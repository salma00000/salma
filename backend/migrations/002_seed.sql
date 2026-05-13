-- =============================================================
-- 002_seed.sql — Platana seed data (fully idempotent)
-- All inserts use ON CONFLICT DO NOTHING (keyed tables) or
-- NOT EXISTS guards (invoice_lines, which has no unique key).
-- No DO $$ BEGIN IF EXISTS ... THEN RETURN $$ guards.
-- All invoice numbers use F022F0XXXXX format — no FAC-XXXX.
-- image_url values are the final resolved values (no UPDATE pass needed).
-- =============================================================

-- -------------------------------------------------------------
-- config_values — PRODUCT_STATE enum
-- -------------------------------------------------------------
INSERT INTO config_values (config_code, value_code, label_fr, label_en, display_order, active) VALUES
    ('PRODUCT_STATE', 'NEW',     'Neuf',         'New',     1, TRUE),
    ('PRODUCT_STATE', 'GOOD',    'Bon état',     'Good',    2, TRUE),
    ('PRODUCT_STATE', 'DAMAGED', 'Endommagé',    'Damaged', 3, TRUE),
    ('PRODUCT_STATE', 'BROKEN',  'Hors service', 'Broken',  4, TRUE)
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------------
-- customers — 10 BL-organisation customers
-- -------------------------------------------------------------
INSERT INTO customers (external_id, name, email, phone, loyalty_tier, organization) VALUES
    ('PLT-C-10042', 'Marie Dupont',     'marie.dupont@example.be',  '+32 475 11 22 33', 'gold',   'BL'),
    ('PLT-C-10187', 'Jean Martin',      'j.martin@example.be',      '+32 478 44 55 66', 'silver', 'BL'),
    ('PLT-C-10391', 'Sophie Lecomte',   's.lecomte@example.be',     '+32 471 88 99 10', 'bronze', 'BL'),
    ('PLT-C-10584', 'Thomas Dubois',    't.dubois@example.be',      '+32 81 22 33 44',  'silver', 'BL'),
    ('PLT-C-10623', 'Isabelle Laurent', 'i.laurent@example.be',     '+32 4 366 77 88',  'gold',   'BL'),
    ('PLT-C-10741', 'Pierre Renard',    'p.renard@example.be',      '+32 9 244 55 66',  'bronze', 'BL'),
    ('PLT-C-10892', 'Amélie Fontaine',  'a.fontaine@example.be',    '+32 3 211 22 33',  'silver', 'BL'),
    ('PLT-C-11034', 'Lucas Bernard',    'l.bernard@example.be',     '+32 65 33 44 55',  'bronze', 'BL'),
    ('PLT-C-11156', 'Nathalie Leroy',   'n.leroy@example.be',       '+32 71 44 55 66',  'gold',   'BL'),
    ('PLT-C-11289', 'Antoine Maes',     'a.maes@example.be',        '+32 475 66 77 88', 'silver', 'BL')
ON CONFLICT (external_id) DO NOTHING;

-- -------------------------------------------------------------
-- invoices — 12 ASTER-format invoices (F022F0XXXXX)
-- customer_id resolved at runtime via SELECT sub-query.
-- ON CONFLICT (invoice_number) DO NOTHING ensures idempotency.
-- -------------------------------------------------------------

INSERT INTO invoices (invoice_number, customer_id, date, store, amount_ht, vat_rate, status, source)
SELECT 'F022F066481', id, '2025-11-03 10:15:00', 'Bruxelles Centre', 349.17, 21, 'paid', 'ASTER'
FROM customers WHERE external_id = 'PLT-C-10042'
ON CONFLICT (invoice_number) DO NOTHING;

INSERT INTO invoices (invoice_number, customer_id, date, store, amount_ht, vat_rate, status, source)
SELECT 'F022F071293', id, '2025-12-18 14:30:00', 'Liège', 629.00, 21, 'paid', 'ASTER'
FROM customers WHERE external_id = 'PLT-C-10187'
ON CONFLICT (invoice_number) DO NOTHING;

INSERT INTO invoices (invoice_number, customer_id, date, store, amount_ht, vat_rate, status, source)
SELECT 'F022F078842', id, '2026-01-30 09:00:00', 'Bruxelles Ixelles', 119.00, 21, 'paid', 'ASTER'
FROM customers WHERE external_id = 'PLT-C-10391'
ON CONFLICT (invoice_number) DO NOTHING;

