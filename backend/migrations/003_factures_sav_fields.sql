-- ═══════════════════════════════════════════════════════════════
-- Migration 003 — Add customer/store SAV fields to factures
-- Idempotent: uses ADD COLUMN IF NOT EXISTS
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE factures ADD COLUMN IF NOT EXISTS client_phone        VARCHAR(30);
ALTER TABLE factures ADD COLUMN IF NOT EXISTS client_loyalty_tier VARCHAR(20)
    CHECK (client_loyalty_tier IN ('bronze', 'silver', 'gold'));
ALTER TABLE factures ADD COLUMN IF NOT EXISTS customer_id         VARCHAR(30);
ALTER TABLE factures ADD COLUMN IF NOT EXISTS store               VARCHAR(150);

-- Back-fill seed rows
UPDATE factures SET customer_id = 'C-987', client_phone = '+32 2 555 01 01', client_loyalty_tier = 'gold',   store = 'Magasin Bruxelles Centre' WHERE numero_facture = 'FAC-1024';
UPDATE factures SET customer_id = 'C-456', client_phone = '+32 4 555 02 02', client_loyalty_tier = 'silver', store = 'Magasin Liège'             WHERE numero_facture = 'FAC-1025';
UPDATE factures SET customer_id = 'C-987', client_phone = '+32 2 555 01 01', client_loyalty_tier = 'gold',   store = 'Magasin Bruxelles Centre' WHERE numero_facture = 'FAC-1026';
UPDATE factures SET customer_id = 'C-789', client_phone = '+32 4 555 04 04', client_loyalty_tier = 'bronze', store = 'Magasin Namur'             WHERE numero_facture = 'FAC-1027';
UPDATE factures SET customer_id = 'C-321', client_phone = '+32 2 555 05 05', client_loyalty_tier = 'gold',   store = 'Magasin Bruxelles Nord'   WHERE numero_facture = 'FAC-1028';
