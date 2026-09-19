-- =============================================================================
-- TraceOne — 032_duplicidade_por_serial.sql
-- A aba Duplicidade só enxergava um dos dois problemas: serviço do GDIS com
-- mais de um serial vinculado. Hoje isso dá zero — mas existem 300 casos do
-- outro tipo, invisíveis: o mesmo serial em mais de uma linha, seja duplicata
-- literal (mesmo serviço repetido) ou o mesmo medidor físico vinculado a dois
-- serviços diferentes.
--
-- Agora a detecção tem dois critérios, e cada grupo carrega qual deles disparou:
--   SERVICO — um serviço com mais de um serial distinto (regra antiga)
--   SERIAL  — um serial em mais de uma linha (novo)
--
-- TC e chave de aferição seguem de fora (tipos_de_medidores.tipo ILIKE 'MEDID%'):
-- eles podem legitimamente dividir serviço com o medidor.
--
-- duplicidade_revisados era chaveada por servico_gdis, o que não comporta um
-- grupo do tipo SERIAL (cujas linhas têm serviços diferentes). A chave passa a
-- ser (tipo, chave). A tabela está vazia, então não há dado a preservar.
-- =============================================================================

ALTER TABLE duplicidade_revisados
  ADD COLUMN IF NOT EXISTS tipo  TEXT,
  ADD COLUMN IF NOT EXISTS chave TEXT;

-- Backfill defensivo: se houvesse linha antiga, ela era sempre por serviço.
UPDATE duplicidade_revisados
SET    tipo = 'SERVICO', chave = servico_gdis
WHERE  chave IS NULL;

ALTER TABLE duplicidade_revisados
  ALTER COLUMN tipo  SET NOT NULL,
  ALTER COLUMN chave SET NOT NULL;

-- A PK antiga (servico_gdis) foi criada inline em 026, sem nome explícito.
-- Descobre o nome no catálogo em vez de adivinhar.
DO $$
DECLARE
  v_name TEXT;
BEGIN
  SELECT con.conname INTO v_name
  FROM   pg_constraint con
  JOIN   pg_class rel ON rel.oid = con.conrelid
  WHERE  rel.relname = 'duplicidade_revisados'
    AND  con.contype = 'p';
  IF v_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE duplicidade_revisados DROP CONSTRAINT %I', v_name);
  END IF;
END $$;

ALTER TABLE duplicidade_revisados
  DROP COLUMN IF EXISTS servico_gdis;

-- Daqui pra baixo os passos não são idempotentes por natureza (RENAME, ADD
-- CONSTRAINT), então cada um checa antes — rodar a migration duas vezes por
-- engano não deve explodir no meio.
DO $$
BEGIN
  -- "seriais" era o nome certo quando só existia grupo por serviço. Num grupo
  -- SERIAL o snapshot guarda os serviços em conflito, então o nome generaliza.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'duplicidade_revisados' AND column_name = 'seriais_conflitantes'
  ) THEN
    ALTER TABLE duplicidade_revisados RENAME COLUMN seriais_conflitantes TO itens_conflitantes;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'duplicidade_revisados_pkey'
  ) THEN
    ALTER TABLE duplicidade_revisados ADD CONSTRAINT duplicidade_revisados_pkey PRIMARY KEY (tipo, chave);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'duplicidade_revisados_tipo_check'
  ) THEN
    ALTER TABLE duplicidade_revisados ADD CONSTRAINT duplicidade_revisados_tipo_check
      CHECK (tipo IN ('SERVICO', 'SERIAL'));
  END IF;
END $$;

