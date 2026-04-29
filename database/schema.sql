-- ═══════════════════════════════════════════════════════════════════
-- Schéma de base de données — Gestion des Factures
-- Base   : gestion_devis
-- SGBD   : PostgreSQL 15+
-- ═══════════════════════════════════════════════════════════════════

-- Extension pour les UUIDs (optionnel)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────────────────
-- Table : factures
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS factures (
    id               SERIAL        PRIMARY KEY,
    numero_facture   VARCHAR(30)   NOT NULL UNIQUE,
    client_nom       VARCHAR(150)  NOT NULL,
    client_email     VARCHAR(200),
    date_creation    TIMESTAMP     NOT NULL DEFAULT NOW(),
    date_echeance    DATE,
    montant_ht       NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    taux_tva         NUMERIC(5,2)  NOT NULL DEFAULT 20.00,
    montant_tva      NUMERIC(12,2) GENERATED ALWAYS AS (ROUND(montant_ht * taux_tva / 100, 2)) STORED,
    montant_total    NUMERIC(12,2) GENERATED ALWAYS AS (ROUND(montant_ht * (1 + taux_tva / 100), 2)) STORED,
    statut           VARCHAR(30)   NOT NULL DEFAULT 'En attente'
                         CHECK (statut IN ('En attente', 'Envoyée', 'Payée', 'Annulée', 'En retard')),
    notes            TEXT,
    created_at       TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- Index sur le numéro de facture (recherches fréquentes)
CREATE INDEX IF NOT EXISTS idx_factures_numero ON factures (numero_facture);

-- Index sur le statut (filtres fréquents)
CREATE INDEX IF NOT EXISTS idx_factures_statut ON factures (statut);

-- ─────────────────────────────────────────────────────────────────
-- Table : articles
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS articles (
    id               SERIAL        PRIMARY KEY,
    facture_id       INTEGER       NOT NULL REFERENCES factures(id) ON DELETE CASCADE,
    nom_article      VARCHAR(200)  NOT NULL,
    description      TEXT,
    quantite         NUMERIC(10,3) NOT NULL DEFAULT 1,
    prix_unitaire    NUMERIC(12,2) NOT NULL,
    sous_total       NUMERIC(14,2) GENERATED ALWAYS AS (ROUND(quantite * prix_unitaire, 2)) STORED,
    created_at       TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- Index sur facture_id (jointures très fréquentes)
CREATE INDEX IF NOT EXISTS idx_articles_facture_id ON articles (facture_id);

-- ─────────────────────────────────────────────────────────────────
-- Trigger : mise à jour automatique de updated_at sur factures
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_factures_updated_at ON factures;
CREATE TRIGGER trg_factures_updated_at
    BEFORE UPDATE ON factures
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────────────────────────────
-- Trigger : recalcul automatique de montant_ht après insert/update article
-- (met à jour la facture parente)
-- ─────────────────────────────────────────────────────────────────
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
-- Table : sav_tickets
-- Stocke les dossiers SAV générés par l'agent IA
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sav_tickets (
    id                  SERIAL          PRIMARY KEY,
    ticket_id           VARCHAR(30)     NOT NULL UNIQUE,
    facture_id          INTEGER         REFERENCES factures(id) ON DELETE SET NULL,
    numero_facture      VARCHAR(30),
    client_nom          VARCHAR(150),
    client_email        VARCHAR(200),
    order_date          TIMESTAMP,
    issue_description   TEXT            NOT NULL,
    status              VARCHAR(20)     NOT NULL DEFAULT 'open'
                            CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority            VARCHAR(10)     NOT NULL DEFAULT 'medium'
                            CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    ai_summary          TEXT,
    created_at          TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sav_ticket_id   ON sav_tickets (ticket_id);
CREATE INDEX IF NOT EXISTS idx_sav_facture_id  ON sav_tickets (facture_id);
CREATE INDEX IF NOT EXISTS idx_sav_status      ON sav_tickets (status);
CREATE INDEX IF NOT EXISTS idx_sav_priority    ON sav_tickets (priority);

DROP TRIGGER IF EXISTS trg_sav_updated_at ON sav_tickets;
CREATE TRIGGER trg_sav_updated_at
    BEFORE UPDATE ON sav_tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
