## Context

Paid checkout is fully wired but the product is not ready to charge. Three surfaces can start a Stripe checkout, all funnelling through `POST /api/checkout`:

- `src/app/page.tsx` → `Pricing()` renders the Pro tier via `UpgradeButton` (`stripePlan: "pro"`).
- `src/components/UpgradeButton.tsx` → `fetch("/api/checkout")` then `window.location.href = url`.
- `src/components/chat/UsageBanner.tsx` → "Actualizar a Pro →" → same `fetch("/api/checkout")` redirect. Rendered by `ChatInterface` and `AgentChat` (dashboard chat + agent).

The Básico tier CTA is a plain `<Link href="/sign-up">` and must stay live. Empresa is already commented out. `/api/checkout` uses `STRIPE_PRICES` + `stripe.paymentLinks.create`.

## Goals / Non-Goals

**Goals:**
- One flag flips all paid surfaces between "coming soon" and live checkout.
- Disabled CTAs are non-interactive and never call `/api/checkout`.
- Defense in depth: API refuses too, so the gate can't be bypassed.
- Re-enabling later is config-only, no code rewrite.

**Non-Goals:**
- Removing Stripe wiring, prices, or the checkout route.
- Changing the free/Básico flow or auth.
- Building a real feature-flag service — an env var is sufficient.

## Decisions

- **Single env flag, exposed two ways.** Server reads `PAID_PLANS_ENABLED`; client reads `NEXT_PUBLIC_PAID_PLANS_ENABLED`. Centralize parsing in one helper (e.g. `src/lib/plans.ts` → `paidPlansEnabled()`), defaulting to **disabled** when unset. Rationale: client CTAs need a build-time public value; the API route needs a server value; one helper keeps the truth in one place. Alternative considered: a single `NEXT_PUBLIC_*` var read everywhere — rejected because the API gate should not depend on a client-exposed value alone.
- **Disabled CTA is presentational, gated at the data layer.** In `Pricing()`, when a paid plan is gated, set its CTA to a disabled "Próximamente" button instead of `UpgradeButton`. In `UpgradeButton` and `UsageBanner`, short-circuit `handleClick`/`handleUpgrade` and render the disabled label when the flag is off. Rationale: keeps redirect logic intact for the re-enable path. Alternative: delete `UpgradeButton` usage — rejected, loses the toggle.
- **API returns 503 while disabled.** `/api/checkout` checks the flag first and returns `503` ("Paid plans not available yet") before touching Stripe. Rationale: defense in depth; a stale client or direct call still can't create a payment link.
- **Use existing "Próximamente" Spanish copy.** Matches the app's language. The coming-soon marker reuses the existing badge styling slot (the "MÁS POPULAR" pill position) so layout is unchanged.

## Risks / Trade-offs

- **Build-time inlining of `NEXT_PUBLIC_*`** → flipping the flag requires a redeploy, not just a runtime change. Acceptable: re-enabling is a deliberate, infrequent event. Mitigation: document in `.env.example`.
- **Two flags drifting (server vs public)** → if one is set and the other isn't, surfaces disagree. Mitigation: helper defaults both to disabled; document that both must be set together to enable.
- **Disabled `<button>` still in DOM** → ensure `disabled` + no `onClick` side effect, not just visual styling, so keyboard/programmatic activation can't fire checkout.

## Migration Plan

1. Add the flag helper and wire all three surfaces + the API route.
2. Ship with the flag unset → coming-soon everywhere (paid), free flow intact.
3. To re-enable later: set `PAID_PLANS_ENABLED=true` and `NEXT_PUBLIC_PAID_PLANS_ENABLED=true`, redeploy. No code change.
