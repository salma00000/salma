"use strict";

const pool = require("../db/pool");

const FACTURE_COLUMNS = `
  id, numero_facture, client_nom, client_email, client_phone, client_loyalty_tier, customer_id,
  date_creation, date_echeance,
  montant_ht, montant_tva, montant_total, statut,
  store, notes
`;

async function findAll({ page = 1, limit = 20 } = {}) {
  const safeLimit = Math.min(100, Math.max(1, limit));
  const offset = (Math.max(1, page) - 1) * safeLimit;

  const { rows } = await pool.query(
    `SELECT ${FACTURE_COLUMNS}
     FROM factures ORDER BY date_creation DESC LIMIT $1 OFFSET $2`,
    [safeLimit, offset],
  );
  const { rows: countRows } = await pool.query("SELECT COUNT(*) FROM factures");

  return { data: rows, total: parseInt(countRows[0].count, 10) };
}

async function search({ q, client, article, date, numero } = {}) {
  const conditions = [];
  const params = [];
  let idx = 1;

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
      `EXISTS (SELECT 1 FROM articles a WHERE a.facture_id = f.id AND a.nom_article ILIKE $${idx++})`,
    );
    params.push(`%${article}%`);
  }
  if (q) {
    conditions.push(`(
      f.numero_facture ILIKE $${idx}
      OR f.client_nom   ILIKE $${idx}
      OR f.client_email ILIKE $${idx}
      OR EXISTS (SELECT 1 FROM articles a WHERE a.facture_id = f.id AND a.nom_article ILIKE $${idx})
    )`);
    params.push(`%${q}%`);
    idx++;
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  const { rows } = await pool.query(
    `SELECT f.id, f.numero_facture, f.client_nom, f.client_email,
            f.date_creation, f.montant_total, f.statut, COUNT(a.id) AS nb_articles
     FROM factures f LEFT JOIN articles a ON a.facture_id = f.id
     ${whereClause}
     GROUP BY f.id ORDER BY f.date_creation DESC LIMIT 10`,
    params,
  );

  return rows;
}

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT ${FACTURE_COLUMNS} FROM factures WHERE id = $1 LIMIT 1`,
    [id],
  );
  return rows[0] || null;
}

async function findByNumero(numero) {
  const { rows } = await pool.query(
    `SELECT ${FACTURE_COLUMNS} FROM factures WHERE numero_facture = $1 LIMIT 1`,
    [numero],
  );
  return rows[0] || null;
}

module.exports = { findAll, search, findById, findByNumero };
