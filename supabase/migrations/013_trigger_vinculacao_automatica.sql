-- =============================================================================
-- TraceOne — 012_trigger_vinculacao_automatica.sql
-- Trigger AFTER INSERT em medidores_list para resolver vinculações pendentes
-- =============================================================================
CREATE OR REPLACE FUNCTION _trigger_auto_vincular_serial()
RETURNS TRIGGER AS $$
DECLARE
  v_servico_id TEXT;
BEGIN
  IF NEW.status <> 'PENDENTE' THEN
    RETURN NEW;
  END IF;

  SELECT servico INTO v_servico_id
  FROM   servicos_report
  WHERE  status_conferencia = 'AGUARDANDO_VINCULACAO'
    AND  serial_buscado     = NEW.serial
  ORDER  BY imported_at ASC
  LIMIT  1;

  IF v_servico_id IS NOT NULL THEN
    PERFORM _tentar_vincular_serial(v_servico_id, NEW.serial);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_vincular_serial ON medidores_list;

CREATE TRIGGER trg_auto_vincular_serial
  AFTER INSERT ON medidores_list
  FOR EACH ROW
  EXECUTE FUNCTION _trigger_auto_vincular_serial();
