# Backup and restore runbook

> **STATUS: REQUIRES MANUAL PLATFORM VERIFICATION — NOT CLOSED**
>
> Nothing in this repository can prove that backups exist, that point-in-time
> recovery is enabled, or that a restore works. Those are Supabase project
> settings and a live operation. This document specifies exactly what must be
> confirmed and rehearsed; **P0-4 stays open until the rehearsal in section 4
> has actually been performed and its measured RPO and RTO are recorded in
> section 5.**
>
> Do not mark this closed because the document exists. The document is not the
> control; the rehearsal is.

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

> **Empty. No rehearsal has been performed.**
> P0-4 remains open until this table is filled in from an actual run.

| Field | Value |
|---|---|
| Date performed | _not yet performed_ |
| Performed by | — |
| Production project tier | _unverified_ |
| Daily backups enabled | _unverified_ |
| PITR enabled | _unverified_ |
| PITR retention window | _unverified_ |
| Backup restored (timestamp) | — |
| Schema check (4.4) | — |
| Tenant isolation check (4.5) | — |
| **Measured RPO** | — |
| **Measured RTO** | — |
| End-to-end path verified (4.8) | — |
| Scratch project destroyed | — |
| Notes / surprises | — |

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

**Action required (not yet implemented):** decide and implement a Storage
backup strategy — scheduled `supabase storage` export to independent object
storage, or bucket replication. Record the decision here.

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
