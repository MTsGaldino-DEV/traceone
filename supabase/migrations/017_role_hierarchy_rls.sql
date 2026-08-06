-- =============================================================================
-- TraceOne — 017_role_hierarchy_rls.sql
-- Atualiza as policies de 002_rls_policies.sql para os 5 roles:
-- ADMIN, GESTOR, SUPERVISOR, ALMOXARIFADO, DESPACHANTE
-- Rodar APÓS 016_role_hierarchy_enum.sql (roles novos já precisam existir).
-- =============================================================================

-- =============================================================================
-- profiles: Gestão de usuários liberada para ADMIN, GESTOR, SUPERVISOR
-- =============================================================================
DROP POLICY IF EXISTS "admin_all_profiles" ON profiles;

CREATE POLICY "gestao_usuarios_all_profiles" ON profiles
  FOR ALL TO authenticated
  USING (get_user_role() IN ('ADMIN', 'GESTOR', 'SUPERVISOR'))
  WITH CHECK (get_user_role() IN ('ADMIN', 'GESTOR', 'SUPERVISOR'));

-- =============================================================================
-- Escrita nas tabelas operacionais: ADMIN, GESTOR, SUPERVISOR, ALMOXARIFADO
-- (DESPACHANTE permanece apenas leitura via as policies read_all_* já existentes)
-- =============================================================================
DROP POLICY IF EXISTS "write_tipos" ON tipos_de_medidores;
CREATE POLICY "write_tipos" ON tipos_de_medidores
  FOR ALL TO authenticated
  USING (get_user_role() IN ('ADMIN', 'GESTOR', 'SUPERVISOR', 'ALMOXARIFADO'))
  WITH CHECK (get_user_role() IN ('ADMIN', 'GESTOR', 'SUPERVISOR', 'ALMOXARIFADO'));

DROP POLICY IF EXISTS "write_colaboradores" ON colaboradores;
CREATE POLICY "write_colaboradores" ON colaboradores
  FOR ALL TO authenticated
  USING (get_user_role() IN ('ADMIN', 'GESTOR', 'SUPERVISOR', 'ALMOXARIFADO'))
  WITH CHECK (get_user_role() IN ('ADMIN', 'GESTOR', 'SUPERVISOR', 'ALMOXARIFADO'));

DROP POLICY IF EXISTS "write_medidores" ON medidores_list;
CREATE POLICY "write_medidores" ON medidores_list
  FOR ALL TO authenticated
  USING (get_user_role() IN ('ADMIN', 'GESTOR', 'SUPERVISOR', 'ALMOXARIFADO'))
  WITH CHECK (get_user_role() IN ('ADMIN', 'GESTOR', 'SUPERVISOR', 'ALMOXARIFADO'));

DROP POLICY IF EXISTS "write_servicos" ON servicos_report;
CREATE POLICY "write_servicos" ON servicos_report
  FOR ALL TO authenticated
  USING (get_user_role() IN ('ADMIN', 'GESTOR', 'SUPERVISOR', 'ALMOXARIFADO'))
  WITH CHECK (get_user_role() IN ('ADMIN', 'GESTOR', 'SUPERVISOR', 'ALMOXARIFADO'));
