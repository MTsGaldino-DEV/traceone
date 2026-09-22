-- =============================================================================
-- TraceOne — 038_importar_servicos_forcado.sql
--
-- A importação do relatório GDIS trava quando alguma matrícula da planilha não
-- existe em colaboradores (servicos_report.matricula é FK). Essa RPC permite
-- forçar a importação: quem não está cadastrado entra sem matrícula, em vez de
-- derrubar o lote inteiro.
--
-- Só SUPERVISOR, GESTOR e ADMIN podem forçar — ALMOXARIFADO importa normal,
-- mas não passa por cima da trava. Como a policy write_servicos libera escrita
-- para ALMOXARIFADO também, esconder o botão na tela não bastaria: a checagem
-- precisa ser aqui dentro.
-- =============================================================================

CREATE OR REPLACE FUNCTION importar_servicos_forcado(p_itens JSONB)
RETURNS INT AS $$
DECLARE
  v_count INT;
BEGIN
  -- SECURITY DEFINER ignora RLS, então a permissão é checada aqui.
  IF get_user_role() NOT IN ('ADMIN', 'GESTOR', 'SUPERVISOR') THEN
    RAISE EXCEPTION 'Apenas supervisor, gestor ou admin podem forçar a importação.';
  END IF;

  IF p_itens IS NULL OR jsonb_array_length(p_itens) = 0 THEN
    RETURN 0;
  END IF;

  WITH itens AS (
    SELECT
      it->>'servico'                        AS servico,
      lower(NULLIF(trim(it->>'matricula'), '')) AS matricula,
      (it->>'termino')::TIMESTAMPTZ         AS termino,
      NULLIF(it->>'cod_serv', '')           AS cod_serv,
      NULLIF(it->>'tipo_serv', '')          AS tipo_serv
    FROM jsonb_array_elements(p_itens) AS it
  ), dedup AS (
    -- a planilha pode repetir o mesmo serviço; ON CONFLICT não aceita a mesma
    -- chave duas vezes no mesmo comando
    SELECT DISTINCT ON (servico) *
    FROM   itens
    WHERE  servico IS NOT NULL
    ORDER  BY servico, termino DESC
  ), gravados AS (
    INSERT INTO servicos_report (servico, matricula, termino, cod_serv, tipo_serv)
    SELECT d.servico,
           c.matricula,  -- NULL quando não está cadastrado: é isso que destrava
           d.termino,
           d.cod_serv,
           d.tipo_serv
    FROM   dedup d
    LEFT   JOIN colaboradores c ON c.matricula = d.matricula
    ON CONFLICT (servico) DO UPDATE
      SET matricula = EXCLUDED.matricula,
          termino   = EXCLUDED.termino,
          cod_serv  = EXCLUDED.cod_serv,
          tipo_serv = EXCLUDED.tipo_serv
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_count FROM gravados;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION importar_servicos_forcado(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION importar_servicos_forcado(JSONB) TO authenticated;
