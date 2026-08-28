-- Migration 166: the dashboard's operations summary, counted in the database.
--
-- ============================== WHAT THIS IS FOR ==============================
-- The admin dashboard renders a Daily Operations panel: revenue collected and
-- outstanding, open jobs, stalled jobs, pending expenses, active technicians,
-- completed work awaiting invoicing, and two profitability warnings. Eight
-- sections, almost all of them a count or a sum.
--
-- It produced them by loading every job, every invoice, every estimate, every
-- expense, every job-labor entry and every job material the company has ever
-- had, and reducing those arrays through eleven report builders.
--
-- ============================== THE MEASUREMENT THAT SHAPED THIS ==============================
-- Measured on the scale-seeded scratch tenant (12,000 jobs / 10,000 invoices /
-- 6,000 estimates / 5,000 customers), because the shape of the fix depends
-- entirely on where the time goes and the obvious guess was wrong.
--
--   the six whole-book reads, issued concurrently, direct to the database
--       3,183 ms wall  (serial sum 4,953 ms — concurrency does help)
--
--   the same six as the dashboard experiences them, through the loaders
--       ~11,500 ms per branch
--
--   getDashboardData end to end                        15,799 ms
--   ...of which the fan-out                            15,453 ms
--   ...of which reduction AFTER the fan-out               346 ms
--
-- So the database is responsible for about a fifth of it. The rest is Node:
-- parsing six thousand joined rows into domain objects and then grouping and
-- reducing them through eleven builders. That is why this migration exists and
-- why a faster query alone would not have moved the number — the fix is to stop
-- materialising the objects at all.
--
-- ============================== EVERY PREDICATE, COPIED NOT INVENTED ==============================
-- The dashboard calls these reports with dateRange "all", so resolveReportDateBounds
-- returns null and NONE of the date scoping applies. That is what makes this
-- expressible without a single time-zone decision. Each figure below names the
-- TypeScript it reproduces:
--
--   collectedRevenue        sum(payment.amount) over listInvoicePayments, which
--                           is every payment row for the company — no lifecycle
--                           filter exists on that table.
--                           revenue-report.ts, scopedPayments with null bounds.
--
--   outstandingRevenue      sum(balanceDue) over active invoices with
--                           balanceDue > 0. "Active" is isActiveInvoice:
--                           status not in (void, cancelled) — shared/types/invoice.ts.
--                           The listInvoices scope adds deleted_at is null and
--                           archived_at is null.
--
--   openJobs                count of jobs whose status is not in
--                           CLOSED_JOB_STATUSES = (completed, cancelled).
--                           job-activity-report.ts. listJobs scope: not deleted,
--                           not archived.
--
--   pendingExpenses         count and sum over expenses with status 'submitted'.
--                           expense-report.ts summarizeExpensesByStatus.
--                           listExpenses scope: not deleted, not archived.
--
--   activeLaborEntries      count of job_labor time entries with ended_at null.
--   technicianCount         distinct technician_id over ALL job_labor entries —
--                           entriesInRange with null bounds is every entry, not
--                           only the open ones. That asymmetry is in the
--                           original and is reproduced deliberately.
--                           technician-labor-report.ts.
--
-- ============================== WHAT IS DELIBERATELY NOT HERE ==============================
-- Three sections depend on computeJobProfitability — 473 lines of business rule
-- covering revenue recognition, material COGS, expense classification and
-- labour. Re-expressing that in SQL would create a second definition of a
-- job's profitability, and the two would drift silently.
--
--   completedAwaitingInvoicing   needs snapshot.completeness.noActiveInvoices
--   completedWorkReview          needs the review-blocker rules
--   profitabilityWarnings        needs materialCogs vs collected revenue
--
-- Those stay in TypeScript and are made cheap a different way: by narrowing
-- what they are handed to a provably sufficient set. materialCogs derives ONLY
-- from inputs.materials, so a job with no material rows can never trigger the
-- warning; and isCompletedAwaitingInvoicing requires status = 'completed'. The
-- SQL below therefore also returns the candidate job ids for those paths, so
-- the caller can fetch a handful of jobs instead of all of them.
--
-- ============================== PRIVILEGES ==============================
-- SECURITY DEFINER with a pinned search_path, gated on active membership, and
-- created with an explicit revoke before the grant because PostgreSQL's default
-- is PUBLIC EXECUTE. scripts/verify-function-grants.mjs fails the build
-- otherwise, and scripts/verify-function-privileges-live.mjs calls it as anon.
--
-- Permission gating stays in the application. getDashboardData only calls this
-- when access.canViewOperationalReports is true; the function itself checks
-- membership, which is what stops it crossing tenants.

begin;

