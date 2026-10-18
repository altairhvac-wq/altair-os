# Altair OS launch-readiness audit — 2026-10-18

Purpose: the owner is about to send YouTube and TikTok traffic to the product. This audit answers one question — *can a stranger from a video sign up, land in a working workspace, pay, and run a small field-service company on it today, and what still has to be hardened first?*

Method: code read of the working tree (branch `preserve/video-editor-shorts-20260915`, 23 commits behind `origin/main`; the auth/billing/security code audited here is identical on `main`), live probes of the production deployment, the read-only production schema audit (`scripts/audit-production-schema.mjs`), `npx tsc --noEmit`, `npm run lint`, and `node scripts/verify-all.mjs`. Nothing was changed, no account was created, no data was written.

Severity key — **Blocker**: traffic will bounce or data is at risk; **High**: fix in the first week of real users; **Medium**: fix before scaling; **Low**: hygiene.

---

## 0. Verdict

The platform core is in better shape than the "beta-ready" status doc suggests: every public boundary probed behaves correctly, the live database carries every object the deployed code calls (63/63 checks), all 100 tables have RLS, there are no `using (true)` policies, and type-check and lint are clean. The product can take early clients.

What is **not** ready is the funnel the videos will feed:

1. **`altair-os.com` does not exist.** The product is live at **`altair-op.com`** (`www.` and `app.`). `altair-os.com` is NXDOMAIN — unregistered or unpointed. Any video, caption, or bio that says "altair-os.com" sends people nowhere.
2. **The "14-day free trial" requires a credit card before the first screen**, and if Stripe is not fully configured in production the new company sees "Subscription checkout is not configured yet. Contact support" and never reaches the dashboard.
3. **Signup email confirmation depends on Supabase dashboard settings that cannot be verified from the repo** (template shape + SMTP sender limits). On Supabase's default sender, ~3–4 emails/hour is the ceiling — a single TikTok spike will throttle signups.

Fix those three, and the High list below, before the first video goes public.

---

## 1. Blockers

### B1 — The marketed domain does not resolve
- `nslookup altair-os.com` → NXDOMAIN; `curl https://altair-os.com` → unreachable.
- Live: `altair-op.com` → 308 → `https://www.altair-op.com/` (200); `app.altair-op.com` (200). Both on Vercel with full security headers.
- Nothing in the repo references `altair-os.com`; the legal pages and PWA install view reference `altair-op.com`.
- **Fix:** either register/point `altair-os.com` at the Vercel project (add the domain in Vercel, 308 it to `www.altair-op.com`) or say `altair-op.com` in every video. Decide once; the two names one letter apart will otherwise cost conversions for years.

### B2 — Every new company is born paywalled, and there is no founder override
- `supabase/migrations/124_require_billing_activation_bootstrap.sql:108-122` seeds `company_subscriptions` with `status='incomplete', access_grant='none'`.
- `lib/saas-billing/policy.ts` maps `incomplete` → BLOCKED; `lib/saas-billing/require-app-access.ts:23-40` redirects every `(admin)` and `/technician` render (`app/(admin)/layout.tsx:39`, `app/technician/layout.tsx:30`) to `/activate-subscription`.
- `/activate-subscription` demands a payment method (`shared/components/billing/ActivateSubscriptionView.tsx:59-61`, `lib/saas-billing/checkout.ts:178-184`). If `STRIPE_SECRET_KEY` or any `STRIPE_PRICE_*` is missing, `isSaasBillingCheckoutConfigured()` (`lib/saas-billing/constants.ts:168-183`) is false and the page shows "Subscription checkout is not configured yet. Contact support" (`shared/components/settings/CompanySubscriptionBillingCard.tsx:215`).
- Invited **technicians and dispatchers hit the same gate** and see "Only owners and admins can start billing… sign in again" (`ActivateSubscriptionView.tsx:81-86`) until the owner has paid.
- The complimentary path exists in the data model (`access_grant='beta_comped'`, `lib/saas-billing/policy.ts:59`) but **no UI or action sets it** — only SQL in the Supabase editor. You cannot comp an early client from `/platform`.
- The marketing site is at least honest: pricing says "Credit card required" and "converts to your selected plan unless canceled". The landing-page hero ("Start Your 14-Day Free Trial") does not say it.
- **Fix (pick one):**
  - *Card-free trial*: have `bootstrap_company_for_new_user` seed `status='trialing', trial_ends_at = now() + interval '14 days'`; keep Checkout for conversion at day 10–14. Best for cold video traffic.
  - *Keep card-required*: confirm all `STRIPE_*` vars are set in Vercel production, run one real signup end-to-end, and put "card required" in the hero. Add a `/platform` action that sets `beta_comped` so you can comp people you meet through the channel.

