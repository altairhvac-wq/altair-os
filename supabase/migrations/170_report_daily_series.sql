-- Migration 170: the reports charts and sparklines, as per-day totals.
--
-- ============================== THE DEFECT THIS CLOSES ==============================
-- getCompanyReportChartSeries loaded every invoice, every payment, every
-- expense, every job and every job-labor entry the company has ever had, and
-- reduced them into four charts of at most a few dozen points. Every one of
-- those reads is capped at 1,000 rows by PostgREST, so on the scale-seeded
-- tenant the revenue chart summed $2,310,475 where the truth is $4,722,389 --
-- and said nothing.
--
-- The KPI and Period Ledger sparklines have the same problem from the same
-- rows: attachReportPageSparklines re-buckets payments, estimates and invoices
-- that were already truncated on the way in.
--
-- ============================== WHY PER-DAY AND NOT PER-BUCKET ==============================
-- The obvious aggregate would return the finished chart: one row per bucket,
-- bucketed in SQL. That would move resolveReportChartBucketSize,
-- resolveReportChartBucketStart and buildReportChartBuckets into the database --
-- three bucketing rules, including a week-start convention and a label format,
-- restated in a second language where they could drift from the axis the page
-- draws.
--
-- So this returns one row per DAY instead, and the shipped bucketing code runs
-- over that unchanged. A day is the finest granularity any of these series
-- uses, so no information is lost, and the row count is bounded by the length
-- of the axis -- at most 366 rows for a year, against 7,857 payments -- rather
-- than by the size of the tenant.
--
-- That leaves exactly one definition of what a week is, and it is the
-- TypeScript one.
--
-- ============================== THE DATE RULE ==============================
-- As in migration 169: the shipped comparison is toReportDateOnly(value), which
-- splits PostgREST's rendering at the "T" and therefore compares UTC calendar
-- dates. Every timestamp here is converted with `at time zone 'UTC'` before the
-- cast, because that is what reproduces the current behaviour. Date columns
-- (payment_date, issue_date, due_date, purchase_date) are used as they are.
--
-- ============================== THE SERIES, AND WHAT EACH FEEDS ==============================
--   paymentsByDay        payment_date -> sum, count
--                        revenue chart "collected"; the revenue and net-income
--                        ledger sparklines; the average-ticket sparkline, which
--                        is why the COUNT is carried and not just the sum.
--   invoicedByDay        issue_date -> sum(total), active invoices
--                        revenue chart "invoiced".
--   openArByDay          issue_date -> sum(balance_due), active, balance > 0
--                        the outstanding sparkline.
--   overdueArByDay       coalesce(due_date, issue_date) -> sum(balance_due),
--                        active, status 'overdue', balance > 0
--                        the overdue sparkline. buildOverdueSparkline uses
--                        `invoice.dueDate || invoice.issueDate`, and dueDate is
--                        NOT NULL in this schema, so the fallback is
--                        unreachable -- it is reproduced anyway rather than
--                        assumed away.
--   expensesByDay        report date -> sum, split submitted vs
--                        approved/reimbursed
--                        the expenses chart; the net-income ledger sparkline.
--   jobsByDay            scheduled date -> count; completion date -> count
--                        the jobs chart. Scheduled and completed are separate
--                        columns on one row because a job contributes to both.
--   laborByDay           started_at date -> sum(minutes)
--                        the labour chart. Minutes, not hours: integers sum
--                        exactly, and the hours conversion happens once in
--                        TypeScript. Same reasoning as the technician labour
--                        totals in migration 169.
--   estimatesByDay       sent date -> count; approved date -> count
--                        the close-rate sparkline.
--
-- ============================== THE THREE LIMITATION FLAGS ==============================
-- The charts add a limitation line when a fallback was used. Those flags were
-- set inside the loops over the rows, so they have to be computed here too:
--
--   expenseCreatedDateFallback     any expense in range with no purchase_date
--   jobScheduledCompletionFallback any completed job in range with no
--                                  completed_at
--   openLaborExcluded              any job_labor entry in range with neither a
--                                  duration nor an ended_at
--
-- The SENTENCES stay in TypeScript. Only the booleans move.
--
-- ============================== PRIVILEGES ==============================
-- Same gate and same proof as migrations 168 and 169: canViewOperationalReports
-- is manageBilling or dispatchJobs or manageCompany, and manageCompany is a
-- strict subset of manageBilling under COMPANY_ROLE_PERMISSIONS.

begin;

