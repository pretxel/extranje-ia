## ADDED Requirements

### Requirement: Paid plan availability switch

The system SHALL gate all paid-plan purchase flows behind a single availability flag. When paid plans are disabled, no UI surface SHALL initiate a Stripe checkout, and the checkout API SHALL refuse to create payment links.

#### Scenario: Paid plans disabled by default

- **WHEN** the availability flag is unset or `false`
- **THEN** every paid-plan CTA renders in the "coming soon" disabled state
- **AND** no request is sent to `/api/checkout`

#### Scenario: Re-enabling paid plans is a single switch

- **WHEN** an operator sets the availability flag to `true`
- **THEN** all paid-plan CTAs return to their interactive checkout-redirecting behavior with no further code changes

### Requirement: Landing pricing shows coming-soon paid tier

The landing pricing section (`#precios`) SHALL present each paid tier with a "Próximamente" marker and a disabled, non-interactive CTA while paid plans are disabled. The free/Básico tier SHALL remain fully functional.

#### Scenario: Paid tier marked coming soon

- **WHEN** a visitor views the pricing section while paid plans are disabled
- **THEN** the paid tier displays a "Próximamente" label
- **AND** its CTA is visibly disabled and cannot be clicked or focused for activation

#### Scenario: Paid CTA does not reach checkout

- **WHEN** a visitor attempts to activate a disabled paid CTA
- **THEN** no navigation to Stripe occurs and `/api/checkout` is not called

#### Scenario: Free tier unaffected

- **WHEN** a visitor clicks the Básico tier CTA
- **THEN** they are taken to `/sign-up` as normal

### Requirement: In-app upgrade CTA shows coming-soon state

The `UsageBanner` upgrade control (shown on dashboard chat and agent surfaces) SHALL render a disabled "Próximamente" state that does not redirect to checkout while paid plans are disabled.

#### Scenario: Upgrade button disabled in dashboard

- **WHEN** a free-plan user sees the usage banner while paid plans are disabled
- **THEN** the upgrade control shows a "Próximamente" label in a disabled state
- **AND** clicking it does not call `/api/checkout` or navigate away

### Requirement: Checkout API refuses while disabled

The `/api/checkout` route SHALL reject payment-link creation while paid plans are disabled, returning a non-success status, so that direct API calls cannot bypass the UI gate.

#### Scenario: Direct checkout call blocked

- **WHEN** a client POSTs to `/api/checkout` while paid plans are disabled
- **THEN** the route responds with a non-2xx status and creates no Stripe payment link
