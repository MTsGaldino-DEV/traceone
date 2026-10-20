-- =============================================================================
-- TraceOne — 041_recuperacao_candidatos_livres.sql
-- Na aba "Recuperação de Dados", candidatosSerial passa a trazer só os serials
-- que ainda não estão gravados em nenhum medidor — os já usados em correções
-- anteriores causariam duplicidade. Sem candidato livre, vem NULL e a tela
-- mostra o campo de digitação manual.
-- =============================================================================

CREATE OR REPLACE FUNCTION get_recuperacao_pendente()
RETURNS JSONB
LANGUAGE SQL STABLE SECURITY INVOKER
AS $$
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'medidorId',        r.medidor_id,
      'tipo',             r.tipo,
      'candidatosSerial', (
        SELECT jsonb_agg(cand.s ORDER BY cand.ord)
        FROM   jsonb_array_elements_text(r.candidatos_serial) WITH ORDINALITY AS cand(s, ord)
        WHERE  NOT EXISTS (SELECT 1 FROM medidores_list m WHERE m.serial = cand.s)
      ),
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
