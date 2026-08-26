# Backup and restore runbook

> **STATUS: RESTORE PROVEN — RECOVERY OBJECTIVES STILL UNMEASURED**
>
> A restore-to-new-project rehearsal **has been performed** (see section 5).
> A Supabase backup was restored into a separate scratch project, real
> production-derived data was present, migration 148 applied cleanly, and the
> document-number allocator seeded correctly above the existing per-company
> maxima for jobs, invoices, estimates and expenses.
>
> That closes the question "can this data be brought back at all", which was
> the substance of P0-4.
>
> **It does not close P0-4 entirely.** Three things are still outstanding and
> are recorded honestly as unknown rather than assumed:
>
> 1. **RPO and RTO were not measured.** The rehearsal proved recoverability,
>    not recovery *time* or recovery *point*. Sections 3 and 5 stay empty.
> 2. **The Supabase settings in section 1 are still unconfirmed** — in
>    particular whether PITR is enabled, which is a paid add-on that is off by
>    default even on Pro. Without it the exposure is up to 24 hours of
>    accepted invoices and payments.
> 3. **Storage objects are still unprotected** (section 6). Database backups
>    do not cover them, and `company-files` holds expense receipts, which are
>    tax records.
>
> Do not upgrade this banner to "closed" until sections 1, 3 and 5 are filled
> in from measurement.

## Why this is a launch blocker

The commitment being made to a paying HVAC business is custody of their
invoices, payments, payroll and customer history. Without a rehearsed restore
the worst case is not downtime — it is permanent, unrecoverable loss of a
customer's financial records, with no recourse and no insurance.

A backup that has never been restored is a hypothesis, not a backup.

---

## 1. Settings that must be confirmed

Confirm each in the Supabase dashboard for the **production** project and
record the answer in section 5. Do not assume a default.

| # | Setting | Where | Required value |
|---|---------|-------|----------------|
| 1.1 | Project tier | Settings → Billing | Pro or above. Daily backups are not available on Free. |
| 1.2 | Daily backups | Database → Backups | Enabled, with at least 7 days retention. |
| 1.3 | Point-in-time recovery (PITR) | Database → Backups → PITR | Enabled. This is a paid add-on and is **off by default even on Pro**. |
| 1.4 | PITR retention window | Database → Backups → PITR | 7 days minimum. |
| 1.5 | Most recent successful backup | Database → Backups | Within the last 24 hours. |
| 1.6 | Storage bucket contents | Storage | Note whether object storage is included in the backup. **Database backups do not cover Storage objects.** See section 6. |
| 1.7 | Project region | Settings → General | Recorded, so a restore target can be created in the same region. |

If 1.3 is off, **stop and enable it before onboarding any customer.** Daily
backups alone mean up to 24 hours of accepted invoices and payments can be
lost, and this application records real money.

---

## 2. What a restore must recover

A partial restore is not a restore. All of the following must come back
together and consistently:

- Every table in `public` — 65 tables, all tenant-scoped and RLS-protected.
- All RLS policies, `SECURITY DEFINER` functions, triggers and grants. These
  are the tenant boundary; a restore that loses them restores the data into an
  unprotected database.
- `auth.users` and the Supabase Auth schema. Restoring `public.profiles`
  without `auth.users` produces memberships whose users cannot sign in.
- The document-number counters (`public.company_document_counters`). If these
  are lost but documents survive, allocation re-seeds from the highest existing
  suffix, which is correct by design — but confirm it rather than assume it.
- Payment ledgers: `payment_provider_events`, `payment_attempts`,
  `payment_reconciliations`, `payment_disputes`, `invoice_payments`,
  `subscription_event_ledger`. Losing the provider-event ledger destroys
  webhook idempotency and a Stripe redelivery would double-record payments.

---

## 3. Recovery objectives to agree before launch

Fill these in as decisions, then measure against them in section 4.

| Objective | Definition | Target | Measured |
|---|---|---|---|
| **RPO** (Recovery Point Objective) | Maximum acceptable data loss, in minutes | _decide_ (PITR makes single-digit minutes achievable) | _measure in 4.6_ |
| **RTO** (Recovery Time Objective) | Maximum acceptable time from decision-to-restore until customers are transacting again | _decide_ | _measure in 4.7_ |

A target without a measurement is a wish. Section 4 produces the measurement.

---

## 4. Restore rehearsal procedure

Run against a **scratch project**. Never against production. Never against a
project any customer or preview deployment points at.

1. **Create the scratch project.** Same region as production (1.7). Name it
   distinctly, e.g. `altair-restore-rehearsal-<date>`.
