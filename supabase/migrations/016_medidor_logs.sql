-- =============================================================================
-- TraceOne — 015_medidor_logs.sql
-- Tabela de log de atividades por medidor
-- =============================================================================

CREATE TABLE IF NOT EXISTS medidor_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medidor_id  UUID NOT NULL REFERENCES medidores_list(id) ON DELETE CASCADE,
  evento      TEXT NOT NULL,  -- 'CADASTRADO' | 'CONCLUIDO' | 'SERVICO_VINCULADO' | 'REATRIBUIDO' | 'EDITADO' | 'REABERTO'
  descricao   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medidor_logs_medidor_id ON medidor_logs(medidor_id);
CREATE INDEX IF NOT EXISTS idx_medidor_logs_created_at  ON medidor_logs(created_at DESC);

ALTER TABLE medidor_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can read logs" ON medidor_logs;
CREATE POLICY "Authenticated can read logs" ON medidor_logs
  FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Authenticated can insert logs" ON medidor_logs;
CREATE POLICY "Authenticated can insert logs" ON medidor_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- =============================================================================
-- Trigger: captura eventos relevantes em medidores_list
-- =============================================================================
CREATE OR REPLACE FUNCTION fn_log_medidor_evento()
RETURNS TRIGGER AS $$
BEGIN
  -- INSERT → CADASTRADO
  IF TG_OP = 'INSERT' THEN
    INSERT INTO medidor_logs (medidor_id, evento, descricao)
    VALUES (
      NEW.id,
      'CADASTRADO',
      'Medidor cadastrado para matrícula ' || NEW.matricula ||
      ' com material ' || NEW.material_sap
    );
    RETURN NEW;
  END IF;

  -- UPDATE
  IF TG_OP = 'UPDATE' THEN
    -- Status PENDENTE → CONCLUIDO
    IF OLD.status = 'PENDENTE' AND NEW.status = 'CONCLUIDO' THEN
      INSERT INTO medidor_logs (medidor_id, evento, descricao)
      VALUES (
        NEW.id,
        'CONCLUIDO',
        'Marcado como concluído' ||
        CASE WHEN NEW.servico_gdis IS NOT NULL
          THEN ' com serviço GDIS ' || NEW.servico_gdis
          ELSE ''
        END ||
        CASE WHEN NEW.data_conclusao IS NOT NULL
          THEN ' em ' || NEW.data_conclusao::TEXT
          ELSE ''
        END
      );

    -- Status CONCLUIDO → PENDENTE (reabertura)
    ELSIF OLD.status = 'CONCLUIDO' AND NEW.status = 'PENDENTE' THEN
      INSERT INTO medidor_logs (medidor_id, evento, descricao)
      VALUES (NEW.id, 'REABERTO', 'Status revertido para PENDENTE');

    -- Serviço GDIS alterado (sem mudança de status)
    ELSIF COALESCE(OLD.servico_gdis, '') <> COALESCE(NEW.servico_gdis, '')
      AND OLD.status = NEW.status THEN
      IF NEW.servico_gdis IS NULL OR NEW.servico_gdis = '' THEN
        INSERT INTO medidor_logs (medidor_id, evento, descricao)
        VALUES (NEW.id, 'SERVICO_REMOVIDO', 'Número de serviço GDIS removido');
      ELSE
        INSERT INTO medidor_logs (medidor_id, evento, descricao)
        VALUES (
          NEW.id,
          'SERVICO_VINCULADO',
          'Serviço GDIS vinculado: ' || NEW.servico_gdis
        );
      END IF;

    -- Mudança de colaborador (reatribuição manual)
    ELSIF OLD.matricula <> NEW.matricula THEN
      INSERT INTO medidor_logs (medidor_id, evento, descricao)
      VALUES (
        NEW.id,
        'REATRIBUIDO',
        'Colaborador alterado de ' || OLD.matricula || ' para ' || NEW.matricula
      );

    -- Material alterado
    ELSIF OLD.material_sap <> NEW.material_sap THEN
      INSERT INTO medidor_logs (medidor_id, evento, descricao)
      VALUES (
        NEW.id,
        'EDITADO',
        'Material alterado de ' || OLD.material_sap || ' para ' || NEW.material_sap
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_log_medidor_evento
  AFTER INSERT OR UPDATE ON medidores_list
  FOR EACH ROW EXECUTE FUNCTION fn_log_medidor_evento();

-- Backfill: gerar log CADASTRADO para registros existentes
INSERT INTO medidor_logs (medidor_id, evento, descricao, created_at)
SELECT
  id,
  'CADASTRADO',
  'Medidor cadastrado para matrícula ' || matricula || ' com material ' || material_sap,
  COALESCE(created_at, NOW())
FROM medidores_list
ON CONFLICT DO NOTHING;

-- Backfill: gerar log CONCLUIDO para já concluídos
INSERT INTO medidor_logs (medidor_id, evento, descricao, created_at)
SELECT
  id,
  'CONCLUIDO',
  'Marcado como concluído' ||
  CASE WHEN servico_gdis IS NOT NULL THEN ' com serviço GDIS ' || servico_gdis ELSE '' END ||
  CASE WHEN data_conclusao IS NOT NULL THEN ' em ' || data_conclusao::TEXT ELSE '' END,
  COALESCE(data_conclusao::TIMESTAMPTZ, atualizacao, NOW())
FROM medidores_list
WHERE status = 'CONCLUIDO'
ON CONFLICT DO NOTHING;
