"use strict";

const prisma = require("../db/prisma");
const { Prisma } = require("@prisma/client");

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
 */
async function getSession(req, res, next) {
  try {
    const { sessionId } = req.params;
    const session = await prisma.savSession.findUnique({
      where: { session_id: sessionId },
      select: { session_id: true, draft: true, turn: true, updated_at: true },
    });
    res.json(session || {});
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
    const result = await prisma.savSession.upsert({
      where: { session_id: sessionId },
      create: { session_id: sessionId, draft: EMPTY_DRAFT, turn: 1 },
      update: { turn: { increment: 1 }, updated_at: new Date() },
      select: { session_id: true, draft: true, turn: true },
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/internal/sessions/:sessionId/draft
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
    try {
      const result = await prisma.savSession.update({
        where: { session_id: sessionId },
        data: { draft, updated_at: new Date() },
        select: { session_id: true, draft: true, turn: true },
      });
      res.json(result);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2025"
      ) {
        return res.status(404).json({ error: "Session not found" });
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/internal/sessions/:sessionId/status
 * Uses jsonb_set — requires raw query since Prisma doesn't support JSONB operators.
 */
async function updateStatus(req, res, next) {
  try {
    const { sessionId } = req.params;
    const { status } = req.body || {};
    if (!status || typeof status !== "string") {
      return res
        .status(400)
        .json({ error: "Body must contain a status string" });
    }
    const rows = await prisma.$queryRaw`
      UPDATE sav_sessions
      SET draft = jsonb_set(COALESCE(draft, '{}'), '{status}', ${JSON.stringify(status)}::jsonb),
          updated_at = NOW()
      WHERE session_id = ${sessionId}
      RETURNING session_id, draft, turn
    `;
    if (!rows[0]) return res.status(404).json({ error: "Session not found" });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/internal/sessions/:sessionId
 */
async function deleteSession(req, res, next) {
  try {
    const { sessionId } = req.params;
    await prisma.savSession.delete({ where: { session_id: sessionId } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/internal/tickets
 */
async function createTicketFromDraft(req, res, next) {
  try {
    const { ticketId, sessionId, draft } = req.body || {};
    if (!ticketId || !sessionId || !draft) {
      return res
        .status(400)
        .json({ error: "ticketId, sessionId and draft are required" });
    }

    let factureId = null;
    const invoiceRef = draft.purchase?.invoice_id;
    if (invoiceRef) {
      const facture = await prisma.facture.findUnique({
        where: { numero_facture: String(invoiceRef) },
        select: { id: true },
      });
      if (facture) factureId = facture.id;
    }

    const issueDesc =
      draft.issue?.description || draft.issue?.type || "Non spécifié";
    const aiSummary =
      [draft.issue?.type, draft.issue?.description]
        .filter(Boolean)
        .join(": ") || null;

    const ticket = await prisma.savTicket.create({
      data: {
        ticket_id: ticketId,
        facture_id: factureId,
        numero_facture: invoiceRef ? String(invoiceRef) : null,
        client_nom: draft.customer?.name || null,
        client_email: draft.customer?.email || null,
        order_date: draft.purchase?.date ? new Date(draft.purchase.date) : null,
        issue_description: issueDesc,
        status: "open",
        priority: "medium",
        ai_summary: aiSummary,
      },
      select: { ticket_id: true, created_at: true },
    });

    await prisma.$executeRaw`
      UPDATE sav_sessions
      SET draft = jsonb_set(COALESCE(draft, '{}'), '{status}', '"ticket_created"'),
          updated_at = NOW()
      WHERE session_id = ${sessionId}
    `;

    res.status(201).json(ticket);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSession,
  upsertSession,
  updateDraft,
  updateStatus,
  deleteSession,
  createTicketFromDraft,
};
