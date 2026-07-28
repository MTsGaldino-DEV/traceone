-- =============================================================================
-- TraceOne — 001_initial_schema.sql
-- Colar no SQL Editor do Supabase e executar
-- =============================================================================

-- Extensão para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- ENUMS
-- =============================================================================
CREATE TYPE role_type AS ENUM ('ADMIN', 'ALMOXARIFE', 'GESTOR');
CREATE TYPE item_type AS ENUM ('CONSUMABLE', 'ASSET');
CREATE TYPE item_status AS ENUM ('ACTIVE', 'INACTIVE', 'DISCONTINUED');
CREATE TYPE employee_status AS ENUM ('ACTIVE', 'INACTIVE', 'ON_LEAVE');
CREATE TYPE movement_type AS ENUM ('DELIVERY', 'RETURN', 'LOSS', 'REPLACEMENT', 'WRITEOFF');
CREATE TYPE audit_action AS ENUM ('LOGIN', 'CREATE', 'UPDATE', 'DELETE', 'DELIVERY', 'RETURN', 'LOSS', 'WRITEOFF');

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
-- TABELA: employees
-- =============================================================================
CREATE TABLE employees (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL,
  registration TEXT NOT NULL UNIQUE,
  job_title    TEXT NOT NULL,
  sector       TEXT NOT NULL,
  unit         TEXT NOT NULL,
  status       employee_status NOT NULL DEFAULT 'ACTIVE',
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- TABELA: categories
-- =============================================================================
CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- TABELA: items
-- =============================================================================
CREATE TABLE items (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT NOT NULL,
  description       TEXT,
  type              item_type NOT NULL,
  category_id       UUID NOT NULL REFERENCES categories(id),
  -- Consumable fields
  quantity          INTEGER NOT NULL DEFAULT 0,
  min_stock         INTEGER NOT NULL DEFAULT 0,
  lot_number        TEXT,
  expires_at        TIMESTAMPTZ,
  unit              TEXT NOT NULL DEFAULT 'un',
  -- Asset fields
  patrimony_code    TEXT UNIQUE,
  serial_number     TEXT,
  current_holder_id UUID REFERENCES employees(id),
  -- Common
  status            item_status NOT NULL DEFAULT 'ACTIVE',
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_items_updated_at
  BEFORE UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- TABELA: stock_movements
-- =============================================================================
CREATE TABLE stock_movements (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type                  movement_type NOT NULL,
  item_id               UUID NOT NULL REFERENCES items(id),
  employee_id           UUID REFERENCES employees(id),
  user_id               UUID NOT NULL REFERENCES profiles(id),
  quantity              INTEGER NOT NULL DEFAULT 1,
  notes                 TEXT,
  -- Snapshot fields (preserved even if item/employee changes)
  item_name             TEXT NOT NULL,
  employee_name         TEXT,
  employee_registration TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- TABELA: audits
-- =============================================================================
CREATE TABLE audits (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES profiles(id),
  action     audit_action NOT NULL,
  entity     TEXT NOT NULL,
  entity_id  UUID,
  details    JSONB,
  ip         TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- ÍNDICES para performance
-- =============================================================================
CREATE INDEX idx_stock_movements_item_id     ON stock_movements(item_id);
CREATE INDEX idx_stock_movements_employee_id ON stock_movements(employee_id);
CREATE INDEX idx_stock_movements_user_id     ON stock_movements(user_id);
CREATE INDEX idx_stock_movements_created_at  ON stock_movements(created_at DESC);
CREATE INDEX idx_audits_user_id              ON audits(user_id);
CREATE INDEX idx_audits_created_at           ON audits(created_at DESC);
CREATE INDEX idx_items_category_id           ON items(category_id);
CREATE INDEX idx_items_type                  ON items(type);
CREATE INDEX idx_items_is_active             ON items(is_active);
