'use strict';

const { Router } = require('express');
const pool       = require('../services/db');

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function parsePositiveInt(value, fieldName) {
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed <= 0) {
    const err = new Error(`Le paramètre "${fieldName}" doit être un entier positif.`);
    err.status = 400;
    throw err;
  }
  return parsed;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/factures — Liste paginée
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const offset = (page - 1) * limit;

    const { rows } = await pool.query(
      `SELECT id, numero_facture, client_nom, client_email, date_creation, montant_total, statut
       FROM factures ORDER BY date_creation DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const { rows: countRows } = await pool.query('SELECT COUNT(*) FROM factures');
    const total = parseInt(countRows[0].count, 10);

    res.json({ data: rows, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/factures/search — Recherche intelligente (critères partiels)
// Query params: q, client, article, date, numero
// ─────────────────────────────────────────────────────────────────────────────
router.get('/search', async (req, res, next) => {
  try {
    const { q, client, article, date, numero } = req.query;

    if (!q && !client && !article && !date && !numero) {
      return res.status(400).json({
        error: 'Paramètre requis',
        message: 'Fournissez au moins un critère : q, client, article, date, ou numero.',
        exemples: [
          '/api/factures/search?q=Acme',
          '/api/factures/search?client=Martin',
          '/api/factures/search?article=Licence',
          '/api/factures/search?date=2025-01-15',
          '/api/factures/search?numero=FAC-1024',
        ],
      });
    }

    const conditions = [];
    const params     = [];
    let   idx        = 1;

    if (numero) {
      conditions.push(`f.numero_facture ILIKE $${idx++}`);
      params.push(`%${numero}%`);
    }
    if (client) {
      conditions.push(`f.client_nom ILIKE $${idx++}`);
      params.push(`%${client}%`);
    }
    if (date) {
      conditions.push(`DATE(f.date_creation) = $${idx++}`);
      params.push(date);
    }
    if (article) {
      conditions.push(
        `EXISTS (SELECT 1 FROM articles a WHERE a.facture_id = f.id AND a.nom_article ILIKE $${idx++})`
      );
      params.push(`%${article}%`);
    }
    if (q) {
      // Recherche générale multi-champs
      conditions.push(`(
        f.numero_facture ILIKE $${idx}
        OR f.client_nom   ILIKE $${idx}
        OR f.client_email ILIKE $${idx}
        OR EXISTS (SELECT 1 FROM articles a WHERE a.facture_id = f.id AND a.nom_article ILIKE $${idx})
      )`);
      params.push(`%${q}%`);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await pool.query(
      `SELECT
         f.id,
         f.numero_facture,
         f.client_nom,
         f.client_email,
         f.date_creation,
         f.montant_total,
         f.statut,
         COUNT(a.id) AS nb_articles
       FROM factures f
       LEFT JOIN articles a ON a.facture_id = f.id
       ${whereClause}
       GROUP BY f.id
       ORDER BY f.date_creation DESC
       LIMIT 10`,
      params
    );

    res.json({
      found:           rows.length,
      results:         rows,
      search_criteria: { q, client, article, date, numero },
    });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/factures/:id — Détail d'une facture
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const id_facture = parsePositiveInt(req.params.id, 'id');

    const { rows } = await pool.query(
      `SELECT
         id, numero_facture, client_nom, client_email,
         date_creation, date_echeance,
         montant_ht, montant_tva, montant_total,
         statut, notes
       FROM factures
       WHERE id = $1
       LIMIT 1`,
      [id_facture]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error:   'Facture introuvable',
        message: `Aucune facture avec l'ID ${id_facture}.`,
        id_facture,
      });
    }

    res.json(rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
