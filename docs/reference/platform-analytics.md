# Platform analytics

The owner-only analytics page at `/platform/analytics`, and the first-party
tracking behind it. Added on branch `claude/platform-analytics`.

Status: code complete and tested on the scratch project. **Tracking is dormant
in production until migration 202 is applied.** Until then the page still
works: every figure that comes from accounts, companies, subscriptions and the
Stripe ledger is real, and every figure that needs website tracking shows "—"
with the reason, never 0.

## What the page shows

Six tabs, each with a date range (7, 30, 90 days or 12 months):

| Tab | Figures | Source |
|-----|---------|--------|
| Overview | new and active companies, active trials, paying subscribers, MRR, signups, retention, biggest funnel drop-off, insights, data-health | all sources below |
| Website traffic | visitors today / 7 / 30 days, unique visitors, pageviews, sessions, daily trend, top pages, referring sites, channels, devices, new vs returning | `web_analytics_events` |
| Acquisition | funnel Visit → Viewed pricing → Started signup → Completed signup → Trial activated → First job/estimate/invoice → Paid, signups per day, UTM campaigns | tracking for the first three steps; accounts, companies and subscriptions for the rest |
| Product usage | DAU / WAU / MAU, active and returning companies, jobs / estimates / invoices / customers created, feature usage (most and least used), onboarding completion, inactive trials | records plus tracked signed-in pageviews |
| Revenue | MRR, run rate, paying companies, active trials, trial → paid, collected subscription revenue (kept separate from MRR), cancellations, churn, failed payments, monthly collected trend, trials ending within 4 days | `company_subscriptions` and the Stripe webhook ledger |
| Marketing | signups by channel and by UTM campaign, visit → signup rate per channel, activated and paid per channel | tracking plus first-touch attribution saved on each new user |

Rules the page follows:

- **Real data only.** Nothing is estimated except MRR when a subscription has
  no Stripe price in the ledger; then the card says "estimated from catalog".
- **Unknown is not zero.** A figure that cannot be measured renders "—" with a
  reason. Funnel steps that need tracking are blank for ranges that start
  before tracking began, and a notice says the range is partial.
- **Internal companies are excluded** from every figure: demo-flagged
  companies and companies owned by a platform admin email. The count of
  excluded companies is shown.
- **Collected revenue is not MRR.** MRR comes from the latest subscription
  object's prices, normalised to a month. Collected revenue is the sum of paid
  Altair subscription invoices. Customers' own invoice payments through Altair
  are shown only as a footnote, labelled as the customers' revenue.
- Days are UTC.

Access: the `/platform` layout and the page both call `requirePlatformAdmin()`.
A non-admin gets the not-found screen. All reads use the service role only
after that check.

## Tracking design

First-party and cookieless. No third-party script is added.

1. `FirstPartyAnalytics` (mounted once in `app/layout.tsx`) sends a beacon on
   every route change to `POST /api/analytics/collect`.
2. The browser keeps a random visitor id in `localStorage` and a per-tab
   session id in `sessionStorage`. First-touch and session attribution (UTM
   tags, referrer host, landing path) are kept the same way. No cookies.
3. The route refuses, silently with 204: non-production deployments, bots and
   headless browsers, cross-site origins, oversized or malformed bodies,
   unknown events, bad ids, more than 300 events per address per 15 minutes,
   and platform admins.
4. The server HMACs the visitor and session ids, strips the path, reduces the
   referrer to a host, classifies the channel and stores one row. Duplicate
   beacons are dropped by a unique dedupe key.
5. `signup_completed` is recorded by the signup action itself, never by the
   browser. The same action saves the visitor's first-touch attribution on the
   new user (`user_metadata.signup_attribution`), so the source of every signup
   after deploy is known even if the visitor later clears storage.

Events: `pageview`, `signup_started` (first focus in the signup form),
`signup_completed` (server only).