### B3 — Signup confirmation path is unverifiable from the repo and rate-limited by default
- Signup uses an implicit-flow client (`lib/supabase/auth-email.ts:10-19`) with `emailRedirectTo=/auth/callback` (`app/actions/auth.ts:263,286`). `app/auth/callback/route.ts:40-43,110-111` reads only query params (`code`, `token_hash`, `access_token`). Supabase's default confirmation template puts tokens in the URL **fragment**, which the server never sees → `/login?error=auth_callback`. It works only if the Supabase email templates were rewritten to `.../auth/callback?token_hash={{ .TokenHash }}&type=signup`. `docs/reference/internal-alpha-deployment-checklist.md:100-106` does not mention this.
- Signup/reset emails go through **Supabase Auth SMTP**, not Resend. Supabase's built-in sender is limited to roughly 3–4 emails per hour per project. That is the first thing a video spike will break.
- Signup success copy says "confirm your address, then sign in" (`auth.ts:305-308`) but the link signs the user in and bootstraps the company (`lib/auth/post-auth.ts:55-77`). Users who follow the copy literally will try to log in before clicking the link.
- **Fix:** in Supabase → Auth: (a) confirm the templates use `token_hash`, (b) configure custom SMTP (Resend domain is already set up for app mail), (c) confirm `https://www.altair-op.com/auth/callback` and `https://app.altair-op.com/auth/callback` are in the redirect allowlist. In code: switch signup to the PKCE server client so `?code=` arrives regardless of template, and fix the success copy.

---

## 2. High

### H1 — Cross-tenant write: `accept_network_help_offer` never checks the caller
- `supabase/migrations/140_network_help_requests.sql:177-236`: SECURITY DEFINER, granted to `authenticated` (line 236), takes `p_acting_company_id` and only checks `request.company_id = p_acting_company_id`. No `auth.uid()` / `has_company_role` check. Any signed-in user of any tenant can read open requests (policy at 140:107) and mark another company's request `filled`, accept an arbitrary offer, decline the rest, and stamp `filled_referral_id`.
- Verified by reading the function body: the only `raise exception` lines are "not found / no longer open / offer no longer available".
- **Fix:** new migration — `if not public.has_company_role(p_acting_company_id, array['owner','admin']::company_role[]) then raise exception 'insufficient_permission'; end if;` at the top (mirror `137_…sql:58`).

### H2 — Meta Pixel fires on every route, including secret-token pages, with no consent or disclosure
- `app/layout.tsx:111` mounts `<MetaPixel />` at the root; `shared/components/analytics/MetaPixel.tsx:44,67` tracks a PageView on every `usePathname()` change. That includes `/estimate-approval/[token]`, `/invoice-payment/[token]`, and all signed-in admin and technician pages — so customer approval/payment token URLs are sent to Meta.
- The privacy policy contains no mention of cookies or the pixel; signup has no terms acceptance (`shared/components/auth/SignUpForm.tsx`: 0 matches for "terms").
- **Fix:** mount the pixel only in `app/(marketing)/layout.tsx`; never on token or authenticated routes. Add a one-line "By creating an account you agree to the Terms and Privacy Policy" to signup. Add a cookies/analytics paragraph to `/privacy`.

