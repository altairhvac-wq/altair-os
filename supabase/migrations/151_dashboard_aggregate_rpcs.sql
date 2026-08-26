-- Migration 151: exact dashboard aggregates, computed in the database.
--
-- ============================== THE DEFECT ==============================
-- getDashboardData fans out 21 ways, and six of those are unbounded full-table
-- reads: listInvoices, listEstimates, listExpenses, listCustomers, listLeads and
-- listOpenClockEntriesForCompany. Every one of them loads a company's ENTIRE
-- history into the Node process on every dashboard render, then reduces it to a
-- handful of counts and top-10 slices. The largest dashboard limit is 10.
--
-- This function replaces the invoice, estimate and expense reads with one
-- round trip that returns the finished numbers.
--
-- ============================== WHAT IT DELIBERATELY DOES NOT COVER ==============================
-- Customers and leads are NOT aggregated here, and that is a deliberate
-- correctness decision rather than an omission.
--
--   * The customers "needs info" queue routes through
--     isCustomerMissingImportantInfo -> validateCustomerFormData(..., {
--       requireContact: true, requireAddress: true }), a full form validator
--     with its own normalization rules. Transcribing that into SQL would create
--     two definitions of "complete customer" that drift apart silently, and the
--     symptom would be a wrong number on a dashboard rather than an error.
--
--   * The lead pipeline metrics bucket by company time zone over a rolling
--     30-day window. That is expressible, but only with the same timezone
--     resolution the application performs, and getting it subtly wrong yields a
--     plausible wrong number.
--
-- Both remain in TypeScript. They are bounded instead by the Step 4 pagination
-- work rather than converted to aggregates.
--
-- ============================== EXACTNESS ==============================
-- Every value is a SQL count(*) or sum(...) FILTER over the whole matching set.
-- None is derived from a truncated list. A count that disagrees with the number
-- of rows a user can page through is worse than a slow dashboard, so the
-- predicates below are transcriptions of the TypeScript, checked one by one:
--
--   isActiveInvoice          status <> 'void'
--                            (TS also excludes 'cancelled', which is NOT a
--                             member of public.invoice_status — that arm of the
--                             TS check is dead. Enumerating it here would be a
--                             type error.)
--   hasInvoiceUnpaidBalance  active AND status <> 'paid' AND balance_due > 0
--   getInvoiceSummary        three sum(...) FILTER aggregates
--   isInvoiceAwaitingFollowUp
--                            active AND unpaid AND status IN ('sent',
--                            'partially_paid') AND
--                            coalesce(sent_at, issued_at, created_at) is at
--                            least 7 days old
--                            (TS excludes 'overdue' and 'draft' explicitly;
--                             the IN list already excludes both)
--   isEstimateAwaitingRecovery
--                            status = 'sent' AND sent_at IS NOT NULL AND
--                            sent_at is at least 7 days old
--
-- The day thresholds use floor(seconds / 86400) to match daysSinceSentAt, which
-- floors whole elapsed days rather than counting calendar boundaries.
--
-- The dashboard's own list reads exclude soft-deleted and archived rows
-- (listInvoices defaults includeDeleted/includeArchived to false), so every
-- aggregate here carries `deleted_at is null and archived_at is null`.
--
-- ============================== AUTHORIZATION ==============================
-- Migration 149 exists because migration 148 got this wrong twice. The rules
-- applied here, deliberately and explicitly:
--
--   * SECURITY DEFINER, so RLS is bypassed and the function must do its own
--     checks. It does: authentication, active membership, and a per-section
--     permission gate that mirrors getCompanyAccessScope exactly.
--   * A caller who lacks canViewBilling gets zeros for the billing sections
--     rather than an error, matching the TypeScript, which passes
--     Promise.resolve([]) for those reads.
--   * A caller who lacks canViewCompanyExpenses gets zeros for expenses.
--   * No helper introduced here is granted to `authenticated`. Only the
--     entry point is callable, and it checks membership before reading
--     anything.
--
-- ============================== SAFETY ==============================
-- Read-only. Creates one function. No table, no policy, no grant on any table,
-- no row read, written or deleted. Reversible with DROP FUNCTION.

create or replace function public.get_company_dashboard_aggregates(
  p_company_id uuid,
  p_reference timestamptz default now()
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
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

  -- Authentication and tenancy. The service-role path (auth.uid() is null)
  -- is NOT given a blanket bypass here the way allocation needs: this function
  -- only reads, and every caller in the application is a signed-in user
  -- rendering their own dashboard. A null actor gets zeros.
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
                  p_reference - coalesce(i.sent_at, i.issued_at, i.created_at)
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
          and e.sent_at is not null
          and floor(
                extract(epoch from (p_reference - e.sent_at)) / 86400
              ) >= v_recovery_days
      ),
      'approvedCount', count(*) filter (
        where e.status = 'approved'::public.estimate_status
      ),
      'totalActiveCount', count(*)
    )
    into v_estimates
    from public.estimates e
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
      'attachedReceiptCount', count(*) filter (
        where x.receipt_status = 'attached'::public.receipt_status
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
$$;

comment on function public.get_company_dashboard_aggregates(uuid, timestamptz) is
  'Exact dashboard counts and money totals for one company, computed in SQL instead of by loading every invoice, estimate and expense into the application. Every value is a count(*) or sum(...) FILTER over the full matching set — never a truncated list. Enforces authentication, active membership, and the same per-section permissions as getCompanyAccessScope.';

revoke all on function public.get_company_dashboard_aggregates(uuid, timestamptz) from public;
grant execute on function public.get_company_dashboard_aggregates(uuid, timestamptz)
  to authenticated, service_role;
