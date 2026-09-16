-- =============================================================================
-- TraceOne — 004_reatribuido_enum_value.sql
-- Isola o ADD VALUE do enum numa migration própria: ALTER TYPE ... ADD VALUE
-- não pode ser usado na mesma transação em que o valor novo é criado, e o
-- `supabase db push` roda cada arquivo como uma transação. A migration
-- 005_reatribuicao.sql (antiga 004) criava e já usava 'REATRIBUIDO' no mesmo
-- arquivo — separado aqui.
-- =============================================================================

ALTER TYPE status_medidor ADD VALUE IF NOT EXISTS 'REATRIBUIDO';