### H3 — Error monitoring is dark unless `SENTRY_DSN` is set, and the browser is never monitored
- `lib/operations/monitoring.ts:87-90` returns early with no DSN; `captureMonitoredEvent/Exception` and flush all no-op (`:191, :219, :245`). The production config check lists the DSN as required (`lib/system-check/production-config.ts:153`) but nothing fails the deploy.
- No `instrumentation-client.ts`; `app/error.tsx:18` and `app/global-error.tsx:45` only `console.error`. A client-side crash during signup is invisible to you.
- No cron heartbeat — if a cron never runs, nothing alerts (Sentry cron monitors not configured; `docs/development/backup-and-restore-runbook.md:385-390` lists alert rules as a manual step).
- **Fix:** confirm `SENTRY_DSN` is set in Vercel production; add `instrumentation-client.ts`; add Sentry cron check-ins to the four cron routes.

### H4 — Team invite claim trusts an email that may not be verified
- `supabase/migrations/030_team_invite_acceptance_rls.sql:4-59` matches on `auth.jwt()->>'email'`; `acceptPendingInvite` (`lib/database/queries/memberships.ts:686-692`) compares emails only. If Supabase email confirmation is ever turned off (or a provider without verified email is added), anyone who signs up with a victim's address claims the membership.
- Invites never expire (`029_team_invite_foundation.sql` has no `expires_at`). Reuse is correctly prevented (`memberships.ts:729-741`).
- **Fix:** require `email_confirmed_at is not null` in the RLS helper, or move to a tokenized invite link; add `invite_expires_at` (14 days) and check it.

### H5 — Data export and workspace deletion exist on the server but no screen calls them
- `app/actions/company-deletion.ts:52` (30-day grace) and `app/actions/workspace-export.ts:46` are not imported by any `.tsx`. Only `scripts/purge-company.mjs` actually deletes. The privacy policy promises "you can export your data first" (`app/(marketing)/privacy/page.tsx:77`).
- An **admin**, not only the owner, can schedule deletion (`175_company_deletion_lifecycle.sql:148`). There is no self-serve account deletion and no "remove member" — only suspend (`app/actions/memberships.ts:504-514`).
- **Fix:** Settings → Workspace: Export and Delete controls (owner-only); Team: Remove member.

### H6 — Links from TikTok/YouTube will unfurl as bare text
- The live homepage `<head>` has only `<meta name="description">` — **no `og:title`, `og:image`, `og:description`, or `twitter:card`**. No `metadataBase`/`openGraph` in `app/layout.tsx` or `app/(marketing)/layout.tsx`.
- `/opengraph-image` → 307 to `/login`; `/apple-touch-icon.png` → 404; `/robots.txt` → 307 to `/login` (no `app/robots.ts`). `sitemap.xml` is public (200) and correct.
- **Fix:** add `metadataBase: new URL("https://www.altair-op.com")`, `openGraph` + `twitter` metadata and a static `public/og.png` (1200×630) in the marketing layout; add `app/robots.ts` and an apple-touch-icon; allow `/robots.txt`, `/opengraph-image`, `/manifest.webmanifest`, `/sw.js` through `lib/supabase/middleware.ts` `isPublicRoute`.

### H7 — The 7-day grace period is dead code: the first failed card payment locks the whole company out at once
- The gate `companyHasFullApplicationAccess` (`lib/saas-billing/app-access-policy.ts:27-35`) allows only `trialing` / `active` / `beta_comped`. `past_due` fails closed, so `app/(admin)/layout.tsx:39` and `app/technician/layout.tsx:30` redirect office **and every technician** to `/activate-subscription` on the first `invoice.payment_failed` (`lib/saas-billing/webhook.ts:1010-1016`).
- Meanwhile `lib/saas-billing/policy.ts:102-124` computes GRACE/LIMITED states for a 7-day window (`constants.ts:32`) and the webhook writes `grace_period_ends_at` (`webhook.ts:381-383,446-452`) — but nothing on the gate path reads it; only the Settings page displays it.
- Impact: a one-day card decline takes an HVAC shop offline mid-dispatch.
- **Fix:** make `requireCompanyBillingAppAccess` (`lib/saas-billing/require-app-access.ts:23-27`) use `evaluateBillingPolicy().canUseOperationalFeatures` instead of the status-only check.

