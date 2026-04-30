"use strict";

const pool = require("../db/pool");

async function insert({
  ticket_id,
  facture_id,
  numero_facture,
  client_nom,
  client_email,
  order_date,
  issue_description,
  status,
  priority,
  ai_summary,
}) {
  const { rows } = await pool.query(
    `INSERT INTO sav_tickets
       (ticket_id, facture_id, numero_facture, client_nom, client_email,
        order_date, issue_description, status, priority, ai_summary)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [
      ticket_id,
      facture_id,
      numero_facture,
      client_nom,
      client_email,
      order_date,
      issue_description,
      status,
      priority,
      ai_summary,
    ],
  );
  return rows[0];
}

async function findAll({ status, priority } = {}) {
  const conditions = [];
  const params = [];
  let idx = 1;

  if (status) {
    conditions.push(`t.status = $${idx++}`);
    params.push(status);
  }
  if (priority) {
    conditions.push(`t.priority = $${idx++}`);
    params.push(priority);
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  const { rows } = await pool.query(
    `SELECT t.ticket_id, t.facture_id, t.numero_facture, t.client_nom,
            t.issue_description, t.status, t.priority, t.created_at, f.montant_total
     FROM sav_tickets t LEFT JOIN factures f ON f.id = t.facture_id
     ${whereClause}
     ORDER BY t.created_at DESC LIMIT 50`,
    params,
  );

  return rows;
}

async function findByTicketId(ticketId) {
  const { rows } = await pool.query(
    `SELECT t.*, f.montant_ht, f.montant_tva, f.montant_total,
            f.date_echeance, f.statut AS invoice_status, f.notes AS facture_notes
     FROM sav_tickets t LEFT JOIN factures f ON f.id = t.facture_id
     WHERE t.ticket_id = $1`,
    [ticketId],
  );
  return rows[0] || null;
}

async function updateStatus(ticketId, status) {
  const { rows } = await pool.query(
    "UPDATE sav_tickets SET status = $1, updated_at = NOW() WHERE ticket_id = $2 RETURNING *",
    [status, ticketId],
  );
  return rows[0] || null;
}

module.exports = { insert, findAll, findByTicketId, updateStatus };
