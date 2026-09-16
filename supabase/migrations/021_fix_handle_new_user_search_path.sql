-- =============================================================================
-- TraceOne — 020_fix_handle_new_user_search_path.sql
-- handle_new_user() é SECURITY DEFINER mas não fixava search_path, então
-- herdava o search_path de quem chama. O role supabase_auth_admin (usado
-- pelo GoTrue de verdade) tem search_path = 'auth' apenas — sem 'public' —
-- então o INSERT INTO profiles (sem schema qualificado) falhava ao criar
-- QUALQUER usuário novo pela API/painel do Supabase Auth, com o erro
-- genérico "Database error creating new user". Fixando o search_path da
-- função resolve isso de vez (padrão recomendado pelo Supabase para toda
-- função SECURITY DEFINER).
-- =============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.role_type, 'ALMOXARIFADO')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
