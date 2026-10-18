# Internal Alpha / Beta Deployment Checklist

Use this checklist before and after deploying Altair OS to Vercel for internal alpha or first external beta companies.

## Deployment target

- **Platform:** Vercel (private project, invite-only team access)
- **Database:** Supabase project with all repo migrations applied (through `109_platform_founder_signal_actions.sql`)
- **Audience:** Internal testers and invited beta companies — not public launch

---

## 1. Vercel environment variables

Set these in **Project Settings → Environment Variables**.

### Required (Production + Preview)

| Variable | Scope | Notes |
|----------|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview | Supabase project URL. Safe for browser. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview | Supabase anon/public key. Safe for browser. |

### Required for beta launch (Production — server-only, never expose to browser)

| Variable | Scope | Notes |
|----------|-------|-------|
| `SUPABASE_SERVICE_ROLE_KEY` | Production | Required for `/platform` Founder Brain, bug report admin, workflow reminder cron, founder signal actions, and cross-tenant platform queries. `/platform` will error if missing. |
| `CRON_SECRET` | Production | Vercel cron sends `Authorization: Bearer <CRON_SECRET>`. Without it, `/api/cron/workflow-reminders` returns 503 and workflow reminders never evaluate. |
| `NEXT_PUBLIC_APP_URL` | Production, Preview | Full `https://` origin for invite emails, estimate approval links, and invoice payment links. Falls back to `VERCEL_URL` on Vercel when unset. |

The project currently uses the Vercel Hobby-compatible daily schedule `0 12 * * *` (12:00 UTC). Reliability marks the workflow cron stale after 36 hours so normal schedule and build jitter do not create false alarms. Hourly cron schedules require a Vercel plan that supports more than one run per day.

### Recommended for beta launch (Production)

| Variable | Scope | Notes |
|----------|-------|-------|
| `STRIPE_SECRET_KEY` | Production | Stripe Connect onboarding and public Pay Now checkout. Manual payments work without Stripe. |
| `STRIPE_WEBHOOK_SECRET` | Production | Required for checkout payment recording and Connect account sync. |
| `RESEND_API_KEY` | Production | Team invite and billing email delivery. Invites still save without Resend; UI reports delivery honestly. |
| `RESEND_FROM_EMAIL` | Production | Verified sender domain for Resend. |
| `NEXT_PUBLIC_ALPHA_HARDENING` | Preview (optional) | Set to `true` on Preview if you want alpha nav/Coming Soon behavior before Production. **Production enables alpha hardening automatically** via `NODE_ENV=production`. Coming Soon path lists are currently **empty** — estimates, price book, and network are reachable in production. |

### Optional (SMS payment links)

| Variable | Scope | Notes |
|----------|-------|-------|
| `SMS_PROVIDER` | Production | Set to `twilio` when SMS is enabled. |
| `TWILIO_ACCOUNT_SID` | Production | Twilio account SID (server-only). |
| `TWILIO_AUTH_TOKEN` | Production | Twilio auth token (server-only). |
| `SMS_FROM_NUMBER` | Production | Twilio sender number. |

### Verify after deploy

- [ ] Production build succeeds (`npm run build`)
- [ ] `/settings/system-check` loads for a company **owner** and shows passing checks
- [ ] No secret values appear in client bundles or the system-check UI

---

## 2. Supabase Auth redirect URLs

Configure in **Supabase Dashboard → Authentication → URL Configuration**.

Replace `<PRODUCTION_DOMAIN>` with your Vercel production domain (e.g. `altair-os.vercel.app` or custom domain).

### Site URL

```
https://<PRODUCTION_DOMAIN>
```

### Redirect URLs (add all that apply)

Production:

```
https://<PRODUCTION_DOMAIN>/auth/callback
https://<PRODUCTION_DOMAIN>/auth/callback**
https://<PRODUCTION_DOMAIN>/login
https://<PRODUCTION_DOMAIN>/signup
https://<PRODUCTION_DOMAIN>/setup
```

Preview deployments (if testing PR previews):

```
https://*-<team-slug>.vercel.app/auth/callback
https://*-<team-slug>.vercel.app/login
https://*-<team-slug>.vercel.app/signup
https://*-<team-slug>.vercel.app/setup
```

Or add specific preview URLs as needed:

```
https://<preview-deployment>.vercel.app/auth/callback
```

### Email confirmation

If Supabase email confirmation is enabled:

- [ ] Confirmation emails redirect to a URL on your deployed domain
- [ ] `/auth/callback` is listed in Redirect URLs (wildcard `**` optional if you add `?next=` query params)
- [ ] Password reset uses `redirectTo` = `https://<domain>/auth/callback`
- [ ] Test signup → open the email link → lands signed in on `/setup` or the dashboard (the link signs the user in; they do not log in separately)

