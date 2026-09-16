-- =============================================================================
-- TraceOne — 018_remove_allow_all_policies.sql
-- Remove policies "allow_all_*" pré-existentes (não versionadas em migrations
-- anteriores) que liberavam leitura/escrita total a `public` (inclusive não
-- autenticado) em colaboradores, medidores_list, servicos_report e
-- tipos_de_medidores. Elas anulavam a hierarquia de permissões por role
-- aplicada em 017_role_hierarchy_rls.sql.
-- =============================================================================

DROP POLICY IF EXISTS "allow_all_colaboradores"   ON colaboradores;
DROP POLICY IF EXISTS "allow_all_medidores"        ON medidores_list;
DROP POLICY IF EXISTS "allow_all_servicos"         ON servicos_report;
DROP POLICY IF EXISTS "allow_all_tipos"            ON tipos_de_medidores;
