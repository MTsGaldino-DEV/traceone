-- =============================================================================
-- TraceOne — 006_rpc_reatribuir.sql
-- RPC para realizar a reatribuição de um medidor
-- =============================================================================

CREATE OR REPLACE FUNCTION reatribuir_medidor(
  p_serial TEXT,
  p_nova_matricula TEXT,
  p_sap_material_id TEXT,
  p_field_service TEXT DEFAULT NULL,
  p_team TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_old_id UUID;
  v_new_id UUID;
BEGIN
  -- 1. Localizar a linha PENDENTE atual desse serial
  SELECT id INTO v_old_id
  FROM medidores_list
  WHERE serial = p_serial AND status = 'PENDENTE';

  IF v_old_id IS NULL THEN
    RAISE EXCEPTION 'Nenhuma linha PENDENTE encontrada para o serial %', p_serial;
  END IF;

  -- 2. UPDATE na linha antiga: status = 'REATRIBUIDO', data_reatribuicao = now()
  UPDATE medidores_list
  SET status = 'REATRIBUIDO',
      data_reatribuicao = NOW()
  WHERE id = v_old_id;

  -- 3. INSERT nova linha em medidores_list: status = 'PENDENTE'
  INSERT INTO medidores_list (
    serial, 
    matricula, 
    material_sap, 
    servico_campo, 
    equipe, 
    status, 
    data, 
    reatribuido_de_id
  ) VALUES (
    p_serial,
    p_nova_matricula,
    p_sap_material_id,
    p_field_service,
    p_team,
    'PENDENTE',
    CURRENT_DATE,
    v_old_id
  ) RETURNING id INTO v_new_id;

  -- 4. UPDATE na linha antiga para salvar a referência de para quem foi (reatribuido_para_id)
  UPDATE medidores_list
  SET reatribuido_para_id = v_new_id
  WHERE id = v_old_id;

  -- 5. Retornar ID da nova linha
  RETURN v_new_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
