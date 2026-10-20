-- =============================================================================
-- TraceOne — 032_rpc_ranking_colaboradores.sql
--
-- Ranking de colaboradores por QUANTIDADE de medidores, com os mesmos filtros
-- da consulta. Criada para o painel de Consulta de Medidores da Central NEC,
-- que lê este banco por uma edge function.
--
-- Por que não reaproveitar get_medidores_metrics: aquela função ordena o
-- ranking por `valor_pendente` e corta em 10. Reordenar esses 10 por
-- quantidade daria um top-10 errado — um colaborador com muitos medidores de
-- valor baixo ficaria de fora do corte antes de ser contado.
--
-- SECURITY INVOKER de propósito, diferente das demais RPCs deste projeto:
-- a função roda com as permissões de quem chama, então não consegue fazer
-- nada que o próprio usuário já não pudesse fazer com um SELECT direto na
-- view. Isso evita criar mais um caminho que ignora RLS. É somente leitura.
-- p_serial e TEXT[] porque a consulta aceita varios seriais separados por
-- virgula; se fosse TEXT unico, o ranking filtraria por '%A,B%' e nao casaria
-- nada enquanto a tabela mostraria os dois.
-- =============================================================================

DROP FUNCTION IF EXISTS get_ranking_colaboradores(
  INT, TEXT[], TEXT[], TEXT[], TEXT[], TEXT, TEXT, DATE, DATE, DATE, DATE, INT);

CREATE OR REPLACE FUNCTION get_ranking_colaboradores(
  p_limite             INT     DEFAULT 10,
  p_matriculas         TEXT[]  DEFAULT NULL,
  p_supervisores       TEXT[]  DEFAULT NULL,
  p_status             TEXT[]  DEFAULT NULL,
  p_material_sap       TEXT[]  DEFAULT NULL,
  p_serial             TEXT[]  DEFAULT NULL,
  p_servico_gdis       TEXT    DEFAULT NULL,
  p_atribuicao_inicio  DATE    DEFAULT NULL,
  p_atribuicao_fim     DATE    DEFAULT NULL,
  p_conclusao_inicio   DATE    DEFAULT NULL,
  p_conclusao_fim      DATE    DEFAULT NULL,
  p_dias_min           INT     DEFAULT NULL
)
RETURNS JSON
LANGUAGE sql
SECURITY INVOKER
STABLE
AS $$
  SELECT COALESCE(json_agg(r ORDER BY r.qtd_total DESC), '[]'::json)
  FROM (
    SELECT
      v."MATRICULA"                                                      AS matricula,
      v."COLABORADOR"                                                    AS nome,
      COUNT(*)::int                                                      AS qtd_total,
      COUNT(*) FILTER (WHERE v."Concluído/Pendente" = 'PENDENTE')::int   AS qtd_pendente,
      COUNT(*) FILTER (WHERE v."Concluído/Pendente" = 'CONCLUIDO')::int  AS qtd_concluido
    FROM vw_medidores_completo v
    WHERE (p_matriculas        IS NULL OR v."MATRICULA" = ANY(p_matriculas))
      AND (p_supervisores      IS NULL OR v."SUPERVISOR" = ANY(p_supervisores))
      AND (p_status            IS NULL OR v."Concluído/Pendente"::text = ANY(p_status))
      AND (p_material_sap      IS NULL OR v."Material SAP" = ANY(p_material_sap))
      AND (p_serial            IS NULL OR v."Serial" ILIKE ANY (
             SELECT '%' || s || '%' FROM unnest(p_serial) AS s))
      AND (p_servico_gdis      IS NULL OR v."SERVIÇO GDIS" ILIKE '%' || p_servico_gdis || '%')
      AND (p_atribuicao_inicio IS NULL OR v."Data" >= p_atribuicao_inicio)
      AND (p_atribuicao_fim    IS NULL OR v."Data" <= p_atribuicao_fim)
      AND (p_conclusao_inicio  IS NULL OR v."Data da conclusão" >= p_conclusao_inicio)
      AND (p_conclusao_fim     IS NULL OR v."Data da conclusão" <= p_conclusao_fim)
      AND (p_dias_min          IS NULL OR v."DIAS DE ATRIBUIÇÃO" > p_dias_min)
    GROUP BY v."MATRICULA", v."COLABORADOR"
    ORDER BY COUNT(*) DESC
    LIMIT GREATEST(1, LEAST(COALESCE(p_limite, 10), 50))
  ) r;
$$;

COMMENT ON FUNCTION get_ranking_colaboradores IS
  'Top N de colaboradores por quantidade de medidores, com os filtros da consulta. Somente leitura, SECURITY INVOKER.';
