-- =============================================================================
-- TraceOne — 029_automacao_gdis_log.sql
-- Histórico das rodadas da Automação GDIS. Uma linha por medidor processado,
-- gravada conforme o resultado chega (não no fim do lote) — um lote de 3 mil
-- leva ~2h e a aba pode morrer no meio.
--
-- Campos desnormalizados de propósito: o relatório precisa contar o que
-- aconteceu naquele dia, mesmo que o medidor mude ou seja apagado depois.
-- Por isso medidor_id também não tem FK.
-- =============================================================================

CREATE TABLE IF NOT EXISTS automacao_gdis_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execucao_id       UUID NOT NULL,
  medidor_id        UUID NOT NULL,
  servico_gdis      TEXT,
  matricula         TEXT,
  colaborador       TEXT,
  tipo_equipamento  TEXT,
  serial_anterior   TEXT,
  serial_encontrado TEXT,
  resultado         TEXT NOT NULL CHECK (resultado IN ('ENCONTRADO', 'GRAVADO', 'CONFLITO', 'VAZIO', 'ERRO')),
  observacao        TEXT,
  modo              TEXT NOT NULL DEFAULT 'AUTOMATICO' CHECK (modo IN ('AUTOMATICO', 'MANUAL')),
  executado_por     UUID REFERENCES profiles(id) ON DELETE SET NULL DEFAULT auth.uid(),
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Uma linha por medidor por rodada: o resultado evolui de ENCONTRADO para
  -- GRAVADO/CONFLITO em vez de virar duas linhas soltas.
  UNIQUE (execucao_id, medidor_id)
);

CREATE INDEX IF NOT EXISTS idx_automacao_log_execucao ON automacao_gdis_log(execucao_id);
CREATE INDEX IF NOT EXISTS idx_automacao_log_criado   ON automacao_gdis_log(criado_em DESC);

ALTER TABLE automacao_gdis_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_automacao_log" ON automacao_gdis_log;
CREATE POLICY "admin_all_automacao_log" ON automacao_gdis_log
  FOR ALL TO authenticated
  USING (get_user_role() = 'ADMIN')
  WITH CHECK (get_user_role() = 'ADMIN');

-- =============================================================================
-- Lista das rodadas, com os totais de cada uma.
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
      'executadoPor', COALESCE(p.name, 'Usuário removido')
    )
    ORDER BY r.inicio DESC
  ), '[]'::jsonb)
  FROM   resumo r
  LEFT   JOIN profiles p ON p.id::TEXT = r.executado_por;
$$;

-- =============================================================================
-- Linhas de uma rodada, na ordem em que foram processadas (pro CSV).
-- =============================================================================
CREATE OR REPLACE FUNCTION get_automacao_execucao_itens(p_execucao_id UUID)
RETURNS JSONB
LANGUAGE SQL STABLE SECURITY INVOKER
AS $$
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
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
