-- ═══════════════════════════════════════════════════════════════
-- Migration 002 — Development seed data (factures & articles)
-- Only intended for local / Docker dev environments.
-- ═══════════════════════════════════════════════════════════════

-- Idempotent: skip if data already present
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM factures LIMIT 1) THEN
    RAISE NOTICE 'Seed data already present, skipping.';
    RETURN;
  END IF;

  INSERT INTO factures (id, numero_facture, client_nom, client_email, client_phone, client_loyalty_tier, customer_id,
                        date_creation, date_echeance, montant_ht, statut, store, notes)
  VALUES
    (1024, 'FAC-1024', 'Sophie Renard',       'sophie.renard@email.be',  '+32 2 555 01 01', 'gold',   'C-987',
     '2025-01-15 09:30:00', '2025-02-14',    0.00, 'Payée',      'Magasin Bruxelles Centre', 'Paiement reçu le 10/02/2025'),

    (1025, 'FAC-1025', 'Marc Dubois',         'marc.dubois@email.be',    '+32 4 555 02 02', 'silver', 'C-456',
     '2023-08-02 14:00:00', '2023-09-01',    0.00, 'Payée',      'Magasin Liège',             NULL),

    (1026, 'FAC-1026', 'Sophie Renard',       'sophie.renard@email.be',  '+32 2 555 01 01', 'gold',   'C-987',
     '2022-11-20 10:15:00', '2022-12-20',    0.00, 'Payée',      'Magasin Bruxelles Centre', NULL),

    (1027, 'FAC-1027', 'Jean-Pierre Lambert', 'jp.lambert@email.be',     '+32 4 555 04 04', 'bronze', 'C-789',
     '2024-12-01 08:00:00', '2025-01-01',    0.00, 'En retard',  'Magasin Namur',             'Facture impayée depuis +60 jours'),

    (1028, 'FAC-1028', 'Isabelle Fontaine',   'i.fontaine@email.be',     '+32 2 555 05 05', 'gold',   'C-321',
     '2025-03-01 11:00:00', '2025-04-01',    0.00, 'En attente', 'Magasin Bruxelles Nord',   'Nouveau client — vérification crédit');

  -- Reset sequence after manual IDs
  PERFORM setval('factures_id_seq', (SELECT MAX(id) FROM factures));

  -- Articles — FAC-1024 (Sophie Renard — lave-linge Bosch)
  -- montant_ht recalculated by trigger: 549 + 100 = 649
  INSERT INTO articles (facture_id, nom_article, description, quantite, prix_unitaire, product_sku, product_brand, product_category, warranty_months) VALUES
    (1024, 'Lave-linge Bosch WAG28400',   'Lave-linge pose libre 8kg, 1400tr/min',  1, 549.00, 'LL-BOSCH-WAG28400',  'Bosch',     'Gros électroménager', 24),
    (1024, 'Kit livraison et installation','Livraison domicile + raccordement',       1, 100.00, 'SVC-INSTALL-GEM',    'Service',   'Service',             0);

  -- Articles — FAC-1025 (Marc Dubois — réfrigérateur Samsung)
  -- montant_ht: 799 + 100 = 899
  INSERT INTO articles (facture_id, nom_article, description, quantite, prix_unitaire, product_sku, product_brand, product_category, warranty_months) VALUES
    (1025, 'Réfrigérateur Samsung RB34',  'Réfrigérateur combiné No Frost 341L',     1, 799.00, 'FRG-SAMSUNG-RB34',   'Samsung',   'Gros électroménager', 24),
    (1025, 'Extension de garantie +1 an', 'Couverture pièces et main-d''œuvre',      1, 100.00, 'SVC-WARRANTY-EXT',   'Service',   'Service',             0);

  -- Articles — FAC-1026 (Sophie Renard — téléviseur LG OLED)
  -- montant_ht: 1499 + 60 + 40 = 1599
  INSERT INTO articles (facture_id, nom_article, description, quantite, prix_unitaire, product_sku, product_brand, product_category, warranty_months) VALUES
    (1026, 'Téléviseur LG OLED 55"',      'TV OLED 4K 55" 120Hz, HDMI 2.1',         1, 1499.00, 'TV-LG-OLED55',       'LG',        'Audiovisuel',         24),
    (1026, 'Support mural téléviseur',    'Support inclinable universel 32"–65"',    1,   60.00, 'ACC-MURAL-TV55',     'Generic',   'Accessoire',          0),
    (1026, 'Câble HDMI 2.1 2m',           'Câble HDMI haute vitesse 48Gbps',         1,   40.00, 'ACC-HDMI-2M',        'Generic',   'Accessoire',          0);

  -- Articles — FAC-1027 (Jean-Pierre Lambert — micro-ondes Whirlpool)
  -- montant_ht: 320
  INSERT INTO articles (facture_id, nom_article, description, quantite, prix_unitaire, product_sku, product_brand, product_category, warranty_months) VALUES
    (1027, 'Micro-ondes Whirlpool MWP339','Micro-ondes combiné grill 33L 1000W',     1, 320.00, 'MWO-WHIRLPOOL-MWP339','Whirlpool','Petit électroménager', 12);

  -- Articles — FAC-1028 (Isabelle Fontaine — lave-vaisselle Miele)
  -- montant_ht: 1099 + 100 = 1199
  INSERT INTO articles (facture_id, nom_article, description, quantite, prix_unitaire, product_sku, product_brand, product_category, warranty_months) VALUES
    (1028, 'Lave-vaisselle Miele G7100',  'Lave-vaisselle encastrable 14 couverts',  1, 1099.00, 'DW-MIELE-G7100',     'Miele',     'Gros électroménager', 36),
    (1028, 'Kit livraison et installation','Livraison domicile + raccordement',       1,  100.00, 'SVC-INSTALL-GEM',    'Service',   'Service',             0);

END $$;
