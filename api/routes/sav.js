'use strict';

const { Router }                       = require('express');
const pool                             = require('../services/db');
const { generateTicketId, buildSavTicket } = require('../services/sav-generator');

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/sav/tickets — Créer un ticket SAV
//
// Body (JSON) :
//   facture_id        {number}  requis
//   issue_description {string}  requis
//   priority          {string}  optionnel — low | medium | high | critical
//   ai_summary        {string}  optionnel — résumé IA
// ─────────────────────────────────────────────────────────────────────────────
router.post('/tickets', async (req, res, next) => {
  try {
    const { facture_id, issue_description, priority = 'medium', ai_summary = '' } = req.body || {};

    // Validation
    if (!facture_id || !issue_description) {
      return res.status(400).json({
        error:    'Champs requis manquants',
        message:  '"facture_id" et "issue_description" sont obligatoires.',
        required: ['facture_id', 'issue_description'],
      });
    }

    const facture_id_int = parseInt(facture_id, 10);
    if (isNaN(facture_id_int) || facture_id_int <= 0) {
      return res.status(400).json({ error: '"facture_id" doit être un entier positif.' });
    }

    if (typeof issue_description !== 'string' || issue_description.trim().length < 5) {
      return res.status(400).json({ error: '"issue_description" doit faire au moins 5 caractères.' });
    }

    // Récupérer la facture
    const { rows: factureRows } = await pool.query(
      `SELECT id, numero_facture, client_nom, client_email,
              date_creation, montant_ht, montant_tva, montant_total, statut
       FROM factures WHERE id = $1 LIMIT 1`,
      [facture_id_int]
    );

    if (factureRows.length === 0) {
      return res.status(404).json({
        error:     'Facture introuvable',
        message:   `La facture avec l'ID ${facture_id_int} n'existe pas.`,
        facture_id: facture_id_int,
      });
    }

    const facture = factureRows[0];

    // Récupérer les articles
    const { rows: articleRows } = await pool.query(
      `SELECT nom_article, description, quantite, prix_unitaire, sous_total
       FROM articles WHERE facture_id = $1 ORDER BY id ASC`,
      [facture.id]
    );

    // Construire le ticket SAV
    const ticket = buildSavTicket({
      facture,
      articles:          articleRows,
      issue_description: issue_description.trim(),
      priority,
      ai_summary,
    });

    // Persister en base
    const { rows: insertRows } = await pool.query(
      `INSERT INTO sav_tickets
         (ticket_id, facture_id, numero_facture, client_nom, client_email,
          order_date, issue_description, status, priority, ai_summary)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'open', $8, $9)
       RETURNING *`,
      [
        ticket.ticket_id,
        facture.id,
        facture.numero_facture,
        facture.client_nom,
        facture.client_email || '',
        facture.date_creation,
        ticket.issue_description,
        ticket.priority,
        ticket.ai_summary,
      ]
    );

    // Réponse complète avec les produits embarqués
    res.status(201).json({
      ...insertRows[0],
      invoice_total:  ticket.invoice_total,
      invoice_status: ticket.invoice_status,
      products:       ticket.products,
    });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/sav/tickets — Liste des tickets SAV (50 derniers)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/tickets', async (req, res, next) => {
  try {
    const status   = req.query.status;
    const priority = req.query.priority;

    const conditions = [];
    const params     = [];
    let   idx        = 1;

    if (status)   { conditions.push(`t.status   = $${idx++}`); params.push(status); }
    if (priority) { conditions.push(`t.priority = $${idx++}`); params.push(priority); }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await pool.query(
      `SELECT t.ticket_id, t.facture_id, t.numero_facture, t.client_nom,
              t.issue_description, t.status, t.priority, t.created_at,
              f.montant_total
       FROM sav_tickets t
       LEFT JOIN factures f ON f.id = t.facture_id
       ${whereClause}
       ORDER BY t.created_at DESC
       LIMIT 50`,
      params
    );

    res.json({ tickets: rows, total: rows.length });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/sav/tickets/:ticket_id — Détail d'un ticket SAV
// ─────────────────────────────────────────────────────────────────────────────
router.get('/tickets/:ticket_id', async (req, res, next) => {
  try {
    const { ticket_id } = req.params;

    // Validation format : SAV-YYYYMMDD-XXXX
    if (!/^SAV-[A-Z0-9\-]{5,20}$/.test(ticket_id)) {
      return res.status(400).json({ error: 'Format ticket_id invalide. Ex: SAV-20260310-A3F2' });
    }

    const { rows } = await pool.query(
      `SELECT
         t.*,
         f.montant_ht, f.montant_tva, f.montant_total,
         f.date_echeance, f.statut AS invoice_status,
         f.notes AS facture_notes
       FROM sav_tickets t
       LEFT JOIN factures f ON f.id = t.facture_id
       WHERE t.ticket_id = $1`,
      [ticket_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: `Ticket "${ticket_id}" introuvable.` });
    }

    // Articles de la facture associée
    const { rows: articleRows } = await pool.query(
      `SELECT nom_article, description, quantite, prix_unitaire, sous_total
       FROM articles WHERE facture_id = $1 ORDER BY id ASC`,
      [rows[0].facture_id]
    );

    res.json({ ...rows[0], products: articleRows });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/sav/tickets/:ticket_id — Mettre à jour le statut d'un ticket
// Body: { status: "in_progress" | "resolved" | "closed" }
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/tickets/:ticket_id', async (req, res, next) => {
  try {
    const { ticket_id } = req.params;
    const { status }    = req.body || {};

    if (!/^SAV-[A-Z0-9\-]{5,20}$/.test(ticket_id)) {
      return res.status(400).json({ error: 'Format ticket_id invalide.' });
    }

    const VALID_STATUSES = ['open', 'in_progress', 'resolved', 'closed'];
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        error:   'Statut invalide.',
        allowed: VALID_STATUSES,
      });
    }

    const { rows } = await pool.query(
      `UPDATE sav_tickets SET status = $1, updated_at = NOW()
       WHERE ticket_id = $2 RETURNING *`,
      [status, ticket_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: `Ticket "${ticket_id}" introuvable.` });
    }

    res.json(rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
