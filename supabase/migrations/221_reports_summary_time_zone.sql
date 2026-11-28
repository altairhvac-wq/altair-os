-- Migration 221: the Reports page counts a day in the company's time zone.
--
-- ============================== THE DEFECT THIS CLOSES ==============================
-- get_company_reports_summary (migration 169) turns every timestamp into a
-- calendar day in UTC. It did that on purpose: the page it replaced compared
-- UTC dates, and 169's job was to count every row, not to change what a day
-- was.
--
-- For a company in the United States the evening is already "tomorrow" in
-- UTC. A job finished at 9:30 pm on October 31 in Denver is 03:30 on
-- November 1 in UTC, so the Reports page counted it on November 1: in the
-- wrong day of a daily chart, in the wrong month of a monthly one, and
-- outside a period that ended on the 31st. The same went for an estimate
-- sent, an estimate approved, an invoice paid, an expense with no purchase
-- date, a labour entry started and a lead created in the evening.
--
-- Migration 220 gave the per-day series (the charts) a time zone argument
-- and the dashboard started passing it. The Reports page was left on UTC
-- then, because its headline figures come from THIS function and changing
-- only the charts would have made the page disagree with itself. This is
-- the other half.
--
-- ============================== WHAT CHANGES ==============================
-- The function gains a ninth argument, p_time_zone, defaulting to 'UTC'.
-- The body is migration 169's, unchanged except that every
-- `at time zone 'UTC'` (16 of them) is now `at time zone v_tz`:
--
--   invoices     paid_at                         (invoices paid in the period)
--   estimates    first "sent" and "approved" activity, else created_at
--   jobs         completed_at, else scheduled_at (completed in the period,
--                per job type and per technician)
--   expenses     created_at, only when there is no purchase date
--   time entries started_at                      (labour per technician)
--   leads        created_at                      (pipeline and per source)
--
-- Nothing else moves. Payment dates, invoice issue and due dates and expense
-- purchase dates are stored as plain dates, were never converted, and are
-- compared exactly as before. Outstanding and overdue balances, aging,
-- customer health and the lifetime total are not date scoped by a timestamp
-- at all.
--
--   - Called with eight arguments (every deployment that predates this
--     change) it behaves exactly as before.
--   - The Reports page passes the company's resolved zone, and passes the
--     same zone to get_company_report_daily_series, so the figures, the
--     charts and the sparklines count the same days.
--
-- p_today (the aging reference date) and the period bounds are still passed
-- in. The application now works them out in the same zone it passes here.
--
-- A zone name this server does not know does not fail the report: the
-- function carries on in UTC, which is what it did before.
--
-- ============================== ONE FUNCTION, NOT TWO ==============================
-- The old eight-argument function is dropped rather than left beside the new
-- one, so an eight-argument call cannot be ambiguous. Both statements are in
-- this one transaction: there is no moment without the function.
--
-- ============================== BEFORE THIS HAS RUN ==============================
-- The application's nine-argument call is answered "no such function"
-- (PGRST202). It then makes the eight-argument call, and the three-argument
-- series call, with the dates it used before, and shows what it showed
-- before. Both halves of the page fall back together.
--
-- ============================== PRIVILEGES ==============================
-- Unchanged from migration 169: security definer with a pinned search_path,
-- the same membership check and the same reports permission check, execute
-- revoked from public and anon and granted to authenticated and
-- service_role.

begin;

drop function if exists public.get_company_reports_summary(
  uuid, date, date, date, date, date, timestamptz, integer
);