### H8 — Nobody is told when a SaaS payment fails
- `lib/saas-billing/webhook.ts` sends no email or in-app notification on `payment_failed`; `lib/email/` has no past-due template. With H7, the owner's first signal is a locked app.
- **Fix:** send a Resend dunning email to owner memberships from `handleInvoiceEvent(..., "payment_failed")`, and surface a dashboard banner during grace.

---

## 3. Medium

| # | Finding | Where | Fix |
|---|---|---|---|
| M1 | `/sw.js` and `/manifest.webmanifest` 307 to `/login` for logged-out visitors. Console on the live homepage: "The script resource is behind a redirect, which is disallowed." PWA install from `/install` cannot work before login. | `lib/supabase/middleware.ts` `isPublicRoute`; `app/manifest.ts`; `public/sw.js` | Add both paths (plus `/robots.txt`, `/opengraph-image`) to the public list. |
| M2 | Supabase Auth API is callable directly with the anon key, bypassing the app's signup/login rate limits; no CAPTCHA anywhere. | `lib/security/public-rate-limit.ts` only guards server actions | Enable Supabase Auth CAPTCHA (Turnstile) before promotion. |
| M3 | Signup limited to 5/hour **per IP**. Mobile carrier NAT puts thousands of TikTok viewers behind a handful of IPs. | `lib/security/public-rate-limit.ts:76` | Raise to ~30/hour/IP and add a per-email limit; rely on CAPTCHA for abuse. |
| M4 | Invite email links to `/setup` without `?next=`; a user who goes to `/signup` directly must invent a company name and trade, then gets told they have an invite. | `shared/lib/team-invite-link.ts:1`; `SignUpForm.tsx:113-132` | Link to `/signup?next=/setup`; make company/trade optional when a pending invite exists. |
| M5 | Password minimum is 6 characters. | `lib/auth/constants.ts:1` | 10+, and enable Supabase leaked-password protection. |
| M6 | Unknown URLs redirect to `/login?next=…` instead of a 404 — a typo in a video caption sends a stranger to a sign-in form. | `lib/supabase/middleware.ts` | Let `not-found.tsx` render for unauthenticated unknown paths. |
| M7 | `can_access_platform_admin()` is a hard-coded founder email with a fallback to the user-writable `profiles.email`. Safe today only because email-auth JWTs always carry `email`. | `093_marketing_posts_founder_source_rls.sql:4-20`; `002:424` | Compare only the JWT email with `email_verified=true`, or use a server-only allow-list table. |
| M8 | Deprecated `generate_expense_number(uuid)` is still granted to `authenticated` (safe only because the allocator it calls checks membership). | `148_document_number_sequences.sql:326-342` | `revoke execute … from authenticated`. |
| M9 | `vercel.json` declares **4 daily crons**; docs say the project is on Vercel **Hobby**, which allows 2. If still Hobby, two crons are silently not scheduled (billing-maintenance and marketing-ai would be the casualties). | `vercel.json`; `docs/product/ALTair_MASTER_STATUS.md:85` | Check the Vercel plan and the Crons tab; upgrade or consolidate into one cron that fans out. |
| M10 | Rate-limit and audit-event sweep functions exist but nothing calls them; the tables grow forever. | `173_…sql:211-215`, `174_…sql:173` | Call both from `billing-maintenance`. |
| M11 | Service worker is network-only (good — no cache leak on shared tablets) but proxies cross-origin Supabase/Stripe requests and has no offline page. | `public/sw.js:13-15` | Skip non-GET and cross-origin; add `/offline`. |
| M12 | Two `bootstrap_company_for_new_user` overloads coexist (`003` text, `124` text,text). Works because the client always passes both args. | migrations 003 + 124 | Drop the old overload. |
| M14 | **Server Actions — no IDOR found** across all 79 files / ~280 actions; every caller-supplied id goes through a company-scoped query. Two permission-breadth gaps: (a) `saveBillingSignatureAction` / `clearBillingSignatureAction` check the permission against `options.jobId` but write to any company `entityId` — nothing asserts `estimate.jobId === options.jobId`; (b) `loadJobWorkflowEstimateDocumentAction` lets any tech with `createFieldEstimates` read any company estimate + linked invoice + customer email, where the sibling field-estimate path requires the assigned job. | `app/actions/billing-signatures.ts:89-105,135-150`; `app/actions/job-workflow-documents.ts:76-85` | Load the entity's own job and compare before the write/read (mirror `estimates.ts:924-937`). Low: `time-clock.ts:34-78` clock-in/out has no permission gate (own rows only); `alpha-tracker.ts` is writable by any owner/admin though its surface is platform-admin-only. |
| M15 | Customer email addresses are written to logs on **every outbound email** (`console.info("provider accepted email", { intendedRecipient, actualRecipient, … })`) — invites, invoices, billing failures — contrary to the repo's own "do not log customer data" rule. "Temporary" env-diagnostic logging on every send path is still live. | `lib/email/resend.ts:278-289`; `lib/email/env.ts:127,159` | Log `toDomain` only; delete or dev-gate both diagnostics. |
| M16 | Server Actions are not billing-gated — only layouts are. Only `app/actions/saas-billing.ts` imports `@/lib/saas-billing`; a canceled tenant can still mutate data by invoking actions directly, and the policy's READ_ONLY/LIMITED states are unenforceable. | `app/actions/*` | Add `assertCompanyCanMutate(company.id)` and call it from mutating actions (or inside `getActiveCompanyContext` for mutations). |
| M17 | Stripe Connect payment webhook never checks `event.livemode` (the SaaS side does: `app-access-policy.ts:70`, `customer.ts:93`). A mis-pasted test signing secret would record test payments as real. | `lib/payments/process-stripe-webhook-event.ts` | Compare `event.livemode` to the `sk_live_` prefix before recording. |
| M13 | `.env.example` omits variables read in code: `ALTAIR_SITE_ORIGIN`, `ALTAIR_SITE_PUBLISHER_NAME`, `YOUTUBE_REDIRECT_URI`, `AI_MONTHLY_TOKEN_CEILING`, `META_REEL_PROCESSING_*`. And `SUPABASE_SERVICE_ROLE_KEY` is a hard runtime requirement (the billing resolver throws without it) but reads as optional. | `.env.example`; `lib/supabase/service.ts:15-19` | Document; mark required. |

