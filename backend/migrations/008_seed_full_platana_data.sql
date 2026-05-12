-- ═══════════════════════════════════════════════════════════════
-- Migration 008 — Full Platana-aligned seed expansion
--
-- What this does:
--  1. Adds image_url + supplier columns to invoice_lines
--  2. Fixes migration-007 seeds: replaces placeholder SKUs with
--     EAN-13 product codes + fills supplier + image_url
--  3. Inserts 7 new customers (BL org, Belgian names/phones)
--  4. Inserts 8 more invoices in F022F0XXXXX ASTER format
--  5. Inserts 20+ invoice lines for the new invoices
--
-- Product code convention (same structure throughout):
--   • Physical goods : EAN-13 barcode (13-digit string)
--   • Platana services: PLT-SVC-<TYPE>-<SEQ> (e.g. PLT-SVC-INST-01)
--
-- Invoice number convention: F022F0XXXXXX  (ASTER / BL site)
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- 1. Add image_url and supplier columns to invoice_lines
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE invoice_lines
  ADD COLUMN IF NOT EXISTS image_url  VARCHAR(500),
  ADD COLUMN IF NOT EXISTS supplier   VARCHAR(150);

-- ─────────────────────────────────────────────────────────────────
-- 2. Backfill migration-007 invoice lines with proper codes
--    (update by invoice_number + label to be idempotent)
-- ─────────────────────────────────────────────────────────────────

-- F022F066481 — Philips robot vacuum
UPDATE invoice_lines
SET sku       = '8710103858836',
    label     = 'Aspirateur robot Philips HomeRun 7000',
    image_url = 'https://media.platana.fr/products/8710103858836.jpg',
    supplier  = 'Philips Belgium'
WHERE invoice_id = (SELECT id FROM invoices WHERE invoice_number = 'F022F066481')
  AND label ILIKE '%aspirateur robot%';

-- F022F066481 — Extended warranty service
UPDATE invoice_lines
SET sku       = 'PLT-SVC-EXT-24',
    label     = 'Extension de garantie +24 mois',
    image_url = NULL,
    supplier  = 'Platana'
WHERE invoice_id = (SELECT id FROM invoices WHERE invoice_number = 'F022F066481')
  AND label ILIKE '%garantie%';

-- F022F071293 — Samsung washing machine
UPDATE invoice_lines
SET sku       = '8806090808777',
    label     = 'Lave-linge Samsung WW90T4040EE 9kg',
    image_url = 'https://media.platana.fr/products/8806090808777.jpg',
    supplier  = 'Samsung Electronics Belgium'
WHERE invoice_id = (SELECT id FROM invoices WHERE invoice_number = 'F022F071293')
  AND label ILIKE '%lave-linge%';

-- F022F078842 — Tefal toaster
UPDATE invoice_lines
SET sku       = '3168430008862',
    label     = 'Grille-pain Tefal Maxi 4 fentes TT7703',
    image_url = 'https://media.platana.fr/products/3168430008862.jpg',
    supplier  = 'SEB Belgium'
WHERE invoice_id = (SELECT id FROM invoices WHERE invoice_number = 'F022F078842')
  AND label ILIKE '%grille%';

-- F022F081557 — LG fridge
UPDATE invoice_lines
SET sku       = '8806091685814',
    label     = 'Réfrigérateur combiné LG GBP62PZNAB 384L',
    image_url = 'https://media.platana.fr/products/8806091685814.jpg',
    supplier  = 'LG Electronics Belgium'
WHERE invoice_id = (SELECT id FROM invoices WHERE invoice_number = 'F022F081557')
  AND label ILIKE '%réfrigérateur%';

-- F022F081557 — Installation service
UPDATE invoice_lines
SET sku       = 'PLT-SVC-INST-01',
    label     = 'Kit livraison et installation',
    image_url = NULL,
    supplier  = 'Platana'
WHERE invoice_id = (SELECT id FROM invoices WHERE invoice_number = 'F022F081557')
  AND label ILIKE '%installation%';

