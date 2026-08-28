-- Migration 172: the data-integrity scan, counted in the database.
--
-- ============================== THE DEFECT THIS CLOSES ==============================
-- getCompanyOperationalInconsistenciesReport loaded listJobs and listInvoices --
-- every job and every invoice the company has, with their joins -- plus every
-- dispatch assignment and every job-labor entry, and ran nine structural rules
-- over them in Node.
--
-- Two problems, and the first one is the serious one.
--
-- IT READ AN EIGHTH OF THE BOOK. PostgREST caps each of those reads at 1,000
-- rows. This is an INTEGRITY SCAN: a scan that reads 1,000 of 12,000 jobs and
-- reports nothing wrong with the other 11,000 is worse than no scan, because it
-- produces a clean bill of health rather than an absence of one. And because
-- listJobs orders scheduled_at desc, the rows it dropped were the OLDEST --
-- which is exactly where unresolved integrity problems accumulate.
--
-- IT WAS THE DASHBOARD'S LARGEST SINGLE COST. Measured by instrumenting the
-- dashboard's own fan-out with ALTAIR_DASHBOARD_AGGREGATES=on, three
-- consecutive renders of the scale-seeded tenant:
--
--   officeReview   7018  6878  6901      both of these await this report
--   opsSummary     6595  6486  6505
--   leads          1786  1681  1479
--   customers      1711  1571  1608
--   ...every other loader below 1200
--
-- getDailyOperationsSummary and getCompanyOfficeReviewQueueReport both await
-- it; React cache() collapses them to one call, and that one call was about
-- 6.5 s of a 9.1 s page.
--
-- ============================== WHAT THIS RETURNS, AND WHY ==============================
-- Counts for the whole tenant, plus a bounded page of the offending JOBS
-- carrying the facts the shipped rules need.
--
-- It deliberately does NOT return finished entries. The caller reconstructs a
-- minimal job / assignment / labour / invoice input for each returned job and
-- runs detectOperationalInconsistencies -- the SHIPPED detector -- over it. So
-- every detail string, every severity, every recovery-guidance line and the
-- final sort come from the one implementation that already exists. The only
-- thing duplicated here is the COUNTING, and verify-integrity-scan-live holds
-- that to a full-data run of the same detector.
--
-- Paging by JOB rather than by entry is not a simplification. Every consumer
-- groups by job: getDailyOperationsSummary builds a Set of job ids and counts
-- distinct critical jobs, and buildOfficeReviewQueueReport calls
-- groupInconsistenciesByJobId. Nothing reads the flat entry order.
--
-- ============================== THE RULES, COPIED NOT INVENTED ==============================
-- From detectOperationalInconsistencies in shared/types/operational-inconsistencies.ts.
-- TERMINAL = status in (completed, cancelled).
--
--   r1  completed_missing_completed_at
--         status = 'completed' and completed_at is null
--   r2  completed_at_status_mismatch
--         completed_at is not null and not TERMINAL
--   r3  stale_active_dispatch_on_terminal_job
--         TERMINAL and an active assignment exists
--   r4  job_assigned_without_active_dispatch
--         not TERMINAL and assigned_technician_id set and NO active assignment
--   r5  active_dispatch_without_job_assignment
--         not TERMINAL and assigned_technician_id null and an active assignment exists
--   r6  dispatch_technician_mismatch
--         active assignment exists and assigned_technician_id set and they differ
--   r8  open_labor_on_cancelled_job
--         status = 'cancelled' and an open (ended_at null) labour entry exists
--   r9  invalid_assigned_technician
--         assigned_technician_id set and not an ACTIVE company membership
--   r10 invoice_balance_mismatch, one entry per invoice
--         live invoice on a live job, status in (sent, partially_paid, paid,
--         overdue), and amount_paid + balance_due <> total after rounding
--
-- ============================== THE RULE THAT CANNOT FIRE ==============================
-- The detector has a tenth branch: `activeAssignments.length > 1`, reported
-- under the same kind as r3 with a "N concurrent active dispatch assignments"
-- detail. It is unreachable. dispatch_assignments carries
--
--   create unique index dispatch_assignments_one_active_per_job_idx
--     on public.dispatch_assignments (job_id) where status = 'active'
--
-- so a second active assignment on a job is rejected by the database. This was
-- found by seeding one and watching the insert fail with 23505.
--
-- Two consequences worth stating. The branch is a guard against data loaded
-- around the index rather than a live case, so it is not reproduced here and no
-- fixture can exercise it. And `activeAssignments[0]` is never ambiguous --
-- there is at most one -- which is why listDispatchAssignmentsForCompany having
-- no ORDER BY does not make r6 nondeterministic.
--
-- ============================== ORDERING ==============================
-- Jobs are ordered by: critical first, then job number, then id.
--
-- The shipped sort is severity, then jobNumber.localeCompare(numeric: true).
-- That compares embedded digit runs numerically, so "JOB-9" sorts before
-- "JOB-10" where plain text ordering would not. The key below reproduces it for
-- the shape this schema produces -- a text prefix and one digit run -- by
-- sorting on (prefix, first-number, whole string). job_id is the final key, so
-- two jobs sharing a number cannot swap between calls; the shipped comparator
-- has no such tiebreaker and one is added there to match.
--
-- ============================== PRIVILEGES ==============================
-- Same gate and same proof as 168, 169 and 170: canViewOperationalReports is
-- manageBilling or dispatchJobs or manageCompany, and COMPANY_ROLE_PERMISSIONS
-- makes manageCompany a strict subset of manageBilling, so the two-term form
-- admits exactly the same callers.

