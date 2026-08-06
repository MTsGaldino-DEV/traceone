-- =============================================================================
-- TraceOne — 005_rpc_verificar.sql
-- RPC para verificar se um serial já está atribuído (conflito)
-- =============================================================================

CREATE OR REPLACE FUNCTION verificar_medidor_atribuido(p_serial TEXT)
RETURNS TABLE (
  medidor_list_id UUID,
  matricula_atual TEXT,
  nome_colaborador TEXT,
  data_atribuicao DATE,
  dias_atribuido INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ml.id AS medidor_list_id,
    ml.matricula AS matricula_atual,
    c.nome AS nome_colaborador,
    ml.data AS data_atribuicao,
    (CURRENT_DATE - ml.data)::INT AS dias_atribuido
  FROM medidores_list ml
  JOIN colaboradores c ON c.matricula = ml.matricula
  WHERE ml.serial = p_serial
    AND ml.status = 'PENDENTE';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
