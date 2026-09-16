-- =============================================================================
-- TraceOne — 023_conferencia_45dias_ocultos.sql
-- Torna o "ocultar" da Conferência +45 dias persistente e compartilhado:
-- some ao recarregar a página e todo mundo vê o que foi ocultado, por quem.
--
-- Antes era só useState no cliente — sumia no F5 e era privado de cada um.
-- =============================================================================

CREATE TABLE IF NOT EXISTS conferencia_45dias_ocultos (
  medidor_id   UUID PRIMARY KEY REFERENCES medidores_list(id) ON DELETE CASCADE,
  ocultado_por UUID REFERENCES profiles(id) ON DELETE SET NULL DEFAULT auth.uid(),
  ocultado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conf45_ocultos_em
  ON conferencia_45dias_ocultos (ocultado_em DESC);

ALTER TABLE conferencia_45dias_ocultos ENABLE ROW LEVEL SECURITY;

-- Leitura para todos os autenticados: ocultar é informação coletiva.
DROP POLICY IF EXISTS "read_all_conf45_ocultos" ON conferencia_45dias_ocultos;
CREATE POLICY "read_all_conf45_ocultos" ON conferencia_45dias_ocultos
  FOR SELECT TO authenticated USING (true);

-- Escrita para quem já escreve nas tabelas operacionais.
DROP POLICY IF EXISTS "write_conf45_ocultos" ON conferencia_45dias_ocultos;
CREATE POLICY "write_conf45_ocultos" ON conferencia_45dias_ocultos
  FOR ALL TO authenticated
  USING (get_user_role() IN ('ADMIN', 'GESTOR', 'SUPERVISOR', 'ALMOXARIFADO'))
  WITH CHECK (get_user_role() IN ('ADMIN', 'GESTOR', 'SUPERVISOR', 'ALMOXARIFADO'));

-- =============================================================================
-- Lista principal — já sem os ocultos, para a paginação bater com o que se vê.
-- =============================================================================
CREATE OR REPLACE FUNCTION get_conferencia_45dias(
  p_page      INT     DEFAULT 1,
  p_page_size INT     DEFAULT 100,
  p_asc       BOOLEAN DEFAULT FALSE,
  p_dias      INT     DEFAULT 45
)
RETURNS JSONB AS $$
DECLARE
  v_total INT;
  v_data  JSONB;
BEGIN
  SELECT COUNT(*) INTO v_total
  FROM   vw_medidores_completo v
  WHERE  v."Concluído/Pendente" = 'PENDENTE'
    AND  v."DIAS DE ATRIBUIÇÃO" > p_dias
    AND  NOT EXISTS (
           SELECT 1 FROM conferencia_45dias_ocultos o WHERE o.medidor_id = v.id
         );

  -- dias_sort só existe para ordenar; sai do JSON antes de ir ao cliente
  SELECT COALESCE(jsonb_agg(to_jsonb(t) - 'dias_sort' ORDER BY t.dias_sort, t.id), '[]'::jsonb)
  INTO   v_data
  FROM (
    SELECT v.id,
           v."MATRICULA"            AS matricula,
           v."COLABORADOR"          AS colaborador,
           v."SERVIÇO GDIS"         AS "servicoGdis",
           v."Serial"               AS serial,
           v."DIAS DE ATRIBUIÇÃO"   AS dias,
           v."Data"                 AS data,
           CASE WHEN p_asc THEN v."DIAS DE ATRIBUIÇÃO"
                ELSE -v."DIAS DE ATRIBUIÇÃO" END AS dias_sort
    FROM   vw_medidores_completo v
    WHERE  v."Concluído/Pendente" = 'PENDENTE'
      AND  v."DIAS DE ATRIBUIÇÃO" > p_dias
      AND  NOT EXISTS (
             SELECT 1 FROM conferencia_45dias_ocultos o WHERE o.medidor_id = v.id
           )
    ORDER  BY dias_sort, v.id
    LIMIT  p_page_size
    OFFSET (GREATEST(p_page, 1) - 1) * p_page_size
  ) t;

  RETURN jsonb_build_object('data', v_data, 'total', v_total);
END;
$$ LANGUAGE plpgsql STABLE SECURITY INVOKER;

-- =============================================================================
-- Os ocultos, com quem ocultou e quando.
-- =============================================================================
CREATE OR REPLACE FUNCTION get_conferencia_45dias_ocultos(p_dias INT DEFAULT 45)
RETURNS JSONB AS $$
  SELECT COALESCE(jsonb_agg(t ORDER BY t."ocultadoEm" DESC), '[]'::jsonb)
  FROM (
    SELECT v.id,
           v."MATRICULA"          AS matricula,
           v."COLABORADOR"        AS colaborador,
           v."SERVIÇO GDIS"       AS "servicoGdis",
           v."Serial"             AS serial,
           v."DIAS DE ATRIBUIÇÃO" AS dias,
           v."Data"               AS data,
           o.ocultado_em          AS "ocultadoEm",
           COALESCE(p.name, 'Usuário removido') AS "ocultadoPor"
    FROM   conferencia_45dias_ocultos o
    JOIN   vw_medidores_completo v ON v.id = o.medidor_id
    LEFT   JOIN profiles p ON p.id = o.ocultado_por
    WHERE  v."Concluído/Pendente" = 'PENDENTE'
      AND  v."DIAS DE ATRIBUIÇÃO" > p_dias
  ) t;
$$ LANGUAGE SQL STABLE SECURITY INVOKER;

REVOKE ALL ON FUNCTION get_conferencia_45dias(INT, INT, BOOLEAN, INT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION get_conferencia_45dias_ocultos(INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_conferencia_45dias(INT, INT, BOOLEAN, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_conferencia_45dias_ocultos(INT) TO authenticated;