Channels: direct, search, social, email, paid, referral, internal, unknown.
UTM medium and source win over the referrer. YouTube, Facebook, Instagram,
TikTok, X, LinkedIn, Reddit and others are recognised as social; Google, Bing,
DuckDuckGo and others as search.

### Privacy

Stored: event name, sanitised path, referrer host, UTM values, channel, device
class, HMAC of the random visitor and session ids, and the user id for
signed-in product use.

Kept: 25 months. Older rows are deleted daily by the billing maintenance
cron (migration 203; see "Known limits and follow-ups").

Not stored: IP addresses, user agents, full referrer URLs, query strings,
emails, names, form contents. Token pages (`/estimate-approval`,
`/invoice-payment`, `/auth/callback`, `/reset-password`) are reduced to their
prefix so tokens never reach the beacon. Record ids in paths become `[id]`.

Honoured: Global Privacy Control and Do Not Track stop all recording for that
browser. Visiting any page with `?altair_analytics=off` opts that device out
permanently (`?altair_analytics=on` reverses it).

Not added: session replay, heatmaps, fingerprinting, third-party analytics.
The site already loads the Meta Pixel when `NEXT_PUBLIC_META_PIXEL_ID` is set;
that is unchanged by this work.

Suggested privacy-policy paragraph, for owner review before publishing:

> We measure how visitors use altair-op.com with our own first-party
> analytics. We record the pages you view, the site or campaign link that
> brought you here, and your device type, linked to a random identifier stored
> in your browser. We do not use cookies for this, we do not record your IP
> address, and we do not share this data with advertising or analytics
> companies. If your browser sends Global Privacy Control or Do Not Track, we
> do not record your visit. We delete these records after 25 months.

## Configuration

| Variable | Where | Purpose |
|----------|-------|---------|
| `PLATFORM_ADMIN_EMAILS` | server | Who can open the page. Their browsing is never recorded and companies they own are excluded. Already required. |
| `PUBLIC_RATE_LIMIT_HASH_SECRET` | server | Key for the visitor/session HMAC and the rate-limit subject. Optional but should be set in production. Changing it splits unique-visitor counts at the change. |
| `ANALYTICS_COLLECTION` | server | Set to `off` to stop all recording immediately (kill switch). Unset means on. |
| `ANALYTICS_RECORD_NON_PRODUCTION` | server | Set to `1` only on a test deployment pointed at a test database, to record outside `VERCEL_ENV=production`. Never set it on a preview that shares the production database. |

No new public (`NEXT_PUBLIC_`) variables.

## Migration 202

`supabase/migrations/202_first_party_web_analytics.sql` creates
`public.web_analytics_events` (service role only, RLS on, no policy) and
`public.platform_web_analytics_summary(p_from, p_to)` (service role only). It
is idempotent and was applied twice on the scratch project without error.

Apply in production: open the Supabase SQL editor on the production project,
paste the whole file, run it. Then run this read-only probe:

```sql
select
  to_regclass('public.web_analytics_events') is not null as table_exists,
  (select relrowsecurity from pg_class where oid = 'public.web_analytics_events'::regclass) as rls_on,
  has_table_privilege('anon', 'public.web_analytics_events', 'select') as anon_can_read,
  has_table_privilege('authenticated', 'public.web_analytics_events', 'select') as authed_can_read,
  has_function_privilege('authenticated', 'public.platform_web_analytics_summary(timestamptz, timestamptz)', 'execute') as authed_can_call,
  (select count(*) from public.web_analytics_events) as rows_so_far;
```

Expected: `true, true, false, false, false`, and a row count that starts at 0
and grows after the deploy.

Order: applying the migration before the deploy is safe (nothing writes yet).
Deploying before the migration is also safe: the beacon fails quietly and the
page shows tracking as not set up.

## Migration 203

