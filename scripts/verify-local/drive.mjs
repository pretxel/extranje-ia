// Drives the authed RAG-chat surface against a running `next dev` pointed at a
// local Supabase stack. Produces a real session cookie via @supabase/ssr's own
// client (in-memory jar) so it is encoded exactly how the server decodes it,
// then exercises /api/chat, /api/conversations/latest, /api/user and the 402
// limit path. Prints PASS/FAIL per scenario and exits non-zero on any failure.
import { createServerClient } from "@supabase/ssr";
import pg from "pg";

const APP = process.env.APP_URL ?? "http://localhost:3210";
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const EMAIL = process.env.VERIFY_EMAIL ?? "verify@local.test";
const PASS = process.env.VERIFY_PASSWORD ?? "Verify12345!";

const results = [];
const record = (name, ok, detail) => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✅ PASS" : "❌ FAIL"}  ${name}\n        ${detail}`);
};

// 1) Mint a real session and capture the cookie the SSR server expects.
const jar = new Map();
const supa = createServerClient(URL, KEY, {
  cookies: {
    getAll: () => [...jar.entries()].map(([name, value]) => ({ name, value })),
    setAll: (cs) => {
      for (const { name, value } of cs) jar.set(name, value);
    },
  },
});
const { data: signIn, error: signErr } = await supa.auth.signInWithPassword({
  email: EMAIL,
  password: PASS,
});
if (signErr || !signIn?.session) {
  console.error("BLOCKED: sign-in failed:", signErr?.message ?? "no session");
  process.exit(2);
}
const cookieHeader = [...jar.entries()]
  .map(([n, v]) => `${n}=${encodeURIComponent(v)}`)
  .join("; ");
console.log(`session minted; cookies: ${[...jar.keys()].join(", ")}\n`);

const authedFetch = (path, init = {}) =>
  fetch(`${APP}${path}`, { ...init, headers: { ...(init.headers ?? {}), Cookie: cookieHeader } });

async function chat(text, conversationId) {
  const res = await authedFetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ id: `u-${Date.now()}`, role: "user", parts: [{ type: "text", text }] }],
      conversationId: conversationId ?? null,
    }),
  });
  const body = await res.text();
  // Extract the resolved conversation id from the transient data part.
  const m = body.match(/"type"\s*:\s*"data-conversation"[^}]*"id"\s*:\s*"([^"]+)"/);
  const idFromStream = m?.[1];
  return { status: res.status, body, conversationId: idFromStream };
}

// --- Scenario 3 + first turn: send a message, inspect the raw stream ---
const t1 = await chat("¿Qué es el NIE?");
const hasText = /"type"\s*:\s*"text-(delta|start)"/.test(t1.body);
const hasSourceUrl = /"type"\s*:\s*"source-url"/.test(t1.body);
record(
  "turn 1 streams a 200 answer",
  t1.status === 200 && hasText,
  `status=${t1.status} hasTextParts=${hasText} convId=${t1.conversationId ?? "—"}`,
);
record(
  "no 'Fuentes' / source-url parts in the stream",
  !hasSourceUrl && !/Fuentes/.test(t1.body),
  `source-url present=${hasSourceUrl}`,
);

// --- Scenario 5 + follow-up reuse: second turn on the same conversation ---
const t2 = await chat("¿Y el TIE?", t1.conversationId);
record(
  "turn 2 reuses the same conversation id",
  t2.status === 200 && t2.conversationId === t1.conversationId,
  `t1=${t1.conversationId} t2=${t2.conversationId}`,
);

// --- Scenario 1 + 5: restore-on-return reflects both turns, in order ---
const latest = await authedFetch("/api/conversations/latest").then((r) => r.json());
const msgRoles = (latest.messages ?? []).map((m) => m.role).join(",");
record(
  "GET /api/conversations/latest returns the persisted thread",
  latest.id === t1.conversationId && (latest.messages?.length ?? 0) === 4,
  `id=${latest.id} count=${latest.messages?.length ?? 0} roles=[${msgRoles}]`,
);

// --- Scenario 2: usage counter incremented server-side (no reload involved) ---
const usage = await authedFetch("/api/user").then((r) => r.json());
record(
  "usage counter reflects 2 completed turns",
  usage.queriesUsed === 2 && usage.queriesLimit === 5,
  `queriesUsed=${usage.queriesUsed} queriesLimit=${usage.queriesLimit} plan=${usage.plan}`,
);

// --- Scenario 4 (server half): 402 limit_reached once at the cap ---
// Bump usage to the limit directly in the DB, then send one more turn.
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const upd = await client.query(
  "UPDATE users SET queries_used = 5 WHERE email = $1 RETURNING queries_used",
  [EMAIL],
);
await client.end();
const bumped = upd.rows[0]?.queries_used;
const over = await chat("una más");
let parsed = {};
try {
  parsed = JSON.parse(over.body);
} catch {}
record(
  "402 limit_reached when at cap (no model call)",
  over.status === 402 && parsed.error === "limit_reached",
  `dbQueriesUsed=${bumped} status=${over.status} body=${over.body.slice(0, 80)}`,
);

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} scenarios passed`);
process.exit(failed.length ? 1 : 0);
