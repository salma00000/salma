-- ═══════════════════════════════════════════════════════════════
-- Migration 005 — Back-fill required product fields on articles
-- Ensures product_sku, product_brand, product_category, warranty_months
-- are populated for legacy rows and newly-required validations.
-- Idempotent: only updates rows with missing values.
-- ═══════════════════════════════════════════════════════════════

-- Targeted fixes for known legacy rows observed in dev databases
UPDATE articles
SET
  product_sku = COALESCE(product_sku, 'SW-LICENCE-PRO'),
  product_brand = COALESCE(product_brand, 'Generic'),
  product_category = COALESCE(product_category, 'Logiciel'),
  warranty_months = COALESCE(warranty_months, 12)
WHERE nom_article ILIKE '%Licence Logiciel Pro%';

UPDATE articles
SET
  product_sku = COALESCE(product_sku, 'SVC-SUPPORT-TECH-H'),
  product_brand = COALESCE(product_brand, 'Service'),
  product_category = COALESCE(product_category, 'Service'),
  warranty_months = COALESCE(warranty_months, 0)
WHERE nom_article ILIKE '%Support technique%';

UPDATE articles
SET
  product_sku = COALESCE(product_sku, 'SVC-FORMATION-USER'),
  product_brand = COALESCE(product_brand, 'Service'),
  product_category = COALESCE(product_category, 'Service'),
  warranty_months = COALESCE(warranty_months, 0)
WHERE nom_article ILIKE '%Formation utilisateur%';

-- Normalize any remaining nulls with sensible defaults.
-- SKU fallback is deterministic from row id to preserve uniqueness.
UPDATE articles
SET
  product_sku = COALESCE(product_sku, 'GEN-' || LPAD(id::text, 6, '0')),
  product_brand = COALESCE(
    product_brand,
    CASE
      WHEN nom_article ILIKE '%support%' OR nom_article ILIKE '%formation%' OR nom_article ILIKE '%service%' OR nom_article ILIKE '%garantie%' OR nom_article ILIKE '%installation%'
        THEN 'Service'
      ELSE 'Generic'
    END
  ),
  product_category = COALESCE(
    product_category,
    CASE
      WHEN nom_article ILIKE '%logiciel%' OR description ILIKE '%logiciel%'
        THEN 'Logiciel'
      WHEN nom_article ILIKE '%support%' OR nom_article ILIKE '%formation%' OR nom_article ILIKE '%service%' OR nom_article ILIKE '%garantie%' OR nom_article ILIKE '%installation%'
        THEN 'Service'
      WHEN nom_article ILIKE '%câble%' OR nom_article ILIKE '%support mural%' OR nom_article ILIKE '%accessoire%'
        THEN 'Accessoire'
      ELSE 'Produit'
    END
  ),
  warranty_months = COALESCE(
    warranty_months,
    CASE
      WHEN nom_article ILIKE '%support%' OR nom_article ILIKE '%formation%' OR nom_article ILIKE '%service%' OR nom_article ILIKE '%garantie%' OR nom_article ILIKE '%installation%'
        THEN 0
      WHEN nom_article ILIKE '%logiciel%' OR description ILIKE '%logiciel%'
        THEN 12
      ELSE 24
    END
  )
WHERE product_sku IS NULL
   OR product_brand IS NULL
   OR product_category IS NULL
   OR warranty_months IS NULL;
