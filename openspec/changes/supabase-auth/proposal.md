## Why

The database and RAG corpus now live on Supabase (change `migrate-to-supabase`, P1), but authentication still runs on Clerk — a second vendor and identity store. Consolidating login onto Supabase Auth removes that vendor, unifies identity with the database, and is the P3 phase deferred from the migration proposal. Scope is deliberately **identity-only**: Supabase Auth replaces Clerk for login/sessions while the Prisma data layer and all app-level authorization stay exactly as they are — the smallest viable change for a live production app.

## What Changes

- **BREAKING:** Remove Clerk (`@clerk/nextjs`) as the auth provider. `clerkMiddleware`, `<ClerkProvider>`, `<SignIn>`/`<SignUp>`, and `auth()`/`currentUser()` are replaced by Supabase Auth via `@supabase/ssr`.
- **BREAKING:** `User.clerkId` → `User.supabaseId` (the Supabase `auth.users` UUID). Existing Clerk users are **not migrated** (fresh start); rows re-create on first authenticated request.
- Login methods: **Google OAuth** and **magic link (passwordless email)**. No password flows.
- New `/auth/callback` route handler exchanges the OAuth/OTP `code` for a session; new sign-out action.
- Custom sign-in/sign-up UI (Google button + magic-link email input) replacing Clerk components.
- Server-side identity via `supabase.auth.getUser()` (verified) — never `getSession()` for authorization.
- `plan`/`queriesUsed` and all authorization remain DB-driven and app-enforced (`hasReachedLimit`); RLS stays enabled-without-policies (Data API locked). Prisma, Stripe, RAG, and retrieval are untouched.
- Cutover via Vercel **Preview → promote** (Clerk stays live in prod until promotion).

## Capabilities

### New Capabilities
- `supabase-auth`: User authentication and session management on Supabase Auth — Google OAuth + magic-link sign-in, SSR session handling via `@supabase/ssr` (browser/server/middleware clients), protected-route enforcement, the `auth.users`→`User` record model, and the authorization-data placement rules (`app_metadata` vs `user_metadata`).

### Modified Capabilities
<!-- None at the requirement level. `extranjeria-agent-chat` keeps its requirement ("authenticated users can chat with cited sources"); only the auth provider behind it changes, captured under `supabase-auth`. -->

## Impact

- **Code (~12 files):** `src/middleware.ts`, `src/app/layout.tsx`, `src/app/(auth)/sign-in/**`, `src/app/(auth)/sign-up/**`, new `src/app/auth/callback/route.ts`, new `src/lib/auth/*` (client factories + sign-out), `src/app/api/{chat,agent,user,checkout}/route.ts` (auth source), `src/app/dashboard/layout.tsx`, `prisma/schema.prisma` (`User.supabaseId` + migration), related tests.
- **Unchanged:** Prisma data access, `hasReachedLimit`/plan logic, Stripe, RAG/retrieval, the `documents`/`chunks`/`rag_vectors` tables.
- **Dependencies:** add `@supabase/supabase-js`, `@supabase/ssr`; remove `@clerk/nextjs` after cutover.
- **Config / external prerequisites:** enable Google + email(magic-link) providers in the Supabase project; create a **Google Cloud OAuth client** (id/secret) and paste into Supabase (user action); set redirect URLs (preview + prod). Magic-link uses Supabase's rate-limited built-in email for preview — production needs **custom SMTP** (deferred).
- **Env:** add `NEXT_PUBLIC_SUPABASE_URL` + publishable key; remove Clerk envs (`*_CLERK_*`) after cutover.
- **Security:** `getUser()` not `getSession()` for authz; `service_role`/secret key never `NEXT_PUBLIC_*`; `plan` stays out of `user_metadata`; deleting a user does not revoke live tokens.
- **Cutover/rollback:** Preview deploy with Supabase-auth envs, validated before promote; rollback = revert the deployment (Clerk env + code still on the prior prod deploy).
