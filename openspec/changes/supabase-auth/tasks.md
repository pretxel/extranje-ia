## 1. Supabase project + external prerequisites

- [ ] 1.1 Confirm email (magic-link) provider enabled in Supabase (`extranjeria-ia`) — on by default; verify
- [ ] 1.2 USER: create a Google Cloud OAuth client (id/secret); enable Google provider in Supabase (deferred — magic-link first)
- [ ] 1.3 Add redirect URLs in Supabase Auth → URL Configuration for the preview origin + prod (`agente-extranjeria.com`) → `/auth/callback`
- [ ] 1.4 Note: magic-link uses Supabase built-in email (rate-limited) for preview; custom SMTP deferred

## 2. Dependencies + env

- [x] 2.1 Added `@supabase/supabase-js` 2.107.0 + `@supabase/ssr` 0.10.3
- [x] 2.2 Added `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to `.env.local` + `.env.example` (publishable key only; no service_role)
- [x] 2.3 Clerk dep left installed (no code references it); remove after prod promotion

## 3. Auth client layer

- [x] 3.1 `src/lib/auth/server.ts` — `createServerClient` (cookies getAll/setAll) for RSC + route handlers
- [x] 3.2 `src/lib/auth/browser.ts` — `createBrowserClient`
- [x] 3.3 `src/lib/auth/middleware.ts` — `updateSession` (refresh + return cookie-carrying response + route guard)
- [x] 3.4 `src/components/auth/SignOutButton.tsx` sign-out action; `src/lib/auth/config.ts` env helper

## 4. Routes + middleware + UI

- [x] 4.1 `src/app/auth/callback/route.ts` — `exchangeCodeForSession` → `/dashboard/chat`
- [x] 4.2 `src/middleware.ts` — Supabase session refresh + guard (`/dashboard`, `/api/{chat,agent,checkout,user}`; redirect pages, 401 API)
- [x] 4.3 `src/app/layout.tsx` — removed `<ClerkProvider>`
- [x] 4.4 `src/components/auth/AuthForm.tsx` (Google button + magic-link input) wired into sign-in + sign-up pages
- [x] 4.5 `src/app/dashboard/layout.tsx` — `UserButton` → `SignOutButton`; `src/app/page.tsx` Nav → Supabase session check

## 5. Route handler auth swap

- [x] 5.1 `api/chat` — `getOrCreateUser()`; increment by `user.id`
- [x] 5.2 `api/agent` — same
- [x] 5.3 `api/user` — same
- [x] 5.4 `api/checkout` — same; `client_reference_id = user.supabaseId`
- [x] 5.5 `api/webhooks/stripe` (was missed by plan; caught by tsc) — keys on `supabaseId` / `client_reference_id`. `hasReachedLimit`/plan logic unchanged.

## 6. Data model

- [x] 6.1 `prisma/schema.prisma` — `User.clerkId` → `User.supabaseId @map("supabase_id")`
- [x] 6.2 Applied rename to Supabase via MCP (RENAME COLUMN + index) — NOT `migrate dev` (would reset/drop rag_vectors); hand-written migration + `migrate resolve --applied`; `db:generate`
- [x] 6.3 Find-or-create keys on `supabaseId` (centralized in `getOrCreateUser`)

## 7. Tests

- [x] 7.1 `api/chat` + `api/agent` route tests mock `getOrCreateUser()` instead of Clerk
- [x] 7.2 `pnpm vitest run` — 54/54 pass
- [x] 7.3 `pnpm lint:biome` clean; `tsc --noEmit` clean; `pnpm build` green

## 8. Cutover (Preview → promote)

- [ ] 8.1 Deploy branch to Vercel Preview with Supabase-auth envs; add preview origin to Supabase redirect URLs
- [ ] 8.2 Validate on preview: magic link, (Google once creds set), protected-route redirect, authenticated `/api/chat` returns cited sources
- [ ] 8.3 Promote to prod: set prod Supabase-auth envs + prod redirect URLs; deploy
- [ ] 8.4 Prod smoke: login + chat query
- [ ] 8.5 After success: remove `@clerk/nextjs` + Clerk envs (follow-up commit)
- [ ] 8.6 Rollback path: redeploy prior (Clerk) deployment
