-- ═══════════════════════════════════════════════════════════════
-- Migration 004 — Product fields belong on articles, not factures
-- Moves product_sku/brand/category/warranty_months to articles.
-- Idempotent: ADD COLUMN IF NOT EXISTS / DROP COLUMN IF EXISTS
-- ═══════════════════════════════════════════════════════════════

-- Add product fields to articles (one product identity per line item)
ALTER TABLE articles ADD COLUMN IF NOT EXISTS product_sku      VARCHAR(100);
ALTER TABLE articles ADD COLUMN IF NOT EXISTS product_brand    VARCHAR(100);
ALTER TABLE articles ADD COLUMN IF NOT EXISTS product_category VARCHAR(100);
ALTER TABLE articles ADD COLUMN IF NOT EXISTS warranty_months  INTEGER;

-- Remove incorrectly-placed product columns from factures
ALTER TABLE factures DROP COLUMN IF EXISTS product_sku;
ALTER TABLE factures DROP COLUMN IF EXISTS product_label;
ALTER TABLE factures DROP COLUMN IF EXISTS product_brand;
ALTER TABLE factures DROP COLUMN IF EXISTS product_category;
ALTER TABLE factures DROP COLUMN IF EXISTS warranty_months;

-- Back-fill articles with real appliance data matching the seed invoices

-- FAC-1024 — Sophie Renard — Bosch washing machine + installation
UPDATE articles SET product_sku = 'LL-BOSCH-WAG28400', product_brand = 'Bosch',    product_category = 'Gros électroménager', warranty_months = 24
WHERE facture_id = 1024 AND nom_article ILIKE '%Bosch%';

UPDATE articles SET product_sku = 'SVC-INSTALL-GEM', product_brand = NULL, product_category = 'Service', warranty_months = NULL
WHERE facture_id = 1024 AND nom_article ILIKE '%installation%';

-- FAC-1025 — Marc Dubois — Samsung fridge + warranty extension
UPDATE articles SET product_sku = 'FRG-SAMSUNG-RB34', product_brand = 'Samsung',  product_category = 'Gros électroménager', warranty_months = 24
WHERE facture_id = 1025 AND nom_article ILIKE '%Samsung%';

UPDATE articles SET product_sku = 'SVC-WARRANTY-EXT', product_brand = NULL, product_category = 'Service', warranty_months = NULL
WHERE facture_id = 1025 AND nom_article ILIKE '%garantie%';

-- FAC-1026 — Sophie Renard — LG OLED TV + accessories
UPDATE articles SET product_sku = 'TV-LG-OLED55',    product_brand = 'LG',        product_category = 'Audiovisuel',         warranty_months = 24
WHERE facture_id = 1026 AND nom_article ILIKE '%LG%';

UPDATE articles SET product_sku = 'ACC-MURAL-TV55',  product_brand = NULL, product_category = 'Accessoire', warranty_months = NULL
WHERE facture_id = 1026 AND nom_article ILIKE '%support%';

UPDATE articles SET product_sku = 'ACC-HDMI-2M',     product_brand = NULL, product_category = 'Accessoire', warranty_months = NULL
WHERE facture_id = 1026 AND nom_article ILIKE '%hdmi%';

-- FAC-1027 — Jean-Pierre Lambert — Whirlpool microwave
UPDATE articles SET product_sku = 'MWO-WHIRLPOOL-MWP339', product_brand = 'Whirlpool', product_category = 'Petit électroménager', warranty_months = 12
WHERE facture_id = 1027 AND nom_article ILIKE '%Whirlpool%';

-- FAC-1028 — Isabelle Fontaine — Miele dishwasher + installation
UPDATE articles SET product_sku = 'DW-MIELE-G7100',  product_brand = 'Miele',     product_category = 'Gros électroménager', warranty_months = 36
WHERE facture_id = 1028 AND nom_article ILIKE '%Miele%';

UPDATE articles SET product_sku = 'SVC-INSTALL-GEM', product_brand = NULL, product_category = 'Service', warranty_months = NULL
WHERE facture_id = 1028 AND nom_article ILIKE '%installation%';
