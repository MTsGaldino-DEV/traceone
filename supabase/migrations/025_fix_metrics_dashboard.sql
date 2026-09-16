-- =============================================================================
-- TraceOne — 024_fix_metrics_dashboard.sql
-- Conserta os números do dashboard.
--
-- Dois bugs:
--
-- 1. getMedidoresMetrics montava as métricas no cliente, baixando a tabela
--    inteira em páginas de 1000 via .range() SEM ORDER BY. Sem ordenação
--    estável o Postgres pode devolver a mesma linha em duas páginas e omitir
--    outras: com o filtro status=PENDENTE, das 2832 linhas buscadas só 2479
--    eram únicas, e o "+45 dias" caía de 1329 para 1129.
--
-- 2. As métricas não recebiam os filtros de supervisor e de dias mínimos, então
--    "Situação Geral" ignorava o filtro de +45 dias ativo na tela.
--
-- A correção move o cálculo para o banco (uma linha de resposta em vez de 16 mil)
-- e aceita os filtros que faltavam.
-- =============================================================================

DROP FUNCTION IF EXISTS get_medidores_metrics(TEXT[], TEXT[], TEXT, TEXT, DATE, DATE, DATE, DATE, TEXT[]);

CREATE OR REPLACE FUNCTION get_medidores_metrics(
  p_matriculas         TEXT[] DEFAULT NULL,
  p_status             TEXT[] DEFAULT NULL,
  p_servico_gdis       TEXT   DEFAULT NULL,
  p_serial             TEXT   DEFAULT NULL,
  p_atribuicao_inicio  DATE   DEFAULT NULL,
  p_atribuicao_fim     DATE   DEFAULT NULL,
  p_conclusao_inicio   DATE   DEFAULT NULL,
  p_conclusao_fim      DATE   DEFAULT NULL,
  p_material_sap_codes TEXT[] DEFAULT NULL,
  p_supervisores       TEXT[] DEFAULT NULL,
  p_dias_min           INT    DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
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
    JOIN colaboradores      c ON c.matricula = ml.matricula
    JOIN tipos_de_medidores t ON t.cod_sap   = ml.material_sap
    WHERE ml.status::TEXT <> 'REATRIBUIDO'
      AND (p_matriculas         IS NULL OR ml.matricula    = ANY(p_matriculas))
      AND (p_supervisores       IS NULL OR c.supervisor    = ANY(p_supervisores))
      AND (p_status             IS NULL OR ml.status::TEXT = ANY(p_status))
      AND (p_servico_gdis       IS NULL OR ml.servico_gdis ILIKE '%' || p_servico_gdis || '%')
      AND (p_serial             IS NULL OR ml.serial       ILIKE '%' || p_serial || '%')
      AND (p_atribuicao_inicio  IS NULL OR ml.data           >= p_atribuicao_inicio)
      AND (p_atribuicao_fim     IS NULL OR ml.data           <= p_atribuicao_fim)
      AND (p_conclusao_inicio   IS NULL OR ml.data_conclusao >= p_conclusao_inicio)
      AND (p_conclusao_fim      IS NULL OR ml.data_conclusao <= p_conclusao_fim)
      AND (p_material_sap_codes IS NULL OR ml.material_sap = ANY(p_material_sap_codes))
      AND (p_dias_min           IS NULL
           OR (COALESCE(ml.data_conclusao, CURRENT_DATE) - ml.data) > p_dias_min)
  ),
  agg AS (
    SELECT
      COUNT(*)                                                    AS total,
      COUNT(*) FILTER (WHERE status = 'PENDENTE')                 AS pendentes,
      COUNT(*) FILTER (WHERE status = 'CONCLUIDO')                AS concluidos,
      COALESCE(SUM(valor) FILTER (WHERE status = 'PENDENTE'), 0)  AS valor_pendente,
      COALESCE(SUM(valor) FILTER (WHERE status = 'CONCLUIDO'), 0) AS valor_concluido,
      COALESCE(SUM(valor), 0)                                     AS valor_total,
      COALESCE(AVG(dias) FILTER (WHERE status = 'PENDENTE'), 0)   AS media_dias_pendentes,
      COUNT(*) FILTER (WHERE status = 'PENDENTE' AND dias > 45)   AS acima_45
    FROM filtered
  ),
  ranking AS (
    SELECT
      matricula,
      nome,
      COUNT(*) FILTER (WHERE status = 'PENDENTE')                AS qtd_pendente,
      COALESCE(SUM(valor) FILTER (WHERE status = 'PENDENTE'), 0) AS valor_pendente
    FROM filtered
    GROUP BY matricula, nome
    HAVING COUNT(*) FILTER (WHERE status = 'PENDENTE') > 0
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

REVOKE ALL ON FUNCTION get_medidores_metrics(TEXT[], TEXT[], TEXT, TEXT, DATE, DATE, DATE, DATE, TEXT[], TEXT[], INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_medidores_metrics(TEXT[], TEXT[], TEXT, TEXT, DATE, DATE, DATE, DATE, TEXT[], TEXT[], INT) TO authenticated;
