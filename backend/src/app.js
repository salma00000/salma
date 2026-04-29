require('dotenv').config();

const REQUIRED_ENV = ['DATABASE_URL', 'JWT_SECRET', 'N8N_WEBHOOK_URL', 'N8N_BASIC_AUTH_USER', 'N8N_BASIC_AUTH_PASSWORD'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) throw new Error(`Variable d'environnement manquante: ${key}`);
}

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const pool = require('./db/pool');
const errorHandler = require('./middleware/errorHandler');
const requireAuth = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const conversationRoutes = require('./routes/conversations');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json());

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch {
    res.status(503).json({ status: 'db_error' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/conversations', requireAuth, conversationRoutes);

app.use(errorHandler);

async function runMigrations() {
  const sql = fs.readFileSync(path.join(__dirname, '../migrations/001_init.sql'), 'utf8');
  await pool.query(sql);
  console.log('Migrations exécutées');
}

async function seedAdvisor() {
  const { rows } = await pool.query("SELECT id FROM advisors WHERE email = 'advisor@sav.com'");
  if (rows.length) return;
  const hash = await bcrypt.hash('password123', 10);
  await pool.query(
    `INSERT INTO advisors (email, password_hash, full_name) VALUES ('advisor@sav.com', $1, 'Test Advisor') ON CONFLICT DO NOTHING`,
    [hash]
  );
  console.log('Conseiller de test créé: advisor@sav.com / password123');
}

async function start() {
  await runMigrations();
  await seedAdvisor();
  const port = process.env.PORT || 3001;
  app.listen(port, () => console.log(`Backend SAV démarré sur le port ${port}`));
}

start().catch((err) => {
  console.error('Erreur au démarrage:', err);
  process.exit(1);
});

process.on('SIGTERM', () => pool.end());

module.exports = app;