create or replace function public.get_company_operations_summary(
  p_company_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $function$
declare
  v_user_id uuid := auth.uid();
  v_revenue jsonb := '{}'::jsonb;
  v_jobs jsonb := '{}'::jsonb;
  v_expenses jsonb := '{}'::jsonb;
  v_labor jsonb := '{}'::jsonb;
  v_candidates jsonb := '{}'::jsonb;
begin
  if p_company_id is null then
    raise exception 'company_id_required';
  end if;

  -- A null actor gets zeros rather than a bypass. Every application caller is a
  -- signed-in user rendering their own dashboard.
  if v_user_id is null then
    return jsonb_build_object(
      'revenue', v_revenue,
      'jobs', v_jobs,
      'expenses', v_expenses,
      'labor', v_labor,
      'candidates', v_candidates
    );
  end if;

  if not public.is_active_company_member(p_company_id) then
    raise exception 'insufficient_permission';
  end if;

  -- ------------------------------------------------------------------
  -- Revenue. collected is the payment LEDGER; outstanding is invoice balances.
  -- ------------------------------------------------------------------
  select jsonb_build_object(
    'collectedRevenue', coalesce(round((
      select sum(p.amount)
      from public.invoice_payments p
      where p.company_id = p_company_id
    ), 2), 0),
    'outstandingRevenue', coalesce(round((
      select sum(i.balance_due)
      from public.invoices i
      where i.company_id = p_company_id
        and i.deleted_at is null
        and i.archived_at is null
        and i.status <> 'void'::public.invoice_status
        and i.status <> 'cancelled'::public.invoice_status
        and i.balance_due > 0
    ), 2), 0)
  )
  into v_revenue;

  -- ------------------------------------------------------------------
  -- Jobs. openJobs is "not closed", where closed is completed or cancelled.
  -- ------------------------------------------------------------------
  select jsonb_build_object(
    'openCount', count(*) filter (
      where j.status <> 'completed'::public.job_status
        and j.status <> 'cancelled'::public.job_status
    )
  )
  into v_jobs
  from public.jobs j
  where j.company_id = p_company_id
    and j.deleted_at is null
    and j.archived_at is null;

  -- ------------------------------------------------------------------
  -- Expenses. Only the submitted bucket reaches the dashboard.
  -- ------------------------------------------------------------------
  select jsonb_build_object(
    'submittedCount', count(*) filter (
      where e.status = 'submitted'::public.expense_status
    ),
    'submittedTotal', coalesce(round(sum(e.amount) filter (
      where e.status = 'submitted'::public.expense_status
    ), 2), 0)
  )
  into v_expenses
  from public.expenses e
  where e.company_id = p_company_id
    and e.deleted_at is null
    and e.archived_at is null;

  -- ------------------------------------------------------------------
  -- Labour. activeLaborEntries counts OPEN clocks; technicianCount counts
  -- distinct technicians across ALL job-labour entries, open or closed. The
  -- two scopes genuinely differ in the TypeScript and are kept apart here.
  -- ------------------------------------------------------------------
  select jsonb_build_object(
    'activeLaborEntries', count(*) filter (where t.ended_at is null),
    'technicianCount', count(distinct t.technician_id)
  )
  into v_labor
  from public.time_entries t
  where t.company_id = p_company_id
    and t.entry_type = 'job_labor'::public.time_entry_type;

  -- ------------------------------------------------------------------
  -- Candidate ids for the sections that must stay in TypeScript.
  --
  -- These are NECESSARY conditions taken straight from the shipped predicates,
  -- not a reimplementation of them:
  --
  --   completed        isCompletedAwaitingInvoicing requires status='completed'
  --   withMaterials    jobMaterialCostExceedsCollectedRevenue requires
  --                    materialCogs > 0, and materialCogs sums ONLY
  --                    inputs.materials — so a job with no material rows
  --                    cannot qualify
  --   stalledCandidate STALLED_CANDIDATE_STATUSES
  --
  -- The caller runs the real rule over these; the SQL only decides who is
  -- worth asking about.
  -- ------------------------------------------------------------------
  select jsonb_build_object(
    'completedJobCount', count(*) filter (
      where j.status = 'completed'::public.job_status
    ),
    'stalledCandidateCount', count(*) filter (
      where j.status in (
        'dispatched'::public.job_status,
        'arrived'::public.job_status,
        'in_progress'::public.job_status
      )
    ),
    'jobsWithMaterialsCount', (
      select count(distinct m.job_id)
      from public.job_materials m
      where m.company_id = p_company_id
    )
  )
  into v_candidates
  from public.jobs j
  where j.company_id = p_company_id
    and j.deleted_at is null
    and j.archived_at is null;

  return jsonb_build_object(
    'revenue', v_revenue,
    'jobs', v_jobs,
    'expenses', v_expenses,
    'labor', v_labor,
    'candidates', v_candidates
  );
end;
$function$;

revoke all on function public.get_company_operations_summary(uuid) from public;
revoke all on function public.get_company_operations_summary(uuid) from anon;
grant execute on function public.get_company_operations_summary(uuid)
  to authenticated, service_role;

commit;
