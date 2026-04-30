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

  INSERT INTO factures (id, numero_facture, client_nom, client_email, date_creation, date_echeance, montant_ht, statut, notes)
  VALUES
    (1024, 'FAC-1024', 'Acme Corporation',     'contact@acme.fr',        '2025-01-15 09:30:00', '2025-02-14', 1125.00, 'Payée',      'Paiement reçu le 10/02/2025'),
    (1025, 'FAC-1025', 'TechStartup SAS',      'billing@techstartup.fr', '2025-02-01 14:00:00', '2025-03-03', 2480.00, 'Envoyée',    'Relance envoyée le 15/02/2025'),
    (1026, 'FAC-1026', 'Design Studio SARL',   'admin@designstudio.fr',  '2025-02-10 10:15:00', '2025-03-12',  640.00, 'En attente', NULL),
    (1027, 'FAC-1027', 'Boulangerie Martin',   'martin@boulangerie.fr',  '2024-12-01 08:00:00', '2025-01-01',  320.00, 'En retard',  'Facture impayée depuis +60 jours'),
    (1028, 'FAC-1028', 'Cabinet Légal Dupont', 'dupont@cabinet.fr',      '2025-03-01 11:00:00', '2025-04-01', 3200.00, 'En attente', 'Nouveau client — vérification crédit');

  -- Reset sequence after manual IDs
  PERFORM setval('factures_id_seq', (SELECT MAX(id) FROM factures));

  -- Articles — FAC-1024
  INSERT INTO articles (facture_id, nom_article, description, quantite, prix_unitaire) VALUES
    (1024, 'Licence Logiciel Pro',     'Licence annuelle logiciel de gestion',  3, 150.00),
    (1024, 'Support technique (h)',    'Assistance technique par heure',         5,  80.00),
    (1024, 'Formation utilisateur',    'Session de formation demi-journée',      1, 500.00);

  -- Articles — FAC-1025
  INSERT INTO articles (facture_id, nom_article, description, quantite, prix_unitaire) VALUES
    (1025, 'Développement API REST',   'Intégration API tierce (jours)',          8, 180.00),
    (1025, 'Hébergement cloud (mois)', 'Serveur VPS premium 3 mois',              3, 120.00),
    (1025, 'Audit sécurité',           'Pentest et rapport de vulnérabilités',    1, 800.00),
    (1025, 'Documentation technique',  'Rédaction specs et guides développeur',   2, 250.00);

  -- Articles — FAC-1026
  INSERT INTO articles (facture_id, nom_article, description, quantite, prix_unitaire) VALUES
    (1026, 'Création logo',            'Logo vectoriel + chartes graphiques',     1, 390.00),
    (1026, 'Déclinaisons couleurs',    'Versions couleurs et N&B',                1, 150.00),
    (1026, 'Livraison fichiers sources','Pack AI, EPS, SVG, PNG',                 1, 100.00);

  -- Articles — FAC-1027
  INSERT INTO articles (facture_id, nom_article, description, quantite, prix_unitaire) VALUES
    (1027, 'Pain de campagne (kg)',    'Pain artisanal au levain',                10,   8.00),
    (1027, 'Viennoiseries (doz.)',     'Assortiment croissants / pains au choc.', 20,  14.00);

  -- Articles — FAC-1028
  INSERT INTO articles (facture_id, nom_article, description, quantite, prix_unitaire) VALUES
    (1028, 'Consultation juridique',  'Conseil droit des affaires (h)',           8, 300.00),
    (1028, 'Rédaction contrat',       'Contrat de prestation de services',        2, 400.00);
END $$;
