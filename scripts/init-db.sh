#!/usr/bin/env bash
# =============================================================================
# scripts/init-db.sh — Initialize the SAV database on the VPS
#
# Run this ONCE after cloning the repo, before starting the backend.
# It is safe to re-run (all operations are idempotent).
#
# Usage (two modes):
#
#   1. Direct psql (postgres is reachable from the host):
#      export PGPASSWORD=<superuser_password>
#      bash scripts/init-db.sh
#
#   2. Via docker exec (postgres runs as a container):
#      POSTGRES_CONTAINER=my-postgres-container bash scripts/init-db.sh
#
# Environment variables (override defaults):
#   POSTGRES_CONTAINER   — Docker container name if using docker exec mode
#   PG_HOST              — postgres host           (default: localhost)
#   PG_PORT              — postgres port           (default: 5432)
#   PG_SUPERUSER         — superuser login         (default: postgres)
#   PGPASSWORD           — superuser password
#   DB_NAME              — database to create      (default: sav_db)
#   DB_USER              — app user to create      (default: sav_user)
#   DB_PASSWORD          — app user password       (default: sav_password)
# =============================================================================

set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-postgres}"  # default to our prod container
PG_HOST="${PG_HOST:-localhost}"
PG_PORT="${PG_PORT:-5432}"
PG_SUPERUSER="${PG_SUPERUSER:-postgres}"
DB_NAME="${DB_NAME:-sav_db}"
DB_USER="${DB_USER:-sav_user}"
DB_PASSWORD="${DB_PASSWORD:-sav_password}"
MIGRATIONS_DIR="$(cd "$(dirname "$0")/../backend/migrations" && pwd)"

# ── Helper: run psql ───────────────────────────────────────────────────────────
psql_cmd() {
  # $1 = database, remaining = query or -f flag
  local db="$1"; shift
  if [[ -n "${POSTGRES_CONTAINER:-}" ]]; then
    docker exec -i "$POSTGRES_CONTAINER" \
      psql -U "$PG_SUPERUSER" -d "$db" "$@"
  else
    psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_SUPERUSER" -d "$db" "$@"
  fi
}

echo "=== SAV Database Initialization ==="
echo "  Target DB   : $DB_NAME"
echo "  App user    : $DB_USER"
echo "  Mode        : ${POSTGRES_CONTAINER:+docker exec ($POSTGRES_CONTAINER)}${POSTGRES_CONTAINER:-direct psql ($PG_HOST:$PG_PORT)}"
echo ""

# ── 1. Create the app user ─────────────────────────────────────────────────────
echo "[1/4] Creating user '$DB_USER' (if not exists)..."
psql_cmd postgres <<-EOSQL
  DO \$\$
  BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$DB_USER') THEN
      CREATE USER "$DB_USER" WITH PASSWORD '$DB_PASSWORD';
      RAISE NOTICE 'User $DB_USER created.';
    ELSE
      RAISE NOTICE 'User $DB_USER already exists, skipping.';
    END IF;
  END
  \$\$;
EOSQL

# ── 2. Create the database ─────────────────────────────────────────────────────
echo "[2/4] Creating database '$DB_NAME' (if not exists)..."
# createdb cannot be wrapped in DO, so we check via shell
DB_EXISTS=$(psql_cmd postgres -tAc \
  "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" 2>/dev/null || echo "")

if [[ "$DB_EXISTS" != "1" ]]; then
  psql_cmd postgres -c "CREATE DATABASE \"$DB_NAME\" OWNER \"$DB_USER\";"
  echo "  Database $DB_NAME created."
else
  echo "  Database $DB_NAME already exists, skipping."
fi

# ── 3. Grant privileges ────────────────────────────────────────────────────────
echo "[3/4] Granting privileges to '$DB_USER' on '$DB_NAME'..."
psql_cmd postgres <<-EOSQL
  GRANT ALL PRIVILEGES ON DATABASE "$DB_NAME" TO "$DB_USER";
  ALTER DATABASE "$DB_NAME" OWNER TO "$DB_USER";
EOSQL

# ── 4. Run migrations ─────────────────────────────────────────────────────────
echo "[4/4] Running migrations from $MIGRATIONS_DIR ..."
for sql_file in $(ls "$MIGRATIONS_DIR"/*.sql | sort); do
  echo "  Applying $(basename "$sql_file")..."
  if [[ -n "${POSTGRES_CONTAINER:-}" ]]; then
    docker exec -i "$POSTGRES_CONTAINER" \
      psql -U "$DB_USER" -d "$DB_NAME" < "$sql_file"
  else
    PGPASSWORD="$DB_PASSWORD" psql \
      -h "$PG_HOST" -p "$PG_PORT" \
      -U "$DB_USER" -d "$DB_NAME" \
      -f "$sql_file"
  fi
done

echo ""
echo "=== Initialization complete! ==="
echo ""
echo "Next: make sure your backend .env contains:"
echo "  DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@<postgres_host>:$PG_PORT/$DB_NAME"
