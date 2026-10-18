# Launch deploy runbook — PR 13 (safety) + PR 12 (funnel), October 2026

Status: **in progress**. Each production step below is executed only on the
owner's explicit go-ahead in chat, and the result is written back into this
file as it happens. A step with no result recorded has not been done.

| Step | State | Evidence |
|------|-------|----------|
| 0. CI unblocked (PR 15) | **done** | squash-merged to main as `bf811843` (2026-10-18, owner: "merge 15 and 13") |
| 1. Conflicts resolved, CI green on both PRs | resolved, CI running | PR 12 branch at `9374370a` (merge of main + migration-200 grant alignment); CI run 39175659876 |
| 2a. PR 13 merged | **done** | merge commit `ddd131df` on main (2026-10-18); Vercel production deploy follows automatically |
| 2b. PR 12 merged | pending | |
| 3a. Migration 199 applied to production | pending | |
| 3b. Migration 200 applied to production | pending | |
| 3c. Read-only probes pass | pending | |
| 4a. Vercel production env | pending | |
| 4b. Live Stripe webhook endpoint | pending | |
| 4c. Supabase redirect allowlist | pending | |
| 5. Phone smoke | pending | |

## What is being landed

- **PR 13** `safety/pr2-launch-audit` — grace-aware billing gate, dunning email
  on `invoice.payment_failed`, Stripe livemode check, Sentry client + cron
  check-ins, retention sweeps, invite expiry, and migration
  `199_launch_safety_hardening.sql`.
- **PR 12** `claude/magical-matsumoto-2e3f82` — OG/link-preview metadata,
  public assets + robots, 404 for logged-out strangers, PKCE signup, card-free
  14-day trial (migration `200_card_free_trial_bootstrap.sql`), trial
  reminders, `/platform` comp action.
- **PR 15** `fix/chunk-sibling-delivery-lookup` — makes the Verifier suite
  green again on main (two stale verifiers; no behaviour change). Lands first
  so the CI signal on 12 and 13 means something.

Both migrations are idempotent (`create ... if not exists`, `create or
replace`, `drop ... if exists`). Neither has been applied to production.
PR 12's migration was exercised on the scratch project
`pdqegctrwgexpameknju` (53 DB checks + 37 Stripe test-mode checks, see the
PR 1 hand-over notes). PR 13's was not applied anywhere before this runbook.

## Facts that shape the order

- **Merge order is 13 then 12.** PR 12 was cut from the same main as PR 13 and
  the two overlap in nine files; five of them conflict (both sides added
  code in the same place, nothing contradictory). PR 12 is the one that gets
  rebuilt on top of 13, which is why its migration was renumbered to 200.
- **Migration order is 199 then 200.** 200 replaces
  `bootstrap_company_for_new_user(text, text)`; 199 drops the old
  single-argument overload of the same function and adds the
  `current_user_email_is_confirmed()` helper that the recreated invite
  policies call. Running 200 first would work, but the verification below
  assumes 199's drop has already happened.
- **Code before schema, with one caveat.** Nothing in PR 13's TypeScript
  requires 199 to be live except the dunning insert (first
  `payment_failed` after deploy would log an insert error and the email
  would not send; the webhook itself still returns 200) and the invite
  expiry column (invite creation would fail until 199 is live). PR 12's code
  tolerates a pre-200 database (the old bootstrap still creates the company,
  as `incomplete`, which sends the new user to `/activate-subscription`
  instead of the dashboard). So: merge, let Vercel deploy, then apply the
  migrations **immediately** — the window where code is new and schema is
  old is one where new signups do not get the trial and new invites fail.
  If the owner prefers zero window, apply 199 and 200 **before** merging:
  both are backward compatible with the code on main today.
- **The Supabase CLI on this machine is linked to production**
  (`supabase projects list` shows `acsmgzkbvstrbggsukyx` as linked). Never
  run `supabase db push` or `supabase migration up` from here for this
  deploy; the migrations go in through the SQL editor so each one is a
  deliberate, owner-visible act.
- **Vercel's CLI is not logged in here.** The env check is done in the
  Vercel dashboard (browser), not from a terminal.

## Step 0 — unblock CI (PR 15)

Why: the Verifier suite on main has been red since `75e65f3e`
(`postgrest-in-limits`), and `verify-all` stops at the first failure, so 35
verifiers never ran in CI on either launch PR. Both PRs show the same red
check for that reason alone. A second stale verifier (`measured-render-qa`,
hidden behind the first) is fixed in the same PR.

1. Merge PR 15 (squash). No migration, no env.
2. Re-run the failed CI on PR 13 and PR 12 (`gh run rerun --failed <id>` or
   the Actions UI). Expect all four checks green.

