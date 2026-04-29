'use strict';

const { Router } = require('express');
const pool       = require('../services/db');

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/articles?facture_id=1024
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    if (!req.query.facture_id) {
      return res.status(400).json({
        error:   'Paramètre manquant',
        message: 'Le paramètre "facture_id" est requis. Ex: /api/articles?facture_id=1024',
      });
    }

    const facture_id = parseInt(req.query.facture_id, 10);
    if (isNaN(facture_id) || facture_id <= 0) {
      return res.status(400).json({ error: '"facture_id" doit être un entier positif.' });
    }

    // Vérifier que la facture existe
    const { rows: factureRows } = await pool.query(
      'SELECT id FROM factures WHERE id = $1 LIMIT 1',
      [facture_id]
    );
    if (factureRows.length === 0) {
      return res.status(404).json({
        error:     'Facture introuvable',
        message:   `La facture ${facture_id} n'existe pas.`,
        facture_id,
      });
    }

    const { rows } = await pool.query(
      `SELECT id, facture_id, nom_article, description, quantite, prix_unitaire, sous_total
       FROM articles
       WHERE facture_id = $1
       ORDER BY id ASC`,
      [facture_id]
    );

    if (rows.length === 0) {
      return res.json({
        facture_id,
        articles: [],
        message:  'Cette facture ne contient aucun article.',
      });
    }

    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
