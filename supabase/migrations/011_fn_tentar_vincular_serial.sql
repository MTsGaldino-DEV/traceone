-- =============================================================================
-- TraceOne — 010_fn_tentar_vincular_serial.sql
-- Função interna reutilizável de vinculação
-- =============================================================================
CREATE OR REPLACE FUNCTION _tentar_vincular_serial(
  p_servico_id TEXT,
  p_serial     TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_medidor    RECORD;
  v_servico    RECORD;
BEGIN
  SELECT id, matricula
  INTO   v_medidor
  FROM   medidores_list
  WHERE  serial = p_serial
    AND  status = 'PENDENTE'
  LIMIT  1;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  SELECT termino INTO v_servico
  FROM   servicos_report
  WHERE  servico = p_servico_id;

  UPDATE medidores_list
  SET    status         = 'CONCLUIDO',
         servico_gdis   = p_servico_id,
         data_conclusao = COALESCE(v_servico.termino::date, CURRENT_DATE)
  WHERE  id = v_medidor.id;

  UPDATE servicos_report
  SET    status_conferencia       = 'CONFERIDO',
         medidor_serial_vinculado = p_serial,
         conferido_em             = NOW(),
         serial_buscado           = NULL
  WHERE  servico = p_servico_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