create or replace function public.get_company_report_daily_series(
  p_company_id uuid,
  p_start_date date,
  p_end_date date
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
  v_payments jsonb;
  v_invoiced jsonb;
  v_open_ar jsonb;
  v_overdue_ar jsonb;
  v_expenses jsonb;
  v_jobs jsonb;
  v_labor jsonb;
  v_estimates jsonb;
  v_flags jsonb;
begin
  if p_company_id is null then
    raise exception 'company_id_required';
  end if;

  if p_start_date is null or p_end_date is null then
    raise exception 'date_bounds_required';
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

  -- ---------------- payments: sum and count per day ----------------
  select coalesce(jsonb_agg(
    jsonb_build_object('d', x.d, 'amount', x.amount, 'count', x.count) order by x.d
  ), '[]'::jsonb)
  into v_payments
  from (
    select p.payment_date as d, sum(p.amount) as amount, count(*) as count
    from public.invoice_payments p
    where p.company_id = p_company_id
      and p.payment_date between p_start_date and p_end_date
    group by p.payment_date
  ) x;

  -- ---------------- invoiced totals per issue date ----------------
  select coalesce(jsonb_agg(
    jsonb_build_object('d', x.d, 'amount', x.amount) order by x.d
  ), '[]'::jsonb)
  into v_invoiced
  from (
    select i.issue_date as d, sum(i.total) as amount
    from public.invoices i
    where i.company_id = p_company_id
      and i.deleted_at is null
      and i.archived_at is null
      and i.status not in ('void','cancelled')
      and i.issue_date between p_start_date and p_end_date
    group by i.issue_date
  ) x;

  -- ---------------- open AR per issue date ----------------
  select coalesce(jsonb_agg(
    jsonb_build_object('d', x.d, 'amount', x.amount) order by x.d
  ), '[]'::jsonb)
  into v_open_ar
  from (
    select i.issue_date as d, sum(i.balance_due) as amount
    from public.invoices i
    where i.company_id = p_company_id
      and i.deleted_at is null
      and i.archived_at is null
      and i.status not in ('void','cancelled')
      and i.balance_due > 0
      and i.issue_date between p_start_date and p_end_date
    group by i.issue_date
  ) x;

  -- ---------------- overdue AR per due date ----------------
  select coalesce(jsonb_agg(
    jsonb_build_object('d', x.d, 'amount', x.amount) order by x.d
  ), '[]'::jsonb)
  into v_overdue_ar
  from (
    select coalesce(i.due_date, i.issue_date) as d, sum(i.balance_due) as amount
    from public.invoices i
    where i.company_id = p_company_id
      and i.deleted_at is null
      and i.archived_at is null
      and i.status = 'overdue'
      and i.balance_due > 0
      and coalesce(i.due_date, i.issue_date) between p_start_date and p_end_date
    group by coalesce(i.due_date, i.issue_date)
  ) x;

  -- ---------------- expenses per report date, both series ----------------
  select coalesce(jsonb_agg(
    jsonb_build_object('d', x.d, 'submitted', x.submitted, 'approved', x.approved)
    order by x.d
  ), '[]'::jsonb)
  into v_expenses
  from (
    select
      coalesce(e.purchase_date, (e.created_at at time zone 'UTC')::date) as d,
      coalesce(sum(coalesce(e.amount, 0)) filter (where e.status = 'submitted'), 0)
        as submitted,
      coalesce(sum(coalesce(e.amount, 0)) filter (
        where e.status in ('approved','reimbursed')), 0) as approved
    from public.expenses e
    where e.company_id = p_company_id
      and e.deleted_at is null
      and e.archived_at is null
      and coalesce(e.purchase_date, (e.created_at at time zone 'UTC')::date)
          between p_start_date and p_end_date
    group by 1
  ) x;

  -- ---------------- jobs: scheduled and completed, per day ----------------
  --
  -- A job can contribute to both series on different days, so the two counts
  -- are computed independently and merged on the date rather than grouped
  -- together.
  with live_jobs as (
    select j.status, j.scheduled_at, j.completed_at
    from public.jobs j
    where j.company_id = p_company_id
      and j.deleted_at is null
      and j.archived_at is null
  ),
  scheduled as (
    select (j.scheduled_at at time zone 'UTC')::date as d, count(*) as n
    from live_jobs j
    where (j.scheduled_at at time zone 'UTC')::date between p_start_date and p_end_date
    group by 1
  ),
  completed as (
    select
      case
        when j.completed_at is not null then (j.completed_at at time zone 'UTC')::date
        else (j.scheduled_at at time zone 'UTC')::date
      end as d,
      count(*) as n
    from live_jobs j
    where j.status = 'completed'
      and case
            when j.completed_at is not null
              then (j.completed_at at time zone 'UTC')::date
            else (j.scheduled_at at time zone 'UTC')::date
          end between p_start_date and p_end_date
    group by 1
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'd', k.d,
      'scheduled', coalesce(s.n, 0),
      'completed', coalesce(c.n, 0)
    ) order by k.d
  ), '[]'::jsonb)
  into v_jobs
  from (select d from scheduled union select d from completed) k
  left join scheduled s on s.d = k.d
  left join completed c on c.d = k.d;

  -- ---------------- closed labour minutes per start date ----------------
  select coalesce(jsonb_agg(
    jsonb_build_object('d', x.d, 'minutes', x.minutes) order by x.d
  ), '[]'::jsonb)
  into v_labor
  from (
    select
      (t.started_at at time zone 'UTC')::date as d,
      sum(
        case
          when t.duration_minutes is not null
            then greatest(0, round(t.duration_minutes)::bigint)
          else greatest(
            0,
            round(extract(epoch from (t.ended_at - t.started_at)) / 60.0)::bigint
          )
        end
      ) as minutes
    from public.time_entries t
    where t.company_id = p_company_id
      and t.entry_type = 'job_labor'
      and (t.duration_minutes is not null or t.ended_at is not null)
      and (t.started_at at time zone 'UTC')::date between p_start_date and p_end_date
    group by 1
  ) x;

  -- ---------------- estimates sent / approved per day ----------------
  with lifecycle as (
    select
      a.estimate_id,
      min(a.created_at) filter (where a.event_type = 'estimate_sent') as sent_at,
      min(a.created_at) filter (where a.event_type = 'estimate_approved') as approved_at
    from public.estimate_activities a
    where a.company_id = p_company_id
      and a.event_type in ('estimate_sent', 'estimate_approved')
    group by a.estimate_id
  ),
  resolved as (
    select
      case
        when e.status in ('cancelled','draft') then null
        when lc.sent_at is not null then (lc.sent_at at time zone 'UTC')::date
        when e.status in ('sent','approved','declined','converted')
          then (e.created_at at time zone 'UTC')::date
        else null
      end as sent_date,
      case
        when e.status not in ('approved','converted') then null
        when lc.approved_at is not null then (lc.approved_at at time zone 'UTC')::date
        when lc.sent_at is not null then (lc.sent_at at time zone 'UTC')::date
        else (e.created_at at time zone 'UTC')::date
      end as approved_date
    from public.estimates e
    left join lifecycle lc on lc.estimate_id = e.id
    where e.company_id = p_company_id
      and e.deleted_at is null
      and e.archived_at is null
  ),
  sent as (
    select sent_date as d, count(*) as n from resolved
    where sent_date between p_start_date and p_end_date group by 1
  ),
  approved as (
    select approved_date as d, count(*) as n from resolved
    where approved_date between p_start_date and p_end_date group by 1
  )
  select coalesce(jsonb_agg(
    jsonb_build_object('d', k.d, 'sent', coalesce(s.n, 0), 'approved', coalesce(ap.n, 0))
    order by k.d
  ), '[]'::jsonb)
  into v_estimates
  from (select d from sent union select d from approved) k
  left join sent s on s.d = k.d
  left join approved ap on ap.d = k.d;

  -- ---------------- the three limitation flags ----------------
  select jsonb_build_object(
    'expenseCreatedDateFallback', coalesce((
      select bool_or(e.purchase_date is null)
      from public.expenses e
      where e.company_id = p_company_id
        and e.deleted_at is null
        and e.archived_at is null
    ), false),
    'jobScheduledCompletionFallback', coalesce((
      select bool_or(j.completed_at is null)
      from public.jobs j
      where j.company_id = p_company_id
        and j.deleted_at is null
        and j.archived_at is null
        and j.status = 'completed'
        and (j.scheduled_at at time zone 'UTC')::date between p_start_date and p_end_date
    ), false),
    'openLaborExcluded', coalesce((
      select bool_or(t.duration_minutes is null and t.ended_at is null)
      from public.time_entries t
      where t.company_id = p_company_id
        and t.entry_type = 'job_labor'
        and (t.started_at at time zone 'UTC')::date between p_start_date and p_end_date
    ), false)
  )
  into v_flags;

  return jsonb_build_object(
    'authorized', true,
    'payments', v_payments,
    'invoiced', v_invoiced,
    'openAr', v_open_ar,
    'overdueAr', v_overdue_ar,
    'expenses', v_expenses,
    'jobs', v_jobs,
    'labor', v_labor,
    'estimates', v_estimates,
    'flags', v_flags
  );
end;
$function$;

revoke all on function public.get_company_report_daily_series(uuid, date, date)
  from public;
revoke all on function public.get_company_report_daily_series(uuid, date, date)
  from anon;
grant execute on function public.get_company_report_daily_series(uuid, date, date)
  to authenticated, service_role;

commit;
