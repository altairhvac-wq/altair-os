-- Migration 162: keyset indexes for the status-filtered lists.
--
-- ============================== WHY MIGRATION 150 IS NOT ENOUGH ==============================
-- 150 added (company_id, created_at desc, id desc) partial indexes so a keyset
-- cursor could walk each list in order. That is the right index for an
-- UNFILTERED page, and every one of these lists is now filtered: the work-queue
-- pill is applied in SQL, so the query is
--
--     company_id = ? and deleted_at is null and archived_at is null
--     and status = ?
--     order by created_at desc, id desc
--     limit 51
--
-- With only (company_id, created_at, id) available, Postgres walks the whole
-- tenant in date order and discards rows until it has fifty of the right status.
-- On the scale-seeded tenant the landing queue is Draft: 863 invoices out of
-- 10,000, so roughly eleven rows are read and thrown away for every one kept —
-- and Partially paid is 14 out of 10,000, where the walk is effectively a scan.
--
-- The existing (company_id, status) indexes do not help either: they find the
-- right rows but carry no order, so the sort still has to materialise all of
-- them before the limit applies.
--
-- ============================== WHAT THESE ARE ==============================
-- (company_id, status, created_at desc, id desc), partial on the lifecycle the
-- list actually shows. That serves the equality, the ordering and the keyset
-- tiebreaker from one index, and the limit stops the scan after fifty rows.
--
-- Column order is deliberate: the equality columns first, then the sort key,
-- then the tiebreaker. Putting created_at before status would put us back where
-- we started.
--
-- These are additive. Nothing is dropped: the 150 indexes still serve the
-- unfiltered All view and the searches, and the (company_id, status) indexes
-- still serve the counts.
--
-- ============================== CONCURRENTLY, AND WHY NOT HERE ==============================
-- create index concurrently cannot run inside a transaction block, and the
-- Supabase migration runner wraps each file in one. These tables are small
-- enough in production today that a brief ACCESS SHARE-blocking build is
-- acceptable; if that stops being true, run the statements manually with
-- CONCURRENTLY outside a transaction instead of relaxing the migration.
-- The deployment note in the handoff says so explicitly.

begin;

create index if not exists invoices_company_status_created_at_id_idx
  on public.invoices (company_id, status, created_at desc, id desc)
  where deleted_at is null;

create index if not exists estimates_company_status_created_at_id_idx
  on public.estimates (company_id, status, created_at desc, id desc)
  where deleted_at is null;

create index if not exists expenses_company_status_created_at_id_idx
  on public.expenses (company_id, status, created_at desc, id desc)
  where deleted_at is null;

create index if not exists leads_company_status_created_at_id_idx
  on public.leads (company_id, status, created_at desc, id desc)
  where deleted_at is null;

create index if not exists customers_company_status_created_at_id_idx
  on public.customers (company_id, status, created_at desc, id desc)
  where deleted_at is null;

commit;
