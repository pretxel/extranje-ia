## 1. Plan-limit single source of truth

- [x] 1.1 Remove the duplicate `PLAN_LIMITS` (and any redundant limit map) from `src/lib/chat-types.ts`, keeping the `UserPlan` and `SourceCitation` types
- [x] 1.2 Repoint every importer of the removed constant to `src/lib/plans.ts` (`PLAN_LIMITS` / `getLimit` / `hasReachedLimit`); grep `chat-types` and `PLAN_LIMITS` to confirm no stale imports
- [x] 1.3 Run `pnpm lint:biome` and `pnpm vitest run` to confirm nothing referenced the deleted export

## 2. Remove the "Fuentes" block

- [x] 2.1 In `src/app/api/chat/route.ts`, delete the `for (const source of sources)` writer loop so no `source-url` parts are emitted
- [x] 2.2 In `src/components/chat/MessageBubble.tsx`, remove the `sourceParts` filter and the "Fuentes" rendering block (and the `SourceCard` import there); leave text rendering intact
- [x] 2.3 Verify a streamed answer contains only text parts and the bubble shows no "Fuentes" heading

## 3. Conversation persistence (server)

- [x] 3.1 Add a persistence helper under `src/lib/chat/` to resolve-or-create a user-scoped `Conversation` from an optional `conversationId` (create with a truncated title from the first user message when absent/unowned)
- [x] 3.2 Update `src/app/api/chat/route.ts` to read `conversationId` from the request body and resolve the conversation before streaming
- [x] 3.3 In `onFinish` (gated on the existing `completed` flag), write the user `Message` and assistant `Message` and increment `queriesUsed` inside a single `prisma.$transaction`
- [x] 3.4 Return the resolved `conversationId` to the client (response header or stream data part) so the first turn binds the thread
- [x] 3.5 Confirm a failed/incomplete generation persists no messages and does not increment usage

## 4. Restore conversation on load (server + client)

- [x] 4.1 Add `GET /api/conversations/latest` returning the authenticated user's newest conversation as `{ id, messages }` (ordered), user-scoped; 200 with empty/null when none
- [x] 4.2 In `ChatInterface.tsx`, fetch the latest conversation on mount and seed `useChat` initial messages plus the active `conversationId`
- [x] 4.3 Send the active `conversationId` with each `sendMessage` request and capture the resolved id returned by the route
- [ ] 4.4 Verify a returning user sees their prior thread after reload and a new user sees the empty state with no errors — needs a live run (dev server + Supabase session)

## 5. Live usage sync

- [x] 5.1 Lift usage state into `ChatInterface` (or expose a refetch from `UsageBanner`) reading `/api/user`
- [x] 5.2 Re-fetch `/api/user` when `useChat` `status` returns to `ready` after a completed turn, updating the banner count
- [ ] 5.3 Verify the "used of limit" count and the at-limit transition update without a manual page reload — needs a live run

## 6. Chat UX polish

- [x] 6.1 Replace the mount-only auto-scroll `useEffect(…, [])` with an effect keyed on streaming text / message count that scrolls to bottom unless the user has scrolled away from the bottom
- [x] 6.2 Handle the HTTP 402 `limit_reached` response in the client: show a limit-reached message with an upgrade affordance and re-enable the input (no stuck loading state)
- [x] 6.3 Surface stream/generation errors as a visible error state for the affected turn and keep the input usable
- [ ] 6.4 Manually verify auto-scroll during streaming, the 402 path, and the error path — needs a live run

## 7. Verification

- [x] 7.1 `pnpm lint:biome` and `pnpm vitest run` pass
- [x] 7.2 Add/adjust tests for the persistence helper (resolve-or-create, user scoping) and the single-source plan limits
- [ ] 7.3 Manual end-to-end pass: send messages, reload (history restored), counter syncs live, no "Fuentes", limit-reached and error states render — needs a live run
