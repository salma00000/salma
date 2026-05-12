"use strict";

const prisma = require("../db/prisma");
const { Prisma } = require("@prisma/client");

const EMPTY_DRAFT = {
  customer: {},
  invoice: {},
  product: {},
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
      return res.status(400).json({ error: "Body must contain a draft object" });
    }
    try {
      const result = await prisma.savSession.update({
        where: { session_id: sessionId },
        data: { draft, updated_at: new Date() },
        select: { session_id: true, draft: true, turn: true },
      });
      res.json(result);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
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
 */
async function updateStatus(req, res, next) {
  try {
    const { sessionId } = req.params;
    const { status } = req.body || {};
    if (!status || typeof status !== "string") {
      return res.status(400).json({ error: "Body must contain a status string" });
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
 * POST /api/internal/folders
 * Creates a sav_folder from the AI draft and marks session as folder_created.
 */
async function createFolderFromDraft(req, res, next) {
  try {
    const { folderRef, sessionId, draft } = req.body || {};
    if (!folderRef || !sessionId || !draft) {
      return res.status(400).json({ error: "folderRef, sessionId and draft are required" });
    }

    let invoiceDbId = null;
    const invoiceNumber = draft.invoice?.invoice_number;
    if (invoiceNumber) {
      const invoice = await prisma.invoice.findUnique({
        where: { invoice_number: String(invoiceNumber) },
        select: { id: true, customer_id: true },
      });
      if (invoice) invoiceDbId = invoice.id;
    }

    let customerId = null;
    if (invoiceDbId) {
      const inv = await prisma.invoice.findUnique({
        where: { id: invoiceDbId },
        select: { customer_id: true },
      });
      customerId = inv?.customer_id ?? null;
    }

    const issueDesc = draft.issue?.description || draft.issue?.type || "Non spécifié";
    const aiSummary =
      [draft.issue?.type, draft.issue?.description].filter(Boolean).join(": ") || null;

    const folder = await prisma.savFolder.create({
      data: {
        folder_reference: folderRef,
        customer_id: customerId,
        invoice_id: invoiceDbId,
        invoice_number: invoiceNumber ? String(invoiceNumber) : null,
        issue_type: draft.issue?.type || null,
        issue_description: issueDesc,
        product_state: draft.product?.state || null,
        status: "open",
        priority: "medium",
        ai_summary: aiSummary,
      },
      select: { folder_reference: true, created_at: true },
    });

    await prisma.$executeRaw`
      UPDATE sav_sessions
      SET draft = jsonb_set(COALESCE(draft, '{}'), '{status}', '"folder_created"'),
          updated_at = NOW()
      WHERE session_id = ${sessionId}
    `;

    res.status(201).json(folder);
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
  createFolderFromDraft,
};
