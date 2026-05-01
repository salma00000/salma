require("dotenv").config();

const REQUIRED_ENV = [
  "DATABASE_URL",
  "JWT_SECRET",
  "N8N_WEBHOOK_URL",
  "N8N_BASIC_AUTH_USER",
  "N8N_BASIC_AUTH_PASSWORD",
];
for (const key of REQUIRED_ENV) {
  if (!process.env[key])
    throw new Error(`Variable d'environnement manquante: ${key}`);
}

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const pool = require("./db/pool");
const errorHandler = require("./middleware/errorHandler");
const requireAuth = require("./middleware/auth");
const authRoutes = require("./routes/auth");
const conversationRoutes = require("./routes/conversations");
const facturesRoutes = require("./routes/factures");
const articlesRoutes = require("./routes/articles");
const savRoutes = require("./routes/sav");
const swaggerRouter = require("./swagger/router");

const app = express();

app.set("trust proxy", 1);
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({
      status: "ok",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch {
    res
      .status(503)
      .json({ status: "db_error", timestamp: new Date().toISOString() });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/conversations", requireAuth, conversationRoutes);
app.use("/api/factures", facturesRoutes);
app.use("/api/articles", articlesRoutes);
app.use("/api/sav", savRoutes);
app.use("/api-docs", swaggerRouter);

app.use(errorHandler);

async function runMigrations() {
  const migrationsDir = path.join(__dirname, "../migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    await pool.query(sql);
    console.log(`Migration exécutée: ${file}`);
  }
}

async function seedAdvisor() {
  const { rows } = await pool.query(
    "SELECT id FROM advisors WHERE email = 'advisor@sav.com'",
  );
  if (rows.length) return;
  const hash = await bcrypt.hash("password123", 10);
  await pool.query(
    `INSERT INTO advisors (email, password_hash, full_name) VALUES ('advisor@sav.com', $1, 'Test Advisor') ON CONFLICT DO NOTHING`,
    [hash],
  );
  console.log("Conseiller de test créé: advisor@sav.com / password123");
}

async function start() {
  await runMigrations();
  await seedAdvisor();
  const port = process.env.PORT || 3002;
  app.listen(port, () =>
    console.log(`Backend SAV démarré sur le port ${port}`),
  );
}

start().catch((err) => {
  console.error("Erreur au démarrage:", err);
  process.exit(1);
});

process.on("SIGTERM", () => pool.end());

module.exports = app;
