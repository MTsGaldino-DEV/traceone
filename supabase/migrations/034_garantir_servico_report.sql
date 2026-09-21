-- =============================================================================
-- TraceOne — 034_garantir_servico_report.sql
-- Vincular um serviço GDIS a um medidor não deveria depender de ele já ter
-- vindo no relatório importado: a maior parte dos vínculos manuais é
-- exatamente para os casos em que o serviço ainda não foi importado.
--
-- Essa RPC cria a linha em servicos_report na hora, se ainda não existir
-- (mesmo padrão já usado pela importação da Planilha PC em
-- importar_planilha_pc), só para satisfazer a FK
-- medidores_list_servico_gdis_fkey. O UPDATE em medidores_list continua
-- sendo feito pelo cliente logo em seguida.
-- =============================================================================

CREATE OR REPLACE FUNCTION garantir_servico_report(
  p_servico TEXT,
  p_serial  TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- SECURITY DEFINER ignora RLS, então a permissão é checada aqui,
  -- espelhando a policy write_servicos.
  IF get_user_role() NOT IN ('ADMIN', 'GESTOR', 'SUPERVISOR', 'ALMOXARIFADO') THEN
    RAISE EXCEPTION 'Sem permissão para vincular serviço.';
  END IF;

  INSERT INTO servicos_report (
    servico, termino, status_conferencia, medidor_serial_vinculado, conferido_em
  )
  VALUES (
    p_servico, NOW(), 'CONFERIDO', p_serial, NOW()
  )
  ON CONFLICT (servico) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION garantir_servico_report(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION garantir_servico_report(TEXT, TEXT) TO authenticated;
