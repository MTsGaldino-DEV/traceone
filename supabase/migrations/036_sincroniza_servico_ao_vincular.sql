-- =============================================================================
-- TraceOne — 036_sincroniza_servico_ao_vincular.sql
--
-- Causa raiz: vincular um serviço manualmente (modal "Vincular Serviço",
-- edição de medidor, conferência 45 dias) grava servico_gdis em
-- medidores_list, mas nunca atualizava servicos_report de volta. Quando o
-- serviço já existia como AGUARDANDO_VINCULACAO (import não achou o medidor
-- porque ele ainda estava com outro serviço vinculado, por exemplo), a linha
-- ficava presa nessa seção da Conferência para sempre, mesmo com o medidor já
-- concluído com esse serviço.
--
-- garantir_servico_report (034) só tratava o caso de o serviço não existir
-- (ON CONFLICT DO NOTHING). Agora, se o serviço já existe, ele também é
-- marcado como CONFERIDO — mesmo comportamento que _tentar_vincular_serial já
-- usa no caminho automático.
-- =============================================================================

CREATE OR REPLACE FUNCTION garantir_servico_report(
  p_servico TEXT,
  p_serial  TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  IF get_user_role() NOT IN ('ADMIN', 'GESTOR', 'SUPERVISOR', 'ALMOXARIFADO') THEN
    RAISE EXCEPTION 'Sem permissão para vincular serviço.';
  END IF;

  INSERT INTO servicos_report (
    servico, termino, status_conferencia, medidor_serial_vinculado, conferido_em
  )
  VALUES (
    p_servico, NOW(), 'CONFERIDO', p_serial, NOW()
  )
  ON CONFLICT (servico) DO UPDATE
    SET status_conferencia       = 'CONFERIDO',
        medidor_serial_vinculado = COALESCE(p_serial, servicos_report.medidor_serial_vinculado),
        conferido_em             = NOW(),
        serial_buscado           = NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Corrige as linhas que já ficaram presas por esse motivo.
UPDATE servicos_report s
SET    status_conferencia       = 'CONFERIDO',
       medidor_serial_vinculado = m.serial,
       conferido_em             = NOW(),
       serial_buscado           = NULL
FROM   medidores_list m
WHERE  m.servico_gdis = s.servico
  AND  m.status = 'CONCLUIDO'
  AND  s.status_conferencia = 'AGUARDANDO_VINCULACAO';
