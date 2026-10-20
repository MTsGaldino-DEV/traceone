-- =============================================================================
-- TraceOne — 044_role_almoxarifado_211_enum.sql
-- Novo papel: Almoxarifado 211 — almoxarifado que também vincula serviço
-- (braço direito do Gestor).
--
-- IMPORTANTE: rodar SOZINHA, antes da 045. ALTER TYPE ... ADD VALUE não pode
-- ser usado na mesma transação em que o valor novo é referenciado.
-- =============================================================================

ALTER TYPE role_type ADD VALUE IF NOT EXISTS 'ALMOXARIFADO_211';
