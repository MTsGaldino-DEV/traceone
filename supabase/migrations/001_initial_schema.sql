-- =============================================================================
-- TraceOne — 001_initial_schema.sql (Módulo Medidores)
-- =============================================================================

-- Extensão para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- ENUMS
-- =============================================================================
CREATE TYPE role_type AS ENUM ('ADMIN', 'ALMOXARIFE', 'GESTOR');
CREATE TYPE status_medidor AS ENUM ('PENDENTE', 'CONCLUIDO');

-- =============================================================================
-- FUNÇÃO UTILITÁRIA: updated_at automático
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TABELA: profiles
-- Extensão de auth.users para armazenar name, role e is_active
-- =============================================================================
CREATE TABLE profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  role       role_type NOT NULL DEFAULT 'ALMOXARIFE',
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger: cria profile automaticamente ao criar usuário no auth
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::role_type, 'ALMOXARIFE')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================================================
-- TABELA: tipos_de_medidores (catálogo fixo)
-- =============================================================================
CREATE TABLE tipos_de_medidores (
  cod_sap     TEXT PRIMARY KEY,
  tipo        TEXT NOT NULL,
  ligacao     TEXT NOT NULL CHECK (ligacao IN ('direto', 'indireto')),
  valor       NUMERIC(10,2) NOT NULL,
  ativo       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_tipos_medidores_updated_at
  BEFORE UPDATE ON tipos_de_medidores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- TABELA: colaboradores
-- =============================================================================
CREATE TABLE colaboradores (
  matricula   TEXT PRIMARY KEY,
  nome        TEXT NOT NULL,
  supervisor  TEXT,
  gc          TEXT,
  go          TEXT,
  ativo       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- normaliza matrícula sempre para minúsculo, em qualquer insert/update
CREATE OR REPLACE FUNCTION normalize_matricula()
RETURNS TRIGGER AS $$
BEGIN
  NEW.matricula := lower(NEW.matricula);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_normalize_matricula_colaboradores
  BEFORE INSERT OR UPDATE ON colaboradores
  FOR EACH ROW EXECUTE FUNCTION normalize_matricula();

CREATE TRIGGER update_colaboradores_updated_at
  BEFORE UPDATE ON colaboradores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- TABELA: servicos_report
-- =============================================================================
CREATE TABLE servicos_report (
  servico     TEXT PRIMARY KEY,
  matricula   TEXT REFERENCES colaboradores(matricula),
  termino     TIMESTAMPTZ NOT NULL,
  cod_serv    TEXT,
  tipo_serv   TEXT,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_normalize_matricula_servicos
  BEFORE INSERT OR UPDATE ON servicos_report
  FOR EACH ROW EXECUTE FUNCTION normalize_matricula();

-- =============================================================================
-- TABELA: medidores_list (tabela principal)
-- =============================================================================
CREATE TABLE medidores_list (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data            DATE NOT NULL,                     -- data de atribuição
  material_sap    TEXT NOT NULL REFERENCES tipos_de_medidores(cod_sap),
  serial          TEXT NOT NULL,
  matricula       TEXT NOT NULL REFERENCES colaboradores(matricula),
  servico_gdis    TEXT REFERENCES servicos_report(servico),  -- preenchido pelo matching
  status          status_medidor NOT NULL DEFAULT 'PENDENTE',
  data_conclusao  DATE,
  servico_campo   TEXT,
  equipe          TEXT,
  atualizacao     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_normalize_matricula_medidores
  BEFORE INSERT OR UPDATE ON medidores_list
  FOR EACH ROW EXECUTE FUNCTION normalize_matricula();

CREATE OR REPLACE FUNCTION set_atualizacao()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizacao = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_touch_atualizacao
  BEFORE UPDATE ON medidores_list
  FOR EACH ROW EXECUTE PROCEDURE set_atualizacao();

-- =============================================================================
-- VIEW: vw_medidores_completo
-- =============================================================================
CREATE OR REPLACE VIEW vw_medidores_completo AS
SELECT
  ml.id,
  ml.data                                   AS "Data",
  ml.material_sap                           AS "Material SAP",
  ml.serial                                 AS "Serial",
  ml.matricula                              AS "MATRICULA",
  c.nome                                    AS "COLABORADOR",
  c.supervisor                              AS "SUPERVISOR",
  ml.servico_gdis                           AS "SERVIÇO GDIS",
  ml.status                                 AS "Concluído/Pendente",
  t.valor                                   AS "VALOR",
  t.tipo                                    AS "EQUIPAMENTO",
  (COALESCE(ml.data_conclusao, CURRENT_DATE) - ml.data) AS "DIAS DE ATRIBUIÇÃO",
  ml.data_conclusao                         AS "Data da conclusão",
  ml.atualizacao                            AS "ATUALIZAÇÃO",
  ml.servico_campo                          AS "SERVIÇO CAMPO",
  ml.equipe                                 AS "EQUIPE"
FROM medidores_list ml
JOIN colaboradores c ON c.matricula = ml.matricula
JOIN tipos_de_medidores t ON t.cod_sap = ml.material_sap;
