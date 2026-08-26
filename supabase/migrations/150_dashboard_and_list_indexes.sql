-- Migration 150: indexes for the Phase 4 dashboard aggregates and list pagination.
--
-- ============================== SCOPE CORRECTION ==============================
-- The Phase 4 preparation pass reported that `leads`, `invoice_payments`,
-- `notifications` and the `*_activities` tables had "no explicit index at all".
-- That was WRONG. It came from a grep that matched `on public.<table> (` on a
-- single line, while most index definitions in this repository put the column
-- list on the following line. A multi-line-aware inventory shows:
--
--     leads               6 indexes
--     invoice_payments    5
--     notifications       3
--     *_activities        2-3 each
--
-- The repeated definitions across 002_app_core, 002_app_core_remaining and
-- 006_create_missing_app_tables reuse the same index NAMES, so they are
-- `if not exists` no-ops rather than duplicates.
--
-- This migration is therefore much smaller than that pass implied. It adds only
-- the gaps that survive a read of the actual query predicates and orderings.
--
-- ============================== HOW THESE WERE CHOSEN ==============================
-- Each index below is written against a specific query that exists today, named
-- in its comment. Composite column order follows the predicate: equality columns
-- first, then the range or ordering column. Partial predicates mirror the
-- filters the queries always apply, which keeps the indexes small and makes them
-- usable for the ordering rather than only the filter.
--
-- ============================== WHY NOT CONCURRENTLY ==============================
-- `CREATE INDEX CONCURRENTLY` cannot run inside a transaction block, and this
-- repository applies migrations by hand through the Supabase dashboard SQL
-- editor (see docs/development/ALTAIR_SESSION_LOG.md), which submits a file as
-- one implicit transaction. All 149 existing migrations use plain CREATE INDEX
-- for that reason. Inventing a different format for this one file would be a
-- deployment hazard, not a safety improvement.
--
-- LOCK IMPLICATION, stated plainly: plain CREATE INDEX takes a SHARE lock on the
-- table, which blocks INSERT/UPDATE/DELETE on that table for the duration of the
-- build. Reads are unaffected. At the current data volume every build here is
-- sub-second, so the write pause is not observable.
--
-- IF A TABLE EVER GROWS LARGE ENOUGH FOR THAT WINDOW TO MATTER, do not change
-- this file. Instead run the concurrent form manually, one statement at a time,
-- outside any transaction:
--
--     create index concurrently if not exists <name> on public.<table> (...);
--
-- A failed CONCURRENTLY build leaves an INVALID index that must be dropped
-- before retrying:
--     select indexrelid::regclass from pg_index where not indisvalid;
--
-- ============================== SAFETY ==============================
-- Index-only. No table is created or altered, no row is read, written or
-- deleted, no policy or grant changes. Fully reversible with DROP INDEX.

-- ---------------------------------------------------------------------------
-- 1. invoice_payments — the dashboard's five payment reads
-- ---------------------------------------------------------------------------
--
-- Existing coverage is (invoice_id, payment_date desc, created_at desc) and a
-- bare (company_id). The dashboard never queries by invoice_id; it queries by
-- company plus a payment_date range, which could only use the bare company
-- index and then filter.
--
-- Serves, from lib/database/queries/invoice-payments.ts:
--   getPaymentsYesterdaySummary      eq(company_id) + eq(payment_date)
--   getPaymentsThisWeekSummary       eq(company_id) + gte/lte(payment_date)
--   getPaymentsThisMonthSummary      eq(company_id) + gte/lte(payment_date)
--   getPaymentsLast7DaysDailyTotals  eq(company_id) + gte/lte(payment_date)
--   listPayments                     eq(company_id) order by payment_date desc,
--                                                            created_at desc
create index if not exists invoice_payments_company_payment_date_idx
  on public.invoice_payments (company_id, payment_date desc, created_at desc);

