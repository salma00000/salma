# SAV Assistant — CLAUDE.md

## Architecture

```
React (Vite, port 5173)  ←→  Express backend (port 3002)  ←→  PostgreSQL (port 5432)
                                        ↕
                               n8n webhook (port 5678)
                               (manages sav_sessions draft)

Express API factures (port 3000) — existing service, unchanged
```

## Key directories

| Path | Role |
|---|---|
| `backend/` | New Express.js API — auth, conversations, messages, n8n proxy |
| `frontend/` | Vite + React SPA — chat UI |
| `api/` | Existing Express API — factures, articles, sav_tickets (untouched) |
| `database/` | SQL schema + seed for the factures/articles tables |
| `backend/migrations/` | Migration run at backend startup — creates advisors, sav_messages, sav_sessions |

## Database (sav_db)

Tables owned by the **new backend**:
- `advisors` — store staff, bcrypt passwords, JWT auth
- `sav_messages` — chat history per session
- `sav_sessions` — created by backend on POST /conversations, updated by n8n

Tables owned by the **existing API**:
- `factures`, `articles`, `sav_tickets`

**n8n writes to `sav_sessions`** via a PG node:
`UPDATE sav_sessions SET draft=$1, turn=$2, updated_at=NOW() WHERE session_id=$1`
The backend never manages n8n's internal session state — it only reads `draft`.

## Draft JSONB structure (written by n8n)

```json
{
  "customer": { "name", "email", "phone", "loyalty_tier", "id" },
  "product":  { "label", "brand", "sku", "category" },
  "purchase": { "invoice_id", "date", "store", "under_warranty", "warranty_end", "amount" },
  "issue":    { "type", "description" },
  "warnings": [],
  "missing_fields": [],
  "status": "draft" | "ready_for_submission" | "ticket_created"
}
```

`status === "ticket_created"` → frontend disables chat input and shows archive banner.

## Backend entry point

`backend/src/app.js` — validates env vars, runs migrations, seeds test advisor, starts server.

Migration is idempotent (`IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`).

## Auth

JWT Bearer tokens. All `/api/conversations*` routes require `Authorization: Bearer <token>`.
Token payload: `{ id, email, full_name }`.
Test credentials: `advisor@sav.com` / `password123` (seeded at startup).

## n8n webhook

`POST N8N_WEBHOOK_URL` with Basic Auth. Body: `{ chatInput, sessionId }`.
Response shape handled: `{ output }` or `{ text }` or `{ message }`.
Timeout: 60 s (LLM can be slow).

In Docker, `N8N_WEBHOOK_URL` is set to `http://n8n:5678/webhook/...` via docker-compose env.
For local dev (outside Docker), set it to `http://localhost:5678/webhook/...` in `backend/.env`.

## Frontend

- All API calls via `src/api/client.js` (axios, attaches JWT, redirects on 401).
- Auth state in `AuthContext` (localStorage token).
- Active session tracked via URL query param `?session=<uuid>`.
- DraftPanel polls `GET /api/conversations/:sessionId` every 3 s; stops when `status === "ticket_created"`.
- `react-markdown` renders assistant messages (n8n returns markdown).

## Environment variables

Copy root `.env.example` → `.env`. Copy `backend/.env.example` → `backend/.env`. Copy `frontend/.env.example` → `frontend/.env`.

Critical backend vars: `DATABASE_URL`, `JWT_SECRET`, `N8N_WEBHOOK_URL`, `N8N_BASIC_AUTH_USER`, `N8N_BASIC_AUTH_PASSWORD`.

## Running locally (without Docker)

```bash
# PostgreSQL must be running on localhost:5432 with sav_db/sav_user/sav_password

# Backend
cd backend && cp .env.example .env   # edit as needed
npm install && npm run dev           # port 3002, runs migrations on start

# Frontend
cd frontend && cp .env.example .env
npm install && npm run dev           # port 5173
```

## Running with Docker

```bash
cp .env.example .env    # edit secrets
docker-compose up -d
```

## n8n setup

1. Open http://localhost:5678, login admin/changeme
2. Import `workflows/SAV Assistant - POC (Q_R).json`
3. Create a PostgreSQL credential: host=`postgres`, port=5432, db=`sav_db`, user=`sav_user`, password=`sav_password`
4. Create an Ollama credential: Base URL = `http://ollama:11434`
5. Activate the workflow

## Conversation label computation

`<customer.name> — <purchase.invoice_id> — <issue.type>` (parts joined with ` — `, falls back to session_id if empty).

## Ports summary

| Service | Local port |
|---|---|
| Frontend (Vite) | 5173 |
| Backend (new) | 3002 |
| API factures (existing) | 3000 |
| PostgreSQL | 5432 |
| n8n | 5678 |
| Ollama | 11434 |