INSERT INTO invoices (invoice_number, customer_id, date, store, amount_ht, vat_rate, status, source)
SELECT 'F022F081557', id, '2026-03-05 11:45:00', 'Bruxelles Centre', 899.00, 21, 'pending', 'ASTER'
FROM customers WHERE external_id = 'PLT-C-10042'
ON CONFLICT (invoice_number) DO NOTHING;

INSERT INTO invoices (invoice_number, customer_id, date, store, amount_ht, vat_rate, status, source)
SELECT 'F022F083124', id, '2025-10-12 11:20:00', 'Namur', 368.00, 21, 'paid', 'ASTER'
FROM customers WHERE external_id = 'PLT-C-10584'
ON CONFLICT (invoice_number) DO NOTHING;

INSERT INTO invoices (invoice_number, customer_id, date, store, amount_ht, vat_rate, status, source)
SELECT 'F022F085001', id, '2025-09-05 14:00:00', 'Liège', 1199.00, 21, 'paid', 'ASTER'
FROM customers WHERE external_id = 'PLT-C-10623'
ON CONFLICT (invoice_number) DO NOTHING;

INSERT INTO invoices (invoice_number, customer_id, date, store, amount_ht, vat_rate, status, source)
SELECT 'F022F087654', id, '2025-08-20 09:30:00', 'Gand', 1748.00, 21, 'paid', 'ASTER'
FROM customers WHERE external_id = 'PLT-C-10741'
ON CONFLICT (invoice_number) DO NOTHING;

INSERT INTO invoices (invoice_number, customer_id, date, store, amount_ht, vat_rate, status, source)
SELECT 'F022F089234', id, '2025-07-15 16:45:00', 'Anvers', 699.00, 21, 'paid', 'ASTER'
FROM customers WHERE external_id = 'PLT-C-10892'
ON CONFLICT (invoice_number) DO NOTHING;

INSERT INTO invoices (invoice_number, customer_id, date, store, amount_ht, vat_rate, status, source)
SELECT 'F022F091000', id, '2025-11-22 10:00:00', 'Mons', 949.00, 21, 'paid', 'ASTER'
FROM customers WHERE external_id = 'PLT-C-11034'
ON CONFLICT (invoice_number) DO NOTHING;

INSERT INTO invoices (invoice_number, customer_id, date, store, amount_ht, vat_rate, status, source)
SELECT 'F022F093456', id, '2025-12-02 13:15:00', 'Bruxelles Ixelles', 868.00, 21, 'paid', 'ASTER'
FROM customers WHERE external_id = 'PLT-C-11156'
ON CONFLICT (invoice_number) DO NOTHING;

INSERT INTO invoices (invoice_number, customer_id, date, store, amount_ht, vat_rate, status, source)
SELECT 'F022F095789', id, '2026-02-14 11:30:00', 'Bruxelles Centre', 948.00, 21, 'paid', 'ASTER'
FROM customers WHERE external_id = 'PLT-C-11289'
ON CONFLICT (invoice_number) DO NOTHING;

INSERT INTO invoices (invoice_number, customer_id, date, store, amount_ht, vat_rate, status, source)
SELECT 'F022F098012', id, '2026-04-01 10:00:00', 'Bruxelles Centre', 1298.00, 21, 'pending', 'ASTER'
FROM customers WHERE external_id = 'PLT-C-10042'
ON CONFLICT (invoice_number) DO NOTHING;

-- -------------------------------------------------------------
-- invoice_lines — 23 line items
-- invoice_id resolved via SELECT sub-query on invoice_number.
-- NOT EXISTS(invoice_id, sku) guard prevents duplicates on restart.
-- image_url is the final resolved value (NULL where no real CDN URL found).
-- -------------------------------------------------------------

-- ── F022F066481 — Marie Dupont ────────────────────────────────
INSERT INTO invoice_lines (invoice_id, sku, label, brand, supplier, image_url, category, quantity, unit_price, warranty_months, product_state)
SELECT i.id, '8710103858836', 'Aspirateur robot Philips HomeRun 7000', 'Philips', 'Philips Belgium', NULL,
       'Electroménager', 1, 249.17, 24, 'GOOD'
FROM invoices i WHERE i.invoice_number = 'F022F066481'
  AND NOT EXISTS (SELECT 1 FROM invoice_lines WHERE invoice_id = i.id AND sku = '8710103858836');

INSERT INTO invoice_lines (invoice_id, sku, label, brand, supplier, image_url, category, quantity, unit_price, warranty_months, product_state)
SELECT i.id, 'PLT-SVC-EXT-24', 'Extension de garantie +24 mois', 'Platana', 'Platana', NULL,
       'Service', 1, 100.00, 0, NULL
