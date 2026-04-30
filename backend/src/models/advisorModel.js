"use strict";

const pool = require("../db/pool");

async function findByEmail(email) {
  const { rows } = await pool.query("SELECT * FROM advisors WHERE email = $1", [
    email,
  ]);
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await pool.query(
    "SELECT id, email, full_name, created_at FROM advisors WHERE id = $1",
    [id],
  );
  return rows[0] || null;
}

module.exports = { findByEmail, findById };
