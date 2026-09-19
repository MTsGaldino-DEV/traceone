-- =============================================================================
-- TraceOne — 033_excluir_medidor_duplicado.sql
-- Botão "Excluir linha" da aba Duplicidade, para o caso do mesmo serial em
-- mais de uma linha.
--
-- Um DELETE direto na tabela já era permitido pela policy write_medidores
-- (FOR ALL), mas sem nenhuma trava: dava pra apagar a última linha de um
-- serial — ou seja, perder o medidor — sobretudo com a tela desatualizada,
-- depois que outra pessoa já apagou a irmã.
--
-- A função recusa exatamente esse caso: só exclui se restar outra linha com o
-- mesmo serial. SECURITY INVOKER de propósito, pra RLS de medidores_list
-- continuar valendo (ADMIN, GESTOR, SUPERVISOR, ALMOXARIFADO).
--
-- Atenção: medidor_logs e conferencia_45dias_ocultos têm ON DELETE CASCADE —
-- o histórico daquela linha vai junto e não volta.
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

  SELECT COUNT(*) INTO v_restantes
  FROM   medidores_list
  WHERE  serial = v_serial
    AND  id <> p_id;

  IF v_restantes = 0 THEN
    RAISE EXCEPTION
      'O serial % não está duplicado: essa é a única linha dele. Nada foi excluído.', v_serial;
  END IF;

  DELETE FROM medidores_list WHERE id = p_id;

  RETURN v_restantes;
END;
$$;

REVOKE ALL ON FUNCTION excluir_medidor_duplicado(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION excluir_medidor_duplicado(UUID) TO authenticated;

-- =============================================================================
-- Excluir exige escolher qual linha vai embora, e as linhas de um mesmo serial
-- costumam divergir: em 86 dos 281 grupos a data de conclusão é diferente, e
-- em 228 alguma linha conclui antes de ter sido atribuída. Sem esse campo na
-- tela não dá pra saber qual apagar — então a função passa a devolvê-lo.
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