begin;

create or replace function public.get_company_operational_inconsistencies(
  p_company_id uuid,
  p_limit integer default 20,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $function$
declare
  v_user_id uuid := auth.uid();
  v_empty jsonb := jsonb_build_object('authorized', false);
  v_counts jsonb;
  v_jobs jsonb;
  v_total bigint;
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

  if not (
    public.can_manage_billing(p_company_id) or public.can_dispatch_jobs(p_company_id)
  ) then
    return v_empty;
  end if;

  -- ------------------------------------------------------------------
  -- Per-job facts, then per-job rule flags. One pass over the live jobs.
  -- ------------------------------------------------------------------
  with live_jobs as (
    select
      j.id,
      j.job_number,
      j.status,
      j.completed_at,
      j.assigned_technician_id,
      j.customer_id
    from public.jobs j
    where j.company_id = p_company_id
      and j.deleted_at is null
      and j.archived_at is null
  ),
  active_assignment as (
    -- At most one per job; the unique index guarantees it.
    select d.job_id, d.id as assignment_id, d.technician_id
    from public.dispatch_assignments d
    where d.company_id = p_company_id
      and d.status = 'active'
  ),
  open_labor as (
    select t.job_id, count(*) as open_count
    from public.time_entries t
    where t.company_id = p_company_id
      and t.job_id is not null
      and t.ended_at is null
    group by t.job_id
  ),
  active_members as (
    select m.user_id
    from public.company_memberships m
    where m.company_id = p_company_id
      and m.status = 'active'
      and m.user_id is not null
  ),
  invoice_flags as (
    select i.job_id, count(*) as mismatch_count
    from public.invoices i
    join live_jobs lj on lj.id = i.job_id
    where i.company_id = p_company_id
      and i.deleted_at is null
      and i.archived_at is null
      and i.status in ('sent','partially_paid','paid','overdue')
      and round(i.amount_paid + i.balance_due, 2) <> round(i.total, 2)
    group by i.job_id
  ),
  flagged as (
    select
      lj.id,
      lj.job_number,
      (lj.status = 'completed' and lj.completed_at is null) as r1,
      (lj.completed_at is not null
        and lj.status not in ('completed','cancelled')) as r2,
      (lj.status in ('completed','cancelled') and aa.job_id is not null) as r3,
      (lj.status not in ('completed','cancelled')
        and lj.assigned_technician_id is not null
        and aa.job_id is null) as r4,
      (lj.status not in ('completed','cancelled')
        and lj.assigned_technician_id is null
        and aa.job_id is not null) as r5,
      (aa.job_id is not null
        and lj.assigned_technician_id is not null
        and aa.technician_id <> lj.assigned_technician_id) as r6,
      (lj.status = 'cancelled' and coalesce(ol.open_count, 0) > 0) as r8,
      (lj.assigned_technician_id is not null
        and not exists (
          select 1 from active_members am
          where am.user_id = lj.assigned_technician_id
        )) as r9,
      coalesce(inv.mismatch_count, 0) as invoice_mismatches
    from live_jobs lj
    left join active_assignment aa on aa.job_id = lj.id
    left join open_labor ol on ol.job_id = lj.id
    left join invoice_flags inv on inv.job_id = lj.id
  ),
  scored as (
    select
      f.*,
      -- Entry count: one per firing rule, plus one per mismatched invoice.
      (f.r1::int + f.r2::int + f.r3::int + f.r4::int + f.r5::int
        + f.r6::int + f.r8::int + f.r9::int + f.invoice_mismatches) as entry_count,
      -- Kind count: every invoice mismatch on a job shares ONE kind, so it
      -- contributes at most one. blockerCount in the office queue is
      -- kinds.length, and readiness is derived from it.
      (f.r1::int + f.r2::int + f.r3::int + f.r4::int + f.r5::int
        + f.r6::int + f.r8::int + f.r9::int
        + least(f.invoice_mismatches, 1)) as kind_count,
      -- critical kinds: r3, r6, invoice_balance_mismatch
      (f.r3 or f.r6 or f.invoice_mismatches > 0) as has_critical
    from flagged f
  )
  select
    jsonb_build_object(
      'total', coalesce(sum(entry_count), 0),
      'critical', coalesce(sum(
        (r3::int + r6::int + invoice_mismatches)), 0),
      'warning', coalesce(sum(
        (r1::int + r2::int + r4::int + r5::int + r8::int + r9::int)), 0),
      'byKind', jsonb_strip_nulls(jsonb_build_object(
        'completed_missing_completed_at', nullif(coalesce(sum(r1::int), 0), 0),
        'completed_at_status_mismatch', nullif(coalesce(sum(r2::int), 0), 0),
        'stale_active_dispatch_on_terminal_job', nullif(coalesce(sum(r3::int), 0), 0),
        'job_assigned_without_active_dispatch', nullif(coalesce(sum(r4::int), 0), 0),
        'active_dispatch_without_job_assignment', nullif(coalesce(sum(r5::int), 0), 0),
        'dispatch_technician_mismatch', nullif(coalesce(sum(r6::int), 0), 0),
        'open_labor_on_cancelled_job', nullif(coalesce(sum(r8::int), 0), 0),
        'invalid_assigned_technician', nullif(coalesce(sum(r9::int), 0), 0),
        'invoice_balance_mismatch', nullif(coalesce(sum(invoice_mismatches), 0), 0)
      )),
      'jobCount', count(*) filter (where entry_count > 0),
      'criticalJobCount', count(*) filter (where has_critical),
      'multiKindJobCount', count(*) filter (where kind_count >= 2)
    ),
    coalesce(sum(entry_count), 0)
  into v_counts, v_total
  from scored;

  -- ------------------------------------------------------------------
  -- The bounded page of offending jobs, with the facts the detector needs.
  -- ------------------------------------------------------------------
  with live_jobs as (
    select
      j.id, j.job_number, j.status, j.completed_at,
      j.assigned_technician_id, j.customer_id
    from public.jobs j
    where j.company_id = p_company_id
      and j.deleted_at is null
      and j.archived_at is null
  ),
  active_assignment as (
    select d.job_id, d.id as assignment_id, d.technician_id
    from public.dispatch_assignments d
    where d.company_id = p_company_id
      and d.status = 'active'
  ),
  open_labor as (
    select t.job_id, count(*) as open_count
    from public.time_entries t
    where t.company_id = p_company_id
      and t.job_id is not null
      and t.ended_at is null
    group by t.job_id
  ),
  active_members as (
    select m.user_id
    from public.company_memberships m
    where m.company_id = p_company_id
      and m.status = 'active'
      and m.user_id is not null
  ),
  bad_invoices as (
    select
      i.job_id,
      jsonb_agg(
        jsonb_build_object(
          'id', i.id,
          'invoiceNumber', i.invoice_number,
          'status', i.status,
          'total', i.total,
          'amountPaid', i.amount_paid,
          'balanceDue', i.balance_due
        ) order by i.invoice_number, i.id
      ) as invoices,
      count(*) as mismatch_count
    from public.invoices i
    join live_jobs lj on lj.id = i.job_id
    where i.company_id = p_company_id
      and i.deleted_at is null
      and i.archived_at is null
      and i.status in ('sent','partially_paid','paid','overdue')
      and round(i.amount_paid + i.balance_due, 2) <> round(i.total, 2)
    group by i.job_id
  ),
  candidates as (
    select
      lj.id,
      lj.job_number,
      lj.status,
      lj.completed_at,
      lj.assigned_technician_id,
      lj.customer_id,
      aa.assignment_id,
      aa.technician_id as active_technician_id,
      coalesce(ol.open_count, 0) as open_labor_count,
      exists (
        select 1 from active_members am
        where am.user_id = lj.assigned_technician_id
      ) as assigned_is_active_member,
      bi.invoices as bad_invoices,
      coalesce(bi.mismatch_count, 0) as invoice_mismatches,
      (
        (lj.status = 'completed' and lj.completed_at is null)::int
        + (lj.completed_at is not null
            and lj.status not in ('completed','cancelled'))::int
        + (lj.status in ('completed','cancelled') and aa.job_id is not null)::int
        + (lj.status not in ('completed','cancelled')
            and lj.assigned_technician_id is not null
            and aa.job_id is null)::int
        + (lj.status not in ('completed','cancelled')
            and lj.assigned_technician_id is null
            and aa.job_id is not null)::int
        + (aa.job_id is not null
            and lj.assigned_technician_id is not null
            and aa.technician_id <> lj.assigned_technician_id)::int
        + (lj.status = 'cancelled' and coalesce(ol.open_count, 0) > 0)::int
        + (lj.assigned_technician_id is not null
            and not exists (
              select 1 from active_members am
              where am.user_id = lj.assigned_technician_id
            ))::int
        + coalesce(bi.mismatch_count, 0)
      ) as entry_count,
      (
        (lj.status in ('completed','cancelled') and aa.job_id is not null)
        or (aa.job_id is not null
            and lj.assigned_technician_id is not null
            and aa.technician_id <> lj.assigned_technician_id)
        or coalesce(bi.mismatch_count, 0) > 0
      ) as has_critical
    from live_jobs lj
    left join active_assignment aa on aa.job_id = lj.id
    left join open_labor ol on ol.job_id = lj.id
    left join bad_invoices bi on bi.job_id = lj.id
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'jobId', c.id,
      'jobNumber', c.job_number,
      'customerName', coalesce(cu.name, 'Unknown customer'),
      'jobStatus', c.status,
      'completedAt', c.completed_at,
      'assignedTechnicianId', c.assigned_technician_id,
      'assignedIsActiveMember', c.assigned_is_active_member,
      'activeAssignmentId', c.assignment_id,
      'activeAssignmentTechnicianId', c.active_technician_id,
      'openLaborCount', c.open_labor_count,
      'badInvoices', coalesce(c.bad_invoices, '[]'::jsonb)
    ) order by c.ord
  ), '[]'::jsonb)
  into v_jobs
  from (
    select
      c.*,
      row_number() over (
        order by
          c.has_critical desc,
          regexp_replace(c.job_number, '[0-9]', '', 'g') asc,
          coalesce((regexp_match(c.job_number, '([0-9]+)'))[1]::bigint, 0) asc,
          c.job_number asc,
          c.id asc
      ) as ord
    from candidates c
    where c.entry_count > 0
    order by
      c.has_critical desc,
      regexp_replace(c.job_number, '[0-9]', '', 'g') asc,
      coalesce((regexp_match(c.job_number, '([0-9]+)'))[1]::bigint, 0) asc,
      c.job_number asc,
      c.id asc
    offset greatest(0, coalesce(p_offset, 0))
    limit greatest(0, least(coalesce(p_limit, 20), 200))
  ) c
  left join public.customers cu on cu.id = c.customer_id;

  return jsonb_build_object(
    'authorized', true,
    'counts', v_counts,
    'jobs', v_jobs,
    'hasMore',
      (coalesce(p_offset, 0) + jsonb_array_length(v_jobs))
        < (v_counts->>'jobCount')::bigint
  );
end;
$function$;

revoke all on function public.get_company_operational_inconsistencies(uuid, integer, integer)
  from public;
revoke all on function public.get_company_operational_inconsistencies(uuid, integer, integer)
  from anon;
grant execute on function public.get_company_operational_inconsistencies(uuid, integer, integer)
  to authenticated, service_role;

commit;
