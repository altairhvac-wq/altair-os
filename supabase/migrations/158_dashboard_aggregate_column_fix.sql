-- Migration 158: fix migration 151 against the real schema.
--
-- ============================== THE DEFECT ==============================
-- 151 was written without a database to check it against, and it references
-- three columns that do not exist:
--
--     invoices.sent_at        -- never existed
--     invoices.issued_at      -- the column is issue_date, and it is a date
--     estimates.sent_at       -- never existed
--
-- So the function does not merely return wrong numbers, it raises:
--
--     ERROR: column i.sent_at does not exist
--
-- Every call fails. ALTAIR_DASHBOARD_AGGREGATES has never been switched on, so
-- nothing in production has run it — this was caught by calling the RPC against
-- a scale-seeded scratch tenant, which is exactly the gate it needed to pass.
--
-- ============================== WHY IT MATTERS MORE THAN IT LOOKS ==============================
-- 151 is not a performance optimization. It is the fix for a live correctness
-- defect, so leaving it broken leaves the defect in place.
--
-- PostgREST caps an unfiltered response at 1000 rows and reports the truncation
-- in a Content-Range header that nothing in the application reads. listInvoices
-- has no .limit(), so on a tenant with 10,000 invoices it receives 1,000 and the
-- dashboard reduces its money totals over that tenth. Measured on the seeded
-- tenant:
--
--     unpaid A/R    shown $1,143,733.80   actual $11,528,989.02   -90.1%
--     overdue       shown   $602,980.68   actual  $7,813,568.17   -92.3%
--
-- Because the list is ordered created_at desc, the rows dropped are the OLDEST
-- ones — the invoices most likely to be overdue and most in need of collection.
--
-- Aggregating in SQL is immune to that cap. That is what makes 151 the remedy,
-- and this migration is what makes 151 run.
--
-- ============================== THE REPLACEMENTS ==============================
-- invoices: coalesce(sent_at, issued_at, created_at)
--        -> coalesce(issue_date::timestamptz, created_at)
--
--   This matches what the application ACTUALLY does, not what 151 assumed.
--   resolveUnpaidReferenceDate in shared/lib/unpaid-invoice-follow-up.ts reads
--   invoice.sentAt ?? invoice.issueDate ?? invoice.createdAt — but
--   mapInvoiceRowToInvoice never populates sentAt, so that first branch is dead
--   and the live behaviour is issueDate ?? createdAt.
--
-- estimates: e.sent_at
--         -> the earliest estimate_sent activity
--
--   Estimate.sentAt is not a column either. It is resolved by
--   batchResolveEstimateLifecycleTimestamps, which reads estimate_activities and
--   takes the MINIMUM created_at for event_type = 'estimate_sent'. The lateral
--   below is that same rule expressed in SQL. An estimate with no such activity
--   has no sentAt and is excluded, which is what isEstimateAwaitingRecovery does
--   when sentAt is absent.
--
-- Day arithmetic is unchanged: floor(epoch / 86400), matching daysSinceSentAt's
-- floor(elapsedMs / 86400000). TS clamps the result at 0 and SQL does not, which
-- cannot change either predicate because both compare >= a positive threshold.
--
-- ============================== NO NEW PRIVILEGED SURFACE ==============================
-- This is CREATE OR REPLACE on a function 151 already defined, with the same
-- signature, the same SECURITY DEFINER, the same pinned search_path and the same
-- permission gates. No grant is added. The migration 148 failure mode — a
-- privileged helper reachable by `authenticated` that leaks across tenants — does
-- not apply: the first thing this does is reject a caller who is not an active
-- member of the company it was asked about.

begin;

