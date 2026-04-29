const router = require('express').Router();
const pool = require('../db/pool');
const { getSession, createSession, computeLabel, listSessions, deleteSession } = require('../services/sessionService');
const { sendMessage } = require('../services/n8nService');

// GET /api/conversations
router.get('/', async (req, res, next) => {
  try {
    const sessions = await listSessions(req.advisor.id);
    res.json(sessions);
  } catch (err) {
    next(err);
  }
});

// POST /api/conversations
router.post('/', async (req, res, next) => {
  try {
    const { session_id } = req.body;
    if (!session_id) return res.status(400).json({ error: 'session_id requis' });

    const existing = await getSession(session_id);
    if (existing) return res.status(409).json({ error: 'Session déjà existante' });

    const session = await createSession(session_id, req.advisor.id);
    res.status(201).json({ ...session, label: computeLabel(session) });
  } catch (err) {
    next(err);
  }
});

// GET /api/conversations/:sessionId
router.get('/:sessionId', async (req, res, next) => {
  try {
    const session = await getSession(req.params.sessionId);
    if (!session) return res.status(404).json({ error: 'Session introuvable' });
    if (session.advisor_id !== req.advisor.id) return res.status(403).json({ error: 'Accès refusé' });
    res.json({ ...session, label: computeLabel(session) });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/conversations/:sessionId
router.delete('/:sessionId', async (req, res, next) => {
  try {
    const session = await getSession(req.params.sessionId);
    if (!session) return res.status(404).json({ error: 'Session introuvable' });
    if (session.advisor_id !== req.advisor.id) return res.status(403).json({ error: 'Accès refusé' });
    await deleteSession(req.params.sessionId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// GET /api/conversations/:sessionId/messages
router.get('/:sessionId/messages', async (req, res, next) => {
  try {
    const session = await getSession(req.params.sessionId);
    if (!session) return res.status(404).json({ error: 'Session introuvable' });
    if (session.advisor_id !== req.advisor.id) return res.status(403).json({ error: 'Accès refusé' });

    const { rows } = await pool.query(
      'SELECT * FROM sav_messages WHERE session_id = $1 ORDER BY created_at ASC',
      [req.params.sessionId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/conversations/:sessionId/messages
router.post('/:sessionId/messages', async (req, res, next) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Contenu du message requis' });

    const session = await getSession(req.params.sessionId);
    if (!session) return res.status(404).json({ error: 'Session introuvable' });
    if (session.advisor_id !== req.advisor.id) return res.status(403).json({ error: 'Accès refusé' });

    // Save user message
    const { rows: [userMessage] } = await pool.query(
      `INSERT INTO sav_messages (session_id, role, content) VALUES ($1, 'user', $2) RETURNING *`,
      [req.params.sessionId, content.trim()]
    );

    // Proxy to n8n
    const responseText = await sendMessage(req.params.sessionId, content.trim());

    // Save assistant message
    const { rows: [assistantMessage] } = await pool.query(
      `INSERT INTO sav_messages (session_id, role, content) VALUES ($1, 'assistant', $2) RETURNING *`,
      [req.params.sessionId, responseText]
    );

    res.status(201).json({ userMessage, assistantMessage });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
