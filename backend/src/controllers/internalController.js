"use strict";

const pool = require("../db/pool");

const EMPTY_DRAFT = {
  customer: {},
  product: {},
  purchase: {},
  issue: {},
  history: [],
  missing_fields: [],
  warnings: [],
  status: "draft",
};

/**
 * GET /api/internal/sessions/:sessionId
 * Returns the session row, or {} if not found (mirrors PG Load Session alwaysOutputData behaviour).
 */
async function getSession(req, res, next) {
  try {
    const { sessionId } = req.params;
    const { rows } = await pool.query(
      "SELECT session_id, draft, turn, updated_at FROM sav_sessions WHERE session_id = $1",
      [sessionId],
    );
    res.json(rows[0] || {});
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/internal/sessions/:sessionId
 * Insert or increment turn (mirrors PG New Session ON CONFLICT logic).
 */
async function upsertSession(req, res, next) {
  try {
    const { sessionId } = req.params;
    const { rows } = await pool.query(
      `INSERT INTO sav_sessions (session_id, draft, turn, updated_at)
       VALUES ($1, $2::jsonb, 1, NOW())
       ON CONFLICT (session_id)
       DO UPDATE SET turn = sav_sessions.turn + 1, updated_at = NOW()
       RETURNING session_id, draft, turn`,
      [sessionId, JSON.stringify(EMPTY_DRAFT)],
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/internal/sessions/:sessionId/draft
 * Update the draft JSONB column (mirrors PG Save Session / PG Save Final).
 * Body: { draft: <object> }
 */
async function updateDraft(req, res, next) {
  try {
    const { sessionId } = req.params;
    const { draft } = req.body;
    if (!draft || typeof draft !== "object") {
      return res.status(400).json({ error: "Body must contain a draft object" });
    }
    const { rows } = await pool.query(
      `UPDATE sav_sessions
       SET draft = $1::jsonb, updated_at = NOW()
       WHERE session_id = $2
       RETURNING session_id, draft, turn`,
      [JSON.stringify(draft), sessionId],
    );
    if (!rows[0]) return res.status(404).json({ error: "Session not found" });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/internal/sessions/:sessionId
 * Remove the session row (mirrors Cleanup Session / Cancel Session).
 */
async function deleteSession(req, res, next) {
  try {
    const { sessionId } = req.params;
    await pool.query("DELETE FROM sav_sessions WHERE session_id = $1", [
      sessionId,
    ]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { getSession, upsertSession, updateDraft, deleteSession };
