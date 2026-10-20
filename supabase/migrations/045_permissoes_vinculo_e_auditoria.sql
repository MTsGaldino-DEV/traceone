-- =============================================================================
-- TraceOne — 045_permissoes_vinculo_e_auditoria.sql
-- Rodar DEPOIS da 044 (o papel ALMOXARIFADO_211 já precisa existir no enum).
--
-- 1. Papéis:
--    ADMIN            tudo
--    GESTOR           tudo, inclusive Backup, Automação GDIS e Log de auditoria
--    ALMOXARIFADO_211 almoxarifado que também vincula serviço
--    SUPERVISOR       reatribui, NÃO vincula serviço
--    ALMOXARIFADO     reatribui, NÃO vincula serviço
--    DESPACHANTE      só leitura (sem mudança)
--
--    "Vincular serviço" = qualquer gravação de número de serviço GDIS num
--    medidor: Conferência, Conferência +45 dias, edição na Lista, Duplicidade,
--    importação do relatório GDIS e das planilhas PC/TC/Lucas.
--
-- 2. Trava no banco (não só na tela): trigger em medidores_list recusa gravar
--    servico_gdis para quem não pode vincular. A vinculação automática
--    (lançamento de um serial que já estava AGUARDANDO_VINCULACAO) continua
--    valendo para todos — ela marca a transação com traceone.vinculo_automatico.
--
-- 3. Log de auditoria (auditoria_log): toda inclusão, alteração e exclusão nas
--    tabelas operacionais, com quem fez, quando, origem (usuário, automático,
--    sistema) e o antes/depois de cada campo alterado. Imutável para o cliente;
--    leitura só ADMIN e GESTOR.
--
-- 4. RPCs da Duplicidade: substituir_serial_medidor e substituir_servico_medidor.
--
-- Códigos de erro próprios (o front traduz pelo código, título = MESSAGE,
-- descrição = DETAIL):
--    TO403  sem permissão     TO404  registro não encontrado
--    TO409  conflito          TO422  dado inválido
-- =============================================================================


-- =============================================================================
-- 1. Helpers de permissão
-- =============================================================================
CREATE OR REPLACE FUNCTION pode_vincular_servico()
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(get_user_role() IN ('ADMIN', 'GESTOR', 'ALMOXARIFADO_211'), FALSE);
$$;

CREATE OR REPLACE FUNCTION pode_escrever()
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    get_user_role() IN ('ADMIN', 'GESTOR', 'SUPERVISOR', 'ALMOXARIFADO', 'ALMOXARIFADO_211'),
    FALSE
  );
$$;

CREATE OR REPLACE FUNCTION _erro_sem_permissao_vinculo()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = 'TO403',
    MESSAGE = 'Sem permissão para vincular serviço',
    DETAIL  = 'Vincular ou trocar o número de serviço de um medidor é exclusivo de Gestor, '
              'Almoxarifado 211 e Administrador. Seu perfil pode reatribuir medidores.';
END;
$$;

GRANT EXECUTE ON FUNCTION pode_vincular_servico() TO authenticated;
GRANT EXECUTE ON FUNCTION pode_escrever()         TO authenticated;


-- =============================================================================
-- 2. RLS: ALMOXARIFADO_211 escreve como o almoxarifado; servicos_report
--    (importar GDIS, conferência) só para quem vincula serviço.
-- =============================================================================
DROP POLICY IF EXISTS "write_tipos" ON tipos_de_medidores;
CREATE POLICY "write_tipos" ON tipos_de_medidores
  FOR ALL TO authenticated
  USING (pode_escrever()) WITH CHECK (pode_escrever());

DROP POLICY IF EXISTS "write_colaboradores" ON colaboradores;
CREATE POLICY "write_colaboradores" ON colaboradores
  FOR ALL TO authenticated
  USING (pode_escrever()) WITH CHECK (pode_escrever());

DROP POLICY IF EXISTS "write_medidores" ON medidores_list;
CREATE POLICY "write_medidores" ON medidores_list
  FOR ALL TO authenticated
  USING (pode_escrever()) WITH CHECK (pode_escrever());

