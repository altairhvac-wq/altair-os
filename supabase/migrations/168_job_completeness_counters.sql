-- Migration 168: the structural half of job profitability, counted in SQL.
--
-- ============================== THE DISCOVERY THIS RESTS ON ==============================
-- computeJobProfitability is 473 lines and produces two very different kinds of
-- output:
--
--   MONEY      collected, invoiced, outstanding, materialCogs, expenseCogs,
--              directCostTotal, grossProfit, grossMarginPercent, labour hours.
--              Revenue recognition, cost classification, rounding. This is the
--              part that must never acquire a second definition.
--
--   COMPLETENESS  activeInvoiceCount, materialsMissingUnitCostCount,
--              excludedPendingExpenseCount, excludedRejectedExpenseCount,
--              excludedMaterialsExpenseCount, expensesMissingAmountCount,
--              openLaborEntryCount. Every one is a COUNT OF ROWS matching a
--              status test. No arithmetic on money at all.
--
-- The dashboard's entire operations panel — jobsWithWarnings, the completed-work
-- review reasons, their severities, and completed-work-awaiting-invoicing — is
-- derived from the COMPLETENESS half alone. Not one of those numbers reads a
-- currency field. That is what makes this safe: the expensive thing (loading
-- every job, invoice, estimate, expense, labour entry and material to build
-- snapshots) exists to compute facts SQL can count directly.
--
-- ============================== SQL COUNTS THE FACTS; TYPESCRIPT KEEPS THE RULES ==============================
-- This function does NOT decide whether a job has warnings. It returns the seven
-- counters, and jobProfitabilityHasWarnings, resolveCompletedWorkReviewReasons
-- and resolveCompletedWorkReviewSeverity — the shipped functions, unchanged —
-- are applied to them in TypeScript. There is still exactly one definition of
-- "this job needs review", and it is the one that was already there.
--
-- The aggregate counts below (jobs_with_warnings, review counts) DO encode the
-- rule a second time, because a per-job round trip for 12,000 jobs is the
-- problem rather than the solution. scripts/verify-job-completeness-live.mjs
-- closes that: it pulls the per-job counters, runs the SHIPPED rules over them
-- in TypeScript, and asserts the SQL aggregate equals that — for every job in
-- the tenant, not a sample. The duplication exists and is continuously proven
-- equal on real data at scale.
--
-- ============================== EVERY COUNTER, AND WHERE IT COMES FROM ==============================
-- From computeJobProfitability, in its own order:
--
--   active_invoice_count       invoices with status not in (void, cancelled).
--                              noActiveInvoices is this being zero.
--
--   materials_missing_unit_cost
--                              job_materials where calculateJobMaterialTotalCost
--                              returns undefined, which it does exactly when
--                              unit_cost is null.
--
--   pending_expense_count      expenses with status in (draft, submitted)
--                              — PENDING_EXPENSE_STATUSES. Checked FIRST, so a
--                              draft materials expense counts here and not as a
--                              materials exclusion. The order matters and is
--                              reproduced.
--
--   rejected_expense_count     status = 'rejected', checked second.
--
--   materials_expense_count    category = 'materials' AND status in
--                              (approved, reimbursed) — ELIGIBLE_EXPENSE_STATUSES.
--                              A materials expense in any other status is
--                              skipped silently by the TypeScript, so it is
--                              skipped here.
--
--   expenses_missing_amount    status in (approved, reimbursed), category is not
--                              materials, and the amount is not a finite number.
--                              In the database that is amount is null.
--
--   open_labor_entry_count     job_labor entries where resolveLaborMinutes
--                              returns null: no finite duration_minutes AND no
--                              ended_at.
--
-- The invoice, expense and material scopes match the loaders the datasets used
-- (listInvoices, listExpenses): not deleted, not archived. job_materials and
-- time_entries have no lifecycle columns in that sense and are taken whole.
--
-- ============================== PRIVILEGES ==============================
-- SECURITY DEFINER, pinned search_path, membership-gated, and gated on the same
-- permission the caller checks. Membership is the tenant boundary; the
-- permission gate is what stops a technician in the same company reading
-- company-wide billing-completeness counts by calling the RPC directly.
-- Explicit revoke before the grant.

begin;

