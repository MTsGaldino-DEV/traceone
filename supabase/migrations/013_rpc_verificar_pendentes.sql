-- =============================================================================
-- TraceOne — 013_rpc_verificar_pendentes.sql
-- RPC para verificar e resolver em lote todas as vinculações pendentes
-- =============================================================================
CREATE OR REPLACE FUNCTION verificar_vinculacoes_pendentes()
RETURNS INT AS $$
DECLARE
  v_rec        RECORD;
  v_vinculados INT := 0;
BEGIN
  FOR v_rec IN
    SELECT servico, serial_buscado
    FROM   servicos_report
    WHERE  status_conferencia = 'AGUARDANDO_VINCULACAO'
      AND  serial_buscado IS NOT NULL
    ORDER  BY imported_at ASC
  LOOP
    IF _tentar_vincular_serial(v_rec.servico, v_rec.serial_buscado) THEN
      v_vinculados := v_vinculados + 1;
    END IF;
  END LOOP;

  RETURN v_vinculados;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
