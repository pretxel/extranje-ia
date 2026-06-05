#!/usr/bin/env bash
# Playwright add-on to the local verification: drives the real chat UI in a
# browser, then (because invoked for the final pass) stops the Supabase stack.
set -uo pipefail
cd "$(dirname "$0")/../.."

PORT="${PORT:-3210}"
export APP_URL="http://localhost:${PORT}"
export VERIFY_EMAIL="${VERIFY_EMAIL:-verify@local.test}"
export VERIFY_PASSWORD="${VERIFY_PASSWORD:-Verify12345!}"
STOP_STACK="${STOP_STACK:-1}"

echo "== [1/5] capture local supabase env =="
if ! supabase status >/dev/null 2>&1; then
  echo "BLOCKED: local supabase stack not running. Run 'supabase start' first." >&2
  exit 2
fi
supabase status -o env 2>/dev/null | grep -E '^[A-Z0-9_]+=' > /tmp/verify_sb.env
set -a; # shellcheck disable=SC1091
source /tmp/verify_sb.env; set +a
: "${API_URL:?BLOCKED: could not read API_URL}"
export NEXT_PUBLIC_SUPABASE_URL="$API_URL"
export NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="$PUBLISHABLE_KEY"
export DATABASE_URL="$DB_URL"
export DIRECT_URL="$DB_URL"

echo "== [2/5] ensure migrated + user seeded =="
pnpm prisma migrate deploy >/dev/null 2>&1 || true
curl -s -X POST "$API_URL/auth/v1/admin/users" \
  -H "apikey: $SERVICE_ROLE_KEY" -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$VERIFY_EMAIL\",\"password\":\"$VERIFY_PASSWORD\",\"email_confirm\":true}" \
  -o /dev/null -w "  seed HTTP %{http_code}\n"

echo "== [3/5] start next dev on :$PORT =="
pkill -f "next dev" 2>/dev/null || true
PORT="$PORT" pnpm dev >/tmp/verify_nextdev.log 2>&1 &
DEVPID=$!
printf "  waiting for server"
for _ in $(seq 1 60); do
  if curl -sf "$APP_URL/" >/dev/null 2>&1; then echo " ready"; break; fi
  printf "."; sleep 1
done

echo "== [4/5] drive the chat UI (Playwright/chromium) =="
pnpm exec playwright test --config scripts/verify-local/playwright.config.mjs
RC=$?

echo "== [5/5] teardown =="
kill "$DEVPID" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
echo "  next dev stopped"
if [ "$STOP_STACK" = "1" ]; then
  echo "  stopping supabase stack..."
  supabase stop >/dev/null 2>&1 && echo "  supabase stopped" || echo "  supabase stop reported an issue"
fi
exit $RC
