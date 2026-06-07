## Context

The brand system already exists in `src/app/globals.css` and `src/app/layout.tsx`: fonts `--font-playfair` (Playfair Display) and `--font-jakarta` (Plus Jakarta Sans); palette `--bg #070b14`, `--surface #0e1528`, `--surface-2 #141b2f`, `--accent #ff6b35`, `--accent-warm #f5a623`, `--text #f0ece4`, `--text-muted #6b7490`, `--border rgba(255,255,255,.06)`; and utilities `.font-display`, `.mesh-bg`, `.noise`, `@keyframes fadeUp/shimmer`. `dashboard/layout.tsx` already consumes these (dark sidebar, `var(--accent)`, `font-display`). The chat components do not: `MessageBubble`/`ChatInput`/`UsageBanner` use `bg-white`, `bg-gray-100`, `bg-blue-600`, `text-gray-900`. The job is to extend the established system into the chat and lift interaction quality — not to invent a new aesthetic.

This is a restyle + interaction change. Behavior owned by `chat-experience` (no `source-url`, persistence, usage sync, 402/error handling) and the `#6` input fix (`isLoading` vs `disabled`) must be preserved.

## Goals / Non-Goals

**Goals:**
- One cohesive branded surface from sidebar → conversation → composer.
- Distinct, attributable user/assistant messages with editorial character.
- Branded empty state with send-on-click suggested prompts.
- Copy-to-clipboard on assistant answers.
- Branded typing indicator + staggered entrance, `prefers-reduced-motion` safe.
- Branded limit/error states; responsive (mobile sidebar collapse); WCAG AA.

**Non-Goals:**
- No backend/API/DB changes; no new dependencies.
- No conversation-history sidebar / multi-thread switching (separate change).
- No Markdown rendering of answers (stays plain text / `whitespace-pre-wrap`).
- No redesign of the marketing site or the agent surface (must not break the shared `SourceCard`/`AgentMessageBubble`).

## Decisions

### Reuse the existing token + utility system; add only chat-scoped tokens
Style with the existing CSS variables and `.mesh-bg`/`.noise`/`fadeUp`. Add at most a few chat-scoped tokens to `globals.css` (e.g. `--chat-user-bg`, `--chat-assistant-bg`, `--chat-ring`) so the message palette is centralized. No per-component hex literals.

*Alternative considered:* a fresh standalone aesthetic for the app. Rejected by the chosen direction — the landing already nails the brand; the chat is the outlier, so cohesion beats novelty.

### Message identities
- **User**: right-aligned, warm — accent treatment (e.g. `--accent`→`--accent-warm` low-opacity tint or solid accent with an accent border), readable text, `rounded-2xl rounded-tr-sm`.
- **Assistant**: left-aligned on `--surface-2` with a hairline `--border` and a subtle accent left-edge or a small Playfair label conveying verified-orientation tone; off-white `--text`; `rounded-2xl rounded-tl-sm`. Text-only (no Fuentes).
Keep `MessageBubble` the single renderer; differentiate by `role`.

### CSS-only motion (no animation library)
Entrance via the existing `fadeUp` with small staggered `animation-delay`; typing indicator and input focus-glow in CSS. Wrap all decorative motion in `@media (prefers-reduced-motion: reduce)` to disable. frontend-design prefers CSS for HTML and Motion for React only when already present — it is not a dependency here, so stay CSS-only.

### Suggested prompts as a presentational component driving the existing send path
A new `SuggestedPrompts` renders chips from a static list; clicking calls the same `handleSend(text)` already wired in `ChatInterface` (which sets `isNearBottomRef` and `sendMessage`). No new state machine — it's the first-message path.

### Copy action as a small client component
A `CopyButton` using `navigator.clipboard.writeText` with a 1–2s "Copiado" state, shown on assistant bubbles (hover/focus-visible). Degrade gracefully if clipboard is unavailable.

### Limit/error restyle only — behavior untouched
The 402 limit banner and the error/retry strip keep their logic from `chat-experience` + the `#6` fix; only their classes move to brand tokens (amber for limit, a brand-appropriate danger tone for errors). The composer's `disabled` (at-limit) vs `isLoading` distinction stays.

### Responsive shell
`dashboard/layout.tsx` sidebar: full-height rail on `md+`; on small screens collapse to a top bar with a toggle/drawer. Chat goes full-width; composer sticky to the bottom. Pure CSS/Tailwind breakpoints + a small client toggle; no routing change.

## Risks / Trade-offs

- **Shared components touch the agent surface** → `MessageBubble` is chat-only, but `SourceCard` is shared with `AgentMessageBubble`. Restyle chat components without altering `SourceCard`'s API; smoke-check the agent page renders.
- **Contrast regressions on dark theme** → verify AA for `--text` and especially `--text-muted` on `--surface`/`--surface-2`; darken/lighten the chat tokens if a pairing falls below 4.5:1.
- **Atmosphere hurting readability** → keep `.noise` opacity low and `.mesh-bg` subtle behind messages so text stays legible; messages sit on solid surfaces, not directly on the mesh.
- **Motion overload** → cap entrance animation to a single short staggered reveal; everything off under reduced-motion.
- **Clipboard API unavailable (older/insecure contexts)** → feature-detect; hide or no-op the copy control gracefully.

## Migration Plan

1. Add chat-scoped tokens/utilities to `globals.css` (reusing mesh/noise/fadeUp).
2. Restyle `MessageBubble`, `ChatInput`, `UsageBanner` to tokens; preserve all props/behavior (incl. the `#6` `disabled` prop).
3. Add `SuggestedPrompts` + `CopyButton`; wire into `ChatInterface` empty state and assistant bubbles.
4. Make `dashboard/layout.tsx` responsive.
5. Verify: brand cohesion, no stock light classes left, agent page intact, AA contrast, reduced-motion, mobile. Rollback = revert the component/CSS diff (no data/contract impact).

## Open Questions

- Assistant editorial accent: a small Playfair byline (e.g. "Extranjería · orientación verificada") vs a pure accent left-edge? (Leaning: accent left-edge + tiny label — character without clutter.)
- Suggested prompts: fixed curated set vs rotating/randomized per load? (Leaning: a curated fixed set of 4 for predictability.)
