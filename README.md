# SAV Assistant

Outil interne pour les conseillers de magasin — création de dossiers SAV via un assistant IA conversationnel.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Navigateur (port 5173)                                 │
│  React + Vite — Login / Chat 3 colonnes                 │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP + JWT
┌──────────────────────▼──────────────────────────────────┐
│  Backend SAV (port 3001)                                │
│  Express.js — Auth JWT, Conversations, Proxy n8n        │
└───────┬──────────────────────────────┬──────────────────┘
        │ pg                           │ axios + Basic Auth
┌───────▼──────────┐         ┌─────────▼──────────────────┐
│  PostgreSQL 16   │         │  n8n (port 5678)           │
│  sav_db          │◄────────│  Workflow SAV Assistant    │
│  advisors        │  UPDATE │  LLM: Ollama (port 11434)  │
│  sav_sessions    │         └────────────────────────────┘
│  sav_messages    │
│  factures        │◄── API factures (port 3000, existant)
│  articles        │
└──────────────────┘
```

## Prérequis

- Node.js 18+
- Docker Desktop (ou Docker + Docker Compose v2)
- n8n configuré et le workflow SAV importé

## Installation

### 1. Variables d'environnement

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Éditez `.env` : changez `JWT_SECRET` et `N8N_ENCRYPTION_KEY`.

### 2. Docker Compose (recommandé)

```bash
docker-compose up -d
```

Le backend exécute les migrations automatiquement au démarrage.

### 3. Développement local (sans Docker)

```bash
# PostgreSQL doit tourner sur localhost:5432
# Base: sav_db, user: sav_user, password: sav_password

# Backend
cd backend
npm install
npm run dev      # → http://localhost:3001

# Frontend (autre terminal)
cd frontend
npm install
npm run dev      # → http://localhost:5173
```

## Identifiants de test

| Champ | Valeur |
|---|---|
| URL | http://localhost:5173 |
| E-mail | `advisor@sav.com` |
| Mot de passe | `password123` |

## Configuration n8n

1. Ouvrir http://localhost:5678 (admin / changeme)
2. Importer `workflows/SAV Assistant - POC (Q_R).json`
3. Créer un credential **PostgreSQL** :
   - Host: `postgres` (dans Docker) ou `localhost`
   - Port: `5432`, DB: `sav_db`, User: `sav_user`, Password: `sav_password`
4. Créer un credential **Ollama** : Base URL = `http://ollama:11434`
5. Activer le workflow

## Référence des routes API

### Auth (`/api/auth`)

| Méthode | Route | Corps | Réponse |
|---|---|---|---|
| POST | `/login` | `{ email, password }` | `{ token, advisor }` |
| GET | `/me` | — | `{ id, email, full_name }` |

### Conversations (`/api/conversations`) — JWT requis

| Méthode | Route | Description |
|---|---|---|
| GET | `/` | Liste des sessions du conseiller |
| POST | `/` | Créer une session `{ session_id }` |
| GET | `/:sessionId` | Détail + draft |
| DELETE | `/:sessionId` | Supprimer (cascade messages) |
| GET | `/:sessionId/messages` | Historique des messages |
| POST | `/:sessionId/messages` | Envoyer un message → proxy n8n |

## Ports

| Service | Port |
|---|---|
| Frontend | 5173 |
| Backend SAV | 3001 |
| API factures (existant) | 3000 |
| PostgreSQL | 5432 |
| n8n | 5678 |
| Ollama | 11434 |
