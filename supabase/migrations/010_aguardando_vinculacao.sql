-- =============================================================================
-- TraceOne — 009_aguardando_vinculacao.sql
-- Adiciona suporte ao estado "Aguardando Vinculação" na Conferência
-- =============================================================================

-- 1. Adicionar coluna serial_buscado em servicos_report
ALTER TABLE servicos_report
  ADD COLUMN IF NOT EXISTS serial_buscado TEXT NULL;

-- 2. Remover a constraint existente de valores válidos e recriar incluindo o novo status
ALTER TABLE servicos_report
  DROP CONSTRAINT IF EXISTS chk_status_conferencia;

ALTER TABLE servicos_report
  ADD CONSTRAINT chk_status_conferencia
    CHECK (status_conferencia IN ('PENDENTE', 'CONFERIDO', 'AGUARDANDO_VINCULACAO'));

-- 3. Índice composto para acelerar busca de pendências por serial
CREATE INDEX IF NOT EXISTS idx_servicos_conferencia_serial
  ON servicos_report (status_conferencia, serial_buscado)
  WHERE status_conferencia = 'AGUARDANDO_VINCULACAO';
