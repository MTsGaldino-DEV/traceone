-- ============================================================
-- DROP de toda a estrutura antiga do TraceOne
-- ============================================================

-- Remover views que possam existir
DROP VIEW IF EXISTS vw_medidores_completo CASCADE;

-- Remover tabelas antigas (com CASCADE para derrubar FKs e triggers)
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS audits        CASCADE;
DROP TABLE IF EXISTS items         CASCADE;
DROP TABLE IF EXISTS categories    CASCADE;
DROP TABLE IF EXISTS employees     CASCADE;

-- Remover novas tabelas caso exista tentativa anterior
DROP TABLE IF EXISTS medidores_list     CASCADE;
DROP TABLE IF EXISTS servicos_report    CASCADE;
DROP TABLE IF EXISTS colaboradores      CASCADE;
DROP TABLE IF EXISTS tipos_de_medidores CASCADE;

-- Remover profiles (será recriada na migration 001)
-- Mas NÃO apagamos auth.users — Supabase gerencia isso
DROP TABLE IF EXISTS profiles CASCADE;

-- Remover funções antigas
DROP FUNCTION IF EXISTS get_dashboard_stats() CASCADE;
DROP FUNCTION IF EXISTS create_movement(movement_type, uuid, uuid, integer, text) CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS normalize_matricula() CASCADE;
DROP FUNCTION IF EXISTS set_atualizacao() CASCADE;
DROP FUNCTION IF EXISTS match_medidores() CASCADE;
DROP FUNCTION IF EXISTS get_user_role() CASCADE;

-- Remover triggers no auth (se existirem)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Remover enums antigos
DROP TYPE IF EXISTS role_type       CASCADE;
DROP TYPE IF EXISTS item_type       CASCADE;
DROP TYPE IF EXISTS item_status     CASCADE;
DROP TYPE IF EXISTS employee_status CASCADE;
DROP TYPE IF EXISTS movement_type   CASCADE;
DROP TYPE IF EXISTS audit_action    CASCADE;
DROP TYPE IF EXISTS status_medidor  CASCADE;
