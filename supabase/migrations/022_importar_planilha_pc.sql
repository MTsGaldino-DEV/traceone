-- =============================================================================
-- TraceOne — 021_importar_planilha_pc.sql
-- Importação da Planilha PC: vincula número de serviço e data de instalação
-- aos medidores, a partir da coluna Medidor_Instalado.
--
-- A Planilha PC é a prova de que o serviço existiu, então ela também é fonte
-- de servicos_report: quando o NumServ ainda não está cadastrado, o serviço é
-- criado aqui (a maioria dos medidores pendentes está pendente justamente
-- porque o serviço deles nunca veio no relatório GDIS).
--
-- Recebe lotes já filtrados e desempatados pelo cliente, no formato:
--   [{ medidor_id, serial, servico, data_fim, tipo_serv, matricula }, ...]
-- =============================================================================

CREATE OR REPLACE FUNCTION importar_planilha_pc(p_itens JSONB)
RETURNS JSONB AS $$
DECLARE
  v_servicos_criados      INT := 0;
  v_medidores_atualizados INT := 0;
  v_servicos_conferidos   INT := 0;
BEGIN
  -- SECURITY DEFINER ignora RLS, então a permissão de escrita é checada aqui,
  -- espelhando a policy write_medidores.
  IF get_user_role() NOT IN ('ADMIN', 'GESTOR', 'SUPERVISOR', 'ALMOXARIFADO') THEN
    RAISE EXCEPTION 'Sem permissão para importar a Planilha PC.';
  END IF;

  IF p_itens IS NULL OR jsonb_array_length(p_itens) = 0 THEN
    RETURN jsonb_build_object(
      'servicos_criados', 0, 'medidores_atualizados', 0, 'servicos_conferidos', 0
    );
  END IF;

  -- evita o NOTICE do DROP IF EXISTS a cada lote
  SET LOCAL client_min_messages = warning;

  DROP TABLE IF EXISTS _pc_itens;
  CREATE TEMP TABLE _pc_itens ON COMMIT DROP AS
  SELECT
    (it->>'medidor_id')::UUID     AS medidor_id,
    it->>'serial'                 AS serial,
    it->>'servico'                AS servico,
    (it->>'data_fim')::DATE       AS data_fim,
    NULLIF(it->>'tipo_serv', '')  AS tipo_serv,
    it->>'matricula'              AS matricula
  FROM jsonb_array_elements(p_itens) AS it;

  -- 1) Serviços ainda não cadastrados: cria já como conferido.
  -- DISTINCT ON evita conflito quando o mesmo NumServ vem em mais de um item.
  WITH novos AS (
    INSERT INTO servicos_report (
      servico, matricula, termino, tipo_serv,
      status_conferencia, medidor_serial_vinculado, conferido_em
    )
    SELECT DISTINCT ON (p.servico)
      p.servico, p.matricula, p.data_fim::TIMESTAMPTZ, p.tipo_serv,
      'CONFERIDO', p.serial, NOW()
    FROM _pc_itens p
    WHERE NOT EXISTS (SELECT 1 FROM servicos_report s WHERE s.servico = p.servico)
    ORDER BY p.servico, p.data_fim
    ON CONFLICT (servico) DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_servicos_criados FROM novos;

  -- 2) Medidores: vincula serviço + data de instalação e fecha como concluído.
  WITH atualizados AS (
    UPDATE medidores_list m
    SET    status         = 'CONCLUIDO',
           servico_gdis   = p.servico,
           data_conclusao = p.data_fim,
           atualizacao    = NOW()
    FROM   _pc_itens p
    WHERE  m.id = p.medidor_id
      AND (m.status <> 'CONCLUIDO'
        OR COALESCE(m.servico_gdis, '') <> p.servico
        OR m.data_conclusao IS DISTINCT FROM p.data_fim)
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_medidores_atualizados FROM atualizados;

  -- 3) Serviços que já existiam: marca como conferido pelo medidor da planilha.
  WITH alvo AS (
    SELECT DISTINCT ON (p.servico) p.servico, p.serial
    FROM   _pc_itens p
    ORDER  BY p.servico, p.data_fim
  ), conferidos AS (
    UPDATE servicos_report s
    SET    status_conferencia       = 'CONFERIDO',
           medidor_serial_vinculado = a.serial,
           conferido_em             = NOW(),
           serial_buscado           = NULL
    FROM   alvo a
    WHERE  s.servico = a.servico
      AND (s.status_conferencia <> 'CONFERIDO'
        OR s.medidor_serial_vinculado IS DISTINCT FROM a.serial)
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_servicos_conferidos FROM conferidos;

  RETURN jsonb_build_object(
    'servicos_criados',      v_servicos_criados,
    'medidores_atualizados', v_medidores_atualizados,
    'servicos_conferidos',   v_servicos_conferidos
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Escrita em massa: mesmos papéis que já podem escrever nas tabelas operacionais
REVOKE ALL ON FUNCTION importar_planilha_pc(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION importar_planilha_pc(JSONB) TO authenticated;
