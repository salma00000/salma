require("dotenv").config();

const REQUIRED_ENV = [
  "DATABASE_URL",
  "JWT_SECRET",
  "N8N_WEBHOOK_URL",
  "N8N_BASIC_AUTH_USER",
  "N8N_BASIC_AUTH_PASSWORD",
  "N8N_INTERNAL_KEY",
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
const prisma = require("./db/prisma");
const errorHandler = require("./middleware/errorHandler");
const requireAuth = require("./middleware/auth");
const authRoutes = require("./routes/auth");
const conversationRoutes = require("./routes/conversations");
const facturesRoutes = require("./routes/factures");
const articlesRoutes = require("./routes/articles");
const savRoutes = require("./routes/sav");
const internalRoutes = require("./routes/internal");
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
    await prisma.$queryRaw`SELECT 1`;
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
app.use("/api/internal", internalRoutes);
app.use("/api-docs", swaggerRouter);

app.use(errorHandler);

// Split SQL into individual statements, treating $$...$$  dollar-quoted blocks
// (used in PL/pgSQL function bodies) as opaque — they may contain semicolons.
function splitSQLStatements(sql) {
  const stmts = [];
  const parts = sql.split("$$");
  let current = "";

  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      // Outside dollar-quote: split on semicolons
      const segments = parts[i].split(";");
      for (let j = 0; j < segments.length - 1; j++) {
        const stmt = (current + segments[j]).trim();
        if (stmt) stmts.push(stmt);
        current = "";
      }
      current += segments[segments.length - 1];
    } else {
      // Inside dollar-quote: treat as opaque text
      current += "$$" + parts[i] + "$$";
    }
  }

  const last = current.trim();
  if (last) stmts.push(last);
  return stmts.filter((s) => s.trim().length > 0);
}

async function runMigrations() {
  const migrationsDir = path.join(__dirname, "../migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    const statements = splitSQLStatements(sql);
    for (const stmt of statements) {
      await prisma.$executeRawUnsafe(stmt);
    }
    console.log(`Migration exécutée: ${file}`);
  }
}

async function seedAdvisor() {
  const existing = await prisma.advisor.findUnique({
    where: { email: "advisor@sav.com" },
    select: { id: true },
  });
  if (existing) return;
  const hash = await bcrypt.hash("password123", 10);
  await prisma.advisor.create({
    data: {
      email: "advisor@sav.com",
      password_hash: hash,
      full_name: "Test Advisor",
    },
  });
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

process.on("SIGTERM", () => prisma.$disconnect());

module.exports = app;
