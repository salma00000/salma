"use strict";

const sessionModel = require("../models/sessionModel");

const INITIAL_DRAFT = {
  customer: {
    name: null,
    email: null,
    phone: null,
    loyalty_tier: null,
    id: null,
  },
  product: { label: null, brand: null, sku: null, category: null },
  purchase: {
    invoice_id: null,
    date: null,
    store: null,
    under_warranty: null,
    warranty_end: null,
    amount: null,
  },
  issue: { type: null, description: null },
  warnings: [],
  missing_fields: [],
  status: "draft",
};

function computeLabel(session) {
  const d = session.draft;
  const parts = [
    d?.customer?.name,
    d?.purchase?.invoice_id,
    d?.issue?.type,
  ].filter(Boolean);
  return parts.length ? parts.join(" — ") : session.session_id;
}

async function getSession(sessionId) {
  return sessionModel.findById(sessionId);
}

async function createSession(sessionId, advisorId) {
  return sessionModel.create(sessionId, advisorId, INITIAL_DRAFT);
}

async function listSessions(advisorId) {
  const rows = await sessionModel.listByAdvisor(advisorId);
  return rows.map((s) => ({ ...s, label: computeLabel(s) }));
}

async function deleteSession(sessionId) {
  return sessionModel.remove(sessionId);
}

module.exports = {
  getSession,
  createSession,
  computeLabel,
  listSessions,
  deleteSession,
};
