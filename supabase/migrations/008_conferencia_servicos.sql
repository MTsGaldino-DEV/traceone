-- =============================================================================
-- TraceOne — 007_conferencia_servicos.sql
-- Adiciona colunas de conferência manual em servicos_report
-- =============================================================================

ALTER TABLE servicos_report
  ADD COLUMN IF NOT EXISTS status_conferencia    TEXT        NOT NULL DEFAULT 'PENDENTE',
  ADD COLUMN IF NOT EXISTS medidor_serial_vinculado TEXT     NULL,
  ADD COLUMN IF NOT EXISTS conferido_em          TIMESTAMPTZ NULL;

-- Constraint de valores válidos
ALTER TABLE servicos_report
  ADD CONSTRAINT chk_status_conferencia
    CHECK (status_conferencia IN ('PENDENTE', 'CONFERIDO'));
