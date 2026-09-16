-- =============================================================================
-- TraceOne — 008_rpc_vincular_servico.sql
-- RPC para vincular manualmente um serviço GDIS a um medidor pelo serial
-- =============================================================================

CREATE OR REPLACE FUNCTION vincular_servico_medidor(
  p_servico_id TEXT,
  p_serial     TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_medidor    RECORD;
  v_servico    RECORD;
  v_colab_nome TEXT;
BEGIN
  -- 1. Buscar medidor PENDENTE com esse serial
  SELECT id, matricula, data_conclusao
  INTO   v_medidor
  FROM   medidores_list
  WHERE  serial  = p_serial
    AND  status  = 'PENDENTE'
  LIMIT  1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok',    false,
      'error', format('Nenhum medidor pendente encontrado com o serial "%s".', p_serial)
    );
  END IF;

  -- 2. Buscar data de término do serviço (para usar como data_conclusao)
  SELECT termino INTO v_servico
  FROM   servicos_report
  WHERE  servico = p_servico_id;

  -- 3. Atualizar medidores_list
  UPDATE medidores_list
  SET    status         = 'CONCLUIDO',
         servico_gdis   = p_servico_id,
         data_conclusao = COALESCE(v_servico.termino::date, CURRENT_DATE)
  WHERE  id = v_medidor.id;

  -- 4. Atualizar servicos_report
  UPDATE servicos_report
  SET    status_conferencia      = 'CONFERIDO',
         medidor_serial_vinculado = p_serial,
         conferido_em             = NOW()
  WHERE  servico = p_servico_id;

  -- 5. Buscar nome do colaborador para feedback na UI
  SELECT nome INTO v_colab_nome
  FROM   colaboradores
  WHERE  matricula = v_medidor.matricula;

  RETURN jsonb_build_object(
    'ok',        true,
    'serial',    p_serial,
    'matricula', v_medidor.matricula,
    'nome',      COALESCE(v_colab_nome, v_medidor.matricula)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