DROP POLICY IF EXISTS "write_conf45_ocultos" ON conferencia_45dias_ocultos;
CREATE POLICY "write_conf45_ocultos" ON conferencia_45dias_ocultos
  FOR ALL TO authenticated
  USING (pode_escrever()) WITH CHECK (pode_escrever());

DROP POLICY IF EXISTS "write_duplicidade_revisados" ON duplicidade_revisados;
CREATE POLICY "write_duplicidade_revisados" ON duplicidade_revisados
  FOR ALL TO authenticated
  USING (pode_escrever()) WITH CHECK (pode_escrever());

DROP POLICY IF EXISTS "write_servicos" ON servicos_report;
CREATE POLICY "write_servicos" ON servicos_report
  FOR ALL TO authenticated
  USING (pode_vincular_servico()) WITH CHECK (pode_vincular_servico());

-- Gestor passa a ver Automação GDIS e a gerar o Backup completo (que lê essas
-- duas tabelas — sem leitura, o backup sairia incompleto sem avisar).
DROP POLICY IF EXISTS "admin_all_automacao_log" ON automacao_gdis_log;
CREATE POLICY "admin_all_automacao_log" ON automacao_gdis_log
  FOR ALL TO authenticated
  USING (get_user_role() IN ('ADMIN', 'GESTOR'))
  WITH CHECK (get_user_role() IN ('ADMIN', 'GESTOR'));

-- A aba Recuperação de Dados saiu do sistema. A tabela continua sendo lida pela
-- Automação GDIS (itens de origem "Recuperação") e pelo Backup — as duas agora
-- de ADMIN e GESTOR.
DROP POLICY IF EXISTS "recuperacao_all_recuperacao_pendente" ON medidor_recuperacao_pendente;
CREATE POLICY "recuperacao_all_recuperacao_pendente" ON medidor_recuperacao_pendente
  FOR ALL TO authenticated
  USING (get_user_role() IN ('ADMIN', 'GESTOR'))
  WITH CHECK (get_user_role() IN ('ADMIN', 'GESTOR'));

-- Mesma função da 040, só muda a checagem de papel.
CREATE OR REPLACE FUNCTION resolver_recuperacao_pendente(p_medidor_id UUID, p_serial_correto TEXT)
RETURNS BOOLEAN -- true = esse serial já existia em outra linha (gravou mesmo assim)
LANGUAGE plpgsql SECURITY INVOKER
AS $$
DECLARE
  v_serial TEXT := TRIM(p_serial_correto);
  v_duplicado BOOLEAN;
BEGIN
  IF get_user_role() IS NULL OR get_user_role() NOT IN ('ADMIN', 'GESTOR') THEN
    RAISE EXCEPTION 'Apenas Administrador ou Gestor podem resolver pendências de recuperação.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM medidores_list WHERE serial = v_serial AND id <> p_medidor_id
  ) INTO v_duplicado;

  UPDATE medidores_list SET serial = v_serial WHERE id = p_medidor_id;
  DELETE FROM medidor_recuperacao_pendente WHERE medidor_id = p_medidor_id;

  RETURN v_duplicado;
END;
$$;


-- =============================================================================
-- 3. Importações que gravam serviço: só quem vincula.
--    Troca só a lista de papéis dentro das funções já existentes (o corpo
--    delas é longo e não muda). Falha alto se o trecho não for encontrado.
-- =============================================================================
DO $$
DECLARE
  r      RECORD;
  v_def  TEXT;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('importar_planilha_pc',
       $de$'ADMIN', 'GESTOR', 'SUPERVISOR', 'ALMOXARIFADO')$de$,
       $para$'ADMIN', 'GESTOR', 'ALMOXARIFADO_211')$para$),
      ('importar_planilha_lucas',
       $de$'ADMIN', 'GESTOR', 'SUPERVISOR', 'ALMOXARIFADO')$de$,
       $para$'ADMIN', 'GESTOR', 'ALMOXARIFADO_211')$para$),
      ('importar_servicos_forcado',
       $de$('ADMIN', 'GESTOR', 'SUPERVISOR')$de$,
       $para$('ADMIN', 'GESTOR', 'ALMOXARIFADO_211')$para$)
    ) AS t(nome, de, para)
  LOOP
    SELECT pg_get_functiondef(p.oid) INTO STRICT v_def
    FROM   pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE  n.nspname = 'public' AND p.proname = r.nome;

    IF position(r.de IN v_def) = 0 THEN
      RAISE EXCEPTION 'Lista de papéis não encontrada em %(): confira a função antes de rodar.', r.nome;
    END IF;

    v_def := replace(v_def, r.de, r.para);
    v_def := replace(v_def,
      'Apenas supervisor, gestor ou admin podem forçar a importação.',
      'Apenas gestor, almoxarifado 211 ou admin podem forçar a importação.');
    EXECUTE v_def;
    RAISE NOTICE 'Permissão de % atualizada.', r.nome;
  END LOOP;
