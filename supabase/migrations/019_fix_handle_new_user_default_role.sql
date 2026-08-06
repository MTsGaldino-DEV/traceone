-- =============================================================================
-- TraceOne — 019_fix_handle_new_user_default_role.sql
-- 016_role_hierarchy_enum.sql renomeou o valor do enum 'ALMOXARIFE' para
-- 'ALMOXARIFADO', mas handle_new_user() ainda tinha 'ALMOXARIFE' hardcoded
-- como fallback — isso quebrava TODA criação de usuário (Postgres tenta
-- resolver o literal como role_type mesmo quando o COALESCE não cai nele).
-- =============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::role_type, 'ALMOXARIFADO')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
