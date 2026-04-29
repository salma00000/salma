'use strict';

const express  = require('express');
const pool     = require('./services/db');

const facturesRouter = require('./routes/factures');
const articlesRouter = require('./routes/articles');
const savRouter      = require('./routes/sav');

const app  = express();
const PORT = process.env.API_PORT || 3000;

// ─────────────────────────────────────────────────────────────────────────────
// Middlewares
// ─────────────────────────────────────────────────────────────────────────────
app.use(express.json());

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ─────────────────────────────────────────────────────────────────────────────
// Health check
// ─────────────────────────────────────────────────────────────────────────────
app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', api: 'running', database: 'connected', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'degraded', api: 'running', database: 'unreachable', error: err.message, timestamp: new Date().toISOString() });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Routes métier
// ─────────────────────────────────────────────────────────────────────────────
app.use('/api/factures', facturesRouter);
app.use('/api/articles', articlesRouter);
app.use('/api/sav',      savRouter);

// ─────────────────────────────────────────────────────────────────────────────
// 404
// ─────────────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error: 'Route introuvable',
    path:  req.path,
    routes_disponibles: [
      'GET  /health',
      'GET  /api/factures',
      'GET  /api/factures/search?q=...',
      'GET  /api/factures/:id',
      'GET  /api/articles?facture_id=X',
      'POST /api/sav/tickets',
      'GET  /api/sav/tickets',
      'GET  /api/sav/tickets/:ticket_id',
      'PATCH /api/sav/tickets/:ticket_id',
    ],
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Gestionnaire d'erreurs global
// ─────────────────────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  console.error(`[ERROR ${status}]`, err.message);
  res.status(status).json({ error: err.message });
});

// ─────────────────────────────────────────────────────────────────────────────
// Démarrage
// ─────────────────────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`✅  API SAV Factures démarrée sur http://localhost:${PORT}`);
  console.log('📌  Routes :');
  console.log(`     GET  /health`);
  console.log(`     GET  /api/factures`);
  console.log(`     GET  /api/factures/search?q=...`);
  console.log(`     GET  /api/factures/:id`);
  console.log(`     GET  /api/articles?facture_id=X`);
  console.log(`     POST /api/sav/tickets`);
  console.log(`     GET  /api/sav/tickets`);
  console.log(`     GET  /api/sav/tickets/:ticket_id`);
  console.log(`    PATCH /api/sav/tickets/:ticket_id`);
});

process.on('SIGTERM', () => server.close(() => { pool.end(); process.exit(0); }));
process.on('SIGINT',  () => server.close(() => { pool.end(); process.exit(0); }));
