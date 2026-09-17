-- =============================================================================
-- TraceOne — 030_remove_bloqueio_conflito.sql
-- A trava da migration 028 impedia gravar quando o serial já existia em outra
-- linha. Decisão revista: a prioridade agora é zerar os PENDENTE-xxxx: grava
-- sempre, e a duplicidade se resolve depois. A função agora só avisa (retorna
-- se havia duplicata) em vez de bloquear.
-- =============================================================================

CREATE OR REPLACE FUNCTION resolver_recuperacao_pendente(p_medidor_id UUID, p_serial_correto TEXT)
RETURNS BOOLEAN -- true = esse serial já existia em outra linha (gravou mesmo assim)
LANGUAGE plpgsql SECURITY INVOKER
AS $$
DECLARE
  v_serial TEXT := TRIM(p_serial_correto);
  v_duplicado BOOLEAN;
BEGIN
  IF get_user_role() <> 'ADMIN' THEN
    RAISE EXCEPTION 'Apenas ADMIN pode resolver pendências de recuperação.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM medidores_list WHERE serial = v_serial AND id <> p_medidor_id
  ) INTO v_duplicado;

  UPDATE medidores_list SET serial = v_serial WHERE id = p_medidor_id;
  DELETE FROM medidor_recuperacao_pendente WHERE medidor_id = p_medidor_id;

  RETURN v_duplicado;
END;
$$;
