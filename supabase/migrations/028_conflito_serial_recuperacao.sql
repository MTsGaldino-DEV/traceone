-- =============================================================================
-- TraceOne — 028_conflito_serial_recuperacao.sql
-- Bug real (serviço 238052628): resolver_recuperacao_pendente gravava o serial
-- sem checar se ele já existia em outro medidor, gerando duplicidade. Agora
-- bloqueia a gravação nesse caso, com uma mensagem identificável pelo frontend.
-- =============================================================================

CREATE OR REPLACE FUNCTION resolver_recuperacao_pendente(p_medidor_id UUID, p_serial_correto TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY INVOKER
AS $$
DECLARE
  v_serial TEXT := TRIM(p_serial_correto);
BEGIN
  IF get_user_role() <> 'ADMIN' THEN
    RAISE EXCEPTION 'Apenas ADMIN pode resolver pendências de recuperação.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM medidores_list
    WHERE serial = v_serial AND id <> p_medidor_id
  ) THEN
    RAISE EXCEPTION 'CONFLITO_SERIAL: já existe outro medidor cadastrado com o serial %.', v_serial;
  END IF;

  UPDATE medidores_list SET serial = v_serial WHERE id = p_medidor_id;
  DELETE FROM medidor_recuperacao_pendente WHERE medidor_id = p_medidor_id;
END;
$$;