-- ─────────────────────────────────────────────────────────────────
-- 3. New customers — all BL organisation, Belgian contacts
-- ─────────────────────────────────────────────────────────────────
INSERT INTO customers (external_id, name, email, phone, loyalty_tier, organization) VALUES
  ('PLT-C-10584', 'Thomas Dubois',    't.dubois@example.be',      '+32 81 22 33 44',  'silver', 'BL'),
  ('PLT-C-10623', 'Isabelle Laurent', 'i.laurent@example.be',     '+32 4 366 77 88',  'gold',   'BL'),
  ('PLT-C-10741', 'Pierre Renard',    'p.renard@example.be',      '+32 9 244 55 66',  'bronze', 'BL'),
  ('PLT-C-10892', 'Amélie Fontaine',  'a.fontaine@example.be',    '+32 3 211 22 33',  'silver', 'BL'),
  ('PLT-C-11034', 'Lucas Bernard',    'l.bernard@example.be',     '+32 65 33 44 55',  'bronze', 'BL'),
  ('PLT-C-11156', 'Nathalie Leroy',   'n.leroy@example.be',       '+32 71 44 55 66',  'gold',   'BL'),
  ('PLT-C-11289', 'Antoine Maes',     'a.maes@example.be',        '+32 475 66 77 88', 'silver', 'BL')
