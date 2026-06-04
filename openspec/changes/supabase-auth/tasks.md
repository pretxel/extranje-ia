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
- [~] 6.2 Migration written (`20260604180000_rename_clerk_to_supabase`, RENAME COLUMN+index — NOT `migrate dev`, which would reset/drop rag_vectors). Applied then REVERTED: prod shares this DB with the still-live Clerk deploy (needs `clerk_id`), so a pre-cutover rename broke prod. Column restored to `clerk_id`; migration record deleted so it re-applies AT cutover. `db:generate` done (client has `supabaseId`).
- [x] 6.3 Find-or-create keys on `supabaseId` (centralized in `getOrCreateUser`)

## 7. Tests

- [x] 7.1 `api/chat` + `api/agent` route tests mock `getOrCreateUser()` instead of Clerk
- [x] 7.2 `pnpm vitest run` — 54/54 pass
- [x] 7.3 `pnpm lint:biome` clean; `tsc --noEmit` clean; `pnpm build` green

## 8. Cutover (Preview → promote)

> SHARED-DB CONSTRAINT: prod + this branch use the same Supabase DB, and the
> `clerk_id`→`supabase_id` rename is incompatible with the live Clerk code.
> So the rename must NOT be pre-applied to the prod DB — it happens atomically
> at promote, and preview validates against an isolated Supabase **branch** DB.

- [x] 8.1 Used a 2nd FREE project `extranjeria-ia-preview` (`yarptkmjstpsrpukvgjf`) instead of a paid branch. Schema (→supabase_id) + RLS + vector via MCP. Vercel Preview env set via API (preview Supabase + DB + OpenAI/Stripe). Deployed: https://extranje-lmtl2e7k1-edsels-projects-7227ff3c.vercel.app. Disabled Vercel SSO protection (RE-ENABLE after).
- [~] 8.2 Server-side validated on preview: sign-in 200, API guard 401, page guard 307→/sign-in, /auth/callback handler live. PENDING (human, can't curl): add preview redirect URL to `extranjeria-ia-preview` Auth config, then magic-link round-trip (email→click→/dashboard). `/api/chat` returns empty RAG (no corpus in preview — expected).
- [x] 8.0 Configured Resend SMTP + Site URL + redirect URLs on extranjeria-ia via Management API (PAT). Verified: test OTP no longer uses built-in mailer; user confirmed email delivery.
- [x] 8.3 Promoted: `vercel --prod` deployed P3 (dpl_GEBknYkwRaQiu6KxuAWa3T35k8RK) while Clerk served the build; then renamed `clerk_id→supabase_id` on prod DB (users=0, zero data risk); `migrate resolve --applied` recorded it. Prod `NEXT_PUBLIC_SUPABASE_*` set.
- [x] 8.4 Prod smoke (www.agente-extranjeria.com): homepage 200, sign-in 200 showing the Supabase AuthForm, /api/user 401, /dashboard 307→/sign-in, no Clerk markers.
- [ ] 8.5 After confirming real-user login: remove `@clerk/nextjs` + Clerk envs (follow-up commit)
- [ ] 8.6 Rollback path: redeploy prior (Clerk) deployment + revert column (`supabase_id`→`clerk_id`)

## 9. CRITICAL follow-ups (prod is live but incomplete)

- [ ] 9.1 ⚠️ Resend sender is `onboarding@resend.dev` → delivers ONLY to the Resend account owner's email. REAL OTHER USERS CANNOT RECEIVE MAGIC LINKS until `agente-extranjeria.com` is verified in Resend and the sender switched to `noreply@agente-extranjeria.com` (Management API PATCH smtp_admin_email).
- [ ] 9.2 Enable Google OAuth (creds) as a non-email fallback login.
- [ ] 9.3 Raise auth email rate limit (currently ~2/hr) for real usage.
- [ ] 9.4 ROTATE the secrets pasted in chat: Supabase PAT + Resend API key.
- [ ] 9.5 Cleanup: delete throwaway `extranjeria-ia-preview` project; re-enable Vercel deployment protection (disabled globally for preview testing); remove `PREVIEW_*` from `.env.local`.
