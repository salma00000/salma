-- ═══════════════════════════════════════════════════════════════════
-- Migration : Ajout de la table sav_tickets
-- Base      : gestion_devis
-- Commande  : psql -U postgres -d gestion_devis -f migration_sav.sql
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- Table : sav_tickets
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sav_tickets (
    id                  SERIAL          PRIMARY KEY,
    ticket_id           VARCHAR(30)     NOT NULL UNIQUE,          -- SAV-YYYYMMDD-XXXX
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

-- Trigger updated_at (réutilise la fonction déjà créée dans schema.sql)
DROP TRIGGER IF EXISTS trg_sav_updated_at ON sav_tickets;
CREATE TRIGGER trg_sav_updated_at
    BEFORE UPDATE ON sav_tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Vérification
SELECT 'Table sav_tickets créée avec succès.' AS migration_status;
