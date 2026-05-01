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
      return res
        .status(400)
        .json({ error: "Body must contain a draft object" });
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

/**
 * POST /api/internal/tickets
 * Create a SAV ticket from draft data and mark the session as ticket_created.
 * Body: { ticketId, sessionId, draft }
 */
async function createTicketFromDraft(req, res, next) {
  try {
    const { ticketId, sessionId, draft } = req.body || {};
    if (!ticketId || !sessionId || !draft) {
      return res
        .status(400)
        .json({ error: "ticketId, sessionId and draft are required" });
    }

    // Optional: resolve the integer facture PK from numero_facture
    let factureId = null;
    const invoiceRef = draft.purchase?.invoice_id;
    if (invoiceRef) {
      const { rows: fRows } = await pool.query(
        "SELECT id FROM factures WHERE numero_facture = $1 LIMIT 1",
        [String(invoiceRef)],
      );
      if (fRows.length) factureId = fRows[0].id;
    }

    const issueDesc =
      draft.issue?.description ||
      draft.issue?.type ||
      "Non spécifié";
    const aiSummary =
      [draft.issue?.type, draft.issue?.description].filter(Boolean).join(": ") ||
      null;

    const { rows } = await pool.query(
      `INSERT INTO sav_tickets
         (ticket_id, facture_id, numero_facture, client_nom, client_email,
          order_date, issue_description, status, priority, ai_summary)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'open', 'medium', $8)
       RETURNING ticket_id, created_at`,
      [
        ticketId,
        factureId,
        invoiceRef ? String(invoiceRef) : null,
        draft.customer?.name || null,
        draft.customer?.email || null,
        draft.purchase?.date || null,
        issueDesc,
        aiSummary,
      ],
    );

    // Mark session as ticket_created so the frontend polling detects it
    await pool.query(
      `UPDATE sav_sessions
       SET draft = jsonb_set(COALESCE(draft, '{}'), '{status}', '"ticket_created"'),
           updated_at = NOW()
       WHERE session_id = $1`,
      [sessionId],
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
}

module.exports = { getSession, upsertSession, updateDraft, deleteSession, createTicketFromDraft };
