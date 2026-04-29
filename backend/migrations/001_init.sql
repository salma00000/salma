-- ═══════════════════════════════════════════════════════════════
-- Migration 001 — SAV Assistant tables
-- ═══════════════════════════════════════════════════════════════

-- Sessions n8n (created by backend, updated by n8n workflow)
CREATE TABLE IF NOT EXISTS sav_sessions (
  session_id TEXT PRIMARY KEY,
  draft      JSONB,
  turn       INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT now()
);

-- Advisors (store staff who use the app)
CREATE TABLE IF NOT EXISTS advisors (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  created_at    TIMESTAMP DEFAULT now()
);

-- Chat messages (persisted by backend, displayed in UI)
CREATE TABLE IF NOT EXISTS sav_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL REFERENCES sav_sessions(session_id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content    TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

-- Link sessions to the advisor who created them
ALTER TABLE sav_sessions ADD COLUMN IF NOT EXISTS advisor_id UUID REFERENCES advisors(id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sav_sessions_advisor ON sav_sessions (advisor_id);
CREATE INDEX IF NOT EXISTS idx_sav_messages_session ON sav_messages (session_id);
