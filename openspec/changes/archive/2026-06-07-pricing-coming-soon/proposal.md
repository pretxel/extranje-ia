## Why

Paid plans are not ready to sell yet, but every paid CTA already redirects users into a live Stripe checkout. Users can reach a real payment flow for a product we are not prepared to fulfil, which risks charges, refunds, and support load. We need to gate the paid surfaces behind a "coming soon" state until billing is ready, without ripping out the existing checkout plumbing.

## What Changes

- Mark the paid tier(s) in the landing pricing section (`#precios`) as **"Próximamente"** (coming soon) and render the plan CTA as a disabled, non-interactive control that does NOT call `/api/checkout`.
- Change the in-app upgrade CTA in `UsageBanner` (shown on dashboard chat + agent) to a disabled "Próximamente" state that no longer redirects to checkout.
- Keep the free/Básico CTA (`/sign-up`) fully functional — only paid redirects are gated.
- Introduce a single source of truth flag so the coming-soon state can be flipped back to live checkout in one place when billing is ready.
- Leave the `/api/checkout` route and Stripe wiring intact (defensive 503/disabled, not deleted) so re-enabling is a config flip, not a rebuild.

## Capabilities

### New Capabilities
- `pricing-availability`: Controls whether paid plans are purchasable. Defines the "coming soon" presentation, the disabled/non-redirecting CTA behavior across all paid surfaces, and the single switch that toggles between coming-soon and live checkout.

### Modified Capabilities
<!-- None — no existing spec governs pricing/checkout behavior today. -->

## Impact

- **UI**: `src/app/page.tsx` (Pricing section), `src/components/UpgradeButton.tsx`, `src/components/chat/UsageBanner.tsx` (rendered by `ChatInterface` + `AgentChat`).
- **API**: `src/app/api/checkout/route.ts` — hardened to refuse while disabled; no schema change.
- **Config**: new availability flag (e.g. `PAID_PLANS_ENABLED` / `NEXT_PUBLIC_PAID_PLANS_ENABLED`) as the single toggle.
- **No DB, auth, or RAG changes.** Stripe keys/prices untouched.
