-- =============================================================================
-- TraceOne — 003_rpc_functions.sql (Módulo Medidores)
-- Colar no SQL Editor do Supabase APÓS executar 001 e 002
-- =============================================================================

-- =============================================================================
-- FUNÇÃO: match_medidores()
-- =============================================================================
CREATE OR REPLACE FUNCTION match_medidores()
RETURNS TABLE(medidor_id UUID, candidatos INT) AS $$
BEGIN
  -- Caso 1: match único e claro -> preenche automaticamente
  UPDATE medidores_list ml
  SET servico_gdis   = s.servico,
      data_conclusao = s.termino::date,
      status         = 'CONCLUIDO'
  FROM (
    SELECT DISTINCT ON (sr.matricula, sr.servico) sr.*
    FROM servicos_report sr
  ) s
  WHERE ml.status = 'PENDENTE'
    AND ml.matricula = s.matricula
    AND s.termino::date >= ml.data
    AND (
      SELECT count(*) FROM servicos_report sr2
      WHERE sr2.matricula = ml.matricula
        AND sr2.termino::date >= ml.data
    ) = 1;

  -- Caso 2: matrícula com mais de 1 serviço na janela -> fica pendente de confirmação manual
  RETURN QUERY
  SELECT ml.id, count(sr.servico)::INT
  FROM medidores_list ml
  JOIN servicos_report sr ON sr.matricula = ml.matricula AND sr.termino::date >= ml.data
  WHERE ml.status = 'PENDENTE'
  GROUP BY ml.id
  HAVING count(sr.servico) > 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
