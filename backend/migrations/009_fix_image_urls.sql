-- ═══════════════════════════════════════════════════════════════
-- Migration 009 — Fix image_url: replace fake media.platana.fr
--                 URLs with real manufacturer CDN URLs.
--
-- Sources confirmed working (verified by HTTP response):
--   • Philips   → images.philips.com Scene7 CDN
--   • Dyson     → dyson-h.assetsadobe2.com (Adobe Scene7)
--   • De'Longhi → dam.delonghi.com
--   • LG        → www.lg.com (Belgium / UK paths)
--   • Miele     → media.miele.com
--
-- Products whose real image URLs could not be located are set
-- to NULL so the frontend shows a placeholder instead of a
-- broken image.
-- ═══════════════════════════════════════════════════════════════

-- ─── LG GBP62PZNAB/AC réfrigérateur combiné ──────────────────
UPDATE invoice_lines
SET image_url = 'https://www.lg.com/be_fr/images/cuisine/md07570908/gallery/D-1.jpg'
WHERE sku = '8806091685814';

-- ─── Miele G 7110 SC lave-vaisselle ──────────────────────────
UPDATE invoice_lines
SET image_url = 'https://media.miele.com/images/2000017/200001731/20000173149.png'
WHERE sku = '4002516193815';

-- ─── LG OLED 55" B2 4K TV ────────────────────────────────────
UPDATE invoice_lines
SET image_url = 'https://www.lg.com/content/dam/channel/wcms/uk/images/tvs/OLED55B26LA_AEK_EEUK_UK_C/gallery/DZ-1.jpg'
WHERE sku = '8806091770097';

-- ─── Philips PerfectCare Elite Plus GC9650 ───────────────────
UPDATE invoice_lines
SET image_url = 'https://images.philips.com/is/image/PhilipsConsumer/GC9650_80-IMS-en_US'
WHERE sku = '8710103940203';

-- ─── De'Longhi Magnifica Evo ECAM29.660 ──────────────────────
UPDATE invoice_lines
SET image_url = 'https://dam.delonghi.com/902x902/assets/225625'
WHERE sku = '8004399334779';

-- ─── Dyson V15 Detect Absolute ───────────────────────────────
UPDATE invoice_lines
SET image_url = 'https://dyson-h.assetsadobe2.com/is/image/content/dam/dyson/images/products/squaretool/971360-01.png'
WHERE sku = '5025155063033';

-- ─── Products with no locatable real image URL ───────────────
-- Setting NULL is safer than leaving a broken media.platana.fr
-- URL: the frontend can then show a generic placeholder icon.

-- ─── Philips HomeRun 7000 robot vacuum ───────────────────────
UPDATE invoice_lines SET image_url = NULL WHERE sku = '8710103858836';

-- Samsung WW90T4040EE lave-linge
UPDATE invoice_lines SET image_url = NULL WHERE sku = '8806090808777';

-- Tefal Maison TT7703 grille-pain
UPDATE invoice_lines SET image_url = NULL WHERE sku = '3168430008862';

-- Whirlpool W7 MH250 micro-ondes
UPDATE invoice_lines SET image_url = NULL WHERE sku = '8003437611575';

-- Siemens iQ500 HB517ABR0 four
UPDATE invoice_lines SET image_url = NULL WHERE sku = '4242003836200';

-- Bosch Serie 6 WAX28400 lave-linge
UPDATE invoice_lines SET image_url = NULL WHERE sku = '5413149016591';

-- Tefal Easy Fry & Grill XXL EY801D
UPDATE invoice_lines SET image_url = NULL WHERE sku = '3168430119960';

-- Electrolux EcoSense EW7F348SI lave-linge
UPDATE invoice_lines SET image_url = NULL WHERE sku = '7332543766314';

-- Samsung RB34T602CSA réfrigérateur
UPDATE invoice_lines SET image_url = NULL WHERE sku = '8806090665097';
