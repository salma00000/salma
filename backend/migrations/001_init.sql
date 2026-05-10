-- ═══════════════════════════════════════════════════════════════
-- Migration 001 — Full schema (all tables, indexes, triggers)
-- ═══════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────────────────
-- Shared trigger function: auto-update updated_at column
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- ─────────────────────────────────────────────────────────────────
-- advisors — store staff who authenticate via the SAV app
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS advisors (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT          UNIQUE NOT NULL,
    password_hash TEXT          NOT NULL,
    full_name     TEXT          NOT NULL,
    created_at    TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────
-- factures — customer invoices
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS factures (
    id               SERIAL        PRIMARY KEY,
    numero_facture   VARCHAR(30)   NOT NULL UNIQUE,
    client_nom       VARCHAR(150)  NOT NULL,
    client_email     VARCHAR(200),
    client_phone     VARCHAR(30),
    client_loyalty_tier VARCHAR(20) CHECK (client_loyalty_tier IN ('bronze', 'silver', 'gold')),
    customer_id      VARCHAR(30),
    date_creation    TIMESTAMP     NOT NULL DEFAULT NOW(),
    date_echeance    DATE,
    montant_ht       NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    taux_tva         NUMERIC(5,2)  NOT NULL DEFAULT 20.00,
    montant_tva      NUMERIC(12,2) GENERATED ALWAYS AS (ROUND(montant_ht * taux_tva / 100, 2)) STORED,
    montant_total    NUMERIC(12,2) GENERATED ALWAYS AS (ROUND(montant_ht * (1 + taux_tva / 100), 2)) STORED,
    statut           VARCHAR(30)   NOT NULL DEFAULT 'En attente'
                         CHECK (statut IN ('En attente', 'Envoyée', 'Payée', 'Annulée', 'En retard')),
    store            VARCHAR(150),
    notes            TEXT,
    created_at       TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_factures_numero ON factures (numero_facture);
CREATE INDEX IF NOT EXISTS idx_factures_statut ON factures (statut);

DROP TRIGGER IF EXISTS trg_factures_updated_at ON factures;
CREATE TRIGGER trg_factures_updated_at
    BEFORE UPDATE ON factures
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────────────────────────────
-- articles — line items belonging to a facture
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS articles (
    id               SERIAL        PRIMARY KEY,
    facture_id       INTEGER       NOT NULL REFERENCES factures(id) ON DELETE CASCADE,
    nom_article      VARCHAR(200)  NOT NULL,
    description      TEXT,
    quantite         NUMERIC(10,3) NOT NULL DEFAULT 1,
    prix_unitaire    NUMERIC(12,2) NOT NULL,
    sous_total       NUMERIC(14,2) GENERATED ALWAYS AS (ROUND(quantite * prix_unitaire, 2)) STORED,
    product_sku      VARCHAR(100),
    product_brand    VARCHAR(100),
    product_category VARCHAR(100),
    warranty_months  INTEGER,
    created_at       TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_articles_facture_id ON articles (facture_id);

-- Trigger: recalculate facture.montant_ht whenever articles change
CREATE OR REPLACE FUNCTION recalculate_facture_total()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    UPDATE factures
    SET montant_ht = (
        SELECT COALESCE(SUM(quantite * prix_unitaire), 0)
        FROM articles
        WHERE facture_id = COALESCE(NEW.facture_id, OLD.facture_id)
    )
    WHERE id = COALESCE(NEW.facture_id, OLD.facture_id);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_articles_update_total ON articles;
CREATE TRIGGER trg_articles_update_total
    AFTER INSERT OR UPDATE OR DELETE ON articles
    FOR EACH ROW EXECUTE FUNCTION recalculate_facture_total();

-- ─────────────────────────────────────────────────────────────────
-- sav_tickets — SAV dossiers created by the AI agent
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sav_tickets (
    id                SERIAL       PRIMARY KEY,
    ticket_id         VARCHAR(30)  NOT NULL UNIQUE,
    facture_id        INTEGER      REFERENCES factures(id) ON DELETE SET NULL,
    numero_facture    VARCHAR(30),
    client_nom        VARCHAR(150),
    client_email      VARCHAR(200),
    order_date        TIMESTAMP,
    issue_description TEXT         NOT NULL,
    status            VARCHAR(20)  NOT NULL DEFAULT 'open'
                          CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority          VARCHAR(10)  NOT NULL DEFAULT 'medium'
                          CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    ai_summary        TEXT,
    created_at        TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sav_ticket_id  ON sav_tickets (ticket_id);
CREATE INDEX IF NOT EXISTS idx_sav_facture_id ON sav_tickets (facture_id);
CREATE INDEX IF NOT EXISTS idx_sav_status     ON sav_tickets (status);
CREATE INDEX IF NOT EXISTS idx_sav_priority   ON sav_tickets (priority);

DROP TRIGGER IF EXISTS trg_sav_updated_at ON sav_tickets;
CREATE TRIGGER trg_sav_updated_at
    BEFORE UPDATE ON sav_tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────────────────────────────
-- sav_sessions — n8n chat sessions (created by backend, updated by n8n)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sav_sessions (
    session_id TEXT      PRIMARY KEY,
    draft      JSONB,
    turn       INTEGER   DEFAULT 0,
    advisor_id UUID      REFERENCES advisors(id),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sav_sessions_advisor ON sav_sessions (advisor_id);

-- ─────────────────────────────────────────────────────────────────
-- sav_messages — chat history displayed in the UI
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sav_messages (
    id         UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT      NOT NULL REFERENCES sav_sessions(session_id) ON DELETE CASCADE,
    role       TEXT      NOT NULL CHECK (role IN ('user', 'assistant')),
    content    TEXT      NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sav_messages_session ON sav_messages (session_id);
