-- =============================================================================
-- TraceOne — 027_medidor_recuperacao_pendente.sql
-- Rastreia medidores reconstruídos após o incidente de perda de dados de
-- 2026-09-16 cujo serial não pôde ser confirmado com certeza (SEM_SERIAL) ou
-- teve mais de um candidato nas fontes cruzadas (AMBIGUO). Só ADMIN acessa —
-- aba de revisão pra ir corrigindo aos poucos.
-- =============================================================================

CREATE TABLE IF NOT EXISTS medidor_recuperacao_pendente (
  medidor_id        UUID PRIMARY KEY REFERENCES medidores_list(id) ON DELETE CASCADE,
  tipo              TEXT NOT NULL CHECK (tipo IN ('SEM_SERIAL', 'AMBIGUO')),
  candidatos_serial JSONB NULL,
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE medidor_recuperacao_pendente ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_recuperacao_pendente" ON medidor_recuperacao_pendente;
CREATE POLICY "admin_all_recuperacao_pendente" ON medidor_recuperacao_pendente
  FOR ALL TO authenticated
  USING (get_user_role() = 'ADMIN')
  WITH CHECK (get_user_role() = 'ADMIN');

-- =============================================================================
-- Lista pra revisão, já com os dados do medidor.
-- =============================================================================
CREATE OR REPLACE FUNCTION get_recuperacao_pendente()
RETURNS JSONB
LANGUAGE SQL STABLE SECURITY INVOKER
AS $$
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'medidorId',        r.medidor_id,
      'tipo',             r.tipo,
      'candidatosSerial', r.candidatos_serial,
      'serialAtual',      ml.serial,
      'matricula',        ml.matricula,
      'colaborador',      c.nome,
      'materialSap',      ml.material_sap,
      'tipoEquipamento',  t.tipo,
      'servicoGdis',      ml.servico_gdis,
      'status',           ml.status,
      'data',             ml.data,
      'criadoEm',         r.criado_em
    )
    ORDER BY r.criado_em, ml.servico_gdis
  ), '[]'::jsonb)
  FROM   medidor_recuperacao_pendente r
  JOIN   medidores_list ml ON ml.id = r.medidor_id
  JOIN   colaboradores c   ON c.matricula = ml.matricula
  JOIN   tipos_de_medidores t ON t.cod_sap = ml.material_sap;
$$;

-- =============================================================================
-- Resolve uma pendência: grava o serial correto e tira da lista de revisão.
-- Restrito a ADMIN mesmo que a RLS de medidores_list permita escrita mais ampla.
-- =============================================================================
CREATE OR REPLACE FUNCTION resolver_recuperacao_pendente(p_medidor_id UUID, p_serial_correto TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY INVOKER
AS $$
BEGIN
  IF get_user_role() <> 'ADMIN' THEN
    RAISE EXCEPTION 'Apenas ADMIN pode resolver pendências de recuperação.';
  END IF;

  UPDATE medidores_list SET serial = TRIM(p_serial_correto) WHERE id = p_medidor_id;
  DELETE FROM medidor_recuperacao_pendente WHERE medidor_id = p_medidor_id;
END;
$$;

REVOKE ALL ON FUNCTION get_recuperacao_pendente() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION resolver_recuperacao_pendente(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_recuperacao_pendente() TO authenticated;
GRANT EXECUTE ON FUNCTION resolver_recuperacao_pendente(UUID, TEXT) TO authenticated;
