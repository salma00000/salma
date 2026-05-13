-- =============================================================
-- 001_schema.sql — Full Platana schema (DDL only, no seed data)
-- Idempotent: IF NOT EXISTS / CREATE OR REPLACE throughout.
-- Table order respects FK dependencies.
-- =============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -------------------------------------------------------------
-- Shared trigger function: auto-update updated_at
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- -------------------------------------------------------------
-- advisors — SAV staff, JWT auth
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS advisors (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT         UNIQUE NOT NULL,
    password_hash TEXT         NOT NULL,
    full_name     TEXT         NOT NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------
-- customers — first-class customer entity (Platana domain)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id   VARCHAR(30)  UNIQUE,
    name          VARCHAR(150) NOT NULL,
    email         VARCHAR(200),
    phone         VARCHAR(30),
    loyalty_tier  VARCHAR(20)  CHECK (loyalty_tier IN ('bronze', 'silver', 'gold')),
    organization  VARCHAR(50),
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_customers_updated_at ON customers;
CREATE TRIGGER trg_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- -------------------------------------------------------------
-- invoices — ASTER-sourced customer invoices
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoices (
    id             SERIAL        PRIMARY KEY,
    invoice_number VARCHAR(30)   UNIQUE NOT NULL,
    customer_id    UUID          REFERENCES customers(id) ON DELETE SET NULL,
    date           TIMESTAMP     NOT NULL DEFAULT NOW(),
    store          VARCHAR(150),
    amount_ht      NUMERIC(12,2) NOT NULL DEFAULT 0,
    vat_rate       NUMERIC(5,2)  NOT NULL DEFAULT 21,
    amount_ttc     NUMERIC(12,2) GENERATED ALWAYS AS (ROUND(amount_ht * (1 + vat_rate / 100), 2)) STORED,
    status         VARCHAR(30)   NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'sent', 'paid', 'cancelled', 'overdue')),
    source         VARCHAR(50)   DEFAULT 'local',
    created_at     TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices (invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices (status);

DROP TRIGGER IF EXISTS trg_invoices_updated_at ON invoices;
CREATE TRIGGER trg_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- -------------------------------------------------------------
-- invoice_lines — line items for an invoice
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoice_lines (
    id              SERIAL         PRIMARY KEY,
    invoice_id      INTEGER        NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    label           VARCHAR(200)   NOT NULL,
    description     TEXT,
    quantity        NUMERIC(10,3)  NOT NULL DEFAULT 1,
    unit_price      NUMERIC(12,2)  NOT NULL,
    subtotal        NUMERIC(14,2)  GENERATED ALWAYS AS (ROUND(quantity * unit_price, 2)) STORED,
    sku             VARCHAR(100),
    brand           VARCHAR(100),
    supplier        VARCHAR(150),
    image_url       VARCHAR(500),
    category        VARCHAR(100),
    warranty_months INTEGER,
    product_state   VARCHAR(50),
    created_at      TIMESTAMP      NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice_id ON invoice_lines (invoice_id);

-- -------------------------------------------------------------
-- config_values — Platana-style configurable enums
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS config_values (
    config_code   VARCHAR(100) NOT NULL,
    value_code    VARCHAR(100) NOT NULL,
    label_fr      VARCHAR(200),
    label_en      VARCHAR(200),
    display_order INTEGER      DEFAULT 0,
    active        BOOLEAN      NOT NULL DEFAULT TRUE,
    PRIMARY KEY (config_code, value_code)
);

-- Rename sort_order → display_order if the table was created by an older migration.
-- Add active column if it was missing. Both are no-ops on a fresh schema.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'config_values' AND column_name = 'sort_order'
    ) THEN
        ALTER TABLE config_values RENAME COLUMN sort_order TO display_order;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'config_values' AND column_name = 'display_order'
    ) THEN
        ALTER TABLE config_values ADD COLUMN display_order INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'config_values' AND column_name = 'active'
    ) THEN
        ALTER TABLE config_values ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE;
    END IF;
END $$;

-- -------------------------------------------------------------
-- sav_sessions — n8n chat sessions (created by backend, updated by n8n)
-- updated_at is set explicitly by callers, no trigger needed.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sav_sessions (
    session_id  TEXT      PRIMARY KEY,
    draft       JSONB,
    turn        INTEGER   DEFAULT 0,
    advisor_id  UUID      REFERENCES advisors(id),
    updated_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sav_sessions_advisor ON sav_sessions (advisor_id);

-- -------------------------------------------------------------
-- sav_messages — chat history per session
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sav_messages (
    id          UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  TEXT      NOT NULL REFERENCES sav_sessions(session_id) ON DELETE CASCADE,
    role        TEXT      NOT NULL CHECK (role IN ('user', 'assistant')),
    content     TEXT      NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sav_messages_session ON sav_messages (session_id);

-- -------------------------------------------------------------
-- sav_folders — SAV dossiers (Platana "dossier SAV" model)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sav_folders (
    id                SERIAL      PRIMARY KEY,
    folder_reference  VARCHAR(30) UNIQUE NOT NULL,
    customer_id       UUID        REFERENCES customers(id) ON DELETE SET NULL,
    invoice_id        INTEGER     REFERENCES invoices(id) ON DELETE SET NULL,
    invoice_number    VARCHAR(30),
    product_id        INTEGER     REFERENCES invoice_lines(id) ON DELETE SET NULL,
    issue_type        VARCHAR(100),
    product_state     VARCHAR(50),
    advisor_id        UUID        REFERENCES advisors(id) ON DELETE SET NULL,
    issue_description TEXT        NOT NULL,
    status            VARCHAR(20) NOT NULL DEFAULT 'open'
                          CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority          VARCHAR(10) NOT NULL DEFAULT 'medium'
                          CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    ai_summary        TEXT,
    created_at        TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sav_folders_reference ON sav_folders (folder_reference);
CREATE INDEX IF NOT EXISTS idx_sav_folders_status    ON sav_folders (status);
CREATE INDEX IF NOT EXISTS idx_sav_folders_advisor   ON sav_folders (advisor_id);

DROP TRIGGER IF EXISTS trg_sav_folders_updated_at ON sav_folders;
CREATE TRIGGER trg_sav_folders_updated_at
    BEFORE UPDATE ON sav_folders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