END $$;


-- =============================================================================
-- 4. RPCs de vínculo: checagem de papel no começo
-- =============================================================================
CREATE OR REPLACE FUNCTION garantir_servico_report(
  p_servico TEXT,
  p_serial  TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  IF NOT pode_vincular_servico() THEN
    PERFORM _erro_sem_permissao_vinculo();
  END IF;

  INSERT INTO servicos_report (
    servico, termino, status_conferencia, medidor_serial_vinculado, conferido_em
  )
  VALUES (
    p_servico, NOW(), 'CONFERIDO', p_serial, NOW()
  )
  ON CONFLICT (servico) DO UPDATE
    SET status_conferencia       = 'CONFERIDO',
        medidor_serial_vinculado = COALESCE(p_serial, servicos_report.medidor_serial_vinculado),
        conferido_em             = NOW(),
        serial_buscado           = NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION vincular_servico_medidor(
  p_servico_id TEXT,
  p_serial     TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_vinculado  BOOLEAN;
  v_medidor    RECORD;
  v_colab_nome TEXT;
BEGIN
  IF NOT pode_vincular_servico() THEN
    PERFORM _erro_sem_permissao_vinculo();
  END IF;

  SELECT _tentar_vincular_serial(p_servico_id, p_serial) INTO v_vinculado;

  IF v_vinculado THEN
    SELECT matricula INTO v_medidor
    FROM   medidores_list
    WHERE  serial       = p_serial
      AND  servico_gdis = p_servico_id
    LIMIT  1;

    SELECT nome INTO v_colab_nome
    FROM   colaboradores
    WHERE  matricula = v_medidor.matricula;

    RETURN jsonb_build_object(
      'ok',        true,
      'aguardando', false,
      'serial',    p_serial,
      'matricula', v_medidor.matricula,
      'nome',      COALESCE(v_colab_nome, v_medidor.matricula)
    );
  ELSE
    UPDATE servicos_report
    SET    status_conferencia = 'AGUARDANDO_VINCULACAO',
           serial_buscado     = p_serial
    WHERE  servico = p_servico_id;

    RETURN jsonb_build_object(
      'ok',        true,
      'aguardando', true,
      'serial',    p_serial
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION verificar_vinculacoes_pendentes()
RETURNS INT AS $$
DECLARE
  v_rec        RECORD;
  v_vinculados INT := 0;
BEGIN
  IF NOT pode_vincular_servico() THEN
    PERFORM _erro_sem_permissao_vinculo();
  END IF;

  FOR v_rec IN
    SELECT servico, serial_buscado
    FROM   servicos_report
    WHERE  status_conferencia = 'AGUARDANDO_VINCULACAO'
      AND  serial_buscado IS NOT NULL
    ORDER  BY imported_at ASC
  LOOP
    IF _tentar_vincular_serial(v_rec.servico, v_rec.serial_buscado) THEN
      v_vinculados := v_vinculados + 1;
    END IF;
  END LOOP;

  RETURN v_vinculados;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Vinculação automática ao lançar um serial que o GDIS já esperava: vale para
-- qualquer papel que lança. A marca na transação libera a trava e identifica
-- a origem no log de auditoria.
CREATE OR REPLACE FUNCTION _trigger_auto_vincular_serial()
RETURNS TRIGGER AS $$
DECLARE
  v_servico_id TEXT;
BEGIN
  IF NEW.status <> 'PENDENTE' THEN
    RETURN NEW;
  END IF;

  SELECT servico INTO v_servico_id
  FROM   servicos_report
  WHERE  status_conferencia = 'AGUARDANDO_VINCULACAO'
    AND  serial_buscado     = NEW.serial
  ORDER  BY imported_at ASC
  LIMIT  1;

  IF v_servico_id IS NOT NULL THEN
    PERFORM set_config('traceone.vinculo_automatico', 'on', true);
    PERFORM _tentar_vincular_serial(v_servico_id, NEW.serial);
    PERFORM set_config('traceone.vinculo_automatico', 'off', true);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- =============================================================================
-- 5. Trava: gravar serviço num medidor exige permissão de vínculo.
--    Limpar o serviço (desvincular) continua liberado para quem escreve.
--    Sem usuário logado (scripts com service role) não trava.
-- =============================================================================
CREATE OR REPLACE FUNCTION fn_trava_vinculo_servico()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.servico_gdis IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.servico_gdis IS NOT DISTINCT FROM OLD.servico_gdis THEN
    RETURN NEW;
  END IF;
  IF auth.uid() IS NULL
     OR current_setting('traceone.vinculo_automatico', true) = 'on'
     OR pode_vincular_servico() THEN
    RETURN NEW;
  END IF;

  PERFORM _erro_sem_permissao_vinculo();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_trava_vinculo_servico ON medidores_list;
CREATE TRIGGER trg_trava_vinculo_servico
  BEFORE INSERT OR UPDATE OF servico_gdis ON medidores_list
  FOR EACH ROW EXECUTE FUNCTION fn_trava_vinculo_servico();


-- =============================================================================
-- 6. Log de auditoria
-- =============================================================================
CREATE TABLE IF NOT EXISTS auditoria_log (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- sem FK: o registro sobrevive à exclusão do usuário
  usuario_id     UUID,
  usuario_nome   TEXT,
  usuario_papel  TEXT,
  origem         TEXT NOT NULL,          -- USUARIO | AUTOMATICO | SISTEMA
  tabela         TEXT,
  operacao       TEXT NOT NULL,          -- INSERT | UPDATE | DELETE | NEGADO
  evento         TEXT NOT NULL,          -- ex.: SERVICO_SUBSTITUIDO, ACESSO_NEGADO
  registro_id    TEXT,
  chave          TEXT,                   -- serial, serviço, matrícula… o que identifica a linha
  busca          TEXT,                   -- identificadores em minúsculo, para a busca da tela
  antes          JSONB,                  -- UPDATE: só os campos alterados
  depois         JSONB
);

CREATE INDEX IF NOT EXISTS idx_auditoria_criado_em ON auditoria_log (criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_evento    ON auditoria_log (evento);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario   ON auditoria_log (usuario_id);

ALTER TABLE auditoria_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auditoria_leitura_gestao" ON auditoria_log;
CREATE POLICY "auditoria_leitura_gestao" ON auditoria_log
  FOR SELECT TO authenticated
  USING (get_user_role() IN ('ADMIN', 'GESTOR'));

-- Ninguém do lado do cliente grava, altera ou apaga: só os triggers.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON auditoria_log FROM anon, authenticated;

CREATE OR REPLACE FUNCTION fn_auditoria()
RETURNS TRIGGER AS $$
DECLARE
  v_old    JSONB := CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END;
  v_new    JSONB := CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END;
  v_row    JSONB;
  v_antes  JSONB;
  v_depois JSONB;
  v_uid    UUID := auth.uid();
  v_nome   TEXT;
  v_papel  TEXT;
  v_origem TEXT;
  v_evento TEXT;
  v_id     TEXT;
  v_chave  TEXT;
  v_busca  TEXT;
  k        TEXT;
BEGIN
  v_row := COALESCE(v_new, v_old);

  IF TG_OP = 'UPDATE' THEN
    v_antes  := '{}'::JSONB;
    v_depois := '{}'::JSONB;
    FOR k IN SELECT jsonb_object_keys(v_new) LOOP
      CONTINUE WHEN k IN ('atualizacao', 'updated_at');
      IF v_old -> k IS DISTINCT FROM v_new -> k THEN
        v_antes  := v_antes  || jsonb_build_object(k, v_old -> k);
        v_depois := v_depois || jsonb_build_object(k, v_new -> k);
      END IF;
    END LOOP;
    -- UPDATE que não mudou nada (ex.: upsert de relatório repetido) não vira log
    IF v_depois = '{}'::JSONB THEN
      RETURN NULL;
    END IF;
  ELSE
    v_antes  := v_old;
    v_depois := v_new;
  END IF;

  IF current_setting('traceone.vinculo_automatico', true) = 'on' THEN
    v_origem := 'AUTOMATICO';
  ELSIF v_uid IS NULL THEN
    v_origem := 'SISTEMA';
  ELSE
    v_origem := 'USUARIO';
  END IF;

  IF v_uid IS NOT NULL THEN
    SELECT name, role::TEXT INTO v_nome, v_papel FROM profiles WHERE id = v_uid;
  END IF;

  CASE TG_TABLE_NAME
    WHEN 'medidores_list' THEN
      v_id    := v_row ->> 'id';
      v_chave := v_row ->> 'serial';
      v_busca := concat_ws(' ', v_old ->> 'serial', v_new ->> 'serial',
                                v_old ->> 'servico_gdis', v_new ->> 'servico_gdis',
                                v_old ->> 'matricula', v_new ->> 'matricula');
      v_evento := CASE
        WHEN TG_OP = 'INSERT' THEN 'MEDIDOR_CADASTRADO'
        WHEN TG_OP = 'DELETE' THEN 'MEDIDOR_EXCLUIDO'
        WHEN v_depois ? 'servico_gdis' THEN
          CASE
            WHEN v_old ->> 'servico_gdis' IS NULL THEN 'SERVICO_VINCULADO'
            WHEN v_new ->> 'servico_gdis' IS NULL THEN 'SERVICO_DESVINCULADO'
            ELSE 'SERVICO_SUBSTITUIDO'
          END
        WHEN v_depois ? 'serial' THEN 'SERIAL_SUBSTITUIDO'
        WHEN v_depois ? 'status' AND v_new ->> 'status' = 'REATRIBUIDO' THEN 'MEDIDOR_REATRIBUIDO'
        WHEN v_depois ? 'matricula' THEN 'COLABORADOR_ALTERADO'
        WHEN v_depois ? 'status' THEN 'STATUS_ALTERADO'
        ELSE 'MEDIDOR_EDITADO'
      END;

    WHEN 'servicos_report' THEN
      v_id    := v_row ->> 'servico';
      v_chave := v_id;
      v_busca := concat_ws(' ', v_id, v_row ->> 'matricula',
                                v_old ->> 'medidor_serial_vinculado', v_new ->> 'medidor_serial_vinculado',
                                v_old ->> 'serial_buscado', v_new ->> 'serial_buscado');
      v_evento := CASE
        WHEN TG_OP = 'INSERT' THEN 'SERVICO_IMPORTADO'
        WHEN TG_OP = 'DELETE' THEN 'SERVICO_EXCLUIDO'
        WHEN v_depois ? 'status_conferencia' THEN 'CONFERENCIA_' || (v_new ->> 'status_conferencia')
        ELSE 'SERVICO_EDITADO'
      END;

    WHEN 'colaboradores' THEN
      v_id    := v_row ->> 'matricula';
      v_chave := v_id;
      v_busca := concat_ws(' ', v_id, v_row ->> 'nome');
      v_evento := CASE TG_OP
        WHEN 'INSERT' THEN 'COLABORADOR_CADASTRADO'
        WHEN 'DELETE' THEN 'COLABORADOR_EXCLUIDO'
        ELSE 'COLABORADOR_EDITADO'
      END;

    WHEN 'profiles' THEN
      v_id    := v_row ->> 'id';
      v_chave := v_row ->> 'name';
      v_busca := v_chave;
      v_evento := CASE
        WHEN TG_OP = 'INSERT' THEN 'USUARIO_CRIADO'
        WHEN TG_OP = 'DELETE' THEN 'USUARIO_EXCLUIDO'
        WHEN v_depois ? 'role' THEN 'PAPEL_ALTERADO'
        ELSE 'USUARIO_EDITADO'
      END;

    WHEN 'tipos_de_medidores' THEN
      v_id    := v_row ->> 'cod_sap';
      v_chave := v_id;
      v_busca := concat_ws(' ', v_id, v_row ->> 'tipo');
      v_evento := CASE TG_OP
        WHEN 'INSERT' THEN 'TIPO_CADASTRADO'
        WHEN 'DELETE' THEN 'TIPO_EXCLUIDO'
        ELSE 'TIPO_EDITADO'
      END;

    WHEN 'conferencia_45dias_ocultos' THEN
      v_id    := v_row ->> 'medidor_id';
      SELECT serial INTO v_chave FROM medidores_list WHERE id = (v_row ->> 'medidor_id')::UUID;
      v_busca := v_chave;
      v_evento := CASE TG_OP
        WHEN 'INSERT' THEN 'OCULTADO_45_DIAS'
        WHEN 'DELETE' THEN 'REEXIBIDO_45_DIAS'
        ELSE 'OCULTO_45_DIAS_EDITADO'
      END;

    WHEN 'duplicidade_revisados' THEN
      v_chave := v_row ->> 'chave';
      v_id    := concat_ws(':', v_row ->> 'tipo', v_chave);
      v_busca := v_chave;
      v_evento := CASE TG_OP
        WHEN 'INSERT' THEN 'DUPLICIDADE_REVISADA'
        WHEN 'DELETE' THEN 'REVISAO_REVERTIDA'
        ELSE 'REVISAO_EDITADA'
      END;

    ELSE
      v_evento := TG_OP;
  END CASE;

  INSERT INTO auditoria_log (
    usuario_id, usuario_nome, usuario_papel, origem, tabela, operacao,
    evento, registro_id, chave, busca, antes, depois
  )
  VALUES (
    v_uid, v_nome, v_papel, v_origem, TG_TABLE_NAME, TG_OP,
    v_evento, v_id, v_chave, lower(v_busca), v_antes, v_depois
  );

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'medidores_list', 'servicos_report', 'colaboradores', 'profiles',
    'tipos_de_medidores', 'conferencia_45dias_ocultos', 'duplicidade_revisados'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_auditoria ON %I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_auditoria AFTER INSERT OR UPDATE OR DELETE ON %I '
      'FOR EACH ROW EXECUTE FUNCTION fn_auditoria()', t);
  END LOOP;
END $$;

-- Tentativas recusadas não chegam a gravar nada (a transação é desfeita), então
-- o front registra a recusa à parte, numa chamada própria.
CREATE OR REPLACE FUNCTION registrar_acesso_negado(p_acao TEXT, p_detalhe TEXT DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO auditoria_log (
    usuario_id, usuario_nome, usuario_papel, origem, operacao, evento, chave, busca, depois
  )
  SELECT auth.uid(), p.name, p.role::TEXT, 'USUARIO', 'NEGADO', 'ACESSO_NEGADO',
         left(p_acao, 200),
         lower(left(concat_ws(' ', p_acao, p_detalhe), 500)),
         jsonb_build_object('acao', left(p_acao, 200), 'detalhe', left(p_detalhe, 1000))
  FROM   profiles p
  WHERE  p.id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION registrar_acesso_negado(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION registrar_acesso_negado(TEXT, TEXT) TO authenticated;


-- =============================================================================
-- 7. Duplicidade: substituir número do medidor / número do serviço
-- =============================================================================

-- Troca o serial de uma linha. Liberado para quem escreve (é correção de
-- digitação, não vínculo). Respeita a regra de um PENDENTE por serial e
-- mantém servicos_report apontando para o serial novo.
CREATE OR REPLACE FUNCTION substituir_serial_medidor(p_id UUID, p_serial TEXT)
RETURNS VOID AS $$
DECLARE
  v_serial TEXT := NULLIF(trim(p_serial), '');
  v_med    RECORD;
  v_outro  RECORD;
BEGIN
  IF NOT pode_escrever() THEN
    RAISE EXCEPTION USING
      ERRCODE = 'TO403',
      MESSAGE = 'Sem permissão para alterar medidores',
      DETAIL  = 'Seu perfil só consulta. Peça a um supervisor, almoxarifado ou gestor.';
  END IF;

  IF v_serial IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'TO422',
      MESSAGE = 'Número do medidor vazio',
      DETAIL  = 'Digite o novo número de série do medidor.';
  END IF;

  SELECT * INTO v_med FROM medidores_list WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'TO404',
      MESSAGE = 'Medidor não encontrado',
      DETAIL  = 'A linha foi excluída ou alterada por outra pessoa. Recarregue a tela.';
  END IF;

  IF v_med.serial = v_serial THEN
    RETURN;
  END IF;

  IF v_med.status = 'PENDENTE' THEN
    SELECT m.matricula, c.nome INTO v_outro
    FROM   medidores_list m
    LEFT   JOIN colaboradores c ON c.matricula = m.matricula
    WHERE  m.serial = v_serial AND m.status = 'PENDENTE' AND m.id <> p_id
    LIMIT  1;
    IF FOUND THEN
      RAISE EXCEPTION USING
        ERRCODE = 'TO409',
        MESSAGE = 'Serial já pendente em outra linha',
        DETAIL  = format(
          'O serial %s já está PENDENTE com %s (%s). Cada serial só pode ter uma linha pendente: '
          'resolva aquela linha antes de trocar este número.',
          v_serial, COALESCE(v_outro.nome, v_outro.matricula), v_outro.matricula);
    END IF;
  END IF;

  UPDATE medidores_list SET serial = v_serial WHERE id = p_id;

  IF v_med.servico_gdis IS NOT NULL THEN
    UPDATE servicos_report
    SET    medidor_serial_vinculado = v_serial
    WHERE  servico = v_med.servico_gdis
      AND  medidor_serial_vinculado = v_med.serial;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Troca (ou grava) o serviço de uma linha. Só quem vincula. Linha PENDENTE
-- vira CONCLUIDO, como em qualquer vínculo. O serviço antigo, se veio do
-- relatório GDIS e ficou sem medidor, volta para a fila da Conferência.
CREATE OR REPLACE FUNCTION substituir_servico_medidor(p_id UUID, p_servico TEXT)
RETURNS VOID AS $$
DECLARE
  v_servico TEXT := NULLIF(trim(p_servico), '');
  v_med     RECORD;
  v_termino TIMESTAMPTZ;
BEGIN
  IF NOT pode_vincular_servico() THEN
    PERFORM _erro_sem_permissao_vinculo();
  END IF;

  IF v_servico IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'TO422',
      MESSAGE = 'Número de serviço vazio',
      DETAIL  = 'Digite o novo número de serviço GDIS.';
  END IF;

  SELECT * INTO v_med FROM medidores_list WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'TO404',
      MESSAGE = 'Medidor não encontrado',
      DETAIL  = 'A linha foi excluída ou alterada por outra pessoa. Recarregue a tela.';
  END IF;

  IF v_med.servico_gdis IS NOT DISTINCT FROM v_servico THEN
    RETURN;
  END IF;

  PERFORM garantir_servico_report(v_servico, v_med.serial);
  SELECT termino INTO v_termino FROM servicos_report WHERE servico = v_servico;

  UPDATE medidores_list
  SET    servico_gdis   = v_servico,
         status         = CASE WHEN status = 'PENDENTE' THEN 'CONCLUIDO'::status_medidor ELSE status END,
         data_conclusao = COALESCE(data_conclusao, v_termino::DATE, CURRENT_DATE)
  WHERE  id = p_id;

  -- Serviço antigo sem nenhum medidor: se veio do relatório (tem dados do
  -- GDIS), volta a ser conferido. Se foi criado só para o vínculo manual, fica.
  IF v_med.servico_gdis IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM medidores_list WHERE servico_gdis = v_med.servico_gdis) THEN
    UPDATE servicos_report
    SET    status_conferencia       = 'PENDENTE',
           medidor_serial_vinculado = NULL,
           conferido_em             = NULL,
           serial_buscado           = NULL
    WHERE  servico = v_med.servico_gdis
      AND  (cod_serv IS NOT NULL OR tipo_serv IS NOT NULL OR matricula IS NOT NULL);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION substituir_serial_medidor(UUID, TEXT)  FROM PUBLIC;
REVOKE ALL ON FUNCTION substituir_servico_medidor(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION substituir_serial_medidor(UUID, TEXT)  TO authenticated;
GRANT EXECUTE ON FUNCTION substituir_servico_medidor(UUID, TEXT) TO authenticated;