FROM invoices i WHERE i.invoice_number = 'F022F066481'
  AND NOT EXISTS (SELECT 1 FROM invoice_lines WHERE invoice_id = i.id AND sku = 'PLT-SVC-EXT-24');

-- ── F022F071293 — Jean Martin ─────────────────────────────────
INSERT INTO invoice_lines (invoice_id, sku, label, brand, supplier, image_url, category, quantity, unit_price, warranty_months, product_state)
SELECT i.id, '8806090808777', 'Lave-linge Samsung WW90T4040EE 9kg', 'Samsung', 'Samsung Electronics Belgium', NULL,
       'Gros Appareil', 1, 629.00, 24, 'DAMAGED'
FROM invoices i WHERE i.invoice_number = 'F022F071293'
  AND NOT EXISTS (SELECT 1 FROM invoice_lines WHERE invoice_id = i.id AND sku = '8806090808777');

-- ── F022F078842 — Sophie Lecomte ──────────────────────────────
INSERT INTO invoice_lines (invoice_id, sku, label, brand, supplier, image_url, category, quantity, unit_price, warranty_months, product_state)
SELECT i.id, '3168430008862', 'Grille-pain Tefal Maxi 4 fentes TT7703', 'Tefal', 'SEB Belgium', NULL,
       'Petit Appareil', 1, 119.00, 12, 'BROKEN'
FROM invoices i WHERE i.invoice_number = 'F022F078842'
  AND NOT EXISTS (SELECT 1 FROM invoice_lines WHERE invoice_id = i.id AND sku = '3168430008862');

-- ── F022F081557 — Marie Dupont ────────────────────────────────
INSERT INTO invoice_lines (invoice_id, sku, label, brand, supplier, image_url, category, quantity, unit_price, warranty_months, product_state)
SELECT i.id, '8806091685814', 'Réfrigérateur combiné LG GBP62PZNAB 384L', 'LG', 'LG Electronics Belgium',
       'https://www.lg.com/be_fr/images/cuisine/md07570908/gallery/D-1.jpg',
       'Gros Appareil', 1, 799.00, 36, 'NEW'
FROM invoices i WHERE i.invoice_number = 'F022F081557'
  AND NOT EXISTS (SELECT 1 FROM invoice_lines WHERE invoice_id = i.id AND sku = '8806091685814');

INSERT INTO invoice_lines (invoice_id, sku, label, brand, supplier, image_url, category, quantity, unit_price, warranty_months, product_state)
SELECT i.id, 'PLT-SVC-INST-01', 'Kit livraison et installation', 'Platana', 'Platana', NULL,
       'Service', 1, 100.00, 0, NULL
FROM invoices i WHERE i.invoice_number = 'F022F081557'
  AND NOT EXISTS (SELECT 1 FROM invoice_lines WHERE invoice_id = i.id AND sku = 'PLT-SVC-INST-01');

-- ── F022F083124 — Thomas Dubois ───────────────────────────────
INSERT INTO invoice_lines (invoice_id, sku, label, brand, supplier, image_url, category, quantity, unit_price, warranty_months, product_state)
SELECT i.id, '8003437611575', 'Four micro-ondes combiné Whirlpool W7 MH250', 'Whirlpool', 'Whirlpool EMEA', NULL,
       'Petit Appareil', 1, 319.00, 12, 'NEW'
FROM invoices i WHERE i.invoice_number = 'F022F083124'
  AND NOT EXISTS (SELECT 1 FROM invoice_lines WHERE invoice_id = i.id AND sku = '8003437611575');

INSERT INTO invoice_lines (invoice_id, sku, label, brand, supplier, image_url, category, quantity, unit_price, warranty_months, product_state)
SELECT i.id, 'PLT-SVC-EXT-12', 'Extension de garantie +12 mois', 'Platana', 'Platana', NULL,
       'Service', 1, 49.00, 0, NULL
FROM invoices i WHERE i.invoice_number = 'F022F083124'
  AND NOT EXISTS (SELECT 1 FROM invoice_lines WHERE invoice_id = i.id AND sku = 'PLT-SVC-EXT-12');

