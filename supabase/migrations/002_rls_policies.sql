-- =============================================================================
-- TraceOne — 002_rls_policies.sql
-- Colar no SQL Editor do Supabase APÓS executar 001_initial_schema.sql
-- =============================================================================

-- =============================================================================
-- Habilitar RLS em todas as tabelas
-- =============================================================================
ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees      ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE audits         ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- Função helper: retorna a role do usuário autenticado
-- =============================================================================
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS role_type AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- =============================================================================
-- POLICIES: profiles
-- ADMIN: acesso total
-- Qualquer usuário: lê e atualiza o próprio perfil
-- =============================================================================
CREATE POLICY "admin_all_profiles" ON profiles
  FOR ALL TO authenticated
  USING (get_user_role() = 'ADMIN')
  WITH CHECK (get_user_role() = 'ADMIN');

CREATE POLICY "user_read_own_profile" ON profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "user_update_own_profile" ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- =============================================================================
-- POLICIES: employees
-- ADMIN + ALMOXARIFE: CRUD completo
-- GESTOR: somente leitura
-- =============================================================================
CREATE POLICY "admin_almox_all_employees" ON employees
  FOR ALL TO authenticated
  USING (get_user_role() IN ('ADMIN', 'ALMOXARIFE'))
  WITH CHECK (get_user_role() IN ('ADMIN', 'ALMOXARIFE'));

CREATE POLICY "gestor_read_employees" ON employees
  FOR SELECT TO authenticated
  USING (get_user_role() = 'GESTOR');

-- =============================================================================
-- POLICIES: categories
-- ADMIN + ALMOXARIFE: CRUD completo
-- GESTOR: somente leitura
-- =============================================================================
CREATE POLICY "admin_almox_all_categories" ON categories
  FOR ALL TO authenticated
  USING (get_user_role() IN ('ADMIN', 'ALMOXARIFE'))
  WITH CHECK (get_user_role() IN ('ADMIN', 'ALMOXARIFE'));

CREATE POLICY "gestor_read_categories" ON categories
  FOR SELECT TO authenticated
  USING (get_user_role() = 'GESTOR');

-- =============================================================================
-- POLICIES: items
-- ADMIN + ALMOXARIFE: CRUD completo
-- GESTOR: somente leitura
-- =============================================================================
CREATE POLICY "admin_almox_all_items" ON items
  FOR ALL TO authenticated
  USING (get_user_role() IN ('ADMIN', 'ALMOXARIFE'))
  WITH CHECK (get_user_role() IN ('ADMIN', 'ALMOXARIFE'));

CREATE POLICY "gestor_read_items" ON items
  FOR SELECT TO authenticated
  USING (get_user_role() = 'GESTOR');

-- =============================================================================
-- POLICIES: stock_movements
-- ADMIN + ALMOXARIFE: CRUD completo
-- GESTOR: somente leitura
-- Nota: inserções via RPC create_movement (SECURITY DEFINER) também funcionam
-- =============================================================================
CREATE POLICY "admin_almox_all_movements" ON stock_movements
  FOR ALL TO authenticated
  USING (get_user_role() IN ('ADMIN', 'ALMOXARIFE'))
  WITH CHECK (get_user_role() IN ('ADMIN', 'ALMOXARIFE'));

CREATE POLICY "gestor_read_movements" ON stock_movements
  FOR SELECT TO authenticated
  USING (get_user_role() = 'GESTOR');

-- =============================================================================
-- POLICIES: audits
-- Apenas ADMIN pode ler
-- Inserções são feitas pelas funções SECURITY DEFINER (bypassam RLS)
-- =============================================================================
CREATE POLICY "admin_read_audits" ON audits
  FOR SELECT TO authenticated
  USING (get_user_role() = 'ADMIN');
