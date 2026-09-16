-- =============================================================================
-- TraceOne — 025_duplicidade_medidores.sql
-- Aba "Duplicidade": mesmo número de serviço (GDIS) vinculado a mais de um
-- medidor. Só considera medidores de verdade (tipo ILIKE 'MEDID%') — TC e
-- chave de aferição podem legitimamente compartilhar serviço com o medidor.
-- =============================================================================

CREATE TABLE IF NOT EXISTS duplicidade_revisados (
  servico_gdis         TEXT PRIMARY KEY,
  seriais_conflitantes JSONB NOT NULL,
  revisado_por         UUID REFERENCES profiles(id) ON DELETE SET NULL DEFAULT auth.uid(),
  revisado_em          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE duplicidade_revisados ENABLE ROW LEVEL SECURITY;

-- Leitura para todos os autenticados: o log é informação coletiva.
DROP POLICY IF EXISTS "read_all_duplicidade_revisados" ON duplicidade_revisados;
CREATE POLICY "read_all_duplicidade_revisados" ON duplicidade_revisados
  FOR SELECT TO authenticated USING (true);

-- Escrita para quem já escreve nas tabelas operacionais.
DROP POLICY IF EXISTS "write_duplicidade_revisados" ON duplicidade_revisados;
CREATE POLICY "write_duplicidade_revisados" ON duplicidade_revisados
  FOR ALL TO authenticated
  USING (get_user_role() IN ('ADMIN', 'GESTOR', 'SUPERVISOR', 'ALMOXARIFADO'))
  WITH CHECK (get_user_role() IN ('ADMIN', 'GESTOR', 'SUPERVISOR', 'ALMOXARIFADO'));

-- =============================================================================
-- Grupos ativos: serviços com mais de um serial de medidor vinculado.
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
    WHERE  ml.servico_gdis IS NOT NULL
      AND  t.tipo ILIKE 'MEDID%'
  ),
  duplicados AS (
    SELECT servico_gdis
    FROM   medidores_reais
    GROUP  BY servico_gdis
    HAVING COUNT(DISTINCT serial) > 1
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'servicoGdis', m.servico_gdis,
      'id',          m.id,
      'serial',      m.serial,
      'matricula',   m.matricula,
      'colaborador', m.colaborador,
      'status',      m.status,
      'data',        m.data,
      'dias',        m.dias
    )
    ORDER BY m.servico_gdis, m.data
  ), '[]'::jsonb)
  FROM   medidores_reais m
  JOIN   duplicados d ON d.servico_gdis = m.servico_gdis
  WHERE  NOT EXISTS (
           SELECT 1 FROM duplicidade_revisados r WHERE r.servico_gdis = m.servico_gdis
         );
$$;

-- =============================================================================
-- Marca um serviço como revisado: tira da lista ativa e guarda uma foto dos
-- seriais em conflito no momento da revisão (log sobrevive a "Desvincular").
-- =============================================================================
CREATE OR REPLACE FUNCTION marcar_duplicidade_revisado(p_servico_gdis TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY INVOKER
AS $$
DECLARE
  v_seriais JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(DISTINCT ml.serial), '[]'::jsonb)
  INTO   v_seriais
  FROM   medidores_list ml
  JOIN   tipos_de_medidores t ON t.cod_sap = ml.material_sap
  WHERE  ml.servico_gdis = p_servico_gdis
    AND  t.tipo ILIKE 'MEDID%';

  INSERT INTO duplicidade_revisados (servico_gdis, seriais_conflitantes)
  VALUES (p_servico_gdis, v_seriais)
  ON CONFLICT (servico_gdis) DO UPDATE
    SET seriais_conflitantes = EXCLUDED.seriais_conflitantes,
        revisado_por         = auth.uid(),
        revisado_em          = NOW();
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
      'servicoGdis',         r.servico_gdis,
      'seriaisConflitantes', r.seriais_conflitantes,
      'revisadoPor',         COALESCE(p.name, 'Usuário removido'),
      'revisadoEm',          r.revisado_em
    )
    ORDER BY r.revisado_em DESC
  ), '[]'::jsonb)
  FROM   duplicidade_revisados r
  LEFT   JOIN profiles p ON p.id = r.revisado_por;
$$;

REVOKE ALL ON FUNCTION get_duplicidade_medidores() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION marcar_duplicidade_revisado(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION get_duplicidade_revisados() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_duplicidade_medidores() TO authenticated;
GRANT EXECUTE ON FUNCTION marcar_duplicidade_revisado(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_duplicidade_revisados() TO authenticated;