create or replace function public.get_company_dashboard_aggregates(
  p_company_id uuid,
  p_reference timestamptz default now()
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $function$
declare
  v_user_id uuid := auth.uid();
  v_can_billing boolean := false;
  v_can_expenses boolean := false;
  v_invoices jsonb := '{}'::jsonb;
  v_estimates jsonb := '{}'::jsonb;
  v_expenses jsonb := '{}'::jsonb;
  v_follow_up_days constant integer := 7;
  v_recovery_days constant integer := 7;
begin
  if p_company_id is null then
    raise exception 'company_id_required';
  end if;

  -- A null actor gets zeros rather than a bypass. This function only reads, and
  -- every application caller is a signed-in user rendering their own dashboard.
  if v_user_id is null then
    return jsonb_build_object(
      'invoices', v_invoices,
      'estimates', v_estimates,
      'expenses', v_expenses
    );
  end if;

  if not public.is_active_company_member(p_company_id) then
    raise exception 'insufficient_permission';
  end if;

  -- Mirrors getCompanyAccessScope:
  --   canViewBilling         = permissions.manageBilling
  --   canViewCompanyExpenses = manageBilling OR dispatchJobs
  v_can_billing := public.can_manage_billing(p_company_id);
  v_can_expenses :=
    public.can_manage_billing(p_company_id)
    or public.can_dispatch_jobs(p_company_id);

  -- ------------------------------------------------------------------
  -- Invoices
  -- ------------------------------------------------------------------
  if v_can_billing then
    select jsonb_build_object(
      'unpaidTotal', coalesce(round(sum(i.balance_due) filter (
        where i.status <> 'void'::public.invoice_status
          and i.status <> 'paid'::public.invoice_status
          and i.balance_due > 0
      ), 2), 0),
      'paidTotal', coalesce(round(sum(i.total) filter (
        where i.status = 'paid'::public.invoice_status
      ), 2), 0),
      'overdueTotal', coalesce(round(sum(i.balance_due) filter (
        where i.status = 'overdue'::public.invoice_status
      ), 2), 0),
      'unpaidCount', count(*) filter (
        where i.status <> 'void'::public.invoice_status
          and i.status <> 'paid'::public.invoice_status
          and i.balance_due > 0
      ),
      'overdueCount', count(*) filter (
        where i.status = 'overdue'::public.invoice_status
          and i.balance_due > 0
      ),
      'draftCount', count(*) filter (
        where i.status = 'draft'::public.invoice_status
      ),
      'followUpCount', count(*) filter (
        where i.status in (
                'sent'::public.invoice_status,
                'partially_paid'::public.invoice_status
              )
          and i.balance_due > 0
          and floor(
                extract(epoch from (
                  p_reference - coalesce(i.issue_date::timestamptz, i.created_at)
                )) / 86400
              ) >= v_follow_up_days
      ),
      'totalActiveCount', count(*)
    )
    into v_invoices
    from public.invoices i
    where i.company_id = p_company_id
      and i.deleted_at is null
      and i.archived_at is null;
  end if;

  -- ------------------------------------------------------------------
  -- Estimates
  -- ------------------------------------------------------------------
  if v_can_billing then
    select jsonb_build_object(
      'draftCount', count(*) filter (
        where e.status = 'draft'::public.estimate_status
      ),
      'staleSentCount', count(*) filter (
        where e.status = 'sent'::public.estimate_status
          and sent.sent_at is not null
          and floor(
                extract(epoch from (p_reference - sent.sent_at)) / 86400
              ) >= v_recovery_days
      ),
      'approvedCount', count(*) filter (
        where e.status = 'approved'::public.estimate_status
      ),
      'totalActiveCount', count(*)
    )
    into v_estimates
    from public.estimates e
    left join lateral (
      select min(a.created_at) as sent_at
      from public.estimate_activities a
      where a.estimate_id = e.id
        and a.company_id = e.company_id
        and a.event_type = 'estimate_sent'
    ) sent on true
    where e.company_id = p_company_id
      and e.deleted_at is null
      and e.archived_at is null;
  end if;

  -- ------------------------------------------------------------------
  -- Expenses
  -- ------------------------------------------------------------------
  if v_can_expenses then
    select jsonb_build_object(
      'submittedCount', count(*) filter (
        where x.status = 'submitted'::public.expense_status
      ),
      'submittedTotal', coalesce(round(sum(x.amount) filter (
        where x.status = 'submitted'::public.expense_status
      ), 2), 0),
      'missingReceiptCount', count(*) filter (
        where x.receipt_status = 'missing'::public.receipt_status
      ),
      'totalActiveCount', count(*)
    )
    into v_expenses
    from public.expenses x
    where x.company_id = p_company_id
      and x.deleted_at is null
      and x.archived_at is null;
  end if;

  return jsonb_build_object(
    'invoices', coalesce(v_invoices, '{}'::jsonb),
    'estimates', coalesce(v_estimates, '{}'::jsonb),
    'expenses', coalesce(v_expenses, '{}'::jsonb)
  );
end;
$function$;

-- Supports the estimates lateral: one probe per estimate for its earliest
-- estimate_sent row.
create index if not exists estimate_activities_sent_lookup_idx
  on public.estimate_activities (estimate_id, created_at)
  where event_type = 'estimate_sent';

commit;
