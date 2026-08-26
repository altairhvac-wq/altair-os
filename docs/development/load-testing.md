# Load testing and Phase 4 benchmarking

Tooling for measuring Altair at production scale before and after the Phase 4
scalability work.

> **Never point any of this at production.** The seeder holds a service-role
> key and writes thousands of rows. Read [Safety](#safety) before running
> anything.

| Script | Purpose |
| --- | --- |
| `scripts/loadtest-seed.mjs` | Seeds one labelled tenant with production-scale data |
| `scripts/loadtest-benchmark.mjs` | Measures page latency and payload size over HTTP |
| `scripts/verify-loadtest-harness.mjs` | Asserts the safety guards still refuse (runs in `verify:all`) |

---

## Why this exists

The launch audit's P1-1 finding is that the dashboard loads every invoice,
estimate, expense, customer and lead a company has ever created. At the scale
the product was built against — a handful of rows — that is invisible. At the
scale of a real HVAC business importing three years of history it is the
difference between a usable product and an unusable one.

You cannot fix that responsibly without measuring it first, and you cannot
measure it without data. This harness produces the data.

---

## Safety

The seeder is protected by four independent guards. Three are about *targeting*
— making sure you write where you meant to. The fourth is about *containment*,
and it is the one that matters, because targeting guards only help if you notice
you got them wrong.

### 1. Dedicated credential names

The seeder reads `ALTAIR_LOADTEST_SUPABASE_URL` and
`ALTAIR_LOADTEST_SERVICE_ROLE_KEY` — and nothing else. It never reads
`NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY`, and it does not load
`.env.local`.

Running it in an ordinary checkout with production credentials present does
nothing at all: there is no variable for it to pick up.

### 2. Collision check against `.env.local`

If a `.env.local` exists and its Supabase URL matches the target, the seeder
refuses. That is the signature of someone having copied the production values
into the load-test variables.

### 3. Explicit project-ref confirmation

`--confirm <project-ref>` must match the ref parsed out of the target URL. You
cannot run the seeder without typing the identity of the project you are about
to write to. There is no default.

### 4. Containment

Every row the seeder writes is scoped to a company it creates itself, named
`[LOADTEST] …` with a slug beginning `loadtest-`. It has no `--company-id`
option and cannot write into a pre-existing company. `--clean` only ever deletes
companies matching **both** prefixes.

So even if guards 1–3 were all defeated, the worst outcome is a clearly
labelled extra tenant that `--clean` removes. No pre-existing row is updated or
deleted, and `--status` counts other companies without listing them.

### No external side effects

The seeder is standalone: it imports `@supabase/supabase-js` and nothing from
`lib/`, `app/` or `shared/`. There is no import edge to the email, SMS, Stripe,
AI or marketing-publish code, so it is structurally incapable of sending a
message, charging a card, or calling a model.

---

## Seeding a test tenant

### Prerequisites

1. **A scratch Supabase project.** Restore a production backup into a *new*
   project (see [the recovery runbook](./backup-and-restore-runbook.md)). A
   restored copy is the ideal target: it exercises the real schema, real RLS,
   and real existing document-number maxima.
2. **An auth user in that project.** The seeder does not create auth users. Sign
   in to the scratch instance once with the account you will use to view the
   dashboard, so its `profiles` row exists.

### Run it

```bash
export ALTAIR_LOADTEST_SUPABASE_URL="https://<scratch-ref>.supabase.co"
export ALTAIR_LOADTEST_SERVICE_ROLE_KEY="<scratch service role key>"

# See what is already there. Counts other companies; never lists them.
node scripts/loadtest-seed.mjs --status --confirm <scratch-ref>

# Seed. Defaults are 5,000 customers / 10,000 invoices.
node scripts/loadtest-seed.mjs \
  --confirm <scratch-ref> \
  --owner-user-id <your auth user uuid>
```

### Options

| Flag | Default | Notes |
| --- | --- | --- |
| `--customers` | `5000` | |
| `--invoices` | `10000` | |
| `--jobs` | `1.2 × invoices` | |
| `--estimates` | `0.6 × invoices` | |
| `--expenses` | `2000` | All attributed to `--owner-user-id` |
| `--leads` | `800` | |
| `--seed-value` | `20260826` | Also forms the company slug, so two seed values can coexist |
| `--as-of` | `2026-08-26T12:00:00Z` | All generated dates derive from this, never from the clock |
| `--dry-run` | — | Generates and reports without connecting to anything |

### Determinism

Every value comes from a seeded PRNG and every date from `--as-of`. The same
`--seed-value` produces byte-identical data, so a before/after comparison
compares like with like. Verify without touching a database:

```bash
node scripts/loadtest-seed.mjs --dry-run --customers 500 --invoices 900
```

### What the data looks like

The status mix is chosen so the dashboard's attention queues are genuinely
populated — roughly 58% paid, 14% sent, 10% overdue, 9% draft, 5% partially
paid. A benchmark against 10,000 invoices that all fall out of every filter
measures nothing.

Rows are ordinary rows: `is_demo` is false and document numbers are standalone
(`INV-900000`+, deliberately far above the historical base so they cannot
collide with anything the migration-148 allocator produces for the tenant).

### Cleaning up

```bash
node scripts/loadtest-seed.mjs --clean --confirm <scratch-ref>
```

Children are deleted explicitly, deepest first, because `jobs.customer_id` and
`invoices.customer_id` are `ON DELETE RESTRICT` — letting company cascades race
each other can fail.

---

## Benchmarking

Build and start the app against the seeded scratch project, then measure.

```bash
npm run build && npm run start          # in another terminal

node scripts/loadtest-benchmark.mjs \
  --cookie "sb-<ref>-auth-token=...; sb-<ref>-auth-token.1=..." \
  --runs 12 --label before
```

Get the cookie from a signed-in browser session against the scratch instance
(DevTools → Application → Cookies). The benchmark never logs it and never
writes it to the results file.

The benchmark refuses a non-local `--base-url` without `--allow-remote`:
pointing a request loop at a shared deployment is a way to cause an outage
while trying to measure one.

After the Phase 4 changes:

```bash
node scripts/loadtest-benchmark.mjs --cookie "..." --runs 12 --label after
node scripts/loadtest-benchmark.mjs --compare before after
```

Results land in `.tmp/loadtest/<label>.json`, which is gitignored.

### What it measures

- TTFB and total response time as min / p50 / p95 / max
- Response payload size — the clearest single proxy for "this page serialized
  the whole dataset into the RSC payload"
- Cold (first request after boot) versus warm
- The same for `/customers`, `/sales`, `/work`, `/expenses`, `/reports`,
  `/schedule`

### What it does not measure, and why

**Query count.** An HTTP client cannot see it, and this script does not pretend
to. Measure it on the database:

```sql
-- once, on the SCRATCH project
create extension if not exists pg_stat_statements;

select pg_stat_statements_reset();
-- now issue exactly ONE dashboard request in the browser
select calls, rows, round(total_exec_time::numeric, 1) as ms, query
from pg_stat_statements
where query ilike '%invoices%' or query ilike '%estimates%'
   or query ilike '%customers%' or query ilike '%expenses%'
order by total_exec_time desc
limit 40;
```

`calls` is the query count and `rows` is what a query count alone hides — a
single query returning 10,000 rows is the actual P1-1 defect.

**Server memory.** Next.js does not expose per-request memory, and process RSS
is dominated by the framework. Payload size is the honest proxy and is
reported. For a real number, run the server under
`node --max-old-space-size=<mb>` and watch RSS across a sustained run.

### Cron timing

The cron handlers are HTTP routes, so they can be timed the same way:

```bash
time curl -s -o /dev/null -w "%{http_code} %{time_total}s\n" \
  -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/workflow-reminders
```

Note that `evaluateWorkflowRemindersForAllCompanies` iterates **every** company
in the project serially. On a restored copy that is every real tenant plus the
load-test one, which is exactly the P1-12 measurement worth having.

---

## Suggested acceptance thresholds

Numbers to beat, not laws. Set the real targets from the `before` run.

| Surface | Threshold |
| --- | --- |
| Dashboard p95 total | < 1500 ms warm |
| Dashboard payload | < 500 KB |
| List page p95 total | < 800 ms warm |
| List page payload | < 300 KB, independent of tenant size |
| Dashboard queries per render | ≤ 25, none returning more than ~200 rows |
| Workflow-reminder cron | completes within the configured `maxDuration` with 3× the tenant count |

The payload and row-count criteria matter more than the latency ones: latency
on a warm local machine flatters a design that will not survive a cold
serverless invocation against a remote database.
