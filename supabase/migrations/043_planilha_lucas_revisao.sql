-- =============================================================================
-- TraceOne — 043_planilha_lucas_revisao.sql
-- Revisão dos "não aplicados" da Planilha Lucas: o usuário pode escolher, por
-- linha, trocar também a matrícula quando a atribuição 05/08/2026 está com
-- outra matrícula no TraceOne.
--
-- Substitui importar_planilha_lucas (042). Muda só o item DATA, que passa a
-- aceitar dois campos opcionais:
--   [{ acao: 'DATA', medidor_id, data, matricula?, matricula_atual? }, ...]
-- Com matricula, a troca só acontece se a linha ainda estiver com
-- matricula_atual — o mesmo valor que a prévia mostrou. Se alguém mudou a
-- matrícula no TraceOne nesse meio-tempo, a linha fica como está.
-- (Medidor novo com material escolhido na revisão já é um NOVO comum.)
-- =============================================================================

CREATE OR REPLACE FUNCTION importar_planilha_lucas(p_itens JSONB)
RETURNS JSONB AS $$
DECLARE
  v_role               TEXT;
  v_medidores_criados  INT := 0;
  v_datas_corrigidas   INT := 0;
  v_servicos_criados   INT := 0;
  v_servicos_conferidos INT := 0;
BEGIN
  -- SECURITY DEFINER ignora RLS, então a permissão é checada aqui.
  -- COALESCE garante que perfil ausente/anon caia no ramo de erro.
  v_role := COALESCE(get_user_role()::TEXT, '');
  IF v_role NOT IN ('ADMIN', 'GESTOR', 'SUPERVISOR', 'ALMOXARIFADO') THEN
    RAISE EXCEPTION 'Sem permissão para importar a Planilha Lucas.';
  END IF;

  IF p_itens IS NULL OR jsonb_typeof(p_itens) <> 'array' OR jsonb_array_length(p_itens) = 0 THEN
    RETURN jsonb_build_object(
      'medidores_criados', 0, 'datas_corrigidas', 0,
      'servicos_criados', 0, 'servicos_conferidos', 0
    );
  END IF;

  -- evita o NOTICE do DROP IF EXISTS a cada lote
  SET LOCAL client_min_messages = warning;

  DROP TABLE IF EXISTS _lucas_novos;
  CREATE TEMP TABLE _lucas_novos ON COMMIT DROP AS
  SELECT DISTINCT ON (UPPER(TRIM(it->>'serial')))
    UPPER(TRIM(it->>'serial'))              AS serial,
    (it->>'data')::DATE                     AS data,
    it->>'material_sap'                     AS material_sap,
    LOWER(TRIM(it->>'matricula'))           AS matricula,
    (it->>'status')::status_medidor         AS status,
    NULLIF(it->>'data_conclusao', '')::DATE AS data_conclusao,
    NULLIF(it->>'servico_gdis', '')         AS servico_gdis,
    NULLIF(it->>'servico_campo', '')        AS servico_campo,
    NULLIF(it->>'equipe', '')               AS equipe
  FROM jsonb_array_elements(p_itens) AS it
  WHERE it->>'acao' = 'NOVO'
  ORDER BY UPPER(TRIM(it->>'serial'));

  -- Recheca contra o banco atual: serial já cadastrado em qualquer linha fica de fora.
  DELETE FROM _lucas_novos n
  WHERE EXISTS (SELECT 1 FROM medidores_list m WHERE UPPER(TRIM(m.serial)) = n.serial);

  -- Serviço sem data de conclusão não tem "termino" para criar em
  -- servicos_report; o medidor entra sem vínculo de serviço.
  UPDATE _lucas_novos n
  SET    servico_gdis = NULL
  WHERE  n.servico_gdis IS NOT NULL
    AND  n.data_conclusao IS NULL
    AND  NOT EXISTS (SELECT 1 FROM servicos_report s WHERE s.servico = n.servico_gdis);

  -- 1) Serviços ainda não cadastrados: cria já como conferido (mesmo padrão da Planilha PC).
  WITH novos AS (
    INSERT INTO servicos_report (
      servico, matricula, termino,
      status_conferencia, medidor_serial_vinculado, conferido_em
    )
    SELECT DISTINCT ON (n.servico_gdis)
      n.servico_gdis, n.matricula, n.data_conclusao::TIMESTAMPTZ,
      'CONFERIDO', n.serial, NOW()
    FROM   _lucas_novos n
    WHERE  n.servico_gdis IS NOT NULL
      AND  NOT EXISTS (SELECT 1 FROM servicos_report s WHERE s.servico = n.servico_gdis)
    ORDER  BY n.servico_gdis, n.data_conclusao
    ON CONFLICT (servico) DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_servicos_criados FROM novos;

  -- 2) Medidores novos.
  WITH inseridos AS (
    INSERT INTO medidores_list (
      data, material_sap, serial, matricula, servico_gdis,
      status, data_conclusao, servico_campo, equipe
    )
    SELECT n.data, n.material_sap, n.serial, n.matricula, n.servico_gdis,
           n.status, n.data_conclusao, n.servico_campo, n.equipe
    FROM   _lucas_novos n
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_medidores_criados FROM inseridos;

  -- 3) Serviços que já existiam e ainda não estavam conferidos: o TraceOne
  --    prevalece, então um serviço já conferido com outro serial não é tocado.
  WITH alvo AS (
    SELECT DISTINCT ON (n.servico_gdis) n.servico_gdis AS servico, n.serial
    FROM   _lucas_novos n
    WHERE  n.servico_gdis IS NOT NULL
    ORDER  BY n.servico_gdis, n.data_conclusao
  ), conferidos AS (
    UPDATE servicos_report s
    SET    status_conferencia       = 'CONFERIDO',
           medidor_serial_vinculado = a.serial,
           conferido_em             = NOW(),
           serial_buscado           = NULL
    FROM   alvo a
    WHERE  s.servico = a.servico
      AND  s.status_conferencia <> 'CONFERIDO'
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_servicos_conferidos FROM conferidos;

  -- 4) Datas de atribuição genéricas: só troca o que ainda está em 2026-08-05.
  --    Com matrícula escolhida na revisão, troca junto, se a atual não mudou.
  WITH datas AS (
    SELECT (it->>'medidor_id')::UUID               AS medidor_id,
           (it->>'data')::DATE                     AS data,
           LOWER(NULLIF(it->>'matricula', ''))       AS matricula,
           LOWER(NULLIF(it->>'matricula_atual', '')) AS matricula_atual
    FROM   jsonb_array_elements(p_itens) AS it
    WHERE  it->>'acao' = 'DATA'
  ), corrigidas AS (
    UPDATE medidores_list m
    SET    data      = d.data,
           matricula = COALESCE(d.matricula, m.matricula)
    FROM   datas d
    WHERE  m.id = d.medidor_id
      AND  m.data = DATE '2026-08-05'
      AND  d.data <> DATE '2026-08-05'
      AND  (d.matricula IS NULL OR LOWER(m.matricula) = d.matricula_atual)
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_datas_corrigidas FROM corrigidas;

  RETURN jsonb_build_object(
    'medidores_criados',   v_medidores_criados,
    'datas_corrigidas',    v_datas_corrigidas,
    'servicos_criados',    v_servicos_criados,
    'servicos_conferidos', v_servicos_conferidos
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- anon recebe EXECUTE por default privileges do Supabase; tira explicitamente.
REVOKE ALL ON FUNCTION importar_planilha_lucas(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION importar_planilha_lucas(JSONB) TO authenticated;
