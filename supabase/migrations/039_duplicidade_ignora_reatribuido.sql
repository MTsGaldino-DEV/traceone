-- =============================================================================
-- TraceOne — 039_duplicidade_ignora_reatribuido.sql
--
-- Causa raiz: reatribuir um medidor mantém a linha antiga como REATRIBUIDO e
-- cria uma nova apontando pra ela. A vw_medidores_completo esconde as
-- REATRIBUIDO (por isso somem da Lista de Medidores), mas
-- get_duplicidade_medidores lê medidores_list direto — então toda
-- reatribuição virava um falso "medidor duplicado", com duas linhas do mesmo
-- serial que na verdade são a mesma atribuição antes e depois da troca.
--
-- Além do falso positivo, excluir qualquer uma das duas estourava o FK
-- reatribuido_de_id/reatribuido_para_id com o erro cru do Postgres na tela.
--
-- Aqui: a duplicidade passa a usar a mesma regra da view, e a exclusão passa a
-- contar só as linhas visíveis — a REATRIBUIDO não conta como "linha que
-- sobrou", senão dava pra apagar a última linha visível e o medidor sumia.
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
           ml.data_conclusao,
           (COALESCE(ml.data_conclusao, CURRENT_DATE) - ml.data) AS dias,
           c.nome AS colaborador
    FROM   medidores_list ml
    JOIN   colaboradores      c ON c.matricula = ml.matricula
    JOIN   tipos_de_medidores t ON t.cod_sap   = ml.material_sap
    WHERE  t.tipo ILIKE 'MEDID%'
      AND  ml.status <> 'REATRIBUIDO'  -- mesma regra da vw_medidores_completo
  ),
  grupos_servico AS (
    SELECT servico_gdis AS chave
    FROM   medidores_reais
    WHERE  servico_gdis IS NOT NULL
    GROUP  BY servico_gdis
    HAVING COUNT(DISTINCT serial) > 1
  ),
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
      'tipo',           l.tipo,
      'chave',          l.chave,
      'servicoGdis',    l.servico_gdis,
      'id',             l.id,
      'serial',         l.serial,
      'matricula',      l.matricula,
      'colaborador',    l.colaborador,
      'status',         l.status,
      'data',           l.data,
      'dataConclusao',  l.data_conclusao,
      'dias',           l.dias
    )
    ORDER BY l.tipo, l.chave, l.data
  ), '[]'::jsonb)
  FROM   linhas l
  WHERE  NOT EXISTS (
           SELECT 1 FROM duplicidade_revisados r
           WHERE  r.tipo = l.tipo AND r.chave = l.chave
         );
$$;

REVOKE ALL ON FUNCTION get_duplicidade_medidores() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_duplicidade_medidores() TO authenticated;

-- =============================================================================
-- Exclusão: conta só linha visível e desfaz o vínculo de reatribuição antes do
-- DELETE, senão o FK reatribuido_de_id/reatribuido_para_id derruba a operação.
-- =============================================================================
CREATE OR REPLACE FUNCTION excluir_medidor_duplicado(p_id UUID)
RETURNS INT -- quantas linhas sobraram com esse serial
LANGUAGE plpgsql SECURITY INVOKER
AS $$
DECLARE
  v_serial    TEXT;
  v_restantes INT;
BEGIN
  SELECT serial INTO v_serial
  FROM   medidores_list
  WHERE  id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Medidor não encontrado — a lista pode estar desatualizada.';
  END IF;

  -- REATRIBUIDO não conta: ela não aparece na Lista de Medidores, então deixar
  -- só ela de pé é o mesmo que perder o medidor.
  SELECT COUNT(*) INTO v_restantes
  FROM   medidores_list
  WHERE  serial = v_serial
    AND  id <> p_id
    AND  status <> 'REATRIBUIDO';

  IF v_restantes = 0 THEN
    RAISE EXCEPTION
      'O serial % não está duplicado: essa é a única linha dele. Nada foi excluído.', v_serial;
  END IF;

  -- Solta as pontas da cadeia de reatribuição que apontam pra linha que vai sair.
  UPDATE medidores_list SET reatribuido_para_id = NULL WHERE reatribuido_para_id = p_id;
  UPDATE medidores_list SET reatribuido_de_id   = NULL WHERE reatribuido_de_id   = p_id;

  DELETE FROM medidores_list WHERE id = p_id;

  RETURN v_restantes;
END;
$$;

REVOKE ALL ON FUNCTION excluir_medidor_duplicado(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION excluir_medidor_duplicado(UUID) TO authenticated;

-- =============================================================================
-- Esses 3 grupos foram marcados como revisados só para tirar o falso positivo
-- da tela. Como agora eles nem são mais detectados, a marcação virou lixo — e
-- pior: ela é permanente por (tipo, chave), então esconderia uma duplicidade
-- de verdade que aparecesse nesses seriais no futuro. Escopo fechado nas 3
-- chaves; para remarcar, basta clicar em "Marcar como revisado" de novo.
-- =============================================================================
DELETE FROM duplicidade_revisados
WHERE  tipo = 'SERIAL'
  AND  chave IN ('ARW255600111', 'ARW255600112', 'ARW255600117');