create or replace function public.get_company_reports_summary(
  p_company_id uuid,
  p_start_date date,
  p_end_date date,
  p_prev_start_date date,
  p_prev_end_date date,
  p_today date,
  p_follow_up_cutoff timestamptz,
  p_limit integer default 5,
  p_time_zone text default 'UTC'
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
  -- The zone every timestamp below is turned into a calendar day in.
  v_tz text := 'UTC';
  v_payments jsonb;
  v_payment_methods jsonb;
  v_invoices jsonb;
  v_aging jsonb;
  v_estimates jsonb;
  v_jobs jsonb;
  v_expenses jsonb;
  v_sales_tax numeric;
  v_top_customers jsonb;
  v_service_categories jsonb;
  v_overdue_invoices jsonb;
  v_technicians jsonb;
  v_customer_health jsonb;
  v_leads jsonb;
  v_lead_sources jsonb;
begin
  if p_company_id is null then
    raise exception 'company_id_required';
  end if;

  if p_start_date is null or p_end_date is null
     or p_prev_start_date is null or p_prev_end_date is null
     or p_today is null or p_follow_up_cutoff is null then
    raise exception 'date_bounds_required';
  end if;

  -- A null actor gets the unauthorized shape rather than a bypass. Every
  -- application caller is a signed-in user rendering their own company.
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

  -- ---------------- the zone a "day" is in ----------------
  --
  -- Checked by using it: a name this server does not know raises, and the
  -- function carries on in UTC (what it did before this migration) instead
  -- of failing the report.
  if p_time_zone is not null and btrim(p_time_zone) <> '' then
    begin
      perform now() at time zone btrim(p_time_zone);
      v_tz := btrim(p_time_zone);
    exception when others then
      v_tz := 'UTC';
    end;
  end if;

  -- ------------------------------------------------------------------
  -- Payments. collectedRevenueInBounds / averageTicketInBounds, plus the
  -- all-time total customerHealth.lifetimeRevenueTotal uses.
  -- No lifecycle scope: invoice_payments has none, and listInvoicePayments
  -- applies none either.
  -- ------------------------------------------------------------------
  select jsonb_build_object(
    'collectedInBounds', coalesce(sum(p.amount) filter (
      where p.payment_date between p_start_date and p_end_date), 0),
    'countInBounds', count(*) filter (
      where p.payment_date between p_start_date and p_end_date),
    'collectedInPrev', coalesce(sum(p.amount) filter (
      where p.payment_date between p_prev_start_date and p_prev_end_date), 0),
    'countInPrev', count(*) filter (
      where p.payment_date between p_prev_start_date and p_prev_end_date),
    'lifetimeTotal', coalesce(sum(p.amount), 0)
  )
  into v_payments
  from public.invoice_payments p
  where p.company_id = p_company_id;

  -- paymentsByMethod. formatPaymentMethod runs in TypeScript over the raw
  -- enum, so the label is produced exactly once and this returns the value.
  select coalesce(jsonb_agg(
    jsonb_build_object('method', m.method, 'amount', m.amount, 'count', m.count)
    order by m.method
  ), '[]'::jsonb)
  into v_payment_methods
  from (
    select p.payment_method::text as method,
           sum(p.amount) as amount,
           count(*) as count
    from public.invoice_payments p
    where p.company_id = p_company_id
      and p.payment_date between p_start_date and p_end_date
    group by p.payment_method
  ) m;

  -- ------------------------------------------------------------------
  -- Invoices. buildCashHealth, buildKpis outstanding, buildAccountantSummary.
  -- ------------------------------------------------------------------
  select jsonb_build_object(
    -- cashHealth.paid: active and amount_paid > 0
    'activePaidSum', coalesce(sum(i.amount_paid) filter (
      where i.status not in ('void','cancelled') and i.amount_paid > 0), 0),
    -- cashHealth.outstanding: active, balance > 0, NOT overdue
    'activeNotOverdueOutstanding', coalesce(sum(i.balance_due) filter (
      where i.status not in ('void','cancelled')
        and i.balance_due > 0
        and i.status <> 'overdue'), 0),
    -- cashHealth.overdue AND accountantSummary.overdueBalance: no balance filter
    'activeOverdueTotal', coalesce(sum(i.balance_due) filter (
      where i.status not in ('void','cancelled') and i.status = 'overdue'), 0),
    -- kpis outstanding AND accountantSummary.outstandingBalance
    'activeOutstandingTotal', coalesce(sum(i.balance_due) filter (
      where i.status not in ('void','cancelled') and i.balance_due > 0), 0),
    'activeUnpaidCount', count(*) filter (
      where i.status not in ('void','cancelled') and i.balance_due > 0),
    -- cashHealth invoiceTotal / accountantSummary.totalInvoiceValue
    'scopedInvoiceTotal', coalesce(sum(i.total) filter (
      where i.status not in ('void','cancelled')
        and i.issue_date between p_start_date and p_end_date), 0),
    -- salesFunnel invoicesPaid: invoicePaidInBounds
    'paidInBoundsCount', count(*) filter (
      where i.status = 'paid'
        and case
              when i.paid_at is not null
                then (i.paid_at at time zone v_tz)::date
              else i.issue_date
            end between p_start_date and p_end_date)
  )
  into v_invoices
  from public.invoices i
  where i.company_id = p_company_id
    and i.deleted_at is null
    and i.archived_at is null;

  -- Aging. buildInvoiceAging over active invoices with balance_due > 0.
  -- daysBetweenDates(dueDate, today) floors at 0, which is exactly what date
  -- subtraction with a greatest(0, ...) gives.
  select coalesce(jsonb_agg(
    jsonb_build_object('label', b.label, 'count', b.count, 'amount', b.amount)
    order by b.sort_order
  ), '[]'::jsonb)
  into v_aging
  from (
    select
      x.sort_order,
      x.label,
      count(i.id) as count,
      coalesce(sum(i.balance_due), 0) as amount
    from (values
      (0, 'Current'), (1, '1-30 Days'), (2, '31-60 Days'),
      (3, '61-90 Days'), (4, '90+ Days')
    ) as x(sort_order, label)
    left join public.invoices i
      on i.company_id = p_company_id
     and i.deleted_at is null
     and i.archived_at is null
     and i.status not in ('void','cancelled')
     and i.balance_due > 0
     and x.sort_order = case
           when greatest(0, p_today - i.due_date) > 90 then 4
           when greatest(0, p_today - i.due_date) > 60 then 3
           when greatest(0, p_today - i.due_date) > 30 then 2
           when greatest(0, p_today - i.due_date) >= 1 then 1
           else 0
         end
    group by x.sort_order, x.label
  ) b;

  -- ------------------------------------------------------------------
  -- Estimates. estimateSentInBounds / estimateApprovedInBounds, for the
  -- current and previous periods (the KPI comparison needs both).
  --
  -- The lifecycle timestamps come from estimate_activities, earliest event of
  -- each type, which is what resolveEstimateLifecycleTimestampsFromActivities
  -- computes. Reading them here also closes a second, quieter truncation: the
  -- application resolves them through selectInChunks over every estimate id at
  -- 200 ids per chunk, and a chunk whose estimates carry more than 1,000
  -- lifecycle rows between them is cut without a word.
  -- ------------------------------------------------------------------
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
      -- resolveEstimateSentReportDate
      case
        when e.status in ('cancelled','draft') then null
        when lc.sent_at is not null then (lc.sent_at at time zone v_tz)::date
        when e.status in ('sent','approved','declined','converted')
          then (e.created_at at time zone v_tz)::date
        else null
      end as sent_date,
      -- resolveEstimateApprovedReportDate: approvedAt ?? the sent date above
      case
        when e.status not in ('approved','converted') then null
        when lc.approved_at is not null then (lc.approved_at at time zone v_tz)::date
        -- Falls through to the SENT date. No cancelled/draft branch is needed:
        -- the first arm already excluded every status but approved and
        -- converted, and both are in resolveEstimateSentReportDate's outbound
        -- list, so the sent date is always defined here.
        when lc.sent_at is not null then (lc.sent_at at time zone v_tz)::date
        else (e.created_at at time zone v_tz)::date
      end as approved_date
    from public.estimates e
    left join lifecycle lc on lc.estimate_id = e.id
    where e.company_id = p_company_id
      and e.deleted_at is null
      and e.archived_at is null
  )
  select jsonb_build_object(
    'sentInBounds', count(*) filter (
      where sent_date between p_start_date and p_end_date),
    'approvedInBounds', count(*) filter (
      where approved_date between p_start_date and p_end_date),
    'sentInPrev', count(*) filter (
      where sent_date between p_prev_start_date and p_prev_end_date),
    'approvedInPrev', count(*) filter (
      where approved_date between p_prev_start_date and p_prev_end_date)
  )
  into v_estimates
  from resolved;

  -- ------------------------------------------------------------------
  -- Jobs completed in bounds: the funnel count, average completion time, and
  -- the single top technician by completions (buildWorkCompletedSnapshot).
  --
  -- averageHours divides the sum of (completed_at - work_started_at) in hours
  -- by the number of jobs that HAVE both and where completed > started, which
  -- is the guard the TypeScript applies before pushing onto completionDurations.
  -- ------------------------------------------------------------------
  with completed as (
    select
      j.id,
      j.assigned_technician_id,
      j.work_started_at,
      j.completed_at
    from public.jobs j
    where j.company_id = p_company_id
      and j.deleted_at is null
      and j.archived_at is null
      and j.status = 'completed'
      and case
            when j.completed_at is not null
              then (j.completed_at at time zone v_tz)::date
            else (j.scheduled_at at time zone v_tz)::date
          end between p_start_date and p_end_date
  ),
  durations as (
    select extract(epoch from (cj.completed_at - cj.work_started_at)) / 3600.0 as hours
    from completed cj
    where cj.completed_at is not null
      and cj.work_started_at is not null
      and cj.completed_at > cj.work_started_at
  ),
  top_tech as (
    select cj.assigned_technician_id as technician_id, count(*) as completions
    from completed cj
    where cj.assigned_technician_id is not null
    group by cj.assigned_technician_id
    -- The TypeScript takes [0] of a plain descending sort, which is unstable
    -- across ties. The id is added as a final key so the same data cannot
    -- produce two different answers; verify-reports-live compares against the
    -- shipped builder and reports a tie rather than accepting either.
    order by completions desc, cj.assigned_technician_id asc
    limit 1
  )
  select jsonb_build_object(
    'completedInBounds', (select count(*) from completed),
    'completionSampleCount', (select count(*) from durations),
    'completionHoursTotal', (select coalesce(sum(hours), 0) from durations),
    'topTechnicianId', (select technician_id from top_tech),
    'topTechnicianCount', (select completions from top_tech),
    -- full_name AND email, because the display rule is
     -- resolveOptionalSubjectAttributionName: full_name, else email, else
     -- "Team member". That rule stays in TypeScript so there is one copy of it.
    'topTechnicianName', (
      select pr.full_name from public.profiles pr
      where pr.id = (select technician_id from top_tech)
    ),
    'topTechnicianEmail', (
      select pr.email from public.profiles pr
      where pr.id = (select technician_id from top_tech)
    )
  )
  into v_jobs;

  -- ------------------------------------------------------------------
  -- Expenses. buildAccountantSummary scopedExpenses: report date in bounds and
  -- status approved or reimbursed. expenseAmount treats null as 0.
  -- ------------------------------------------------------------------
  select jsonb_build_object(
    'scopedApprovedReimbursedTotal', coalesce(sum(coalesce(e.amount, 0)), 0)
  )
  into v_expenses
  from public.expenses e
  where e.company_id = p_company_id
    and e.deleted_at is null
    and e.archived_at is null
    and e.status in ('approved','reimbursed')
    and coalesce(e.purchase_date, (e.created_at at time zone v_tz)::date)
        between p_start_date and p_end_date;

  -- ------------------------------------------------------------------
  -- Sales tax collected. Joins the ACTIVE invoice set -- see the asymmetry
  -- note in the header. double precision, not numeric, because the TypeScript
  -- accumulates in IEEE doubles and rounds once at the end.
  -- ------------------------------------------------------------------
  select coalesce(
    sum(
      coalesce(i.tax_amount, 0)::double precision
      * (p.amount::double precision / i.total::double precision)
    ),
    0
  )
  into v_sales_tax
  from public.invoice_payments p
  join public.invoices i
    on i.id = p.invoice_id
   and i.company_id = p_company_id
   and i.deleted_at is null
   and i.archived_at is null
   and i.status not in ('void','cancelled')
   and i.total > 0
  where p.company_id = p_company_id
    and p.payment_date between p_start_date and p_end_date;

  -- ------------------------------------------------------------------
  -- Top customers by collected revenue in bounds (buildTopCustomers, also
  -- reused verbatim as accountantSummary.revenueByCustomer).
  --
  -- Joins the LIVE invoice set with no status filter -- see asymmetry (1).
  -- customer_id and customerName come from the INVOICE, not the customers
  -- table, because that is where the TypeScript reads them.
  --
  -- The shipped sort is revenue descending with no tiebreaker, so two customers
  -- on the same total could swap between renders. customer_id is added as a
  -- final key here for determinism.
  -- ------------------------------------------------------------------
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'customerId', tc.customer_id,
      'name', tc.name,
      'revenue', tc.revenue,
      'paymentCount', tc.payment_count
    ) order by tc.revenue desc, tc.customer_id asc
  ), '[]'::jsonb)
  into v_top_customers
  from (
    select
      i.customer_id,
      coalesce(max(c.name), 'Unknown customer') as name,
      sum(p.amount) as revenue,
      count(*) as payment_count
    from public.invoice_payments p
    join public.invoices i
      on i.id = p.invoice_id
     and i.company_id = p_company_id
     and i.deleted_at is null
     and i.archived_at is null
    left join public.customers c on c.id = i.customer_id
    where p.company_id = p_company_id
      and p.payment_date between p_start_date and p_end_date
    group by i.customer_id
    order by revenue desc, i.customer_id asc
    limit p_limit
  ) tc;

  -- ------------------------------------------------------------------
  -- Service categories. Job type cardinality is small, so EVERY group is
  -- returned and the shipped sort and slice run untouched in TypeScript.
  --
  -- Two independent contributions, matching the two loops:
  --   jobCount  jobs completed in bounds
  --   revenue   payments in bounds -> invoice.job_id -> job.job_type, with NO
  --             completion or status filter on that job
  -- ------------------------------------------------------------------
  with live_jobs as (
    select j.id, j.job_type, j.status, j.completed_at, j.scheduled_at
    from public.jobs j
    where j.company_id = p_company_id
      and j.deleted_at is null
      and j.archived_at is null
  ),
  counts as (
    select j.job_type, count(*) as job_count
    from live_jobs j
    where j.status = 'completed'
      and case
            when j.completed_at is not null
              then (j.completed_at at time zone v_tz)::date
            else (j.scheduled_at at time zone v_tz)::date
          end between p_start_date and p_end_date
    group by j.job_type
  ),
  revenue as (
    select j.job_type, sum(p.amount) as revenue
    from public.invoice_payments p
    join public.invoices i
      on i.id = p.invoice_id
     and i.company_id = p_company_id
     and i.deleted_at is null
     and i.archived_at is null
     and i.job_id is not null
    join live_jobs j on j.id = i.job_id
    where p.company_id = p_company_id
      and p.payment_date between p_start_date and p_end_date
    group by j.job_type
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'jobType', k.job_type,
      'revenue', coalesce(r.revenue, 0),
      'jobCount', coalesce(cnt.job_count, 0)
    ) order by k.job_type
  ), '[]'::jsonb)
  into v_service_categories
  from (
    select job_type from counts
    union
    select job_type from revenue
  ) k
  left join counts cnt on cnt.job_type = k.job_type
  left join revenue r on r.job_type = k.job_type;

  -- ------------------------------------------------------------------
  -- Overdue invoices, largest balance first (buildOverdueInvoices).
  -- Not date scoped: current overdue AR regardless of period, which the
  -- limitations list on the page already states.
  -- ------------------------------------------------------------------
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', o.id,
      'customerId', o.customer_id,
      'customerName', o.customer_name,
      'invoiceNumber', o.invoice_number,
      'balanceDue', o.balance_due
    ) order by o.balance_due desc, o.id asc
  ), '[]'::jsonb)
  into v_overdue_invoices
  from (
    select
      i.id,
      i.customer_id,
      coalesce(c.name, 'Unknown customer') as customer_name,
      i.invoice_number,
      i.balance_due
    from public.invoices i
    left join public.customers c on c.id = i.customer_id
    where i.company_id = p_company_id
      and i.deleted_at is null
      and i.archived_at is null
      and i.status = 'overdue'
    order by i.balance_due desc, i.id asc
    limit p_limit
  ) o;

  -- ------------------------------------------------------------------
  -- Technician metrics (buildTechnicianProfitability inputs only).
  --
  -- Returns EVERY technician that appears in any of the three loops. The
  -- filter (revenue > 0 or laborHours > 0), the descending sort, the slice to
  -- five, and all of the labour-cost, gross-profit and margin arithmetic stay
  -- in the shipped TypeScript. Technician cardinality is headcount, so
  -- returning every group costs nothing.
  --
  -- laborMinutes is an integer SUM. The shipped loop accumulated hours with
  -- roundJobMaterialAmount applied after EVERY entry, which is order-dependent
  -- -- the same rows in a different order could produce a different total, and
  -- no SQL translation could be faithful to it. buildTechnicianProfitability
  -- now sums minutes and rounds once, which is order-independent and cannot
  -- disagree with itself. See the note on that function.
  -- ------------------------------------------------------------------
  with live_jobs as (
    select j.id, j.assigned_technician_id, j.status, j.completed_at, j.scheduled_at
    from public.jobs j
    where j.company_id = p_company_id
      and j.deleted_at is null
      and j.archived_at is null
  ),
  job_counts as (
    select j.assigned_technician_id as technician_id, count(*) as job_count
    from live_jobs j
    where j.assigned_technician_id is not null
      and j.status = 'completed'
      and case
            when j.completed_at is not null
              then (j.completed_at at time zone v_tz)::date
            else (j.scheduled_at at time zone v_tz)::date
          end between p_start_date and p_end_date
    group by j.assigned_technician_id
  ),
  tech_revenue as (
    select j.assigned_technician_id as technician_id, sum(p.amount) as revenue
    from public.invoice_payments p
    join public.invoices i
      on i.id = p.invoice_id
     and i.company_id = p_company_id
     and i.deleted_at is null
     and i.archived_at is null
     and i.job_id is not null
    join live_jobs j on j.id = i.job_id
    where p.company_id = p_company_id
      and p.payment_date between p_start_date and p_end_date
      and j.assigned_technician_id is not null
    group by j.assigned_technician_id
  ),
  labor as (
    select
      t.technician_id,
      sum(
        case
          when t.duration_minutes is not null
            then greatest(0, round(t.duration_minutes)::bigint)
          else greatest(
            0,
            round(extract(epoch from (t.ended_at - t.started_at)) / 60.0)::bigint
          )
        end
      ) as labor_minutes
    from public.time_entries t
    where t.company_id = p_company_id
      and t.entry_type = 'job_labor'
      and (t.duration_minutes is not null or t.ended_at is not null)
      and (t.started_at at time zone v_tz)::date between p_start_date and p_end_date
    group by t.technician_id
  ),
  ids as (
    select technician_id from job_counts
    union select technician_id from tech_revenue
    union select technician_id from labor
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'technicianId', k.technician_id,
      'name', pr.full_name,
      'email', pr.email,
      'revenue', coalesce(tr.revenue, 0),
      'jobCount', coalesce(jc.job_count, 0),
      'laborMinutes', coalesce(lb.labor_minutes, 0)
    ) order by k.technician_id
  ), '[]'::jsonb)
  into v_technicians
  from ids k
  left join job_counts jc on jc.technician_id = k.technician_id
  left join tech_revenue tr on tr.technician_id = k.technician_id
  left join labor lb on lb.technician_id = k.technician_id
  left join public.profiles pr on pr.id = k.technician_id;

  -- ------------------------------------------------------------------
  -- Customer health (buildCustomerHealth).
  --
  -- A qualifying job is a completed job OR a job attached to an active PAID
  -- invoice; the TypeScript unions them into a Set of job ids per customer and
  -- counts customers with two or more. count(distinct) over a union does the
  -- same thing. Both halves are all-time, not period scoped -- which the
  -- limitations list on the page states.
  --
  -- totalCustomerCount replaces `customers.length` from an unbounded
  -- listCustomers read. That read was capped at 1,000, so on this fixture the
  -- repeat rate was computed as 126/1000 = 13% where the truth is 3632/5000 =
  -- 73%.
  -- ------------------------------------------------------------------
  with qualifying as (
    select j.customer_id, j.id as job_id
    from public.jobs j
    where j.company_id = p_company_id
      and j.deleted_at is null
      and j.archived_at is null
      and j.status = 'completed'
    union
    select i.customer_id, i.job_id
    from public.invoices i
    where i.company_id = p_company_id
      and i.deleted_at is null
      and i.archived_at is null
      and i.status = 'paid'
      and i.job_id is not null
  )
  select jsonb_build_object(
    'repeatCustomerCount', (
      select count(*) from (
        select q.customer_id
        from qualifying q
        group by q.customer_id
        having count(distinct q.job_id) >= 2
      ) r
    ),
    'totalCustomerCount', (
      select count(*)
      from public.customers c
      where c.company_id = p_company_id
        and c.deleted_at is null
        and c.archived_at is null
    )
  )
  into v_customer_health;

  -- ------------------------------------------------------------------
  -- Lead pipeline, date scoped.
  --
  -- Migration 160 already aggregates this for the leads page, but WITHOUT
  -- date bounds: buildLeadPipelineMetrics filters activeLeads by createdAt in
  -- bounds while counting followUpsDue over ALL leads. That asymmetry is in the
  -- shipped function and is reproduced here rather than tidied.
  --
  -- The won/lost algebra is migration 160's, unchanged:
  --   won  = status 'won'  or (status 'lost' and won_at is not null)
  --   lost = status 'lost' and won_at is null            (top level)
  --   per-source lost keeps the UNFILTERED predicate, so a lead that is both
  --   counts in both -- matching the per-source loop.
  -- ------------------------------------------------------------------
  select jsonb_build_object(
    'totalLeads', count(*) filter (where lp.in_bounds),
    'wonLeads', count(*) filter (where lp.in_bounds and lp.is_won),
    'lostLeads', count(*) filter (where lp.in_bounds and lp.is_lost and not lp.is_won),
    'followUpsDue', count(*) filter (
      where lp.status not in ('won','lost')
        and lp.next_follow_up_at is not null
        and lp.next_follow_up_at <= p_follow_up_cutoff)
  )
  into v_leads
  from (
    select
      l.status,
      l.next_follow_up_at,
      (l.created_at at time zone v_tz)::date between p_start_date and p_end_date
        as in_bounds,
      (l.status = 'won' or (l.status = 'lost' and l.won_at is not null)) as is_won,
      (l.status = 'lost' or (l.status = 'won' and l.lost_at is not null)) as is_lost
    from public.leads l
    where l.company_id = p_company_id
      and l.deleted_at is null
      and l.archived_at is null
  ) lp;

  select coalesce(jsonb_agg(
    jsonb_build_object('source', s.source, 'total', s.total, 'won', s.won, 'lost', s.lost)
    order by s.source
  ), '[]'::jsonb)
  into v_lead_sources
  from (
    select
      l.source::text as source,
      count(*) as total,
      count(*) filter (
        where l.status = 'won' or (l.status = 'lost' and l.won_at is not null)) as won,
      count(*) filter (
        where l.status = 'lost' or (l.status = 'won' and l.lost_at is not null)) as lost
    from public.leads l
    where l.company_id = p_company_id
      and l.deleted_at is null
      and l.archived_at is null
      and (l.created_at at time zone v_tz)::date between p_start_date and p_end_date
    group by l.source
  ) s;

  return jsonb_build_object(
    'authorized', true,
    'payments', v_payments,
    'paymentsByMethod', v_payment_methods,
    'invoices', v_invoices,
    'invoiceAging', v_aging,
    'estimates', v_estimates,
    'jobs', v_jobs,
    'expenses', v_expenses,
    'salesTaxCollected', v_sales_tax,
    'topCustomers', v_top_customers,
    'serviceCategories', v_service_categories,
    'overdueInvoices', v_overdue_invoices,
    'technicians', v_technicians,
    'customerHealth', v_customer_health,
    'leads', v_leads,
    'leadSources', v_lead_sources
  );
end;
$function$;

revoke all on function public.get_company_reports_summary(
  uuid, date, date, date, date, date, timestamptz, integer, text
) from public;
revoke all on function public.get_company_reports_summary(
  uuid, date, date, date, date, date, timestamptz, integer, text
) from anon;
grant execute on function public.get_company_reports_summary(
  uuid, date, date, date, date, date, timestamptz, integer, text
) to authenticated, service_role;

commit;

-- The API keeps a list of functions and their arguments; tell it to read the
-- list again so the nine-argument call is known straight away.
notify pgrst, 'reload schema';
