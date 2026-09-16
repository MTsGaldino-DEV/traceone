-- =============================================================================
-- TraceOne — 011_update_vincular_servico.sql
-- Atualiza RPC pública vincular_servico_medidor para usar _tentar_vincular_serial
-- =============================================================================
CREATE OR REPLACE FUNCTION vincular_servico_medidor(
  p_servico_id TEXT,
  p_serial     TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_vinculado  BOOLEAN;
  v_medidor    RECORD;
  v_colab_nome TEXT;
BEGIN
  SELECT _tentar_vincular_serial(p_servico_id, p_serial) INTO v_vinculado;

  IF v_vinculado THEN
    SELECT matricula INTO v_medidor
    FROM   medidores_list
    WHERE  serial       = p_serial
      AND  servico_gdis = p_servico_id
    LIMIT  1;

    SELECT nome INTO v_colab_nome
    FROM   colaboradores
    WHERE  matricula = v_medidor.matricula;

    RETURN jsonb_build_object(
      'ok',        true,
      'aguardando', false,
      'serial',    p_serial,
      'matricula', v_medidor.matricula,
      'nome',      COALESCE(v_colab_nome, v_medidor.matricula)
    );
  ELSE
    UPDATE servicos_report
    SET    status_conferencia = 'AGUARDANDO_VINCULACAO',
           serial_buscado     = p_serial
    WHERE  servico = p_servico_id;

    RETURN jsonb_build_object(
      'ok',        true,
      'aguardando', true,
      'serial',    p_serial
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
