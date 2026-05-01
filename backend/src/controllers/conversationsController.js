"use strict";

const svc = require("../services/conversationsService");
const { computeLabel } = require("../services/sessionService");

const NOT_FOUND = { error: "Session introuvable" };
const FORBIDDEN = { error: "Accès refusé" };

async function list(req, res, next) {
  try {
    res.json(await svc.listSessions(req.advisor.id));
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { session_id } = req.body;
    if (!session_id)
      return res.status(400).json({ error: "session_id requis" });

    const { session, conflict } = await svc.createSession(
      session_id,
      req.advisor.id,
    );
    if (conflict)
      return res.status(409).json({ error: "Session déjà existante" });

    res.status(201).json({ ...session, label: computeLabel(session) });
  } catch (err) {
    next(err);
  }
}

async function get(req, res, next) {
  try {
    const { session, status } = await svc.getSession(
      req.params.sessionId,
      req.advisor.id,
    );
    if (!session)
      return res.status(status).json(status === 404 ? NOT_FOUND : FORBIDDEN);
    res.json({ ...session, label: computeLabel(session) });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const { ok, status } = await svc.deleteSession(
      req.params.sessionId,
      req.advisor.id,
    );
    if (!ok)
      return res.status(status).json(status === 404 ? NOT_FOUND : FORBIDDEN);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function getMessages(req, res, next) {
  try {
    const { messages, status } = await svc.getMessages(
      req.params.sessionId,
      req.advisor.id,
    );
    if (!messages)
      return res.status(status).json(status === 404 ? NOT_FOUND : FORBIDDEN);
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

    const { result, status } = await svc.addMessage(
      req.params.sessionId,
      req.advisor.id,
      content.trim(),
    );
    if (!result)
      return res.status(status).json(status === 404 ? NOT_FOUND : FORBIDDEN);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, get, remove, getMessages, addMessage };
