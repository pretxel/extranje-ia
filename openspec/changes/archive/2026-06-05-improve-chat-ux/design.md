## Context

The primary product surface is the RAG chat: `ChatInterface.tsx` (a `useChat` client) talking to `POST /api/chat`, which runs retrieval (`findRelevantChunks`) and a LangChain `ChatOpenAI` chain (`buildRagChain`), streaming text plus `source-url` parts. Auth is Supabase-backed via `getOrCreateUser()`; the `User` model tracks `plan` and `queriesUsed`. `Conversation` and `Message` Prisma models already exist but are never written — `useChat` keeps history only in client state, so threads are lost on reload. Plan limits live in two places: the authoritative `src/lib/plans.ts` (`free: 5`, `pro: Infinity`) and a stale duplicate in `src/lib/chat-types.ts`. `UsageBanner` fetches `/api/user` once on mount, so its count drifts after each query.

This change touches the client component, the chat route, two lib modules, and adds a small read endpoint and persistence helper. No schema migration is needed.

## Goals / Non-Goals

**Goals:**
- Render answers as clean text, with no "Fuentes" block and no `source-url` parts on the RAG chat.
- Persist each turn to `Conversation`/`Message`, reuse one conversation per thread, and restore the most recent conversation on mount.
- Keep the usage counter live after each query and collapse `PLAN_LIMITS` to a single definition.
- Fix auto-scroll, surface the 402 limit-reached state, and surface stream errors.

**Non-Goals:**
- No conversation sidebar / multi-thread switching, rename, or delete (the "Full history UI" option was not chosen).
- No change to retrieval, embeddings, the prompt's "answer only from context" constraint, or the `/api/agent` surface.
- No removal of the `SourceCard` component itself (it may be used elsewhere) — only its use in chat answers.
- No schema migration.

## Decisions

### Conversation identity: client-supplied `conversationId`
The client owns the active conversation id and sends it in the `/api/chat` request body alongside `messages`. The route resolves it: if absent or not owned by the user, create a new `Conversation` (deriving `title` from the first user message); otherwise reuse it. The route returns the resolved id to the client (via response header or a stream data part) so the first turn binds the thread. On mount, `GET /api/conversations/latest` returns `{ id, messages }` for the user's newest conversation, seeding both `useChat` initial messages and the active id.

*Alternative considered:* server derives "active conversation" purely from "most recent open conversation." Rejected — racy across tabs and makes "start a new chat" ambiguous. An explicit id is simpler and user-scoped.

### Persistence happens in `onFinish`, after success
Writes occur in the route's existing `onFinish` callback, gated on the same `completed` flag that already guards the `queriesUsed` increment. Both user and assistant `Message` rows are written in one `prisma.$transaction` together with the increment, so a failed generation persists nothing and never burns a quota. Assistant `sources` JSON is left null (sources are no longer surfaced).

*Alternative considered:* persist the user message on request arrival, before generation. Rejected — would leave orphan user messages on failures and complicate the "no partial persistence" requirement.

### Source removal: stop at the producer
Remove the `for (const source of sources)` writer loop in `route.ts` and delete the `sourceParts` rendering block in `MessageBubble.tsx`. `formatContext` still returns `sources` for internal prompt grounding (the `[Fuente: …]` context lines stay — the model still answers from cited context), but nothing source-shaped reaches the client. This keeps the "answer only from retrieved context" rule intact while satisfying "remove Fuentes from the response."

*Alternative considered:* keep emitting `source-url` parts but hide them in CSS. Rejected — leaks data to the client and contradicts the spec ("SHALL NOT emit `source-url`").

### Live usage sync: refetch on finish, lift banner state
`UsageBanner` exposes a refetch, or usage state is lifted into `ChatInterface` and passed down. On `useChat` `status` returning to `ready` after a completed turn, re-fetch `/api/user` and update the count. This reuses the existing `/api/user` endpoint (single source via `getLimit`) rather than threading counts through the stream.

