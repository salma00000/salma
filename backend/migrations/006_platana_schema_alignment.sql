-- ═══════════════════════════════════════════════════════════════
-- Migration 006 — Platana schema alignment
-- Renames tables & columns to match Platana domain terminology:
--   factures   → invoices       (+ customer FK extracted)
--   articles   → invoice_lines  (+ product_state field)
--   sav_tickets → sav_folders   (+ product_id FK, advisor_id)
-- Adds: customers, config_values tables
-- Idempotent: all blocks guarded by IF (NOT) EXISTS checks.
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- 1. customers — first-class entity extracted from factures
-- ─────────────────────────────────────────────────────────────────
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

-- Backfill customers from factures (distinct by customer_id)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'factures')
     AND NOT EXISTS (SELECT 1 FROM customers LIMIT 1) THEN
    INSERT INTO customers (external_id, name, email, phone, loyalty_tier)
    SELECT DISTINCT ON (COALESCE(customer_id, client_email))
      customer_id,
      client_nom,
      client_email,
      client_phone,
      client_loyalty_tier
    FROM factures
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────
-- 2. invoices — replaces factures, references customers
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id             SERIAL        PRIMARY KEY,
  invoice_number VARCHAR(30)   UNIQUE NOT NULL,
  customer_id    UUID          REFERENCES customers(id) ON DELETE SET NULL,
  date           TIMESTAMP     NOT NULL DEFAULT NOW(),
  store          VARCHAR(150),
  amount_ht      NUMERIC(12,2) NOT NULL DEFAULT 0,
  vat_rate       NUMERIC(5,2)  NOT NULL DEFAULT 21,
  amount_ttc     NUMERIC(12,2) GENERATED ALWAYS AS (ROUND(amount_ht * (1 + vat_rate / 100), 2)) STORED,
  status         VARCHAR(30)   DEFAULT 'pending'
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

-- Copy factures → invoices
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'factures')
     AND NOT EXISTS (SELECT 1 FROM invoices LIMIT 1) THEN
    INSERT INTO invoices (id, invoice_number, customer_id, date, store, amount_ht, vat_rate, status, source)
    SELECT
      f.id,
      f.numero_facture,
      c.id,
      f.date_creation,
      f.store,
      f.montant_ht,
      COALESCE(f.taux_tva, 21),
      CASE f.statut
        WHEN 'Payée'     THEN 'paid'
        WHEN 'Envoyée'   THEN 'sent'
        WHEN 'Annulée'   THEN 'cancelled'
        WHEN 'En retard' THEN 'overdue'
        ELSE 'pending'
      END,
      'local'
    FROM factures f
    LEFT JOIN customers c ON c.external_id = f.customer_id;
    PERFORM setval('invoices_id_seq', (SELECT COALESCE(MAX(id), 1) FROM invoices));
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────
-- 3. invoice_lines — replaces articles, adds product_state
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoice_lines (
  id              SERIAL        PRIMARY KEY,
  invoice_id      INTEGER       NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  label           VARCHAR(200)  NOT NULL,
  description     TEXT,
  quantity        NUMERIC(10,3) NOT NULL DEFAULT 1,
  unit_price      NUMERIC(12,2) NOT NULL,
  subtotal        NUMERIC(14,2) GENERATED ALWAYS AS (ROUND(quantity * unit_price, 2)) STORED,
  sku             VARCHAR(100),
  brand           VARCHAR(100),
  category        VARCHAR(100),
  warranty_months INTEGER,
  product_state   VARCHAR(50),
  created_at      TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice_id ON invoice_lines (invoice_id);

-- Copy articles → invoice_lines
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'articles')
     AND NOT EXISTS (SELECT 1 FROM invoice_lines LIMIT 1) THEN
    INSERT INTO invoice_lines (id, invoice_id, label, description, quantity, unit_price, sku, brand, category, warranty_months)
    SELECT
      a.id,
      a.facture_id,
      a.nom_article,
      a.description,
      a.quantite,
      a.prix_unitaire,
      a.product_sku,
      a.product_brand,
      a.product_category,
      a.warranty_months
    FROM articles a
    WHERE EXISTS (SELECT 1 FROM invoices WHERE id = a.facture_id);
    PERFORM setval('invoice_lines_id_seq', (SELECT COALESCE(MAX(id), 1) FROM invoice_lines));
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────
-- 4. config_values — Platana-style configurable enums
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS config_values (
  config_code  VARCHAR(100) NOT NULL,
  value_code   VARCHAR(100) NOT NULL,
  label_fr     VARCHAR(200),
  label_en     VARCHAR(200),
  sort_order   INTEGER      DEFAULT 0,
  PRIMARY KEY (config_code, value_code)
);

INSERT INTO config_values (config_code, value_code, label_fr, label_en, sort_order) VALUES
  ('PRODUCT_STATE', 'NEW',     'Neuf',         'New',     1),
  ('PRODUCT_STATE', 'GOOD',    'Bon état',     'Good',    2),
  ('PRODUCT_STATE', 'DAMAGED', 'Endommagé',    'Damaged', 3),
  ('PRODUCT_STATE', 'BROKEN',  'Hors service', 'Broken',  4)
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────
-- 5. sav_folders — replaces sav_tickets (Platana "dossier" model)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sav_folders (
  id                SERIAL      PRIMARY KEY,
  folder_reference  VARCHAR(30) UNIQUE NOT NULL,
  customer_id       UUID        REFERENCES customers(id) ON DELETE SET NULL,
  invoice_id        INTEGER     REFERENCES invoices(id) ON DELETE SET NULL,
  invoice_number    VARCHAR(30),
  product_id        INTEGER     REFERENCES invoice_lines(id) ON DELETE SET NULL,
  issue_type        VARCHAR(100),
  issue_description TEXT        NOT NULL,
  product_state     VARCHAR(50),
  status            VARCHAR(20) DEFAULT 'open'
                        CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority          VARCHAR(10) DEFAULT 'medium'
                        CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  advisor_id        UUID        REFERENCES advisors(id) ON DELETE SET NULL,
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

-- Copy sav_tickets → sav_folders
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sav_tickets')
     AND NOT EXISTS (SELECT 1 FROM sav_folders LIMIT 1) THEN
    INSERT INTO sav_folders (id, folder_reference, customer_id, invoice_id, invoice_number,
                             issue_description, status, priority, ai_summary, created_at, updated_at)
    SELECT
      t.id,
      t.ticket_id,
      c.id,
      t.facture_id,
      t.numero_facture,
      t.issue_description,
      t.status,
      t.priority,
      t.ai_summary,
      t.created_at,
      t.updated_at
    FROM sav_tickets t
    LEFT JOIN customers c ON c.name = t.client_nom;
    PERFORM setval('sav_folders_id_seq', (SELECT COALESCE(MAX(id), 1) FROM sav_folders));
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────
-- 6. Drop old tables (cascade handles FK children automatically)
-- ─────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sav_tickets') THEN
    DROP TABLE sav_tickets CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'articles') THEN
    DROP TABLE articles CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'factures') THEN
    DROP TABLE factures CASCADE;
  END IF;
END $$;
