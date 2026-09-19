-- =============================================================================
-- TraceOne — 031_automacao_log_item_generico.sql
-- A Automação GDIS passa a processar duas filas: a recuperação pós-incidente
-- (medidor_recuperacao_pendente, já com medidor conhecido) e os serviços
-- pendentes de vínculo da aba Conferência (servicos_report, sem medidor
-- nenhum ainda). automacao_gdis_log era modelada só pra primeira — uma linha
-- por medidor_id, chave UUID obrigatória.
--
-- Isso muda:
--   1. medidor_id vira opcional (item de conferência não tem medidor até
--      vincular) e chave_item (TEXT) passa a ser a identidade real da linha
--      dentro da rodada — "rec:<medidor_id>" ou "conf:<servico>".
--   2. origem TEXT marca de qual fila a linha veio, pro relatório separar.
--   3. resultado ganha 'AGUARDANDO': vincular_servico_medidor pode não achar
--      nenhum medidor PENDENTE com o serial que o GDIS devolveu — resultado
--      legítimo (fica igual ao que a Conferência já mostra como "Aguardando
--      Vinculação"), não é erro.
--
-- As duas constraints antigas (CHECK do resultado, UNIQUE execucao_id+
-- medidor_id) foram criadas inline em 029, sem nome explícito — o Postgres
-- gerou os nomes. Em vez de arriscar adivinhar, o bloco abaixo descobre o
-- nome de cada uma no catálogo antes de derrubar.
-- =============================================================================

DO $$
DECLARE
  v_name TEXT;
BEGIN
  SELECT con.conname INTO v_name
  FROM   pg_constraint con
  JOIN   pg_class rel ON rel.oid = con.conrelid
  WHERE  rel.relname = 'automacao_gdis_log'
    AND  con.contype = 'c'
    AND  pg_get_constraintdef(con.oid) ILIKE '%resultado%';
  IF v_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE automacao_gdis_log DROP CONSTRAINT %I', v_name);
  END IF;

  SELECT con.conname INTO v_name
  FROM   pg_constraint con
  JOIN   pg_class rel ON rel.oid = con.conrelid
  WHERE  rel.relname = 'automacao_gdis_log'
    AND  con.contype = 'u'
    AND  pg_get_constraintdef(con.oid) ILIKE '%medidor_id%';
  IF v_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE automacao_gdis_log DROP CONSTRAINT %I', v_name);
  END IF;
END $$;

ALTER TABLE automacao_gdis_log
  ALTER COLUMN medidor_id DROP NOT NULL;

ALTER TABLE automacao_gdis_log
  ADD COLUMN IF NOT EXISTS chave_item TEXT,
  ADD COLUMN IF NOT EXISTS origem     TEXT NOT NULL DEFAULT 'RECUPERACAO';

-- Backfill: toda linha existente veio da fila de recuperação.
UPDATE automacao_gdis_log
SET    chave_item = 'rec:' || medidor_id::TEXT
WHERE  chave_item IS NULL;

ALTER TABLE automacao_gdis_log
  ALTER COLUMN chave_item SET NOT NULL;

ALTER TABLE automacao_gdis_log
  ADD CONSTRAINT automacao_gdis_log_origem_check
    CHECK (origem IN ('RECUPERACAO', 'CONFERENCIA'));

ALTER TABLE automacao_gdis_log
  ADD CONSTRAINT automacao_gdis_log_resultado_check
    CHECK (resultado IN ('ENCONTRADO', 'GRAVADO', 'CONFLITO', 'VAZIO', 'ERRO', 'AGUARDANDO'));

ALTER TABLE automacao_gdis_log
  ADD CONSTRAINT automacao_gdis_log_execucao_chave_key
    UNIQUE (execucao_id, chave_item);

-- =============================================================================
-- Resumo das rodadas: soma o novo resultado AGUARDANDO.
-- =============================================================================
CREATE OR REPLACE FUNCTION get_automacao_execucoes()
RETURNS JSONB
LANGUAGE SQL STABLE SECURITY INVOKER
AS $$
  WITH resumo AS (
    SELECT l.execucao_id,
           MIN(l.criado_em)                                       AS inicio,
           MAX(l.atualizado_em)                                   AS fim,
           COUNT(*)                                               AS total,
           COUNT(*) FILTER (WHERE l.resultado = 'GRAVADO')        AS gravados,
           COUNT(*) FILTER (WHERE l.resultado = 'CONFLITO')       AS conflitos,
           COUNT(*) FILTER (WHERE l.resultado = 'VAZIO')          AS vazios,
           COUNT(*) FILTER (WHERE l.resultado = 'ERRO')           AS erros,
           COUNT(*) FILTER (WHERE l.resultado = 'ENCONTRADO')     AS encontrados,
           COUNT(*) FILTER (WHERE l.resultado = 'AGUARDANDO')     AS aguardando,
           MIN(l.executado_por::TEXT)                             AS executado_por
    FROM   automacao_gdis_log l
    GROUP  BY l.execucao_id
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'execucaoId',   r.execucao_id,
      'inicio',       r.inicio,
      'fim',          r.fim,
      'total',        r.total,
      'gravados',     r.gravados,
      'conflitos',    r.conflitos,
      'vazios',       r.vazios,
      'erros',        r.erros,
      'encontrados',  r.encontrados,
      'aguardando',   r.aguardando,
      'executadoPor', COALESCE(p.name, 'Usuário removido')
    )
    ORDER BY r.inicio DESC
  ), '[]'::jsonb)
  FROM   resumo r
  LEFT   JOIN profiles p ON p.id::TEXT = r.executado_por;
$$;

-- =============================================================================
-- Linhas de uma rodada: inclui a origem, pro CSV distinguir as duas filas.
-- =============================================================================
CREATE OR REPLACE FUNCTION get_automacao_execucao_itens(p_execucao_id UUID)
RETURNS JSONB
LANGUAGE SQL STABLE SECURITY INVOKER
AS $$
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'origem',           l.origem,
      'servicoGdis',      l.servico_gdis,
      'matricula',        l.matricula,
      'colaborador',      l.colaborador,
      'tipoEquipamento',  l.tipo_equipamento,
      'serialAnterior',   l.serial_anterior,
      'serialEncontrado', l.serial_encontrado,
      'resultado',        l.resultado,
      'observacao',       l.observacao,
      'modo',             l.modo,
      'criadoEm',         l.criado_em
    )
    ORDER BY l.criado_em
  ), '[]'::jsonb)
  FROM   automacao_gdis_log l
  WHERE  l.execucao_id = p_execucao_id;
$$;

REVOKE ALL ON FUNCTION get_automacao_execucoes() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION get_automacao_execucao_itens(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_automacao_execucoes() TO authenticated;
GRANT EXECUTE ON FUNCTION get_automacao_execucao_itens(UUID) TO authenticated;