-- =============================================================================
-- Grupos ativos: os dois critérios, cada linha marcada com o que a trouxe.
-- Uma linha que caia nos dois aparece nos dois grupos — são problemas
-- diferentes e se resolvem de formas diferentes.
-- =============================================================================
CREATE OR REPLACE FUNCTION get_duplicidade_medidores()
RETURNS JSONB
LANGUAGE SQL STABLE SECURITY INVOKER
AS $$
  WITH medidores_reais AS (
    SELECT ml.id,
           ml.servico_gdis,
           ml.serial,
           ml.matricula,
           ml.status,
           ml.data,
           (COALESCE(ml.data_conclusao, CURRENT_DATE) - ml.data) AS dias,
           c.nome AS colaborador
    FROM   medidores_list ml
    JOIN   colaboradores      c ON c.matricula = ml.matricula
    JOIN   tipos_de_medidores t ON t.cod_sap   = ml.material_sap
    WHERE  t.tipo ILIKE 'MEDID%'
  ),
  -- Um serviço puxou mais de um medidor diferente.
  grupos_servico AS (
    SELECT servico_gdis AS chave
    FROM   medidores_reais
    WHERE  servico_gdis IS NOT NULL
    GROUP  BY servico_gdis
    HAVING COUNT(DISTINCT serial) > 1
  ),
  -- O mesmo medidor aparece em mais de uma linha.
  grupos_serial AS (
    SELECT serial AS chave
    FROM   medidores_reais
    GROUP  BY serial
    HAVING COUNT(*) > 1
  ),
  linhas AS (
    SELECT 'SERVICO'::TEXT AS tipo, g.chave, m.*
    FROM   medidores_reais m
    JOIN   grupos_servico  g ON g.chave = m.servico_gdis
    UNION ALL
    SELECT 'SERIAL'::TEXT AS tipo, g.chave, m.*
    FROM   medidores_reais m
    JOIN   grupos_serial   g ON g.chave = m.serial
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'tipo',        l.tipo,
      'chave',       l.chave,
      'servicoGdis', l.servico_gdis,
      'id',          l.id,
      'serial',      l.serial,
      'matricula',   l.matricula,
      'colaborador', l.colaborador,
      'status',      l.status,
      'data',        l.data,
      'dias',        l.dias
    )
    ORDER BY l.tipo, l.chave, l.data
  ), '[]'::jsonb)
  FROM   linhas l
  WHERE  NOT EXISTS (
           SELECT 1 FROM duplicidade_revisados r
           WHERE  r.tipo = l.tipo AND r.chave = l.chave
         );
$$;

-- =============================================================================
-- Marca um grupo como revisado. O snapshot depende do tipo: num grupo SERVICO
-- o que conflita são os seriais; num grupo SERIAL, os serviços.
-- =============================================================================
DROP FUNCTION IF EXISTS marcar_duplicidade_revisado(TEXT);

CREATE FUNCTION marcar_duplicidade_revisado(p_tipo TEXT, p_chave TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY INVOKER
AS $$
DECLARE
  v_itens JSONB;
BEGIN
  IF p_tipo = 'SERVICO' THEN
    SELECT COALESCE(jsonb_agg(DISTINCT ml.serial), '[]'::jsonb)
    INTO   v_itens
    FROM   medidores_list ml
    JOIN   tipos_de_medidores t ON t.cod_sap = ml.material_sap
    WHERE  ml.servico_gdis = p_chave
      AND  t.tipo ILIKE 'MEDID%';

  ELSIF p_tipo = 'SERIAL' THEN
    SELECT COALESCE(jsonb_agg(DISTINCT COALESCE(ml.servico_gdis, '(sem serviço)')), '[]'::jsonb)
    INTO   v_itens
    FROM   medidores_list ml
    JOIN   tipos_de_medidores t ON t.cod_sap = ml.material_sap
    WHERE  ml.serial = p_chave
      AND  t.tipo ILIKE 'MEDID%';

  ELSE
    RAISE EXCEPTION 'Tipo de duplicidade inválido: %', p_tipo;
  END IF;

  INSERT INTO duplicidade_revisados (tipo, chave, itens_conflitantes)
  VALUES (p_tipo, p_chave, v_itens)
  ON CONFLICT (tipo, chave) DO UPDATE
    SET itens_conflitantes = EXCLUDED.itens_conflitantes,
        revisado_por       = auth.uid(),
        revisado_em        = NOW();
END;
$$;

-- =============================================================================
-- Log de revisados, com quem revisou.
-- =============================================================================
CREATE OR REPLACE FUNCTION get_duplicidade_revisados()
RETURNS JSONB
LANGUAGE SQL STABLE SECURITY INVOKER
AS $$
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'tipo',              r.tipo,
      'chave',             r.chave,
      'itensConflitantes', r.itens_conflitantes,
      'revisadoPor',       COALESCE(p.name, 'Usuário removido'),
      'revisadoEm',        r.revisado_em
    )
    ORDER BY r.revisado_em DESC
  ), '[]'::jsonb)
  FROM   duplicidade_revisados r
  LEFT   JOIN profiles p ON p.id = r.revisado_por;
$$;

REVOKE ALL ON FUNCTION get_duplicidade_medidores() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION marcar_duplicidade_revisado(TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION get_duplicidade_revisados() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_duplicidade_medidores() TO authenticated;
GRANT EXECUTE ON FUNCTION marcar_duplicidade_revisado(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_duplicidade_revisados() TO authenticated;
