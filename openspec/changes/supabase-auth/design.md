## Context

Auth today is Clerk v6 across ~12 files: `clerkMiddleware` (`src/middleware.ts`) protects `/dashboard`, `/api/{chat,agent,checkout,user}`; `<ClerkProvider>` wraps the app; `<SignIn>`/`<SignUp>` render the auth pages; route handlers call `auth()`/`currentUser()` and find-or-create a `User` row keyed on `clerkId`. Data access is Prisma via the owner role (bypasses RLS); authorization is app code (`hasReachedLimit`). The database + RAG corpus already live on Supabase (`migrate-to-supabase` P1). Production is live at `agente-extranjeria.com`.

This change swaps **only** the identity layer to Supabase Auth. Decided in brainstorming: identity-only (keep Prisma), fresh start (no user migration), Google OAuth + magic link, Preview→promote cutover.

## Goals / Non-Goals

**Goals:**
- Replace Clerk with Supabase Auth (Google OAuth + magic link) using `@supabase/ssr`.
- Preserve all current behavior: protected routes, plan/quota enforcement, Stripe, RAG.
- Re-key `User` on the Supabase `auth.users` UUID; rows re-create on first login.
- Cut over safely via a validated Vercel Preview before touching prod login.

**Non-Goals:**
- No RLS-policy authorization (Prisma owner role bypasses RLS; identity-only keeps app-level checks). RLS stays enabled-no-policy (Data API locked).
- No data-layer rewrite (no `supabase-js` for app queries).
- No user migration from Clerk (passwords can't export; fresh start chosen).
- No password login (passwordless only). No org/RBAC (Clerk orgs not in use).
- No custom SMTP in this change (deferred; preview uses Supabase built-in email).

## Decisions

### D1 — `@supabase/ssr` with three clients
Browser client (client components), server client (Server Components + route handlers, reads/refreshes cookie session), middleware client (refreshes session every request + guards routes). Rationale: the official SSR pattern for Next.js App Router; cookie-based sessions work across RSC/route handlers. Factories live in `src/lib/auth/`.
- **Alternative — `@supabase/auth-helpers-nextjs`:** deprecated in favor of `@supabase/ssr`. Rejected.

### D2 — Server identity via `getUser()`, never `getSession()`
All server-side authorization reads `supabase.auth.getUser()` (revalidates the token with Supabase). `getSession()` trusts the cookie without verification → unsafe for authz. Security rule, non-negotiable.

### D3 — `User` re-keyed to Supabase UUID, find-or-create preserved
`prisma/schema.prisma`: `clerkId @unique` → `supabaseId @unique` (uuid). Route handlers find-or-create the `User` by `supabaseId` (and email from the verified user) — same shape as today, different id source. `plan`/`queriesUsed` stay DB columns. Fresh start means no backfill; first authed request per user creates the row.
- **Alternative — keep `clerkId` column name, store Supabase id:** confusing/misleading; rejected. Clean rename + migration.

### D4 — Auth flows: OAuth + OTP both via `/auth/callback`
Google: `signInWithOAuth({provider:'google', options:{redirectTo: <origin>/auth/callback}})`. Magic link: `signInWithOtp({email, options:{emailRedirectTo: <origin>/auth/callback}})`. The callback route handler calls `exchangeCodeForSession(code)` then redirects to `/dashboard`. Single callback for both keeps the surface small.

### D5 — Middleware: session refresh + route guard
Replace `clerkMiddleware` with a Supabase middleware that (a) refreshes the auth cookie via the middleware client, (b) redirects unauthenticated requests to protected matchers (`/dashboard`, `/api/{chat,agent,checkout,user}`) to `/sign-in`. Must return the response object that carries refreshed cookies (SSR gotcha — mutating the wrong response drops the session).

### D6 — Cutover: Preview → promote
Build on the `supabase-auth` branch → Vercel Preview deploy with Supabase-auth envs (and Supabase redirect URLs including the preview domain) → validate Google login, magic link, protected routes, `/api/chat` end-to-end → promote to prod (set prod envs + redirect URLs, deploy). Clerk remains the live prod auth until promotion; rollback = redeploy the prior (Clerk) deployment.

## Risks / Trade-offs

- **SSR cookie handling is the classic failure point** → use the official `@supabase/ssr` middleware pattern verbatim; return the cookie-carrying response. Verify against current Supabase docs before coding (their snippets change).
- **Google OAuth needs external creds** (Google Cloud OAuth client) → blocks Google login until the user provides id/secret to Supabase. Magic link can be validated first without it.
- **Magic-link email rate limits** on Supabase's built-in sender (~3-4/hr) → fine for preview testing; production needs custom SMTP (deferred, flagged).
- **Redirect URL mismatch** → OAuth/OTP fail if the preview/prod origins aren't in Supabase's allowed redirect list. Add both.
- **Token ≠ session-revocation** (security): deleting a user doesn't kill live tokens; keep JWT expiry modest.
- **Removing Clerk envs too early** would break the live prod deploy → remove only after promote succeeds.
- **`NEXT_PUBLIC_` exposure**: only the URL + publishable/anon key may be public; `service_role` never.

## Migration Plan

1. Supabase project: enable Google provider (after user supplies Google OAuth creds) + email/magic-link; add redirect URLs for preview + prod origins.
2. Add deps `@supabase/supabase-js` + `@supabase/ssr`; add `NEXT_PUBLIC_SUPABASE_URL` + publishable key to env.
3. Build `src/lib/auth/` client factories + sign-out; `/auth/callback` route; rewrite middleware; rewrite sign-in/up pages; swap `auth()` → `getUser()` in the 4 API routes + dashboard layout.
4. Prisma: rename `clerkId` → `supabaseId`, migration via `DIRECT_URL`.
5. Deploy Preview with Supabase-auth envs; validate magic link first, then Google (once creds set), protected routes, `/api/chat`.
6. Promote to prod (prod envs + redirect URLs); smoke; then remove Clerk deps + envs in a follow-up commit.
7. Rollback: redeploy prior Clerk deployment.

## Open Questions

- Verify the exact current `@supabase/ssr` Next.js middleware + server-client snippets against live Supabase docs before wiring (D1/D5).
- Production SMTP provider for magic-link email (deferred) — pick before heavy prod usage.
- Sign-out + post-login redirect targets (assume `/dashboard`) — confirm during build.
- Whether to keep the `(auth)` route group + `/sign-in`,`/sign-up` paths (yes, reuse) vs new paths.