Signup and password reset use the PKCE flow (`lib/supabase/server.ts`), so the
email link arrives at `/auth/callback?code=…` with the DEFAULT Supabase
templates (`{{ .ConfirmationURL }}`) — no template rewrite is required. A
template rewritten to `?token_hash={{ .TokenHash }}&type=…` still works; the
callback keeps that path as a fallback. Recovery is detected from the PKCE
exchange itself (`redirectType === "recovery"`), with `type=recovery` on the
link honoured when present. The one PKCE constraint: the link must be opened
in the same browser that submitted the form (the code verifier is a cookie);
opening it elsewhere lands on `/login?error=auth_callback`, logged as
`verifierMissing: true`.

---

## 2b. Auth email delivery, auth rate limits, and CAPTCHA

State on 2026-10-18 (read from the dashboards): Supabase sends auth email with
its built-in sender, capped at **2 emails per hour**; CAPTCHA protection is off;
Resend's `mail.altair-op.com` domain is verified (DKIM, SPF, bounce MX), with
open and click tracking off (keep it off: click tracking rewrites auth links).

### Custom SMTP through Resend (owner, Supabase dashboard)

Authentication → Emails → SMTP Settings → Enable custom SMTP:

| Field | Value |
|---|---|
| Sender email | an address on `mail.altair-op.com`, e.g. `hello@mail.altair-op.com` |
| Sender name | `Altair OS` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | a Resend API key with **sending access only** (create a dedicated key named `supabase-auth-smtp`; do not reuse the app's key) |

Then send one password reset to yourself and confirm it arrives and shows in
Resend → Emails.

### Auth rate limits (owner, after SMTP is on)

Authentication → Rate Limits. The app calls Supabase Auth **from the server**,
so the per-IP limits below are shared by every visitor reaching the same
Vercel function IP; the app's own per-visitor limits
(`lib/security/public-rate-limit.ts`) do the per-person work.

| Limit | Default seen | Launch value |
|---|---|---|
| Emails per hour | 2 (built-in sender) | 100 (editable only once custom SMTP is on) |
| Sign-ups and sign-ins per 5 min per IP | 30 | 150 |
| Token verifications per 5 min per IP | 30 | 150 |
| Minimum interval per user (seconds) | 60 | 60 (keep) |

### Branded templates (owner pastes, or approves pasting)

`docs/reference/auth-email-templates/confirm-signup.html` and
`reset-password.html`, with the subjects in each file's header comment. Both keep
`{{ .ConfirmationURL }}`, which the PKCE flow requires.

### Cloudflare Turnstile CAPTCHA (order matters)

1. Cloudflare → Turnstile → Add widget: hostnames `altair-op.com`,
   `www.altair-op.com`, `app.altair-op.com`; widget mode **Managed**.
2. Vercel → Production (and Preview) env: `NEXT_PUBLIC_TURNSTILE_SITE_KEY` =
   the site key. Redeploy. The signup, login and reset forms now render the
   check and send a token; Supabase ignores the token while protection is off.
3. Load `/signup` on a phone and a desktop and confirm the button enables.
4. Only then: Supabase → Authentication → Attack Protection → Enable Captcha
   protection → provider Turnstile → paste the **secret** key → Save.
5. Sign up, sign in and request a reset once each.

Reversing steps 2 and 4 refuses every signup, sign-in and reset until the
deploy lands. To back out, switch protection off in Supabase first.
`scripts/verify-auth-captcha.mjs` (in `verify:all`) fails CI if any
CAPTCHA-enforced auth call stops forwarding the token.

The PWA service worker (`public/sw.js`) must leave cross-origin requests
alone: when it proxied them, the Turnstile script failed with
`net::ERR_FAILED` for every returning visitor.

---

## 3. Supabase Site URL

The **Site URL** must match your primary deployed origin:

```
https://<PRODUCTION_DOMAIN>
```

This affects auth email links and default redirects. Update it whenever the production domain changes.

---

## 4. `company-files` storage bucket

Migration: `supabase/migrations/021_job_attachments_foundation.sql`

- [ ] Bucket `company-files` exists in Supabase Storage
- [ ] Storage policies allow authenticated company members to read/write within their company prefix
- [ ] System check passes **company-files storage bucket** for an owner session
- [ ] Manual test: upload an expense receipt and a job attachment

---

## 5. `bootstrap_company_for_new_user` RPC

Migration: `supabase/migrations/200_card_free_trial_bootstrap.sql` (history: `003`, `031`, `124`)

Since migration 200 a new company is seeded `status='trialing'`,
`trial_ends_at = now() + 14 days`, `plan_key='starter'`, `access_grant='none'`:
the trial starts with NO card and the dashboard is the first screen. Checkout
(Settings → Billing, or `/activate-subscription` once the trial has ended) is
where the card is added; it keeps the local trial end date so the first charge
lands on the day the customer was told. An expired card-free trial is derived
in the application (`lib/saas-billing/trial-policy.ts`) — nothing in the
database flips the row — and is gated like an `incomplete` row. The
`billing-maintenance` cron sends the day-10 and day-13 "add a payment method"
emails to owners (`saas_trial_reminders` keeps them idempotent); Resend must be
configured for them to go out.

- [ ] migration 200 applied (`bootstrap_company_for_new_user` comment mentions the card-free trial; `saas_trial_reminders` exists)
- [ ] RPC exists in Supabase SQL editor / schema
- [ ] System check passes **bootstrap_company_for_new_user RPC** (read-only probe)
- [ ] Manual test: new user signup → company bootstrap → lands on the dashboard with "Trial ends <date>" in the header, no Checkout
- [ ] Manual test: set a test company's `trial_ends_at` to the past → next page load redirects to `/activate-subscription`

### One trial per inbox (migration 201)

`supabase/migrations/201_one_trial_per_email.sql` adds `normalize_trial_email`
(lowercase, no `+tag`, no dots for Gmail) and
`company_subscriptions.trial_withheld_reason`, and redefines the bootstrap RPC:
when the new owner's normalized email already owned a company whose
subscription has a `trial_ends_at`, the new company is seeded
`status='incomplete'` with `trial_withheld_reason='email_already_trialed'` and
lands on `/activate-subscription`, which says the free trial was already used.
No backfill; comped rows are untouched; `/platform` can still comp such a
company. Checkout (`lib/saas-billing/checkout.ts`) also passes no trial when
Stripe already holds a subscription for another customer with the same email
(the company email or the signed-in owner's); that lookup fails open and logs.
`/platform` shows trials started in the last 24 h / 7 d / 30 d, repeat
sign-ups turned away, and the comped-company count.

- [ ] migration 201 applied (`to_regprocedure('public.normalize_trial_email(text)')` is not null; `trial_withheld_reason` column exists)
- [ ] Manual test: sign up with a `+tag` or re-dotted spelling of an address that already trialed → `/activate-subscription` with "Your free trial has already been used", no 14-day promise in Checkout
- [ ] `/platform` → the "Trials started" tile renders with the comped count beside it

---

## 6. Production migration status

The repo currently contains **109** migrations through:

```
109_platform_founder_signal_actions.sql
```

Beta-critical recent migrations:

- `105_workflow_reminders_foundation.sql` — workflow reminders + dashboard surfacing
- `108_platform_automation_runs.sql` — cron health ledger for Reliability Pulse
- `109_platform_founder_signal_actions.sql` — founder action loop (contacted/snooze/resolve)

- [ ] All migrations applied to the Supabase project (`supabase db push` or CI pipeline)
- [ ] System check passes **Production migration status** (repo catalog matches Supabase)
- [ ] No pending migration drift between repo and Supabase

**RLS note:** Do not modify RLS migrations for alpha deploy unless fixing a verified blocker. Document any RLS-related failures in launch blockers.

---

## 7. Alpha hardening env flag

Alpha hardening is **on by default in production** (`NODE_ENV=production`).

When enabled:

- `/network` is hidden from nav and shows Coming Soon if visited directly
- `/estimates` and `/price-book` show Coming Soon
- Post-login redirects avoid coming-soon destinations
- Admin shell shows a subtle **Internal Alpha** banner

Checklist:

- [ ] Production deploy shows Internal Alpha banner in admin shell
- [ ] Hidden nav items are not visible in sidebar/mobile nav
- [ ] Direct URLs to `/estimates`, `/price-book`, `/network` show Coming Soon (not broken pages)
- [ ] Optional: set `NEXT_PUBLIC_ALPHA_HARDENING=true` locally to mirror production behavior

---

## 8. Preview vs production deploy expectations

| Area | Preview | Production |
|------|---------|------------|
| Alpha hardening | Only if `NEXT_PUBLIC_ALPHA_HARDENING=true` | Always on (`NODE_ENV=production`) |
| Supabase env vars | Must be set on Preview | Must be set on Production |
| Auth redirect URLs | Preview URLs must be in Supabase allowlist | Production URLs must be in allowlist |
| Data | Same Supabase project (typical) or isolated project | Primary internal alpha data |
| System check | Owner-only at `/settings/system-check` | Same |
| Audience | Engineers / QA on PR branches | Internal alpha testers |

### Preview deploy workflow

1. Push branch → Vercel Preview URL generated
2. Add preview callback URL to Supabase if not using wildcard
3. Run smoke tests on preview before promoting to production

### Production deploy workflow

1. Merge to main → Vercel Production deploy
2. Run `/settings/system-check` as owner
3. Run `docs/reference/internal-alpha-smoke-test.md` checklist
4. Share URL only with invited internal testers

---

## 9. Post-deploy verification (quick)

- [ ] Owner can open `/settings/system-check` — all critical checks pass
- [ ] Login / signup / setup flow works end-to-end
- [ ] Technician account routes to `/technician`
- [ ] Admin account routes to `/` dashboard
- [ ] No console errors on dashboard load

---

## 10. Known launch blockers to watch

Document and triage any failures here during alpha:

- [ ] Supabase Auth redirect mismatch (login loop or callback error)
- [ ] Missing migrations (schema errors in UI or system check)
- [ ] Storage bucket missing (receipt/attachment upload failures)
- [ ] Bootstrap RPC missing (signup/setup stuck)
- [ ] Email confirmation misconfigured (signup cannot complete)
- [ ] Profile email vs auth email mismatch blocking invites

---

## Related docs

- Smoke test checklist: `docs/reference/internal-alpha-smoke-test.md`
- In-app checks: `/settings/system-check` (owner only)