## Step 1 — conflicts and CI

Resolution of the five conflicts (all "keep both"):

| File | Resolution |
|------|-----------|
| `app/(marketing)/layout.tsx` | keep the `MetaPixel` import and mount (13) **and** the `metadata` export built from `public-site.ts` (12); doc comment merged |
| `app/api/cron/billing-maintenance/route.ts` | run `runRetentionSweeps()` (13) **and** `runTrialPaymentReminders()` (12); one `errorCount` = sweep + retention + reminder errors; totals and JSON carry both sets of fields |
| `lib/database/types/core-tables.ts` | export both `SubscriptionDunningNotice*` and `SaasTrialReminder*` |
| `lib/database/types/database.ts` | same |
| `lib/database/types/platform-automation-runs.ts` | both optional totals fields |

The resolution was verified on a scratch merge of 13 then 12: `tsc` clean,
eslint 0 errors, production build passes, and (with PR 15's fixes) all 56
verifiers pass.

One more change was needed on PR 12 after the merge: PR 13's
`verify-integration-migrations` holds every new table in the range to one
shape (authenticated may SELECT behind a policy, writes service_role only).
Migration 200's `saas_trial_reminders` was service-role-only with no policy,
so it was aligned with `subscription_dunning_notices` (owners/admins can read
their company's rows) and `bootstrap_company_for_new_user` was added to the
reviewed-function list for 200. Migration 200 was not applied anywhere but
the scratch project, so changing it before production is safe.

**PR 14** (`claude/trial-abuse-controls`, migration 201: one trial per
inbox) is open against PR 12's branch. It is not part of this deploy unless
the owner says so; if it rides along it is retargeted to main after PR 12
merges and 201 is applied after 200 with the same procedure.

Procedure once PR 13 is merged:

```bash
git fetch origin
git checkout claude/magical-matsumoto-2e3f82
git merge origin/main
# resolve the five files as above, then
npx tsc --noEmit && npm run lint && node scripts/verify-all.mjs
git push
```

Then wait for green CI on PR 12.

## Step 2 — merge

Owner go-ahead required for each.

1. **PR 13** → main (merge commit or squash, either is fine). Vercel deploys
   production from main automatically.
2. Update PR 12 per Step 1, wait for CI, then **PR 12** → main.

After each merge, record the merge SHA and the Vercel deployment URL/ID here.

## Step 3 — migrations (production)

Owner runs these in **Supabase → SQL editor** on project
`acsmgzkbvstrbggsukyx`, or approves the agent pasting them in the browser.
Paste the whole file each time. 199 wraps itself in `begin; ... commit;`; 200 does not, but the SQL editor sends the paste as one request, which Postgres runs as one implicit transaction, so a failing statement rolls the whole file back either way.

1. `supabase/migrations/199_launch_safety_hardening.sql` (319 lines).
   Expect `Success. No rows returned`. It also backfills
   `invite_expires_at = now() + 14 days` on existing pending invites.
2. `supabase/migrations/200_card_free_trial_bootstrap.sql` (184 lines).
   Expect `Success. No rows returned`. No backfill: existing companies keep
   their current status.

Then verify, read-only, with the probe script (service-role key from the
local `.env.local`, which already points at production):

```bash
node scripts/verify-launch-migrations-live.mjs .env.local
```

It proves, without selecting a row or executing a function:

- `subscription_dunning_notices` exists and is in PostgREST's schema
  document (HEAD count 200, not the 204-no-count a missing table returns),
  with `provider` + `provider_event_id` columns;
- `company_memberships.invite_expires_at` resolves;
- `current_user_email_is_confirmed()`, `accept_network_help_offer(...)` and
  `can_access_platform_admin()` are exposed;
- `saas_trial_reminders` exists;
- `bootstrap_company_for_new_user` is exposed with exactly two text
  parameters, and its comment (visible in the OpenAPI document) mentions the
  card-free trial.

Baseline **before** any migration (run 2026-10-18): 4 passed, 6 failed — the
six are exactly the objects 199 and 200 create. After both migrations the
expected result is 10 passed, 0 failed.

Optional, in the SQL editor (read-only):

```sql
select obj_description('public.bootstrap_company_for_new_user(text,text)'::regprocedure, 'pg_proc');
select count(*) from pg_proc where proname = 'bootstrap_company_for_new_user';  -- expect 1 (the text overload is gone)
select column_name from information_schema.columns where table_name = 'company_memberships' and column_name = 'invite_expires_at';
```

## Step 4 — environment

### 4a. Vercel production env (dashboard → Project → Settings → Environment Variables, filter Production)

Required by the code on main after both merges:

| Variable | Why |
|----------|-----|
| `STRIPE_SECRET_KEY` | must start `sk_live_` — PR 13's livemode check compares every webhook's `livemode` to this prefix and **ignores** mismatches |
| `STRIPE_BILLING_WEBHOOK_SECRET` | signing secret of the **live** endpoint for `/api/webhooks/billing` (not the payments one) |
| `STRIPE_WEBHOOK_SECRET` | the existing `/api/webhooks/payments` endpoint; unchanged |
| `STRIPE_PRICE_STARTER_MONTHLY`, `STRIPE_PRICE_STARTER_ANNUAL`, `STRIPE_PRICE_GROWTH_MONTHLY`, `STRIPE_PRICE_GROWTH_ANNUAL`, `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_PRICE_PRO_ANNUAL` | live `price_...` ids; the catalog resolves these names (`lib/saas-billing/catalog.ts`); legacy `STRIPE_PRICE_STARTER/GROWTH/PRO` are the fallback names |
| `CRON_SECRET` | billing-maintenance (reminders + retention sweeps) runs daily under it |
| `NEXT_PUBLIC_APP_URL` | `https://www.altair-op.com` — the signup email's redirect is built from it |
| `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` | optional; without them PR 13's monitoring is a no-op |

Record "present / absent" per name here. Values are never recorded.

### 4b. Stripe live webhook endpoint (Stripe dashboard → Developers → Webhooks, **live mode**)

- An endpoint for `https://www.altair-op.com/api/webhooks/billing` exists,
  enabled, listening at least to `checkout.session.completed`,
  `customer.subscription.created/updated/deleted`,
  `invoice.paid`, `invoice.payment_failed`.
- Its signing secret is the value in `STRIPE_BILLING_WEBHOOK_SECRET`
  (compare the last 4 characters, nothing more).
- Live prices exist for the six ids above.

### 4c. Supabase Auth redirect allowlist (Supabase → Authentication → URL Configuration)

- Site URL: `https://www.altair-op.com`
- Redirect URLs include **both**
  `https://www.altair-op.com/auth/callback` and
  `https://app.altair-op.com/auth/callback` (PKCE still requires the
  redirect to be allowed; the signup action builds it from
  `NEXT_PUBLIC_APP_URL`).

## Step 5 — live smoke (phone, after PR 12's deploy is live)

Use a fresh email address. Record each result with a timestamp.

| Check | Expected | Result |
|-------|----------|--------|
| `https://www.altair-op.com/robots.txt` | 200, allow-list with `/$`, sitemap line | |
| `https://www.altair-op.com/this-does-not-exist` | **404** (not a redirect to login) | |
| `https://www.altair-op.com/platform` | **307** → `/login` | |
| Sign up (company name, trade, email, password) | success copy says the link finishes setup and signs you in | |
| Open the email link **in the same browser** | lands on the dashboard, signed in | |
| Dashboard header | trial pill "Trial ends <date 14 days out>" | |
| Settings → Billing | days left + "Add payment method" | |
| Link preview (paste the homepage URL into iMessage/Slack) | title, description and OG image unfurl | |

PKCE caveat: opening the link in a different browser than the one that
signed up lands on `/login?error=auth_callback`. That is expected, not a
failure; it is logged with `verifierMissing: true`.

Afterwards, in Supabase (read-only): the new company row has
`status = 'trialing'`, `trial_ends_at ≈ now() + 14d`, `plan_key = 'starter'`,
`access_grant = 'none'`. Delete the smoke company or leave it comped — owner's
call; note what was done.

## Rollback

- **Code**: Vercel → Deployments → promote the previous production
  deployment. Both PRs are additive; the previous build runs fine against a
  database with 199 and 200 applied.
- **Schema**: do not roll back. Both migrations are additive apart from the
  dropped single-argument `bootstrap_company_for_new_user(text)`, which no
  current code calls; leaving 199/200 in place is safe for the previous
  build.

## Log

(appended as steps are executed)

- 2026-10-18 — Scratch merge of 13 then 12 built and verified locally (tsc,
  eslint, build, 56/56 verifiers with PR 15). Read-only probe baseline
  against production: 4 passed, 6 failed (the six objects 199/200 create).
  PR 15 opened and green. Waiting on the owner's go for the first merge.
- 2026-10-18 — Owner: "merge 15 and 13". PR 15 squash-merged (`bf811843`),
  PR 13 merged (`ddd131df`). Main merged into PR 12's branch with the
  five-file resolution; migration 200's grants aligned with the convention;
  57/57 verifiers, tsc, eslint clean locally; pushed as `9374370a`, CI
  running. Next: owner go for PR 12 (and a decision on PR 14).
