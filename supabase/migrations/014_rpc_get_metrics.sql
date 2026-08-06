-- =============================================================================
-- TraceOne — 014_rpc_get_metrics.sql
-- RPC server-side para métricas e ranking do dashboard
-- =============================================================================
CREATE OR REPLACE FUNCTION get_medidores_metrics(
  p_matriculas       TEXT[]    DEFAULT NULL,
  p_status           TEXT[]    DEFAULT NULL,
  p_servico_gdis     TEXT      DEFAULT NULL,
  p_serial           TEXT      DEFAULT NULL,
  p_atribuicao_inicio DATE     DEFAULT NULL,
  p_atribuicao_fim    DATE     DEFAULT NULL,
  p_conclusao_inicio  DATE     DEFAULT NULL,
  p_conclusao_fim     DATE     DEFAULT NULL,
  p_material_sap_codes TEXT[]  DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
BEGIN
  WITH filtered AS (
    SELECT
      ml.status,
      ml.matricula,
      c.nome,
      t.valor,
      (COALESCE(ml.data_conclusao, CURRENT_DATE) - ml.data) AS dias
    FROM medidores_list ml
    JOIN colaboradores      c ON c.matricula  = ml.matricula
    JOIN tipos_de_medidores t ON t.cod_sap    = ml.material_sap
    WHERE
      (p_matriculas        IS NULL OR ml.matricula    = ANY(p_matriculas))
      AND (p_status        IS NULL OR ml.status::TEXT = ANY(p_status))
      AND (p_servico_gdis  IS NULL OR ml.servico_gdis ILIKE '%' || p_servico_gdis || '%')
      AND (p_serial        IS NULL OR ml.serial       ILIKE '%' || p_serial || '%')
      AND (p_atribuicao_inicio IS NULL OR ml.data             >= p_atribuicao_inicio)
      AND (p_atribuicao_fim    IS NULL OR ml.data             <= p_atribuicao_fim)
      AND (p_conclusao_inicio  IS NULL OR ml.data_conclusao   >= p_conclusao_inicio)
      AND (p_conclusao_fim     IS NULL OR ml.data_conclusao   <= p_conclusao_fim)
      AND (p_material_sap_codes IS NULL OR ml.material_sap = ANY(p_material_sap_codes))
  ),
  agg AS (
    SELECT
      COUNT(*)                                                   AS total,
      COUNT(*) FILTER (WHERE status = 'PENDENTE')               AS pendentes,
      COUNT(*) FILTER (WHERE status = 'CONCLUIDO')              AS concluidos,
      COALESCE(SUM(valor) FILTER (WHERE status = 'PENDENTE'),0) AS valor_pendente,
      COALESCE(SUM(valor) FILTER (WHERE status = 'CONCLUIDO'),0)AS valor_concluido,
      COALESCE(SUM(valor), 0)                                   AS valor_total,
      COALESCE(ROUND(AVG(dias) FILTER (WHERE status = 'PENDENTE')), 0) AS media_dias_pendentes,
      COUNT(*) FILTER (WHERE status = 'PENDENTE' AND dias > 30) AS acima_30,
      COUNT(*) FILTER (WHERE status = 'PENDENTE' AND dias > 60) AS acima_60,
      COUNT(*) FILTER (WHERE status = 'PENDENTE' AND dias > 90) AS acima_90
    FROM filtered
  ),
  ranking AS (
    SELECT
      matricula,
      nome,
      COUNT(*)                                                   AS qtd_total,
      COUNT(*) FILTER (WHERE status = 'PENDENTE')               AS qtd_pendente,
      COALESCE(SUM(valor) FILTER (WHERE status = 'PENDENTE'),0) AS valor_pendente
    FROM filtered
    GROUP BY matricula, nome
    ORDER BY valor_pendente DESC NULLS LAST
    LIMIT 10
  )
  SELECT json_build_object(
    'metrics', (SELECT row_to_json(a) FROM agg a),
    'ranking', COALESCE((SELECT json_agg(r) FROM ranking r), '[]'::json)
  ) INTO v_result;

  RETURN v_result;
END;
$$;
