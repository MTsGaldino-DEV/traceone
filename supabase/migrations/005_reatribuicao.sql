-- =============================================================================
-- TraceOne — 004_reatribuicao.sql
-- Sistema anti-duplicidade de seriais com suporte a reatribuição
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Valor 'REATRIBUIDO' do enum status_medidor — movido para a migration
--    003b_reatribuido_enum_value.sql (não pode ser criado e usado na mesma
--    transação; ver comentário lá).
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- 2. Adicionar colunas de reatribuição em medidores_list
-- -----------------------------------------------------------------------------
ALTER TABLE medidores_list
  ADD COLUMN IF NOT EXISTS reatribuido_de_id    UUID REFERENCES medidores_list(id),
  ADD COLUMN IF NOT EXISTS reatribuido_para_id  UUID REFERENCES medidores_list(id),
  ADD COLUMN IF NOT EXISTS data_reatribuicao    TIMESTAMPTZ;

-- -----------------------------------------------------------------------------
-- 3. Índice único parcial: um serial só pode ter UMA linha PENDENTE por vez
-- -----------------------------------------------------------------------------
DROP INDEX IF EXISTS idx_medidor_serial_pendente_unico;

CREATE UNIQUE INDEX idx_medidor_serial_pendente_unico
  ON medidores_list (serial)
  WHERE status = 'PENDENTE';

-- -----------------------------------------------------------------------------
-- 4. Recriar vw_medidores_completo excluindo linhas com status = 'REATRIBUIDO'
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_medidores_completo AS
SELECT
  ml.id,
  ml.data                                   AS "Data",
  ml.material_sap                           AS "Material SAP",
  ml.serial                                 AS "Serial",
  ml.matricula                              AS "MATRICULA",
  c.nome                                    AS "COLABORADOR",
  c.supervisor                              AS "SUPERVISOR",
  ml.servico_gdis                           AS "SERVIÇO GDIS",
  ml.status                                 AS "Concluído/Pendente",
  t.valor                                   AS "VALOR",
  t.tipo                                    AS "EQUIPAMENTO",
  (COALESCE(ml.data_conclusao, CURRENT_DATE) - ml.data) AS "DIAS DE ATRIBUIÇÃO",
  ml.data_conclusao                         AS "Data da conclusão",
  ml.atualizacao                            AS "ATUALIZAÇÃO",
  ml.servico_campo                          AS "SERVIÇO CAMPO",
  ml.equipe                                 AS "EQUIPE",
  ml.reatribuido_de_id,
  ml.reatribuido_para_id,
  ml.data_reatribuicao
FROM medidores_list ml
JOIN colaboradores c ON c.matricula = ml.matricula
JOIN tipos_de_medidores t ON t.cod_sap = ml.material_sap
WHERE ml.status <> 'REATRIBUIDO';
