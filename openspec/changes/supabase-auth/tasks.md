## 1. Supabase project + external prerequisites

- [ ] 1.1 Enable email (magic-link) provider in the Supabase project (`extranjeria-ia`)
- [ ] 1.2 USER: create a Google Cloud OAuth client (id/secret); enable Google provider in Supabase with those creds
- [ ] 1.3 Add redirect URLs in Supabase Auth settings for the Vercel preview origin + prod (`agente-extranjeria.com`) → `/auth/callback`
- [ ] 1.4 Note: magic-link uses Supabase built-in email (rate-limited) for preview; custom SMTP deferred to a follow-up

## 2. Dependencies + env

- [ ] 2.1 Add `@supabase/supabase-js` + `@supabase/ssr`
- [ ] 2.2 Add `NEXT_PUBLIC_SUPABASE_URL` + publishable key to `.env.local` + `.env.example` (do NOT expose `service_role`)
- [ ] 2.3 Leave Clerk deps/envs in place until after prod promotion

## 3. Auth client layer

- [ ] 3.1 `src/lib/auth/server.ts` — `createServerClient` (cookies) for Server Components + route handlers
- [ ] 3.2 `src/lib/auth/browser.ts` — `createBrowserClient` for client components
- [ ] 3.3 `src/lib/auth/middleware.ts` (or inline) — middleware client that refreshes session + returns cookie-carrying response
- [ ] 3.4 Sign-out action

## 4. Routes + middleware + UI

- [ ] 4.1 `src/app/auth/callback/route.ts` — `exchangeCodeForSession(code)` → redirect `/dashboard`
- [ ] 4.2 Rewrite `src/middleware.ts` — Supabase session refresh + guard `/dashboard`, `/api/{chat,agent,checkout,user}` (redirect pages to `/sign-in`, 401 for API)
- [ ] 4.3 `src/app/layout.tsx` — remove `<ClerkProvider>`
- [ ] 4.4 Rewrite `src/app/(auth)/sign-in` + `sign-up` — Google button + magic-link email input (custom)
- [ ] 4.5 `src/app/dashboard/layout.tsx` — Supabase auth guard/user

## 5. Route handler auth swap

- [ ] 5.1 `api/chat/route.ts` — `auth()`/`currentUser()` → `getUser()`; `userId = user.id`
- [ ] 5.2 `api/agent/route.ts` — same
- [ ] 5.3 `api/user/route.ts` — same
- [ ] 5.4 `api/checkout/route.ts` — same; confirm Stripe customer/user linkage still keyed correctly
- [ ] 5.5 Keep `hasReachedLimit`/plan logic + find-or-create pattern unchanged (only id source changes)

## 6. Data model

- [ ] 6.1 `prisma/schema.prisma` — `User.clerkId` → `User.supabaseId String @unique @map("supabase_id")`
- [ ] 6.2 `prisma migrate dev` (via `DIRECT_URL`) → apply migration on Supabase; `pnpm db:generate`
- [ ] 6.3 Confirm find-or-create now keys on `supabaseId`

## 7. Tests

- [ ] 7.1 Update `api/chat` + `api/agent` route tests to mock Supabase `getUser()` instead of Clerk `auth()`
- [ ] 7.2 `pnpm vitest run` green
- [ ] 7.3 `pnpm lint:biome` clean

## 8. Cutover (Preview → promote)

- [ ] 8.1 Deploy branch to Vercel Preview with Supabase-auth envs; add preview origin to Supabase redirect URLs
- [ ] 8.2 Validate on preview: magic link, Google OAuth, protected-route redirect, authenticated `/api/chat` returns cited sources
- [ ] 8.3 Promote to prod: set prod Supabase-auth envs + prod redirect URLs; deploy
- [ ] 8.4 Prod smoke: login + chat query
- [ ] 8.5 After success: remove `@clerk/nextjs` + Clerk envs (follow-up commit)
- [ ] 8.6 Rollback path documented: redeploy prior (Clerk) deployment
