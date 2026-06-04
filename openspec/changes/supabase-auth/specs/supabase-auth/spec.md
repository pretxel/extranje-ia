## ADDED Requirements

### Requirement: Supabase Auth is the identity provider

The system SHALL authenticate users via Supabase Auth using Google OAuth and magic-link (email OTP) sign-in. Clerk MUST NOT be used for authentication. Password-based login SHALL NOT be offered.

#### Scenario: Magic-link sign-in

- **WHEN** a user submits their email on the sign-in page
- **THEN** Supabase sends a magic link
- **AND** clicking it lands on `/auth/callback`, which exchanges the code for a session and redirects to `/dashboard`

#### Scenario: Google OAuth sign-in

- **WHEN** a user clicks "Continue with Google"
- **THEN** they complete Google's consent flow and return to `/auth/callback`
- **AND** a Supabase session is established and they reach `/dashboard`

#### Scenario: No Clerk in the auth path

- **WHEN** the application handles authentication
- **THEN** no `@clerk/*` API (`clerkMiddleware`, `<ClerkProvider>`, `auth()`, `currentUser()`) is invoked

### Requirement: SSR session management

The system SHALL manage sessions with `@supabase/ssr` using cookie storage, with distinct browser, server, and middleware clients. Middleware SHALL refresh the session on each request and return the response carrying the refreshed cookies.

#### Scenario: Session refreshed across requests

- **WHEN** an authenticated user navigates between pages
- **THEN** the middleware refreshes the auth cookie
- **AND** Server Components and route handlers read the same valid session without re-login

### Requirement: Server-side authorization uses verified identity

Server-side authorization decisions SHALL use `supabase.auth.getUser()` (which revalidates the token). The system MUST NOT base authorization on `getSession()`.

#### Scenario: Unverified session not trusted

- **WHEN** a route handler authorizes a request
- **THEN** it calls `getUser()` and uses the returned user
- **AND** it does not authorize based on `getSession()` alone

### Requirement: Protected routes require authentication

The system SHALL require an authenticated session for `/dashboard` and `/api/chat`, `/api/agent`, `/api/checkout`, `/api/user`. Unauthenticated access SHALL be denied (redirect to sign-in for pages; 401 for API routes).

#### Scenario: Unauthenticated access blocked

- **WHEN** an unauthenticated request hits `/dashboard` or a protected `/api/*` route
- **THEN** a page request is redirected to `/sign-in`
- **AND** an API request receives a 401

#### Scenario: Authenticated access allowed

- **WHEN** an authenticated user requests `/api/chat`
- **THEN** the handler runs and returns the RAG response (subject to plan limits)

### Requirement: User record keyed on Supabase identity

The `User` record SHALL be keyed on the Supabase `auth.users` UUID (`supabaseId`, unique). On the first authenticated request for a user without a row, the system SHALL find-or-create the `User` using that UUID and the verified email. `clerkId` SHALL be removed.

#### Scenario: First login creates the user row

- **WHEN** a newly authenticated user makes their first request and no `User` row exists
- **THEN** a `User` row is created with `supabaseId` = the auth UUID, email from the verified user, default plan `free`

#### Scenario: Returning user matched by Supabase id

- **WHEN** a returning user authenticates
- **THEN** their existing `User` row is found by `supabaseId` (no duplicate created)

### Requirement: Authorization data is not user-editable

Authorization-relevant data (`plan`, `queriesUsed`) SHALL be stored in the database and enforced in app code. It MUST NOT be read from `user_metadata` (user-editable). If any authorization claim is ever placed in the JWT, it MUST use `app_metadata`.

#### Scenario: Plan comes from the database

- **WHEN** the system checks whether a user has reached their query limit
- **THEN** it reads `plan`/`queriesUsed` from the `User` row, not from `user_metadata`

### Requirement: Safe production cutover

The cutover SHALL be validated on a non-production deployment before production. Production auth MUST remain on the prior provider until the new auth is validated, and rollback MUST be possible by redeploying the prior deployment.

#### Scenario: Validate on preview before prod

- **WHEN** the Supabase-auth build is ready
- **THEN** it is deployed to a Vercel Preview with Supabase-auth env + redirect URLs and validated (Google, magic link, protected routes, `/api/chat`)
- **AND** production is only promoted after the preview passes

#### Scenario: Rollback by redeploy

- **WHEN** a problem appears after promotion
- **THEN** redeploying the prior (Clerk) deployment restores working auth with no schema change required
