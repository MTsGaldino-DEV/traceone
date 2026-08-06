-- =============================================================================
-- TraceOne — 002_rls_policies.sql (Módulo Medidores)
-- Colar no SQL Editor do Supabase APÓS executar 001_initial_schema.sql
-- =============================================================================

-- =============================================================================
-- Habilitar RLS em todas as tabelas
-- =============================================================================
ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos_de_medidores ENABLE ROW LEVEL SECURITY;
ALTER TABLE colaboradores      ENABLE ROW LEVEL SECURITY;
ALTER TABLE medidores_list     ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicos_report    ENABLE ROW LEVEL SECURITY;

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
-- POLICIES: Leituras (Todos os autenticados)
-- =============================================================================
CREATE POLICY "read_all_tipos" ON tipos_de_medidores FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_all_colaboradores" ON colaboradores FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_all_medidores" ON medidores_list FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_all_servicos" ON servicos_report FOR SELECT TO authenticated USING (true);

-- =============================================================================
-- POLICIES: Escrita (Apenas ADMIN e ALMOXARIFE)
-- =============================================================================
CREATE POLICY "write_tipos" ON tipos_de_medidores
  FOR ALL TO authenticated
  USING (get_user_role() IN ('ADMIN', 'ALMOXARIFE'))
  WITH CHECK (get_user_role() IN ('ADMIN', 'ALMOXARIFE'));

CREATE POLICY "write_colaboradores" ON colaboradores
  FOR ALL TO authenticated
  USING (get_user_role() IN ('ADMIN', 'ALMOXARIFE'))
  WITH CHECK (get_user_role() IN ('ADMIN', 'ALMOXARIFE'));

CREATE POLICY "write_medidores" ON medidores_list
  FOR ALL TO authenticated
  USING (get_user_role() IN ('ADMIN', 'ALMOXARIFE'))
  WITH CHECK (get_user_role() IN ('ADMIN', 'ALMOXARIFE'));

CREATE POLICY "write_servicos" ON servicos_report
  FOR ALL TO authenticated
  USING (get_user_role() IN ('ADMIN', 'ALMOXARIFE'))
  WITH CHECK (get_user_role() IN ('ADMIN', 'ALMOXARIFE'));
