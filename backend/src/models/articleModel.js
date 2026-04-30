"use strict";

const pool = require("../db/pool");

async function findByFactureId(factureId) {
  const { rows } = await pool.query(
    `SELECT id, facture_id, nom_article, description, quantite, prix_unitaire, sous_total
     FROM articles WHERE facture_id = $1 ORDER BY id ASC`,
    [factureId],
  );
  return rows;
}

module.exports = { findByFactureId };
