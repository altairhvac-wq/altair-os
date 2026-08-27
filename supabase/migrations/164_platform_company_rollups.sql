-- Migration 164: roll the platform overview up in SQL.
--
-- ============================== THE DEFECT ==============================
-- getPlatformAdminOverview builds its per-company usage table by reading, across
-- EVERY tenant on the platform:
--
--     select company_id from jobs
--     select company_id from customers
--     select company_id from estimates
--     select company_id from invoices
--     select company_id, created_at from job_activities
--     select company_id, updated_at from jobs
--     select company_id, is_demo from customers / jobs / estimates
--     select company_id, is_demo, created_at from invoices
--     select company_id from invoice_payments
--
-- and then counting the arrays in JavaScript. PostgREST caps each of those at
-- 1,000 rows. Not 1,000 per company -- 1,000 in total, across the platform. So
-- the moment the whole platform has more than a thousand jobs, the admin
-- overview's per-company job counts are computed from an arbitrary thousand of
-- them, and every company below the cut shows zero.
--
-- This is the same defect as the tenant lists, one level up, and it is worse in
-- one specific way: it is the screen used to judge whether tenants are active,
-- so the failure mode is "this customer looks dormant" about a customer who is
-- not.
--
-- ============================== WHAT THIS RETURNS ==============================
-- One row per company that has any of these records, with every figure the
-- overview derived from those eleven reads:
--
--   job_count / customer_count / estimate_count / invoice_count
--   real_* variants, excluding is_demo -- matching countRealByCompanyId, which
--     skips only rows where is_demo IS TRUE (a null is real)
--   payment_count
--   max_job_updated_at / max_job_activity_at, which feed lastActivityByCompany
--   first_invoice_at, the earliest invoice for a company -- the caller still
--     applies its own "only for companies with no payments" rule, because that
--     rule is about what the figure is FOR, not about the data
--
-- The counting moved. The interpretation did not.
--
-- ============================== ACCESS ==============================
-- SECURITY DEFINER, and gated on platform admin rather than on company
-- membership: this deliberately crosses tenants, which is the one thing every
-- other function in this schema must not do. It is granted to service_role
-- ONLY. `authenticated` is not granted, so there is no path from a signed-in
-- user session to cross-tenant counts even if the caller were confused about
-- which client it was holding. The application reaches it through the
-- service-role client, after platform-admin authorization, exactly as it
-- reached the eleven raw reads.

begin;

create or replace function public.get_platform_company_rollups()
returns table (
  company_id uuid,
  job_count bigint,
  customer_count bigint,
  estimate_count bigint,
  invoice_count bigint,
  real_job_count bigint,
  real_customer_count bigint,
  real_estimate_count bigint,
  real_invoice_count bigint,
  payment_count bigint,
  max_job_updated_at timestamptz,
  max_job_activity_at timestamptz,
  first_invoice_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  with ids as (
    select c.id from public.companies c
  ),
  jobs_agg as (
    select
      j.company_id,
      count(*) as total,
      count(*) filter (where j.is_demo is not true) as real_total,
      max(j.updated_at) as max_updated_at
    from public.jobs j
    group by j.company_id
  ),
  job_activity_agg as (
    select a.company_id, max(a.created_at) as max_created_at
    from public.job_activities a
    group by a.company_id
  ),
  customers_agg as (
    select
      c.company_id,
      count(*) as total,
      count(*) filter (where c.is_demo is not true) as real_total
    from public.customers c
    group by c.company_id
  ),
  estimates_agg as (
    select
      e.company_id,
      count(*) as total,
      count(*) filter (where e.is_demo is not true) as real_total
    from public.estimates e
    group by e.company_id
  ),
  invoices_agg as (
    select
      i.company_id,
      count(*) as total,
      count(*) filter (where i.is_demo is not true) as real_total,
      min(i.created_at) as first_created_at
    from public.invoices i
    group by i.company_id
  ),
  payments_agg as (
    select p.company_id, count(*) as total
    from public.invoice_payments p
    group by p.company_id
  )
  select
    ids.id,
    coalesce(jobs_agg.total, 0),
    coalesce(customers_agg.total, 0),
    coalesce(estimates_agg.total, 0),
    coalesce(invoices_agg.total, 0),
    coalesce(jobs_agg.real_total, 0),
    coalesce(customers_agg.real_total, 0),
    coalesce(estimates_agg.real_total, 0),
    coalesce(invoices_agg.real_total, 0),
    coalesce(payments_agg.total, 0),
    jobs_agg.max_updated_at,
    job_activity_agg.max_created_at,
    invoices_agg.first_created_at
  from ids
  left join jobs_agg on jobs_agg.company_id = ids.id
  left join job_activity_agg on job_activity_agg.company_id = ids.id
  left join customers_agg on customers_agg.company_id = ids.id
  left join estimates_agg on estimates_agg.company_id = ids.id
  left join invoices_agg on invoices_agg.company_id = ids.id
  left join payments_agg on payments_agg.company_id = ids.id;
$function$;

revoke all on function public.get_platform_company_rollups()
  from public;
revoke all on function public.get_platform_company_rollups()
  from anon;
revoke all on function public.get_platform_company_rollups()
  from authenticated;
grant execute on function public.get_platform_company_rollups()
  to service_role;

commit;
