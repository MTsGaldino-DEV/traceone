-- =============================================================================
-- TraceOne — 016_role_hierarchy_enum.sql
-- Hierarquia de permissões: Gestor, Supervisor, Almoxarifado, Despachante (+ ADMIN)
-- IMPORTANTE: rodar sozinho (npx tsx run_migration.ts supabase/migrations/016_role_hierarchy_enum.sql)
-- antes de rodar 017_role_hierarchy_rls.sql — ALTER TYPE ... ADD VALUE não pode ser
-- usado na mesma transação em que os novos valores são criados.
-- =============================================================================

ALTER TYPE role_type RENAME VALUE 'ALMOXARIFE' TO 'ALMOXARIFADO';
ALTER TYPE role_type ADD VALUE 'SUPERVISOR';
ALTER TYPE role_type ADD VALUE 'DESPACHANTE';
