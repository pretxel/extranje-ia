## ADDED Requirements

### Requirement: Single canonical plan-limit definition
Plan query limits SHALL be defined in exactly one module (`src/lib/plans.ts`). The duplicate `PLAN_LIMITS` constant in `src/lib/chat-types.ts` SHALL be removed, and all consumers SHALL import the canonical definition.

#### Scenario: A limit value is referenced
- **WHEN** any module needs a plan's query limit
- **THEN** it resolves the value from `src/lib/plans.ts` and no second `PLAN_LIMITS` definition exists in the codebase

#### Scenario: A plan limit changes
- **WHEN** a plan's limit is updated in `src/lib/plans.ts`
- **THEN** the UI banner, the API enforcement, and the `/api/user` response all reflect the new value without further edits

### Requirement: Usage counter stays in sync after each query
The usage banner SHALL reflect current server-side usage after each completed query, not only on initial mount.

#### Scenario: User sends a message under the limit
- **WHEN** a free-plan user completes a query and usage was incremented server-side
- **THEN** the banner's "used of limit" count updates to the new server value without a manual page reload

#### Scenario: User reaches the limit
- **WHEN** the completed query brings the user to their plan limit
- **THEN** the banner transitions to its at-limit state reflecting the server count