---

## 4. Low / hygiene

- `npm run lint`: 0 errors, **293 warnings** (unused imports/vars). Not blocking; a `--fix` pass clears 10.
- `node scripts/verify-all.mjs` on this branch: 52 pass, 1 fail (`measured-render-qa` → "passes the verdict down from the post row"), marketing-only, likely from the uncommitted YouTube/Shorts changes on this branch — not a product-launch issue, but fix before merging the branch.
- CSP keeps `'unsafe-inline'` in `script-src` (`lib/security/response-headers.ts:32-47,113-115`, a Next bootstrap constraint); move to a nonce-based CSP after launch. `app/api/marketing/media/ingest/route.ts:37,54-60` still accepts a legacy non-Bearer secret header (constant-time compared; hygiene only).
- `middleware.ts` uses the pre-16 convention; Next 16.3 wants `proxy.ts` (`node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md:86`).
- No `error.tsx` under `app/(auth)` or `app/setup`; root `app/error.tsx:46-51` offers "Back to dashboard" to a logged-out user.
- Docs drift: `OPERATIONS_EXECUTION_FRAMEWORK.md` and `OPERATIONS_FOUNDATION.md` still say metrics/Sentry are no-op/future; `ALTair_MASTER_STATUS.md` is dated 2026-07-05 and predates SaaS billing (120–124), rate limiting (173), audit events (174), deletion lifecycle (175).
- Working-tree state: this branch carries 17 modified files (YouTube adapter/publish-guard, AI provider, system checks) and an uncommitted `supabase/migrations/199_delivery_visibility_reconciliation.sql` (index-only, no RLS impact). None of it is on `main`/production. Decide whether it ships or is discarded before launch so the deployed code and the audited code converge.
- Repo is public and Vercel deploys every pushed branch except this one (`vercel.json` guard) — keep secrets out of commits.

---

## 5. What checked out (evidence, so you do not re-audit it)

