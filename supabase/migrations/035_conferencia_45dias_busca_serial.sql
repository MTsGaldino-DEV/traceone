-- =============================================================================
-- TraceOne — 035_conferencia_45dias_busca_serial.sql
-- Adiciona filtro por serial na Conferência +45 dias.
--
-- Precisa dropar antes porque muda a assinatura (novo parâmetro no fim);
-- CREATE OR REPLACE sozinho criaria uma segunda função em vez de substituir.
-- =============================================================================

DROP FUNCTION IF EXISTS get_conferencia_45dias(INT, INT, BOOLEAN, INT);

CREATE OR REPLACE FUNCTION get_conferencia_45dias(
  p_page      INT     DEFAULT 1,
  p_page_size INT     DEFAULT 100,
  p_asc       BOOLEAN DEFAULT FALSE,
  p_dias      INT     DEFAULT 45,
  p_serial    TEXT    DEFAULT NULL
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
    AND  (p_serial IS NULL OR p_serial = '' OR v."Serial" ILIKE '%' || p_serial || '%')
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
      AND  (p_serial IS NULL OR p_serial = '' OR v."Serial" ILIKE '%' || p_serial || '%')
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

REVOKE ALL ON FUNCTION get_conferencia_45dias(INT, INT, BOOLEAN, INT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_conferencia_45dias(INT, INT, BOOLEAN, INT, TEXT) TO authenticated;
