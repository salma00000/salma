"use strict";

const pool = require("../db/pool");

async function findById(sessionId) {
  const { rows } = await pool.query(
    "SELECT * FROM sav_sessions WHERE session_id = $1",
    [sessionId],
  );
  return rows[0] || null;
}

async function create(sessionId, advisorId, draft) {
  const { rows } = await pool.query(
    `INSERT INTO sav_sessions (session_id, draft, turn, advisor_id, updated_at)
     VALUES ($1, $2, 0, $3, now()) RETURNING *`,
    [sessionId, JSON.stringify(draft), advisorId],
  );
  return rows[0];
}

async function listByAdvisor(advisorId) {
  const { rows } = await pool.query(
    "SELECT * FROM sav_sessions WHERE advisor_id = $1 ORDER BY updated_at DESC",
    [advisorId],
  );
  return rows;
}

async function remove(sessionId) {
  await pool.query("DELETE FROM sav_sessions WHERE session_id = $1", [
    sessionId,
  ]);
}

module.exports = { findById, create, listByAdvisor, remove };
