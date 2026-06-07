## 1. Brand tokens & atmosphere

- [x] 1.1 Add chat-scoped tokens to `src/app/globals.css` (e.g. `--chat-user-bg`, `--chat-assistant-bg`, `--chat-ring`, danger tone) derived from the existing palette; add a reduced-motion guard block (`@media (prefers-reduced-motion: reduce)`) disabling decorative animations
- [x] 1.2 Apply brand atmosphere to the conversation area in `ChatInterface` (subtle `.mesh-bg` behind messages, low-opacity grain) without putting message text directly on the mesh

## 2. Message styling

- [x] 2.1 Restyle `MessageBubble` to brand tokens: warm accent treatment for user (right), `--surface-2` + hairline border + accent left-edge for assistant (left); off-white text; remove all `bg-white`/`bg-gray-*`/`bg-blue-*`/`text-gray-*` classes; keep text-only (no Fuentes)
- [x] 2.2 Add a small assistant editorial label/byline (Playfair) per the design's leaning; ensure user vs assistant are immediately distinguishable

## 3. Composer (ChatInput) restyle

- [x] 3.1 Restyle `ChatInput` to brand: `--surface` field, accent focus-glow/ring, accent-gradient send button; preserve the `#6` behavior (spinner only for `isLoading`; disabled send-arrow when `disabled`/at-limit)
- [x] 3.2 Style the textarea placeholder, disabled, and focus states on brand; keep auto-grow + Enter-to-send behavior

## 4. Empty state + suggested prompts

- [x] 4.1 Create `src/components/chat/SuggestedPrompts.tsx`: a curated set of ≥3 (target 4) immigration starter prompts (NIE, TIE, visado, arraigo) as branded chips
- [x] 4.2 Render the branded empty state in `ChatInterface` (Playfair headline + subtitle + `SuggestedPrompts`) when `messages.length === 0`; clicking a chip calls the existing `handleSend(text)` (first-message path)

## 5. Copy-message action

- [x] 5.1 Create `src/components/chat/CopyButton.tsx` using `navigator.clipboard.writeText` with a transient "Copiado" confirmation; feature-detect and no-op/hide if unavailable
- [x] 5.2 Show the copy control on assistant bubbles (hover + focus-visible), with an accessible name; do not show it on user bubbles

## 6. Motion & states

- [x] 6.1 Add staggered message entrance using the existing `fadeUp` (capped, short); ensure it is disabled under `prefers-reduced-motion`
- [x] 6.2 Replace the typing indicator with a branded accent version
- [x] 6.3 Restyle the limit-reached banner (amber) and the error/retry strip (brand danger tone) to tokens — behavior unchanged from `chat-experience` + the `#6` fix

## 7. Usage banner restyle

- [x] 7.1 Restyle `UsageBanner` to brand tokens (cohesive amber under-limit / accent at-limit), keeping it presentational (`userData` prop) and the upgrade action intact

## 8. Responsive shell

- [x] 8.1 Make `src/app/dashboard/layout.tsx` responsive: full sidebar on `md+`, collapsed top-bar/drawer toggle on small screens
- [x] 8.2 Ensure the conversation goes full-width and the composer stays sticky/reachable on mobile

## 9. Accessibility & verification

- [x] 9.1 Add visible focus states + accessible names to composer, send, suggested prompts, copy; add ARIA live/role for typing, error, and limit states
- [x] 9.2 Verify WCAG AA contrast for body text and muted text on `--surface`/`--surface-2`; adjust tokens if any pairing is < 4.5:1
- [x] 9.3 Smoke-check the agent surface (`/dashboard/agent`, `AgentMessageBubble`, shared `SourceCard`) still renders correctly
- [ ] 9.4 `pnpm lint:biome` and `pnpm vitest run` pass (done); manual/visual pass pending a live run — brand cohesion, empty-state prompts send, copy works, reduced-motion respected, mobile layout usable
