## 1. Availability flag

- [x] 1.1 Add `paidPlansEnabled()` helper to `src/lib/plans.ts` reading `PAID_PLANS_ENABLED` (server) / `NEXT_PUBLIC_PAID_PLANS_ENABLED` (client), defaulting to disabled when unset
- [x] 1.2 Document `PAID_PLANS_ENABLED` and `NEXT_PUBLIC_PAID_PLANS_ENABLED` in `.env.example` (note: both must be set to enable; redeploy required)

## 2. Landing pricing surface

- [x] 2.1 In `src/app/page.tsx` `Pricing()`, when paid plans are disabled, render the Pro tier with a "Próximamente" marker and a disabled CTA instead of `UpgradeButton`
- [x] 2.2 Keep the Básico tier CTA (`/sign-up`) interactive and unchanged

## 3. In-app upgrade CTAs

- [x] 3.1 In `src/components/UpgradeButton.tsx`, short-circuit `handleClick` and render a disabled "Próximamente" label when paid plans are disabled
- [x] 3.2 In `src/components/chat/UsageBanner.tsx`, render a disabled "Próximamente" upgrade control that does not call `/api/checkout` when paid plans are disabled

## 4. API hardening

- [x] 4.1 In `src/app/api/checkout/route.ts`, return `503` before creating a Stripe payment link when paid plans are disabled

## 5. Verification

- [x] 5.1 Manually verify: landing paid CTA disabled, dashboard upgrade disabled, free signup works, direct `POST /api/checkout` returns 503
- [x] 5.2 `pnpm lint:biome` clean; flip flag locally to confirm checkout path is restored
