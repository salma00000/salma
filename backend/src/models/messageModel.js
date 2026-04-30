"use strict";

const pool = require("../db/pool");

async function findBySession(sessionId) {
  const { rows } = await pool.query(
    "SELECT * FROM sav_messages WHERE session_id = $1 ORDER BY created_at ASC",
    [sessionId],
  );
  return rows;
}

async function insert(sessionId, role, content) {
  const { rows } = await pool.query(
    "INSERT INTO sav_messages (session_id, role, content) VALUES ($1, $2, $3) RETURNING *",
    [sessionId, role, content],
  );
  return rows[0];
}

module.exports = { findBySession, insert };
