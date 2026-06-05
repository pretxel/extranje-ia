## Why

The main RAG chat (`/api/chat` + `ChatInterface.tsx`) has accumulated rough edges that hurt the core product experience: the message list does not auto-scroll as answers stream, the usage counter goes stale until a page reload, plan limits are defined in two places that can drift, every answer is cluttered with a "Fuentes" block, and conversations vanish on reload even though `Conversation`/`Message` tables already exist but are never written. These are the highest-friction issues in the primary user flow.

## What Changes

- **Remove the "Fuentes" block** from rendered chat answers. The `MessageBubble` "Fuentes" section and source-card rendering are removed; the route stops emitting `source-url` stream parts for the RAG chat.
- **Persist conversations to the database.** Each chat turn (user + assistant) is written to the existing `Conversation`/`Message` tables, scoped to the authenticated user. On return, the user's most recent conversation is loaded so the thread survives a page reload, and history is reliably supplied to the LLM.
- **Live usage sync.** The `UsageBanner` query counter refreshes after each completed message instead of only on mount, so the displayed count reflects real server state.
- **Single source of truth for plan limits.** The duplicate `PLAN_LIMITS` constant in `src/lib/chat-types.ts` is removed; `src/lib/plans.ts` becomes the only definition, consumed everywhere.
- **Chat UX polish.** Fix auto-scroll to follow streaming/new messages, surface a visible state when the free limit is reached (HTTP 402) instead of failing silently, and surface stream errors in the UI.

## Capabilities

### New Capabilities
- `chat-experience`: Rendering and interaction behavior of the RAG chat surface — answer rendering without a sources block, auto-scroll on streaming, limit-reached and error states surfaced in the UI.
- `conversation-memory`: Server-side persistence of chat turns to the `Conversation`/`Message` tables, scoped per user, with reload of the most recent conversation and reliable history delivery to the model.
- `usage-limit-sync`: A single canonical plan-limit definition and a usage counter that stays in sync with server state after each query.

### Modified Capabilities
<!-- None: extranjeria-agent-chat covers /api/agent, a separate surface; its requirements are unchanged. -->

## Impact

- **Code**: `src/components/chat/MessageBubble.tsx`, `src/components/chat/ChatInterface.tsx`, `src/components/chat/UsageBanner.tsx`, `src/app/api/chat/route.ts`, `src/lib/plans.ts`, `src/lib/chat-types.ts`. Likely a new conversation-load endpoint (e.g. `GET /api/conversations/latest`) and persistence helpers under `src/lib/chat/`.
- **Removed**: `SourceCard` usage in chat answers (component may be retained for other surfaces); `PLAN_LIMITS` export from `chat-types.ts`.
- **Database**: Uses the existing `Conversation` and `Message` models — no schema migration required. New write paths only.
- **APIs**: `/api/chat` POST gains persistence and conversation association; `/api/user` unchanged; a read endpoint for loading the latest conversation is added.
- **No breaking changes** to external contracts; the agent surface (`/api/agent`) is untouched.