- **Route handlers (all 20+ verified):** every cron, webhook, agent-bridge, ingest and OAuth-callback handler checks its secret or signature *before* any database access; all secret comparisons share one constant-time helper (`lib/operations/bearer-auth.ts:35-44`, SHA-256 + `timingSafeEqual`); OAuth callbacks take company/user from the consumed state row, never from the query string. No `createServiceRoleClient` import in any `.tsx`; no non-`NEXT_PUBLIC_` env read in any client component; no keys in tracked or untracked source.
- **Live perimeter:** HSTS preload, CSP, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` on every response; `poweredByHeader: false`. `/api/cron/*` without secret → 401. `/api/webhooks/payments|billing` GET → 405, POST without signature → 400. `/api/agent/*`, `/api/marketing/media/ingest` → 405 on GET. Invalid estimate/invoice tokens render a friendly state, no stack.
- **Production database** (`scripts/audit-production-schema.mjs --confirm acsmgzkbvstrbggsukyx`, read-only): 63/63 — every RPC the deployed code calls is present, executable, and refuses anon; 72/72 other functions refuse anon; all referenced columns resolve; anon reads zero rows from invoices/customers/leads/expenses. Migration 155 (AI usage/limits) **is applied** in production, contradicting an older "intentionally not applied" note.
- **RLS, from the 200 migrations:** 100/100 tables enable RLS; no `using (true)` / `with check (true)`; the only anon table grant is `marketing_site_pages` (published rows only); 112/112 SECURITY DEFINER functions set `search_path`; all tenant-arg RPCs except H1 verify membership; money RPCs (`record_invoice_payment_atomic`, reconciliation, time entries, document numbering, deletion lifecycle) are service-role only; storage `company-files` is private with row-joined read checks; `marketing-media` service-role only.
- **Auth flow:** open self-serve signup, no waitlist; `sanitizeNextPath` blocks `//`, `://`, `\` (`lib/auth/redirects.ts:66-92`); callback builds `${origin}${sanitized}` only; zero-company users → `/setup` with no loop; profile created by trigger with RPC fallback; invite binds to the row's `company_id`, one-shot.
- **Tenancy at runtime:** `getActiveCompanyContext` loads only `status='active'` memberships per request (`lib/database/company-context.ts:87,208`) — suspending a user takes effect on their next request; company switcher validates membership server-side.
- **Rate limiting:** Postgres-backed, hashed keys, wired into login, signup, reset, invite, estimate approval, invoice checkout, token views; token endpoints fail closed if the limiter is down.
- **Money paths:** both Stripe webhooks verify signatures before any write with deliberately separate secrets (`app/api/webhooks/billing/route.ts:76-100`, `payments/route.ts:93-112`); replay-safe via `unique (provider, provider_event_id)` (`098_…sql:27-28`) plus unique payment rows and `record_invoice_payment_atomic` catching `unique_violation`; transient failures return 500 so Stripe retries; unresolvable events park as `reconciliation_required`. Public tokens are 256-bit `randomBytes`, stored as SHA-256, 30-day expiry, revoked on reissue; test/live mode is surfaced in Settings → Billing.
- **CSV import:** `manageCustomers` checked in the action, every read/write scoped to `context.company.id`, 500-row cap, email/phone dedupe (`app/actions/customers-import.ts`, `shared/lib/customer-import.ts`).
- **Mock data:** no nav-reachable admin or technician route imports `@/shared/data`; the only importers are the dev-only `/tech/demo` and a dead `TimeClockPageView.tsx`. Settings → Integrations/Notifications/Preferences say "Not available yet" honestly.
- **Static checks:** `npx tsc --noEmit` exit 0; `npm run lint` exit 0.

### Module readiness

| Module | Status |
|---|---|
| Customers / Leads, Jobs, Dispatch, Estimates / Invoices, Price book, Expenses / Payroll / Time clock, Technician app (`/technician`), CSV import, Estimate approval + Invoice payment links (public tokens), Stripe Connect payments, Billing cron | **production-ready** |
| SaaS subscriptions (Checkout, webhook, portal) | partial — works, but H7 grace lockout, H8 no dunning, M16 action-level gate |
| Reports | partial — live `getReportsPageData`; richer `AnalyticsPageView` unused with TODO |
| Settings → Integrations / Notifications / Preferences | partial — explicit "Not available yet" |
| Marketing hub | partial — automation stubs labelled; founder-only publishing |
| Data export / workspace deletion / remove member | **missing UI** (server actions exist) — H5 |

---

## 6. Owner checklist — things only you can verify (dashboards, not repo)

**Vercel**
- [ ] Plan tier (Hobby vs Pro) and the Crons tab: are all 4 crons scheduled? (M9)
- [ ] Production env has: `STRIPE_SECRET_KEY`, `STRIPE_BILLING_WEBHOOK_SECRET`, `STRIPE_WEBHOOK_SECRET`, all six `STRIPE_PRICE_*`, `SENTRY_DSN`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `NEXT_PUBLIC_APP_URL=https://www.altair-op.com`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`.
- [ ] Add `altair-os.com` as a domain (redirect to `www.altair-op.com`) **or** retire the name from all scripts. (B1)
- [ ] Decide which of `www.` / `app.` is canonical. Today both hosts serve the identical marketing homepage with no `<link rel="canonical">` (no `alternates` metadata in `app/layout.tsx`), so search engines see duplicate content and link previews split. Redirect the non-canonical host's marketing paths, or set `alternates.canonical` in the marketing layout.

**Supabase (project `acsmgzkbvstrbggsukyx`)**
- [ ] Auth → Email templates: Confirm signup / Magic link / Reset use `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=…`. (B3)
- [ ] Auth → SMTP: custom SMTP configured (not the built-in sender). (B3)
- [ ] Auth → URL configuration: Site URL = `https://www.altair-op.com`; redirect allowlist includes both hosts' `/auth/callback` and `/reset-password`.
- [ ] Auth → Attack protection: enable CAPTCHA (Turnstile) and leaked-password protection. (M2, M5)
- [ ] Confirm the keyset indexes from migrations 162/163 exist (SQL editor; PostgREST cannot see indexes).

**Stripe**
- [ ] Live mode keys in Vercel production; both webhook endpoints (`/api/webhooks/billing`, `/api/webhooks/payments`) registered against `www.altair-op.com` with the live signing secrets.
- [ ] Six live Price IDs match the `STRIPE_PRICE_*` vars; a test subscription reaches `trialing` and the dashboard unlocks.

**Then**
- [ ] One real end-to-end signup from a phone on cellular data: video link → signup → email → `/auth/callback` → `/activate-subscription` → dashboard → invite a technician → technician accepts and sees `/technician`. This is `docs/reference/internal-alpha-smoke-test.md` §Auth + §Team invite, and it has never been run against the current billing gate per the status doc.

---

## 7. Recommended order of work

1. **Day 0 (owner, no code):** domain decision (B1); Supabase templates + SMTP + allowlist + CAPTCHA (B3, M2, M5); Vercel env + plan (B2, H3, M9); Stripe live webhooks. Then the real-phone smoke test.
2. **PR 1 — funnel:** card-free trial or explicit card copy + `/platform` comp action (B2); OG/Twitter metadata, `robots.ts`, apple-touch-icon, public `sw.js`/manifest/robots/og routes (H6, M1); terms line on signup (H2); signup success copy; PKCE signup client (B3); unknown-path 404 (M6); signup rate limit (M3).
3. **PR 2 — safety:** grace-period gate + dunning email (H7, H8); `livemode` check on the Connect webhook (M17); migration 200: `accept_network_help_offer` role check (H1), revoke `generate_expense_number` (M8), harden `can_access_platform_admin` (M7), drop old bootstrap overload (M12), invite expiry + verified-email check (H4). Pixel moved to the marketing layout (H2). `instrumentation-client.ts` + cron check-ins (H3). Sweep calls in billing-maintenance (M10).
4. **PR 3 — trust:** Settings → Export / Delete workspace (owner-only) and Remove member (H5); privacy policy cookies paragraph; `.env.example` and status-doc refresh (M13, Low).

Agent-authored sections consolidated and spot-checked by hand: H1 (function body read), H2 (`app/layout.tsx:111`), B2 (`124_…sql:108-122`, `policy.ts:59`), H6 and M1 (live `curl`/console), production schema audit (run live).