*Alternative considered:* return the new `queriesUsed` as a stream data part. Rejected — more coupling; a cheap refetch keeps the banner the single reader of server truth.

### Single `PLAN_LIMITS`: delete the duplicate
Remove `PLAN_LIMITS` (and the redundant `UserPlan` limit map) from `chat-types.ts`; keep the `UserPlan`/`SourceCitation` types there. Point any importer at `src/lib/plans.ts` (`PLAN_LIMITS`, `getLimit`, `hasReachedLimit`). `UsageBanner` already gets its limit from `/api/user` (`getLimit`), so the UI is unaffected by the deletion.

### Auto-scroll: depend on messages, respect manual scroll-up
Replace the mount-only `useEffect(…, [])` with an effect keyed on the streaming text / message count, scrolling to bottom unless the user has scrolled away from the bottom (tracked with a small "is near bottom" check on the scroll container). Prevents hijacking the scroll when a user reads earlier history mid-stream.

## Risks / Trade-offs

- **Cross-tab divergence of the active conversation** → Each tab keeps its own client id; appends are user-scoped and append-only, so worst case is two threads, never corruption. Acceptable for current single-session usage.
- **Transaction failure after a successful answer** → The user sees the answer but the turn isn't saved and quota isn't charged. Logged like the existing stream error; preferable to charging for unsaved turns. Low frequency.
- **Refetch latency on the banner** → The count may lag by the round-trip of one `/api/user` call after a turn; visually negligible and still eventually consistent, versus today's stale-until-reload.
- **Removing `source-url` reduces transparency** → Product trade-off the user explicitly requested. Grounding is unchanged server-side; the disclaimer and context-only answering remain.
- **History sent to the model grows with thread length** → Existing behavior already sends full client history; persistence doesn't worsen per-request size. If long threads become costly later, cap history server-side (out of scope here).

## Migration Plan

1. Land lib + route changes (single `PLAN_LIMITS`, drop `source-url`, add persistence in `onFinish`, accept `conversationId`).
2. Add `GET /api/conversations/latest` (user-scoped).
3. Update `ChatInterface` (initial-message load, active id, live usage refetch, auto-scroll, 402/error states) and `MessageBubble` (remove Fuentes).
4. No DB migration. Rollback is a code revert; persisted rows are additive and harmless if the feature is reverted.

## Open Questions

- Should "start a new chat" be in scope as a button that clears the active id, or deferred? (Leaning: a minimal "new chat" reset is cheap and complements restore-on-mount, but can be dropped if not wanted.)
- Conversation `title`: derive from the first user message (truncated) vs leave null for now? (Leaning: derive truncated title — costs nothing and helps if a history UI lands later.)

## Known Follow-ups (deferred from adversarial review)

These were confirmed by the post-implementation review but are intentionally NOT
fixed in this change — both fall outside its scope (UX + display sync, no migration):

- **Free-quota TOCTOU (medium).** The plan-limit gate (`hasReachedLimit` on the
  request-start snapshot) and the increment (in `onFinish`) are not atomic, and the
  gap spans the whole generation. Concurrent requests (rapid double-send, multi-tab,
  scripted) can each pass the gate before any increment lands, letting a free user
  exceed 5/mo by one per concurrent burst. This is a **pre-existing pattern in both
  `/api/chat` and `/api/agent`** (not introduced here). Proper fix reserves quota
  atomically up-front (`updateMany({ where: { id, queriesUsed: { lt: limit } }, data:
  { increment } })`, treat `count===0` as 402) and refunds on stream failure — a
  billing-semantics change spanning two routes, worth its own change.
- **Message ordering tiebreaker (low).** `loadLatestConversation` orders by
  `Message.createdAt asc` with no secondary key. Prisma 7 supplies a distinct
  client-side timestamp per `create` op (so user-before-assistant holds in practice),
  but a guaranteed-monotonic ordinal/position column would make intra-turn order
  schema-enforced. Deferred because it needs a migration, which this change avoids.