create or replace function public.get_company_job_completeness_summary(
  p_company_id uuid,
  p_reference timestamptz,
  p_stalled_days integer,
  p_limit integer
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $function$
declare
  v_user_id uuid := auth.uid();
  v_limit integer := least(greatest(coalesce(p_limit, 5), 1), 100);
  v_empty jsonb := jsonb_build_object(
    'jobsWithWarnings', 0,
    'completedAwaitingInvoicingCount', 0,
    'completedAwaitingInvoicingJobs', '[]'::jsonb,
    'completedWorkReviewCount', 0,
    'criticalCompletedWorkReviewCount', 0,
    'completedWorkReviewJobs', '[]'::jsonb,
    'stalledCount', 0,
    'stalledJobs', '[]'::jsonb
  );
  v_result jsonb;
begin
  if p_company_id is null then
    raise exception 'company_id_required';
  end if;

  if v_user_id is null then
    return v_empty;
  end if;

  if not public.is_active_company_member(p_company_id) then
    raise exception 'insufficient_permission';
  end if;

  -- ============================== canViewOperationalReports, EXACTLY ==============================
  -- getCompanyAccessScope defines it as
  --     manageBilling OR dispatchJobs OR manageCompany
  -- and there is no can_manage_company() in SQL. There does not need to be:
  -- COMPANY_ROLE_PERMISSIONS gives manageCompany to (owner, admin) and
  -- manageBilling to (owner, admin, office_staff), so manageCompany is a strict
  -- SUBSET of manageBilling and the third term cannot admit anyone the first
  -- two do not. The two-term form below is therefore equivalent, not a
  -- narrowing — which matters, because a narrowing here would silently blank
  -- the operations panel for a real user.
  if not (
    public.can_manage_billing(p_company_id)
    or public.can_dispatch_jobs(p_company_id)
  ) then
    return v_empty;
  end if;

  with base as (
    select j.id, j.job_number, j.status, j.completed_at, j.created_at,
           j.work_started_at, j.arrived_at,
           j.assigned_technician_id,
           c.name as customer_name,
           p.full_name as assigned_technician
    from public.jobs j
    left join public.customers c on c.id = j.customer_id
    left join public.profiles p on p.id = j.assigned_technician_id
    where j.company_id = p_company_id
      and j.deleted_at is null
      and j.archived_at is null
  ),
  counters as (
    select
      b.*,
      (
        select count(*)
        from public.invoices i
        where i.job_id = b.id
          and i.company_id = p_company_id
          and i.deleted_at is null
          and i.archived_at is null
          and i.status <> 'void'::public.invoice_status
          and i.status <> 'cancelled'::public.invoice_status
      ) as active_invoice_count,
      (
        select count(*)
        from public.job_materials m
        where m.job_id = b.id
          and m.company_id = p_company_id
          and m.unit_cost is null
      ) as materials_missing_unit_cost,
      (
        select count(*)
        from public.expenses e
        where e.job_id = b.id
          and e.company_id = p_company_id
          and e.deleted_at is null
          and e.archived_at is null
          and e.status in (
                'draft'::public.expense_status,
                'submitted'::public.expense_status
              )
      ) as pending_expense_count,
      (
        select count(*)
        from public.expenses e
        where e.job_id = b.id
          and e.company_id = p_company_id
          and e.deleted_at is null
          and e.archived_at is null
          and e.status = 'rejected'::public.expense_status
      ) as rejected_expense_count,
      (
        select count(*)
        from public.expenses e
        where e.job_id = b.id
          and e.company_id = p_company_id
          and e.deleted_at is null
          and e.archived_at is null
          and e.category = 'materials'::public.expense_category
          and e.status in (
                'approved'::public.expense_status,
                'reimbursed'::public.expense_status
              )
      ) as materials_expense_count,
      (
        select count(*)
        from public.expenses e
        where e.job_id = b.id
          and e.company_id = p_company_id
          and e.deleted_at is null
          and e.archived_at is null
          and e.category <> 'materials'::public.expense_category
          and e.status in (
                'approved'::public.expense_status,
                'reimbursed'::public.expense_status
              )
          and e.amount is null
      ) as expenses_missing_amount,
      (
        select count(*)
        from public.time_entries t
        where t.job_id = b.id
          and t.company_id = p_company_id
          and t.entry_type = 'job_labor'::public.time_entry_type
          and t.duration_minutes is null
          and t.ended_at is null
      ) as open_labor_entry_count
    from base b
  ),
  classified as (
    select
      jc.*,
      (jc.active_invoice_count = 0) as no_active_invoices,
      -- jobProfitabilityHasWarnings, shared/types/reports.ts. The cancelled
      -- exemptions apply to the no-invoice and open-labour terms only.
      (
        (jc.active_invoice_count = 0 and jc.status <> 'cancelled'::public.job_status)
        or jc.materials_missing_unit_cost > 0
        or jc.pending_expense_count > 0
        or jc.rejected_expense_count > 0
        or jc.expenses_missing_amount > 0
        or jc.materials_expense_count > 0
        or (jc.open_labor_entry_count > 0 and jc.status <> 'cancelled'::public.job_status)
      ) as has_warnings,
      -- resolveCompletedWorkReviewReasons. No cancelled exemption here: the
      -- review report only ever looks at completed jobs.
      (jc.active_invoice_count = 0) as reason_no_active_invoice,
      (jc.open_labor_entry_count > 0) as reason_open_labor,
      (jc.pending_expense_count > 0) as reason_pending_expenses,
      (
        jc.materials_missing_unit_cost > 0
        or jc.rejected_expense_count > 0
        or jc.materials_expense_count > 0
        or jc.expenses_missing_amount > 0
      ) as reason_data_incomplete
    from counters jc
  ),
  reviewed as (
    select
      cl.*,
      (
        cl.reason_no_active_invoice
        or cl.reason_open_labor
        or cl.reason_pending_expenses
        or cl.reason_data_incomplete
      ) as needs_review,
      -- resolveCompletedWorkReviewSeverity: critical when all three of the
      -- primary reasons are present.
      (
        cl.reason_no_active_invoice
        and cl.reason_open_labor
        and cl.reason_pending_expenses
      ) as is_critical,
      -- resolveCompletedAt: completedAt, else createdAt.
      coalesce(cl.completed_at, cl.created_at) as effective_completed_at,
      -- resolveLastActivityAt: the newest job activity, else workStartedAt,
      -- else arrivedAt, else createdAt. stalled-jobs-report.ts.
      coalesce(
        (
          select max(a.created_at)
          from public.job_activities a
          where a.job_id = cl.id and a.company_id = p_company_id
        ),
        cl.work_started_at,
        cl.arrived_at,
        cl.created_at
      ) as last_activity_at
    from classified cl
  )
  select jsonb_build_object(
    'jobsWithWarnings', (
      select count(*) from reviewed where has_warnings
    ),

    'completedAwaitingInvoicingCount', (
      select count(*)
      from reviewed
      where status = 'completed'::public.job_status and no_active_invoices
    ),
    'completedAwaitingInvoicingJobs', coalesce((
      select jsonb_agg(row_to_json(t))
      from (
        select id as job_id, job_number, customer_name, completed_at,
               assigned_technician,
               floor(
                 extract(epoch from (p_reference - effective_completed_at)) / 86400
               )::integer as days_since_completion
        from reviewed
        where status = 'completed'::public.job_status and no_active_invoices
        order by days_since_completion desc, created_at desc, id asc
        limit v_limit
      ) t
    ), '[]'::jsonb),

    'completedWorkReviewCount', (
      select count(*)
      from reviewed
      where status = 'completed'::public.job_status and needs_review
    ),
    'criticalCompletedWorkReviewCount', (
      select count(*)
      from reviewed
      where status = 'completed'::public.job_status and needs_review and is_critical
    ),
    'completedWorkReviewJobs', coalesce((
      select jsonb_agg(row_to_json(t))
      from (
        select id as job_id, job_number, customer_name, completed_at,
               assigned_technician,
               floor(
                 extract(epoch from (p_reference - effective_completed_at)) / 86400
               )::integer as days_since_completion,
               reason_no_active_invoice, reason_open_labor,
               reason_pending_expenses, reason_data_incomplete,
               is_critical
        from reviewed
        where status = 'completed'::public.job_status and needs_review
        order by is_critical desc, days_since_completion desc, created_at desc, id asc
        limit v_limit
      ) t
    ), '[]'::jsonb),

    -- STALLED_CANDIDATE_STATUSES with the inactivity threshold, from
    -- stalled-jobs-report.ts. floor() matches daysSinceActivity.
    'stalledCount', (
      select count(*)
      from reviewed
      where status in (
              'dispatched'::public.job_status,
              'arrived'::public.job_status,
              'in_progress'::public.job_status
            )
        and floor(
              extract(epoch from (p_reference - last_activity_at)) / 86400
            ) >= p_stalled_days
    ),
    'stalledJobs', coalesce((
      select jsonb_agg(row_to_json(t))
      from (
        select id as job_id, job_number, customer_name, status,
               assigned_technician, last_activity_at,
               greatest(
                 0,
                 floor(
                   extract(epoch from (p_reference - last_activity_at)) / 86400
                 )
               )::integer as days_since_activity
        from reviewed
        where status in (
                'dispatched'::public.job_status,
                'arrived'::public.job_status,
                'in_progress'::public.job_status
              )
          and floor(
                extract(epoch from (p_reference - last_activity_at)) / 86400
              ) >= p_stalled_days
        order by days_since_activity desc, created_at desc, id asc
        limit v_limit
      ) t
    ), '[]'::jsonb)
  )
  into v_result;

  return v_result;
end;
$function$;

-- ============================== PER-JOB COUNTERS, FOR THE DIFFERENTIAL ==============================
-- The aggregate above encodes the warning and review rules a second time. This
-- returns the raw counters per job so the verifier can run the SHIPPED
-- TypeScript rules over them and assert the aggregate agrees, job by job, over
-- the whole tenant. It exists to keep that duplication honest and is not called
-- by the application.
create or replace function public.get_company_job_completeness_counters(
  p_company_id uuid,
  p_offset integer,
  p_limit integer
)
returns table (
  job_id uuid,
  job_status text,
  active_invoice_count bigint,
  materials_missing_unit_cost bigint,
  pending_expense_count bigint,
  rejected_expense_count bigint,
  materials_expense_count bigint,
  expenses_missing_amount bigint,
  open_labor_entry_count bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select
    j.id,
    j.status::text,
    (select count(*) from public.invoices i
      where i.job_id = j.id and i.company_id = p_company_id
        and i.deleted_at is null and i.archived_at is null
        and i.status <> 'void'::public.invoice_status
        and i.status <> 'cancelled'::public.invoice_status),
    (select count(*) from public.job_materials m
      where m.job_id = j.id and m.company_id = p_company_id
        and m.unit_cost is null),
    (select count(*) from public.expenses e
      where e.job_id = j.id and e.company_id = p_company_id
        and e.deleted_at is null and e.archived_at is null
        and e.status in ('draft'::public.expense_status,
                         'submitted'::public.expense_status)),
    (select count(*) from public.expenses e
      where e.job_id = j.id and e.company_id = p_company_id
        and e.deleted_at is null and e.archived_at is null
        and e.status = 'rejected'::public.expense_status),
    (select count(*) from public.expenses e
      where e.job_id = j.id and e.company_id = p_company_id
        and e.deleted_at is null and e.archived_at is null
        and e.category = 'materials'::public.expense_category
        and e.status in ('approved'::public.expense_status,
                         'reimbursed'::public.expense_status)),
    (select count(*) from public.expenses e
      where e.job_id = j.id and e.company_id = p_company_id
        and e.deleted_at is null and e.archived_at is null
        and e.category <> 'materials'::public.expense_category
        and e.status in ('approved'::public.expense_status,
                         'reimbursed'::public.expense_status)
        and e.amount is null),
    (select count(*) from public.time_entries t
      where t.job_id = j.id and t.company_id = p_company_id
        and t.entry_type = 'job_labor'::public.time_entry_type
        and t.duration_minutes is null and t.ended_at is null)
  from public.jobs j
  where j.company_id = p_company_id
    and j.deleted_at is null
    and j.archived_at is null
    and public.is_active_company_member(p_company_id)
  order by j.id asc
  offset greatest(coalesce(p_offset, 0), 0)
  limit least(greatest(coalesce(p_limit, 1000), 1), 5000);
$function$;

revoke all on function public.get_company_job_completeness_summary(
  uuid, timestamptz, integer, integer
) from public;
revoke all on function public.get_company_job_completeness_summary(
  uuid, timestamptz, integer, integer
) from anon;
grant execute on function public.get_company_job_completeness_summary(
  uuid, timestamptz, integer, integer
) to authenticated, service_role;

revoke all on function public.get_company_job_completeness_counters(
  uuid, integer, integer
) from public;
revoke all on function public.get_company_job_completeness_counters(
  uuid, integer, integer
) from anon;
grant execute on function public.get_company_job_completeness_counters(
  uuid, integer, integer
) to authenticated, service_role;

commit;