-- ── F022F085001 — Isabelle Laurent ────────────────────────────
INSERT INTO invoice_lines (invoice_id, sku, label, brand, supplier, image_url, category, quantity, unit_price, warranty_months, product_state)
SELECT i.id, '4002516193815', 'Lave-vaisselle encastrable Miele G 7110 SC', 'Miele', 'Miele Belgium',
       'https://media.miele.com/images/2000017/200001731/20000173149.png',
       'Gros Appareil', 1, 1099.00, 36, 'NEW'
FROM invoices i WHERE i.invoice_number = 'F022F085001'
  AND NOT EXISTS (SELECT 1 FROM invoice_lines WHERE invoice_id = i.id AND sku = '4002516193815');

INSERT INTO invoice_lines (invoice_id, sku, label, brand, supplier, image_url, category, quantity, unit_price, warranty_months, product_state)
SELECT i.id, 'PLT-SVC-INST-01', 'Kit livraison et installation', 'Platana', 'Platana', NULL,
       'Service', 1, 100.00, 0, NULL
FROM invoices i WHERE i.invoice_number = 'F022F085001'
  AND NOT EXISTS (SELECT 1 FROM invoice_lines WHERE invoice_id = i.id AND sku = 'PLT-SVC-INST-01');

-- ── F022F087654 — Pierre Renard ───────────────────────────────
INSERT INTO invoice_lines (invoice_id, sku, label, brand, supplier, image_url, category, quantity, unit_price, warranty_months, product_state)
SELECT i.id, '8806091770097', 'Téléviseur OLED LG 55" B2 4K 120Hz', 'LG', 'LG Electronics Belgium',
       'https://www.lg.com/content/dam/channel/wcms/uk/images/tvs/OLED55B26LA_AEK_EEUK_UK_C/gallery/DZ-1.jpg',
       'Audiovisuel', 1, 1499.00, 24, 'GOOD'
FROM invoices i WHERE i.invoice_number = 'F022F087654'
  AND NOT EXISTS (SELECT 1 FROM invoice_lines WHERE invoice_id = i.id AND sku = '8806091770097');

INSERT INTO invoice_lines (invoice_id, sku, label, brand, supplier, image_url, category, quantity, unit_price, warranty_months, product_state)
SELECT i.id, '8710103940203', 'Centrale vapeur Philips PerfectCare Elite Plus GC9650', 'Philips', 'Philips Belgium',
       'https://images.philips.com/is/image/PhilipsConsumer/GC9650_80-IMS-en_US',
       'Petit Appareil', 1, 249.00, 24, 'NEW'
FROM invoices i WHERE i.invoice_number = 'F022F087654'
  AND NOT EXISTS (SELECT 1 FROM invoice_lines WHERE invoice_id = i.id AND sku = '8710103940203');

-- ── F022F089234 — Amélie Fontaine ─────────────────────────────
INSERT INTO invoice_lines (invoice_id, sku, label, brand, supplier, image_url, category, quantity, unit_price, warranty_months, product_state)
SELECT i.id, '8004399334779', 'Machine à café automatique De''Longhi Magnifica Evo ECAM29.660',
       'De''Longhi', 'De''Longhi Belgium',
       'https://dam.delonghi.com/902x902/assets/225625',
       'Petit Appareil', 1, 699.00, 24, 'NEW'
FROM invoices i WHERE i.invoice_number = 'F022F089234'
  AND NOT EXISTS (SELECT 1 FROM invoice_lines WHERE invoice_id = i.id AND sku = '8004399334779');

-- ── F022F091000 — Lucas Bernard ───────────────────────────────
INSERT INTO invoice_lines (invoice_id, sku, label, brand, supplier, image_url, category, quantity, unit_price, warranty_months, product_state)
SELECT i.id, '4242003836200', 'Four encastrable Siemens iQ500 HB517ABR0', 'Siemens', 'BSH Home Appliances', NULL,
       'Gros Appareil', 1, 849.00, 24, 'BROKEN'
FROM invoices i WHERE i.invoice_number = 'F022F091000'
  AND NOT EXISTS (SELECT 1 FROM invoice_lines WHERE invoice_id = i.id AND sku = '4242003836200');

INSERT INTO invoice_lines (invoice_id, sku, label, brand, supplier, image_url, category, quantity, unit_price, warranty_months, product_state)
SELECT i.id, 'PLT-SVC-INST-01', 'Kit livraison et installation', 'Platana', 'Platana', NULL,
       'Service', 1, 100.00, 0, NULL
FROM invoices i WHERE i.invoice_number = 'F022F091000'
  AND NOT EXISTS (SELECT 1 FROM invoice_lines WHERE invoice_id = i.id AND sku = 'PLT-SVC-INST-01');

