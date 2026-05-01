"use strict";

const sessionModel = require("../models/sessionModel");

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

module.exports = { computeLabel, getSession };
