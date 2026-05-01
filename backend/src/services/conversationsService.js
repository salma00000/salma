"use strict";

const sessionModel = require("../models/sessionModel");
const messageModel = require("../models/messageModel");
const { computeLabel } = require("./sessionService");
const { sendMessage } = require("./n8nService");

async function listSessions(advisorId) {
  const rows = await sessionModel.listByAdvisor(advisorId);
  return rows.map((s) => ({ ...s, label: computeLabel(s) }));
}

async function createSession(sessionId, advisorId) {
  const existing = await sessionModel.findById(sessionId);
  if (existing) return { session: null, conflict: true };

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

  const session = await sessionModel.create(
    sessionId,
    advisorId,
    INITIAL_DRAFT,
  );
  return { session, conflict: false };
}

async function getSession(sessionId, advisorId) {
  const session = await sessionModel.findById(sessionId);
  if (!session) return { session: null, status: 404 };
  if (session.advisor_id !== advisorId) return { session: null, status: 403 };
  return { session, status: 200 };
}

async function deleteSession(sessionId, advisorId) {
  const { session, status } = await getSession(sessionId, advisorId);
  if (!session) return { ok: false, status };
  await sessionModel.remove(sessionId);
  return { ok: true };
}

async function getMessages(sessionId, advisorId) {
  const { session, status } = await getSession(sessionId, advisorId);
  if (!session) return { messages: null, status };
  const messages = await messageModel.findBySession(sessionId);
  return { messages, status: 200 };
}

async function addMessage(sessionId, advisorId, content) {
  const { session, status } = await getSession(sessionId, advisorId);
  if (!session) return { result: null, status };

  const userMessage = await messageModel.insert(sessionId, "user", content);
  const responseText = await sendMessage(sessionId, content);
  const assistantMessage = await messageModel.insert(
    sessionId,
    "assistant",
    responseText,
  );

  return { result: { userMessage, assistantMessage }, status: 201 };
}

module.exports = {
  listSessions,
  createSession,
  getSession,
  deleteSession,
  getMessages,
  addMessage,
};
