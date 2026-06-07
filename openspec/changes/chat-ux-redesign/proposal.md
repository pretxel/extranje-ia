## Why

The marketing site has a distinctive, cohesive brand — Playfair Display + Plus Jakarta Sans on a deep-navy canvas (`#070b14`) with warm orange/amber accents, gradient-mesh and grain atmosphere. The dashboard shell (sidebar) already speaks this language, but the chat surface (`/dashboard/chat`) does not: `MessageBubble`, `ChatInput`, and `UsageBanner` use stock Tailwind light styles (`bg-white`, `bg-gray-100`, `bg-blue-600`), so the core product screen reads as generic AI boilerplate dropped inside a branded frame. The most-used screen should feel the most intentional. This redesign extends the existing brand into the chat and raises the interaction quality, with no backend changes.

## What Changes

- **Brand-aligned visual system** for the chat surface: deep-navy editorial theme using the existing CSS variables and fonts, gradient-mesh + grain atmosphere on the conversation area, replacing all stock Tailwind light/blue/gray styling.
- **Distinct message identities**: user messages in a warm accent treatment; assistant messages on a calm surface with an editorial touch and a clear verified-orientation tone — no "Fuentes" block (unchanged behavior).
- **Branded empty state** with a Playfair headline and 3–4 suggested starter prompts (NIE, TIE, visado, arraigo…) that send on click.
- **Copy-message action** on assistant answers (copy to clipboard with feedback).
- **Refined streaming + entrance motion**: a branded typing indicator and staggered message reveal, honoring `prefers-reduced-motion`.
- **Polished limit-reached and error states** restyled to the brand (behavior unchanged from `chat-experience`).
- **Responsive layout**: usable on mobile — the sidebar collapses and the chat goes full-width with a sticky composer.
- **Accessibility pass**: visible focus states, sufficient contrast, ARIA for the typing/copy/error affordances.

## Capabilities

### New Capabilities
- `chat-interface-design`: The visual and interaction design layer of the RAG chat surface — brand-aligned theming and atmosphere, distinct user/assistant message styling, branded empty state with suggested prompts, copy-message action, refined streaming/entrance motion, responsive layout, and accessibility for these affordances.

### Modified Capabilities
<!-- None. `chat-experience` (no-sources, auto-scroll, limit-reached, stream-error) keeps its behavioral requirements; this change restyles those states without changing behavior. -->

## Impact

- **Code**: `src/components/chat/MessageBubble.tsx`, `ChatInput.tsx`, `UsageBanner.tsx`, `ChatInterface.tsx`; possibly a new `SuggestedPrompts` and `CopyButton` component under `src/components/chat/`; `src/app/globals.css` (a few chat-scoped tokens/utilities reusing the existing mesh/noise/fadeUp); `src/app/dashboard/layout.tsx` (responsive sidebar).
- **No backend / API / DB changes.** No new dependencies — Tailwind v4 + existing CSS utilities only (CSS-driven motion, no animation library).
- **Agent surface** (`/dashboard/agent`, `AgentMessageBubble`) is out of scope but shares components; restyle should not break it.
- **No breaking changes.** Behavior from `chat-experience` (no source-url, persistence, usage sync, 402/error handling) is preserved.