-- ── F022F093456 — Nathalie Leroy ──────────────────────────────
INSERT INTO invoice_lines (invoice_id, sku, label, brand, supplier, image_url, category, quantity, unit_price, warranty_months, product_state)
SELECT i.id, '5413149016591', 'Lave-linge Bosch WAX28400 Series 6 9kg', 'Bosch', 'BSH Home Appliances', NULL,
       'Gros Appareil', 1, 789.00, 24, 'DAMAGED'
FROM invoices i WHERE i.invoice_number = 'F022F093456'
  AND NOT EXISTS (SELECT 1 FROM invoice_lines WHERE invoice_id = i.id AND sku = '5413149016591');

INSERT INTO invoice_lines (invoice_id, sku, label, brand, supplier, image_url, category, quantity, unit_price, warranty_months, product_state)
SELECT i.id, 'PLT-SVC-EXT-24', 'Extension de garantie +24 mois', 'Platana', 'Platana', NULL,
       'Service', 1, 79.00, 0, NULL
FROM invoices i WHERE i.invoice_number = 'F022F093456'
  AND NOT EXISTS (SELECT 1 FROM invoice_lines WHERE invoice_id = i.id AND sku = 'PLT-SVC-EXT-24');

-- ── F022F095789 — Antoine Maes ────────────────────────────────
INSERT INTO invoice_lines (invoice_id, sku, label, brand, supplier, image_url, category, quantity, unit_price, warranty_months, product_state)
SELECT i.id, '5025155063033', 'Aspirateur balai Dyson V15 Detect Absolute', 'Dyson', 'Dyson Belgium',
       'https://dyson-h.assetsadobe2.com/is/image/content/dam/dyson/images/products/squaretool/971360-01.png',
       'Electroménager', 1, 749.00, 24, 'NEW'
FROM invoices i WHERE i.invoice_number = 'F022F095789'
  AND NOT EXISTS (SELECT 1 FROM invoice_lines WHERE invoice_id = i.id AND sku = '5025155063033');

INSERT INTO invoice_lines (invoice_id, sku, label, brand, supplier, image_url, category, quantity, unit_price, warranty_months, product_state)
SELECT i.id, '3168430119960', 'Friteuse sans huile Tefal Easy Fry & Grill XXL EY801D', 'Tefal', 'SEB Belgium', NULL,
       'Petit Appareil', 1, 199.00, 24, 'NEW'
FROM invoices i WHERE i.invoice_number = 'F022F095789'
  AND NOT EXISTS (SELECT 1 FROM invoice_lines WHERE invoice_id = i.id AND sku = '3168430119960');

-- ── F022F098012 — Marie Dupont (2nd purchase) ─────────────────
INSERT INTO invoice_lines (invoice_id, sku, label, brand, supplier, image_url, category, quantity, unit_price, warranty_months, product_state)
SELECT i.id, '7332543766314', 'Lave-linge Electrolux EcoSense EW7F348SI 8kg', 'Electrolux', 'Electrolux Belgium', NULL,
       'Gros Appareil', 1, 649.00, 24, 'GOOD'
FROM invoices i WHERE i.invoice_number = 'F022F098012'
  AND NOT EXISTS (SELECT 1 FROM invoice_lines WHERE invoice_id = i.id AND sku = '7332543766314');

INSERT INTO invoice_lines (invoice_id, sku, label, brand, supplier, image_url, category, quantity, unit_price, warranty_months, product_state)
SELECT i.id, '8806090665097', 'Réfrigérateur combiné Samsung RB34T602CSA No Frost 341L', 'Samsung', 'Samsung Electronics Belgium', NULL,
       'Gros Appareil', 1, 549.00, 24, 'GOOD'
FROM invoices i WHERE i.invoice_number = 'F022F098012'
  AND NOT EXISTS (SELECT 1 FROM invoice_lines WHERE invoice_id = i.id AND sku = '8806090665097');

INSERT INTO invoice_lines (invoice_id, sku, label, brand, supplier, image_url, category, quantity, unit_price, warranty_months, product_state)
SELECT i.id, 'PLT-SVC-INST-01', 'Kit livraison et installation', 'Platana', 'Platana', NULL,
       'Service', 1, 100.00, 0, NULL
FROM invoices i WHERE i.invoice_number = 'F022F098012'
  AND NOT EXISTS (SELECT 1 FROM invoice_lines WHERE invoice_id = i.id AND sku = 'PLT-SVC-INST-01');