2. **Record the start time.** This is where the RTO clock begins.
3. **Restore production's most recent backup into the scratch project.**
   Supabase dashboard → Database → Backups → Restore, targeting the scratch
   project. For a PITR rehearsal, pick a timestamp ~30 minutes in the past.
4. **Verify schema integrity.** Against the scratch project:
   - `select count(*) from information_schema.tables where table_schema = 'public';`
     — compare to production.
   - `select count(*) from pg_policies where schemaname = 'public';`
     — RLS policies must be present, not just tables.
   - `select tablename from pg_tables where schemaname='public' and rowsecurity = false;`
     — must return zero rows.
5. **Verify tenant isolation survived.** Sign in as a non-admin member of one
   company against the scratch project and confirm they cannot read another
   company's customers. A restore that loses RLS looks successful and is a
   tenant-isolation breach.
6. **Measure RPO.** Compare the newest `created_at` in `public.invoices` (or
   `payment_provider_events`) in the restored copy against production at the
   moment the backup was taken. The gap is the real RPO. Record it.
7. **Measure RTO.** Stop the clock when the scratch project serves an
   authenticated request through the application. Record it.
8. **Point a preview deployment at the scratch project** and walk one
   end-to-end path: sign in, open a customer, open an invoice. This is what
   proves the restore is usable rather than merely present.
9. **Destroy the scratch project.** It contains real customer data and is now
   a second copy of the production database. Do not leave it running.
10. **Record everything in section 5.**

---

## 5. Rehearsal record

### Rehearsal 1 — restore to a new project

A restore-to-new-project rehearsal was performed after the Phase 1–3
remediation. Only fields that were actually observed are filled in. Everything
else is left explicitly unmeasured rather than estimated — a runbook that
invents an RTO is worse than one that admits it does not have one.

| Field | Value |
|---|---|
| Date performed | Post-Phase-3 remediation cycle (exact timestamp not captured) |
| Performed by | Operator (not captured) |
| Restore method | Supabase backup restored into a **separate scratch project** |
| Restored data present | **Yes** — real production-derived data was present in the restored copy |
| Auth / database state | **Sufficient for verification** — the restored copy could be inspected and migrated |
| Migration 148 applied to the restored copy | **Yes — applied successfully** |
| Document-number allocator behaviour | **Correct** — seeded above the existing per-company maxima for jobs, invoices, estimates and expenses, against real data |
| Production project tier | _unverified_ |
| Daily backups enabled | _unverified_ |
| PITR enabled | _unverified — see the banner; this is the largest remaining exposure_ |
| PITR retention window | _unverified_ |
| Schema check (4.4) | _not captured as a count comparison_ |
| Tenant isolation check (4.5) | _not captured_ |
| **Measured RPO** | **not measured** |
| **Measured RTO** | **not measured** |
| End-to-end path verified (4.8) | _not captured_ |
| Scratch project destroyed | _not recorded — confirm and record_ |

#### What this rehearsal did and did not establish

**Established.** A Supabase backup can be restored into a fresh project, the
restored copy contains real data, the schema accepts a forward migration, and
migration 148's lazy seeding behaves correctly against real per-company
maxima — which is a stronger result than the modelled proof in
`scripts/verify-document-numbering.mjs`, because it ran against production-derived
rows rather than a reference model.

**Not established.** How long a restore takes (RTO), how much data a restore
would lose (RPO), whether RLS policies and `SECURITY DEFINER` functions came
back intact, and whether a restored copy can actually serve authenticated
application traffic end to end.

#### What the next rehearsal must add

Steps 4.4, 4.5, 4.6, 4.7, 4.8 and 4.9 of section 4 — the schema and policy
count comparison, the cross-tenant read check, the RPO and RTO measurements,
one authenticated end-to-end path, and confirmation the scratch project was
destroyed.

A scratch restore is also the correct target for the Phase 4 load-test harness
(`docs/development/load-testing.md`), so the next rehearsal and the first
scale benchmark should be run in the same sitting.

Re-run this rehearsal at least every 6 months, and after any migration that
changes RLS, `SECURITY DEFINER` functions, or grants.

---

## 6. Known gap: Storage objects

Supabase database backups cover Postgres. They do **not** cover Storage
objects. This application keeps customer-visible files in Storage:

| Bucket | Contents | Private? |
|---|---|---|
| `company-files` | Expense receipts and job attachments — customer-owned records | Yes |
| `marketing-media` | Rendered video | Yes |
| `avatars` | Profile images | No (public) |
| `founder-marketing-screenshots` | Marketing screenshots | No (public) |

`company-files` is the one that matters: a receipt attached to an expense is a
tax record. Losing it while the `expenses` row survives leaves a database that
claims a receipt exists and storage that cannot produce it.