ON CONFLICT (external_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────
-- 4. New invoices — ASTER F022F0XXXXXX format, BL stores
-- ─────────────────────────────────────────────────────────────────
INSERT INTO invoices (invoice_number, customer_id, date, store, amount_ht, vat_rate, status, source)
SELECT 'F022F083124', id, '2025-10-12 11:20:00', 'Namur',              368.00, 21, 'paid',      'ASTER'
FROM customers WHERE external_id = 'PLT-C-10584'
ON CONFLICT (invoice_number) DO NOTHING;

INSERT INTO invoices (invoice_number, customer_id, date, store, amount_ht, vat_rate, status, source)
SELECT 'F022F085001', id, '2025-09-05 14:00:00', 'Liège',             1199.00, 21, 'paid',      'ASTER'
FROM customers WHERE external_id = 'PLT-C-10623'
ON CONFLICT (invoice_number) DO NOTHING;

INSERT INTO invoices (invoice_number, customer_id, date, store, amount_ht, vat_rate, status, source)
SELECT 'F022F087654', id, '2025-08-20 09:30:00', 'Gand',              1748.00, 21, 'paid',      'ASTER'
FROM customers WHERE external_id = 'PLT-C-10741'
ON CONFLICT (invoice_number) DO NOTHING;

INSERT INTO invoices (invoice_number, customer_id, date, store, amount_ht, vat_rate, status, source)
SELECT 'F022F089234', id, '2025-07-15 16:45:00', 'Anvers',             699.00, 21, 'paid',      'ASTER'
FROM customers WHERE external_id = 'PLT-C-10892'
ON CONFLICT (invoice_number) DO NOTHING;

INSERT INTO invoices (invoice_number, customer_id, date, store, amount_ht, vat_rate, status, source)
SELECT 'F022F091000', id, '2025-11-22 10:00:00', 'Mons',               949.00, 21, 'paid',      'ASTER'
FROM customers WHERE external_id = 'PLT-C-11034'
ON CONFLICT (invoice_number) DO NOTHING;

INSERT INTO invoices (invoice_number, customer_id, date, store, amount_ht, vat_rate, status, source)
SELECT 'F022F093456', id, '2025-12-02 13:15:00', 'Bruxelles Ixelles',  868.00, 21, 'paid',      'ASTER'
FROM customers WHERE external_id = 'PLT-C-11156'
ON CONFLICT (invoice_number) DO NOTHING;

INSERT INTO invoices (invoice_number, customer_id, date, store, amount_ht, vat_rate, status, source)
SELECT 'F022F095789', id, '2026-02-14 11:30:00', 'Bruxelles Centre',   948.00, 21, 'paid',      'ASTER'
FROM customers WHERE external_id = 'PLT-C-11289'
ON CONFLICT (invoice_number) DO NOTHING;

INSERT INTO invoices (invoice_number, customer_id, date, store, amount_ht, vat_rate, status, source)
SELECT 'F022F098012', id, '2026-04-01 10:00:00', 'Bruxelles Centre',  1298.00, 21, 'pending',   'ASTER'
FROM customers WHERE external_id = 'PLT-C-10042'   -- Marie Dupont, repeat customer
ON CONFLICT (invoice_number) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────
-- 5. Invoice lines for the 8 new invoices
--    Fields: sku (EAN or PLT-SVC code), label, brand, supplier,
--            image_url, category, quantity, unit_price,
--            warranty_months, product_state
-- ─────────────────────────────────────────────────────────────────

-- ── F022F083124 — Thomas Dubois — Whirlpool microwave + warranty ext ──
INSERT INTO invoice_lines
  (invoice_id, sku, label, brand, supplier, image_url, category, quantity, unit_price, warranty_months, product_state)
SELECT i.id,
  '8003437611575',
  'Four micro-ondes combiné Whirlpool W7 MH250',
  'Whirlpool',
  'Whirlpool EMEA',
  'https://media.platana.fr/products/8003437611575.jpg',
  'Petit Appareil', 1, 319.00, 12, 'NEW'
FROM invoices i WHERE i.invoice_number = 'F022F083124';

INSERT INTO invoice_lines
  (invoice_id, sku, label, brand, supplier, image_url, category, quantity, unit_price, warranty_months, product_state)
SELECT i.id,
  'PLT-SVC-EXT-12',
  'Extension de garantie +12 mois',
  'Platana',
  'Platana',
  NULL,
  'Service', 1, 49.00, 0, NULL
FROM invoices i WHERE i.invoice_number = 'F022F083124';

-- ── F022F085001 — Isabelle Laurent — Miele dishwasher + install ──
INSERT INTO invoice_lines
  (invoice_id, sku, label, brand, supplier, image_url, category, quantity, unit_price, warranty_months, product_state)
SELECT i.id,
  '4002516193815',
  'Lave-vaisselle encastrable Miele G 7110 SC',
  'Miele',
  'Miele Belgium',
  'https://media.platana.fr/products/4002516193815.jpg',
  'Gros Appareil', 1, 1099.00, 36, 'NEW'
FROM invoices i WHERE i.invoice_number = 'F022F085001';

INSERT INTO invoice_lines
  (invoice_id, sku, label, brand, supplier, image_url, category, quantity, unit_price, warranty_months, product_state)
SELECT i.id,
  'PLT-SVC-INST-01',
  'Kit livraison et installation',
  'Platana',
  'Platana',
  NULL,
  'Service', 1, 100.00, 0, NULL
FROM invoices i WHERE i.invoice_number = 'F022F085001';

-- ── F022F087654 — Pierre Renard — LG OLED TV + Philips steam iron ──
INSERT INTO invoice_lines
  (invoice_id, sku, label, brand, supplier, image_url, category, quantity, unit_price, warranty_months, product_state)
SELECT i.id,
  '8806091770097',
  'Téléviseur OLED LG 55" B2 4K 120Hz',
  'LG',
  'LG Electronics Belgium',
  'https://media.platana.fr/products/8806091770097.jpg',
  'Audiovisuel', 1, 1499.00, 24, 'GOOD'
FROM invoices i WHERE i.invoice_number = 'F022F087654';

INSERT INTO invoice_lines
  (invoice_id, sku, label, brand, supplier, image_url, category, quantity, unit_price, warranty_months, product_state)
SELECT i.id,
  '8710103940203',
  'Centrale vapeur Philips PerfectCare Elite Plus GC9650',
  'Philips',
  'Philips Belgium',
  'https://media.platana.fr/products/8710103940203.jpg',
  'Petit Appareil', 1, 249.00, 24, 'NEW'
FROM invoices i WHERE i.invoice_number = 'F022F087654';

-- ── F022F089234 — Amélie Fontaine — De'Longhi coffee machine ──
INSERT INTO invoice_lines
  (invoice_id, sku, label, brand, supplier, image_url, category, quantity, unit_price, warranty_months, product_state)
SELECT i.id,
  '8004399334779',
  'Machine à café automatique De''Longhi Magnifica Evo ECAM29.660',
  'De''Longhi',
  'De''Longhi Belgium',
  'https://media.platana.fr/products/8004399334779.jpg',
  'Petit Appareil', 1, 699.00, 24, 'NEW'
FROM invoices i WHERE i.invoice_number = 'F022F089234';

-- ── F022F091000 — Lucas Bernard — Siemens oven (broken) + install ──
INSERT INTO invoice_lines
  (invoice_id, sku, label, brand, supplier, image_url, category, quantity, unit_price, warranty_months, product_state)
SELECT i.id,
  '4242003836200',
  'Four encastrable Siemens iQ500 HB517ABR0',
  'Siemens',
  'BSH Home Appliances',
  'https://media.platana.fr/products/4242003836200.jpg',
  'Gros Appareil', 1, 849.00, 24, 'BROKEN'
FROM invoices i WHERE i.invoice_number = 'F022F091000';

INSERT INTO invoice_lines
  (invoice_id, sku, label, brand, supplier, image_url, category, quantity, unit_price, warranty_months, product_state)
SELECT i.id,
  'PLT-SVC-INST-01',
  'Kit livraison et installation',
  'Platana',
  'Platana',
  NULL,
  'Service', 1, 100.00, 0, NULL
FROM invoices i WHERE i.invoice_number = 'F022F091000';

-- ── F022F093456 — Nathalie Leroy — Bosch washing machine (damaged) + warranty ──
INSERT INTO invoice_lines
  (invoice_id, sku, label, brand, supplier, image_url, category, quantity, unit_price, warranty_months, product_state)
SELECT i.id,
  '5413149016591',
  'Lave-linge Bosch WAX28400 Series 6 9kg',
  'Bosch',
  'BSH Home Appliances',
  'https://media.platana.fr/products/5413149016591.jpg',
  'Gros Appareil', 1, 789.00, 24, 'DAMAGED'
FROM invoices i WHERE i.invoice_number = 'F022F093456';

INSERT INTO invoice_lines
  (invoice_id, sku, label, brand, supplier, image_url, category, quantity, unit_price, warranty_months, product_state)
SELECT i.id,
  'PLT-SVC-EXT-24',
  'Extension de garantie +24 mois',
  'Platana',
  'Platana',
  NULL,
  'Service', 1, 79.00, 0, NULL
FROM invoices i WHERE i.invoice_number = 'F022F093456';

-- ── F022F095789 — Antoine Maes — Dyson vacuum + Tefal airfryer ──
INSERT INTO invoice_lines
  (invoice_id, sku, label, brand, supplier, image_url, category, quantity, unit_price, warranty_months, product_state)
SELECT i.id,
  '5025155063033',
  'Aspirateur balai Dyson V15 Detect Absolute',
  'Dyson',
  'Dyson Belgium',
  'https://media.platana.fr/products/5025155063033.jpg',
  'Electroménager', 1, 749.00, 24, 'NEW'
FROM invoices i WHERE i.invoice_number = 'F022F095789';

INSERT INTO invoice_lines
  (invoice_id, sku, label, brand, supplier, image_url, category, quantity, unit_price, warranty_months, product_state)
SELECT i.id,
  '3168430119960',
  'Friteuse sans huile Tefal Easy Fry & Grill XXL EY801D',
  'Tefal',
  'SEB Belgium',
  'https://media.platana.fr/products/3168430119960.jpg',
  'Petit Appareil', 1, 199.00, 24, 'NEW'
FROM invoices i WHERE i.invoice_number = 'F022F095789';

-- ── F022F098012 — Marie Dupont (2nd purchase) — Electrolux washer + Samsung fridge ──
INSERT INTO invoice_lines
  (invoice_id, sku, label, brand, supplier, image_url, category, quantity, unit_price, warranty_months, product_state)
SELECT i.id,
  '7332543766314',
  'Lave-linge Electrolux EcoSense EW7F348SI 8kg',
  'Electrolux',
  'Electrolux Belgium',
  'https://media.platana.fr/products/7332543766314.jpg',
  'Gros Appareil', 1, 649.00, 24, 'GOOD'
FROM invoices i WHERE i.invoice_number = 'F022F098012';

INSERT INTO invoice_lines
  (invoice_id, sku, label, brand, supplier, image_url, category, quantity, unit_price, warranty_months, product_state)
SELECT i.id,
  '8806090665097',
  'Réfrigérateur combiné Samsung RB34T602CSA No Frost 341L',
  'Samsung',
  'Samsung Electronics Belgium',
  'https://media.platana.fr/products/8806090665097.jpg',
  'Gros Appareil', 1, 549.00, 24, 'GOOD'
FROM invoices i WHERE i.invoice_number = 'F022F098012';

INSERT INTO invoice_lines
  (invoice_id, sku, label, brand, supplier, image_url, category, quantity, unit_price, warranty_months, product_state)
SELECT i.id,
  'PLT-SVC-INST-01',
  'Kit livraison et installation',
  'Platana',
  'Platana',
  NULL,
  'Service', 1, 100.00, 0, NULL
FROM invoices i WHERE i.invoice_number = 'F022F098012';
