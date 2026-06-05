#!/usr/bin/env bash
# Local end-to-end verification harness for the improve-chat-ux chat surface.
# Brings up nothing itself except `next dev`; assumes a local Supabase stack is
# already running (`supabase start`). Steps:
#   1. capture local stack env   2. prisma migrate deploy (local)
#   3. seed a confirmed user      4. start next dev against local env
#   5. run drive.mjs (real authed API)   6. teardown
set -uo pipefail
cd "$(dirname "$0")/../.."

PORT="${PORT:-3210}"
export APP_URL="http://localhost:${PORT}"
export VERIFY_EMAIL="${VERIFY_EMAIL:-verify@local.test}"
export VERIFY_PASSWORD="${VERIFY_PASSWORD:-Verify12345!}"

echo "== [1/6] capture local supabase env =="
if ! supabase status >/dev/null 2>&1; then
  echo "BLOCKED: local supabase stack not running. Run 'supabase start' first." >&2
  exit 2
fi
supabase status -o env 2>/dev/null | grep -E '^[A-Z0-9_]+=' > /tmp/verify_sb.env
set -a; # shellcheck disable=SC1091
source /tmp/verify_sb.env; set +a
: "${API_URL:?BLOCKED: could not read API_URL from supabase status}"
export NEXT_PUBLIC_SUPABASE_URL="$API_URL"
export NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="$PUBLISHABLE_KEY"
export DATABASE_URL="$DB_URL"
export DIRECT_URL="$DB_URL"
echo "  API_URL=$API_URL  DB=$DB_URL"

echo "== [2/6] prisma migrate deploy (local) =="
pnpm prisma migrate deploy || { echo "BLOCKED: migrate failed" >&2; exit 2; }

echo "== [3/6] seed confirmed user ($VERIFY_EMAIL) =="
curl -s -X POST "$API_URL/auth/v1/admin/users" \
  -H "apikey: $SERVICE_ROLE_KEY" -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$VERIFY_EMAIL\",\"password\":\"$VERIFY_PASSWORD\",\"email_confirm\":true}" \
  -o /tmp/verify_seed.json -w "  seed HTTP %{http_code} (422 = already exists, fine)\n"

echo "== [4/6] start next dev on :$PORT (local env) =="
pkill -f "next dev" 2>/dev/null || true
PORT="$PORT" pnpm dev >/tmp/verify_nextdev.log 2>&1 &
DEVPID=$!
printf "  waiting for server"
for _ in $(seq 1 60); do
  if curl -sf "$APP_URL/" >/dev/null 2>&1; then echo " ready"; break; fi
  printf "."; sleep 1
done

echo "== [5/6] drive the authed surface =="
node scripts/verify-local/drive.mjs
RC=$?

echo "== [6/6] teardown =="
kill "$DEVPID" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
echo "  next dev stopped (log: /tmp/verify_nextdev.log)"
exit $RC