**Still not implemented.** The restore rehearsal in section 5 did not restore
Storage, because a database backup cannot. What follows is the analysis and a
recommended strategy; implementing it requires external infrastructure and is
deliberately not done from the repository.

### How Altair actually uses Storage

Only one bucket carries irreplaceable customer data.

| Bucket | Written by | Object key | Replaceable? |
|---|---|---|---|
| `company-files` | `attachReceiptToExpense`, job attachment upload | `company/{companyId}/expenses/{expenseId}/{file}`<br>`company/{companyId}/jobs/{jobId}/{attachmentId}/{file}` | **No.** A receipt photographed once in a van is gone. |
| `marketing-media` | `/api/marketing/media/ingest` | `company/{id}/marketing/renders/{renderId}/{sha}.mp4` | Yes — re-renderable from the source pipeline. |
| `avatars` | `app/actions/profile-avatar.ts` | per-user | Yes — cosmetic, re-uploadable. |
| `founder-marketing-screenshots` | founder capture script | per-capture | Yes — regenerable with `npm run capture:founder-screenshots`. |

So the backup problem is narrower than "back up Storage". It is: **back up
`company-files`, and specifically the expense-receipt and job-attachment
prefixes.** The other three buckets can be recreated from a source of truth
that is not Storage.

### The consistency problem, which matters more than the volume

A database backup and a Storage copy are taken at different instants. Restoring
them together produces two failure shapes:

- **Row without object** — an `expenses` row with `receipt_status = 'attached'`
  and `receipt_storage_path` set, pointing at a key that is not in the restored
  bucket. The UI will offer a receipt and fail to produce one. This is the
  damaging direction: the record asserts a tax document exists.
- **Object without row** — a file nobody references. Harmless, but see the
  orphan note below.

Any strategy must therefore include a **reconciliation pass** after a restore,
not just a copy. That pass is cheap and worth scripting before it is needed:
select every `expenses` row with `receipt_status = 'attached'`, list the bucket
prefix, and report keys present in one and not the other.

### Recommended strategy

Ordered by effort. Do at least the first.

1. **Scheduled incremental sync of `company-files` to independent object
   storage.** A daily job that lists the bucket and copies new or changed keys
   into an S3-compatible bucket in a *different* provider or account, with
   versioning and object-lock enabled. Independence is the point: a Supabase
   account compromise or billing lapse must not take the backup with it.
   Receipts are small (images and PDFs, capped at 10 MB by the bucket's
   `file_size_limit`), so cost is negligible relative to the liability.

2. **Pair every Storage sync with a database backup marker.** Record the
   Storage sync's completion timestamp in a small table so a future restore
   can pick the database backup closest to a known-good Storage snapshot,
   rather than pairing them blindly.

3. **Reconciliation script.** As described above, run after any restore and
   monthly in normal operation. It is the only way to discover silent drift.

4. **Retention aligned to the tax records the bucket holds** — meaningfully
   longer than the 7-day database PITR window. Expense receipts are commonly
   retained for years; a 7-day backup of them is not a backup.

### Related defect found during this analysis (not fixed)

**Storage objects are never deleted.** No code path in the repository removes a
Storage object — `grep` for `.remove(` across `lib/` and `app/` returns
nothing. `permanentlyDeleteExpense` deletes the `expenses` row and leaves the
receipt in `company-files` indefinitely. Consequences:

- Storage grows without bound and is never reclaimed.
- A record the product describes as *permanently deleted* still has its
  attachment retrievable by object key, which is a data-retention problem
  independent of backups.
- Under the row-joined storage policy proposed for P1-11, these orphans become
  unreadable by anyone — which is the safe outcome, but they still occupy
  storage and still exist.

A reaper (delete objects whose owning row is gone) belongs with the P1-11
storage-authorization work, because both need the same row↔object mapping.

---

## 7. Related manual platform actions

These are also outside the repository and are tracked in the launch handoff:

- **Error monitoring project.** Create the Sentry project, set `SENTRY_DSN` and
  `SENTRY_ENVIRONMENT` in Vercel, and configure alert rules for:
  `payments.webhook_server_error`, `payments.webhook_unhandled_exception`,
  `payments.reconciliation_required`, `sms.blocked_missing_stop_handling`, and
  any `Operation failed: cron.*`. Verify delivery with
  `POST /api/dev/monitoring-check` in development first.
- **Stripe webhook endpoints.** Confirm both are registered and pointed at the
  correct paths, with separate signing secrets:
  `/api/webhooks/payments` (Connect) and `/api/webhooks/billing` (subscriptions).
- **Vercel cron.** Confirm `CRON_SECRET` is set, so Vercel sends the bearer
  token the cron routes require. Without it every scheduled run returns 503.
