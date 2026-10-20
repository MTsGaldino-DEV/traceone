-- =============================================================================
-- TraceOne — 040_recuperacao_libera_almoxarifado.sql
-- Libera a aba "Recuperação de Dados" para o ALMOXARIFADO, além do ADMIN.
-- A escrita em medidores_list já era permitida ao ALMOXARIFADO
-- (018_role_hierarchy_rls.sql); faltava a tabela de pendências e a trava
-- da função de resolver.
-- =============================================================================

DROP POLICY IF EXISTS "admin_all_recuperacao_pendente" ON medidor_recuperacao_pendente;
DROP POLICY IF EXISTS "recuperacao_all_recuperacao_pendente" ON medidor_recuperacao_pendente;
CREATE POLICY "recuperacao_all_recuperacao_pendente" ON medidor_recuperacao_pendente
  FOR ALL TO authenticated
  USING (get_user_role() IN ('ADMIN', 'ALMOXARIFADO'))
  WITH CHECK (get_user_role() IN ('ADMIN', 'ALMOXARIFADO'));

-- Mesma função da 030, só muda a checagem de role.
CREATE OR REPLACE FUNCTION resolver_recuperacao_pendente(p_medidor_id UUID, p_serial_correto TEXT)
RETURNS BOOLEAN -- true = esse serial já existia em outra linha (gravou mesmo assim)
LANGUAGE plpgsql SECURITY INVOKER
AS $$
DECLARE
  v_serial TEXT := TRIM(p_serial_correto);
  v_duplicado BOOLEAN;
BEGIN
  IF get_user_role() IS NULL OR get_user_role() NOT IN ('ADMIN', 'ALMOXARIFADO') THEN
    RAISE EXCEPTION 'Apenas ADMIN ou ALMOXARIFADO podem resolver pendências de recuperação.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM medidores_list WHERE serial = v_serial AND id <> p_medidor_id
  ) INTO v_duplicado;

  UPDATE medidores_list SET serial = v_serial WHERE id = p_medidor_id;
  DELETE FROM medidor_recuperacao_pendente WHERE medidor_id = p_medidor_id;

  RETURN v_duplicado;
END;
$$;
