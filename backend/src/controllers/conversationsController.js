"use strict";

const {
  getSession,
  createSession,
  computeLabel,
  listSessions,
  deleteSession,
} = require("../services/sessionService");
const { sendMessage } = require("../services/n8nService");
const messageModel = require("../models/messageModel");

async function list(req, res, next) {
  try {
    const sessions = await listSessions(req.advisor.id);
    res.json(sessions);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { session_id } = req.body;
    if (!session_id)
      return res.status(400).json({ error: "session_id requis" });

    const existing = await getSession(session_id);
    if (existing)
      return res.status(409).json({ error: "Session déjà existante" });

    const session = await createSession(session_id, req.advisor.id);
    res.status(201).json({ ...session, label: computeLabel(session) });
  } catch (err) {
    next(err);
  }
}

async function get(req, res, next) {
  try {
    const session = await getSession(req.params.sessionId);
    if (!session) return res.status(404).json({ error: "Session introuvable" });
    if (session.advisor_id !== req.advisor.id)
      return res.status(403).json({ error: "Accès refusé" });
    res.json({ ...session, label: computeLabel(session) });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const session = await getSession(req.params.sessionId);
    if (!session) return res.status(404).json({ error: "Session introuvable" });
    if (session.advisor_id !== req.advisor.id)
      return res.status(403).json({ error: "Accès refusé" });
    await deleteSession(req.params.sessionId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function getMessages(req, res, next) {
  try {
    const session = await getSession(req.params.sessionId);
    if (!session) return res.status(404).json({ error: "Session introuvable" });
    if (session.advisor_id !== req.advisor.id)
      return res.status(403).json({ error: "Accès refusé" });
    const messages = await messageModel.findBySession(req.params.sessionId);
    res.json(messages);
  } catch (err) {
    next(err);
  }
}

async function addMessage(req, res, next) {
  try {
    const { content } = req.body;
    if (!content?.trim())
      return res.status(400).json({ error: "Contenu du message requis" });

    const session = await getSession(req.params.sessionId);
    if (!session) return res.status(404).json({ error: "Session introuvable" });
    if (session.advisor_id !== req.advisor.id)
      return res.status(403).json({ error: "Accès refusé" });

    const userMessage = await messageModel.insert(
      req.params.sessionId,
      "user",
      content.trim(),
    );
    const responseText = await sendMessage(
      req.params.sessionId,
      content.trim(),
    );
    const assistantMessage = await messageModel.insert(
      req.params.sessionId,
      "assistant",
      responseText,
    );

    res.status(201).json({ userMessage, assistantMessage });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, get, remove, getMessages, addMessage };