`supabase/migrations/203_web_analytics_retention_sweep.sql` adds
`public.sweep_web_analytics_events(p_retain_months, p_batch_size)`: it deletes
one batch of the oldest rows past the retention period and returns the count.
Service role only, security invoker. It changes no data when applied. Apply it
with or after 202, the same way (paste into the SQL editor). Read-only probe:

```sql
select
  to_regprocedure('public.sweep_web_analytics_events(integer, integer)') is not null as sweep_exists,
  has_function_privilege('anon', 'public.sweep_web_analytics_events(integer, integer)', 'execute') as anon_can_call,
  has_function_privilege('authenticated', 'public.sweep_web_analytics_events(integer, integer)', 'execute') as authed_can_call,
  has_function_privilege('service_role', 'public.sweep_web_analytics_events(integer, integer)', 'execute') as service_can_call;
```

Expected: `true, false, false, true`.

Order: deploying before 203 is applied is safe. The cron records
`webAnalyticsSweepInstalled: false` and treats it as nothing to do, not as a
failure.

## Tagging links

Use UTM tags on every video description, post and ad link so the Marketing tab
can credit signups to the exact piece of content:

```text
https://altair-op.com/?utm_source=youtube&utm_medium=video&utm_campaign=capacitor-short
https://altair-op.com/pricing?utm_source=tiktok&utm_medium=social&utm_campaign=oct-launch
https://altair-op.com/?utm_source=facebook&utm_medium=paid_social&utm_campaign=beta-ad-1
```

`utm_source` and `utm_medium` are lower-cased. A medium of `cpc`, `paid`,
`paid_social` or `display` counts as paid.

## Testing

- `node --experimental-strip-types --import ./scripts/lib/ts-alias-loader-register.mjs scripts/verify-platform-analytics.mjs`
  checks the classification, sanitising, funnel, MRR and churn rules and the
  security shape of the route, page and service. It runs in `verify-all`.
- `verify-integration-migrations`, `verify-perimeter` and
  `verify-public-surface-limits` cover the migration, the admin allowlist and
  the beacon's rate limit.
- The scratch end-to-end run (local build against the scratch project) covered
  real browsing, a real signup with attribution, GPC, token pages, admin
  exclusion, non-admin denial, cross-site and forged beacons, and every tab at
  desktop and phone widths.

## Known limits and follow-ups

- **Retention: 25 months.** `web_analytics_events` rows older than 25 months
  are deleted by the existing daily billing maintenance cron
  (`/api/cron/billing-maintenance`); there is no separate cron entry. The
  page's longest range is the last 12 months, so 25 months keeps that window
  and the year before it, plus a month of slack. The period is
  `WEB_ANALYTICS_RETENTION_MONTHS` in
  `lib/database/services/retention-sweeps.ts`.
  - Deletion is batched: each call to `sweep_web_analytics_events` (migration
    203) removes at most 2,000 of the oldest expired rows in its own short
    transaction, so beacon inserts never wait behind one long delete. The cron
    stops at the first short batch, after 50 batches, or after 5 seconds.
  - The count is recorded on the `billing_maintenance` row in
    `platform_automation_runs`: `totals.webAnalyticsEventsSwept`, with
    `webAnalyticsSweepComplete` (false when a backlog is left for the next
    day; the run is then `partial`) and `webAnalyticsSweepInstalled` (false
    until migration 203 is applied).
  - A failed batch is counted as a run error, keeps the rows deleted so far,
    and never hides the invoice sweep's result.
  - "Tracking since" on the page is the oldest row kept, so after the first
    sweep it moves forward with the retention window.
- Signups before the deploy have no source; they show as "Unknown / before
  tracking".
- DAU / WAU / MAU fall back to sign-in times until tracking has data.
- A visitor who switches device or clears storage counts as a new visitor.
- `shared/components/analytics/AnalyticsPageView.tsx` and its siblings are an
  older company-level analytics module on mock data that no route imports.
  This work does not touch it; it is a candidate for removal.
