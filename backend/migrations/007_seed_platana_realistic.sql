-- ═══════════════════════════════════════════════════════════════
-- Migration 007 — Realistic Platana-aligned seed data
-- Organization: BL (Belgium), invoice format: F0XXXXXXXXX (ASTER)
-- Idempotent: skips if customers already exist.
-- ═══════════════════════════════════════════════════════════════

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM customers LIMIT 1) THEN
    RAISE NOTICE 'Seed data already present, skipping.';
    RETURN;
  END IF;

  -- ── Customers ────────────────────────────────────────────────
  INSERT INTO customers (external_id, name, email, phone, loyalty_tier, organization) VALUES
    ('PLT-C-10042', 'Marie Dupont',   'marie.dupont@example.be',  '+32 475 11 22 33', 'gold',   'BL'),
    ('PLT-C-10187', 'Jean Martin',    'j.martin@example.be',      '+32 478 44 55 66', 'silver', 'BL'),
    ('PLT-C-10391', 'Sophie Lecomte', 's.lecomte@example.be',     '+32 471 88 99 10', 'bronze', 'BL');

  -- ── Invoices (ASTER format: F0XXXXXXXXX) ────────────────────
  INSERT INTO invoices (invoice_number, customer_id, date, store, amount_ht, vat_rate, status, source)
  SELECT 'F022F066481', id, '2025-11-03 10:15:00', 'Bruxelles Centre',   349.17, 21, 'paid',    'ASTER' FROM customers WHERE external_id = 'PLT-C-10042';

  INSERT INTO invoices (invoice_number, customer_id, date, store, amount_ht, vat_rate, status, source)
  SELECT 'F022F071293', id, '2025-12-18 14:30:00', 'Liège',              629.00, 21, 'paid',    'ASTER' FROM customers WHERE external_id = 'PLT-C-10187';

  INSERT INTO invoices (invoice_number, customer_id, date, store, amount_ht, vat_rate, status, source)
  SELECT 'F022F078842', id, '2026-01-30 09:00:00', 'Bruxelles Ixelles',  119.00, 21, 'paid',    'ASTER' FROM customers WHERE external_id = 'PLT-C-10391';

  INSERT INTO invoices (invoice_number, customer_id, date, store, amount_ht, vat_rate, status, source)
  SELECT 'F022F081557', id, '2026-03-05 11:45:00', 'Bruxelles Centre',   899.00, 21, 'pending', 'ASTER' FROM customers WHERE external_id = 'PLT-C-10042';

  -- ── Invoice lines with product_state ─────────────────────────
  -- F022F066481 — Marie Dupont: robot vacuum + warranty
  INSERT INTO invoice_lines (invoice_id, label, sku, brand, category, quantity, unit_price, warranty_months, product_state)
  SELECT id, 'Aspirateur robot X500',  'SKU-RBT-X500', 'Philips', 'Electroménager', 1, 249.17, 24, 'GOOD'
  FROM invoices WHERE invoice_number = 'F022F066481';

  INSERT INTO invoice_lines (invoice_id, label, sku, brand, category, quantity, unit_price, warranty_months, product_state)
  SELECT id, 'Garantie étendue 2 ans', 'SKU-EXT-24M',  'Platana', 'Service',        1, 100.00,  0, NULL
  FROM invoices WHERE invoice_number = 'F022F066481';

  -- F022F071293 — Jean Martin: washing machine (damaged)
  INSERT INTO invoice_lines (invoice_id, label, sku, brand, category, quantity, unit_price, warranty_months, product_state)
  SELECT id, 'Lave-linge 9kg SlimLine', 'SKU-LL-9KG',  'Samsung', 'Gros Appareil',  1, 629.00, 24, 'DAMAGED'
  FROM invoices WHERE invoice_number = 'F022F071293';

  -- F022F078842 — Sophie Lecomte: toaster (broken)
  INSERT INTO invoice_lines (invoice_id, label, sku, brand, category, quantity, unit_price, warranty_months, product_state)
  SELECT id, 'Grille-pain 4 fentes',   'SKU-GT-4F',   'Tefal',   'Petit Appareil', 1, 119.00, 12, 'BROKEN'
  FROM invoices WHERE invoice_number = 'F022F078842';

  -- F022F081557 — Marie Dupont: fridge + installation (new)
  INSERT INTO invoice_lines (invoice_id, label, sku, brand, category, quantity, unit_price, warranty_months, product_state)
  SELECT id, 'Réfrigérateur combiné',  'SKU-RF-COMB', 'LG',      'Gros Appareil',  1, 799.00, 36, 'NEW'
  FROM invoices WHERE invoice_number = 'F022F081557';

  INSERT INTO invoice_lines (invoice_id, label, sku, brand, category, quantity, unit_price, warranty_months, product_state)
  SELECT id, 'Pack installation',      'SKU-INST-GEN','Platana', 'Service',         1, 100.00,  0, NULL
  FROM invoices WHERE invoice_number = 'F022F081557';

END $$;