-- listRecentPayments: eq(company_id) order by created_at desc limit N.
-- A distinct index because its ordering column is not payment_date; the index
-- above cannot serve this sort.
create index if not exists invoice_payments_company_created_at_idx
  on public.invoice_payments (company_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 2. List pagination — keyset ordering for the high-volume admin lists
-- ---------------------------------------------------------------------------
--
-- Every list query is:
--     eq(company_id) + is(deleted_at, null) [+ is(archived_at, null)]
--     order by <created_at|scheduled_at> desc
--
-- The existing (company_id) and (company_id, status) indexes cannot serve that
-- ordering, so today each list sorts its whole result set. These indexes make
-- the sort an index scan and are the precondition for the Step 4 keyset
-- pagination — a keyset walk without them is worse than the offset it replaces.
--
-- `id` is the tiebreaker column: created_at is not unique, and a keyset cursor
-- needs a total order or it will skip or repeat rows at a page boundary.
--
-- Partial on `deleted_at is null` only. Archived rows are sometimes requested
-- (the Customers page passes includeArchived), so excluding them here would
-- make the index unusable for that call; the archived filter is cheap on top.

create index if not exists invoices_company_created_at_id_active_idx
  on public.invoices (company_id, created_at desc, id desc)
  where deleted_at is null;

create index if not exists estimates_company_created_at_id_active_idx
  on public.estimates (company_id, created_at desc, id desc)
  where deleted_at is null;

create index if not exists expenses_company_created_at_id_active_idx
  on public.expenses (company_id, created_at desc, id desc)
  where deleted_at is null;

create index if not exists customers_company_created_at_id_active_idx
  on public.customers (company_id, created_at desc, id desc)
  where deleted_at is null;

create index if not exists leads_company_created_at_id_active_idx
  on public.leads (company_id, created_at desc, id desc)
  where deleted_at is null;

-- Jobs order by scheduled_at, not created_at (listJobs, listJobsForOperationalDay).
-- (company_id, scheduled_at) already exists and Postgres can scan a btree
-- backwards, but it is not partial and carries no tiebreaker, so it cannot
-- support a keyset cursor.
create index if not exists jobs_company_scheduled_at_id_active_idx
  on public.jobs (company_id, scheduled_at desc, id desc)
  where deleted_at is null;

-- ---------------------------------------------------------------------------
-- 3. Overdue invoice sweep
-- ---------------------------------------------------------------------------
--
-- syncOverdueInvoiceStatuses selects:
--     eq(company_id) + in(status, ['sent','partially_paid'])
--     + gt(balance_due, 0) + lt(due_date, today)
--
-- (company_id, status) narrows to the right statuses but then scans them all.
-- Putting due_date next makes the date bound an index range, and the partial
-- predicate keeps the index to invoices that could ever become overdue.
--
-- The status list is deliberately NOT in the partial predicate: an invoice's
-- status changes, and a partial index on a mutable status column produces
-- churn on every transition. balance_due > 0 is the stable half of the filter.
create index if not exists invoices_company_due_date_unpaid_idx
  on public.invoices (company_id, due_date)
  where balance_due > 0 and deleted_at is null;

-- ---------------------------------------------------------------------------
-- 4. Activity feed
-- ---------------------------------------------------------------------------
--
-- listRecentOperationalActivitiesForCompany reads each activity table with
-- eq(company_id) order by created_at desc. lead_activities already has
-- (company_id, created_at desc); the other five have only a bare (company_id)
-- and must sort.
create index if not exists customer_activities_company_created_at_idx
  on public.customer_activities (company_id, created_at desc);

create index if not exists invoice_activities_company_created_at_idx
  on public.invoice_activities (company_id, created_at desc);

create index if not exists estimate_activities_company_created_at_idx
  on public.estimate_activities (company_id, created_at desc);

create index if not exists job_activities_company_created_at_idx
  on public.job_activities (company_id, created_at desc);

create index if not exists expense_activities_company_created_at_idx
  on public.expense_activities (company_id, created_at desc);
