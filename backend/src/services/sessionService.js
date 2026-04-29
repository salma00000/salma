const pool = require('../db/pool');

async function getSession(sessionId) {
  const { rows } = await pool.query(
    'SELECT * FROM sav_sessions WHERE session_id = $1',
    [sessionId]
  );
  return rows[0] || null;
}

async function createSession(sessionId, advisorId) {
  const draft = {
    customer: { name: null, email: null, phone: null, loyalty_tier: null, id: null },
    product: { label: null, brand: null, sku: null, category: null },
    purchase: { invoice_id: null, date: null, store: null, under_warranty: null, warranty_end: null, amount: null },
    issue: { type: null, description: null },
    warnings: [],
    missing_fields: [],
    status: 'draft',
  };
  const { rows } = await pool.query(
    `INSERT INTO sav_sessions (session_id, draft, turn, advisor_id, updated_at)
     VALUES ($1, $2, 0, $3, now())
     RETURNING *`,
    [sessionId, JSON.stringify(draft), advisorId]
  );
  return rows[0];
}

function computeLabel(session) {
  const d = session.draft;
  const parts = [d?.customer?.name, d?.purchase?.invoice_id, d?.issue?.type].filter(Boolean);
  return parts.length ? parts.join(' — ') : session.session_id;
}

async function listSessions(advisorId) {
  const { rows } = await pool.query(
    `SELECT * FROM sav_sessions WHERE advisor_id = $1 ORDER BY updated_at DESC`,
    [advisorId]
  );
  return rows.map((s) => ({ ...s, label: computeLabel(s) }));
}

async function deleteSession(sessionId) {
  await pool.query('DELETE FROM sav_sessions WHERE session_id = $1', [sessionId]);
}

module.exports = { getSession, createSession, computeLabel, listSessions, deleteSession };
