-- Migration 220: a company's time zone is a choice it made, not a value
-- that happens to be in the column. And the dashboard counts a finished job
-- in the month the company finished it.
--
-- ============================== THE DEFECT THIS CLOSES ==============================
-- companies.timezone is NOT NULL DEFAULT 'America/New_York' (migration 001),
-- and nothing ever asked a new company where it was. So the application
-- treated the literal value 'America/New_York' as "not set" and ran the
-- company on Mountain Time instead. That made Eastern unpickable: a company
-- in New York that chose Eastern in Settings stored exactly the value that
-- meant "not set", and went on running on Mountain Time everywhere (the
-- schedule, the dispatch day, reminders, "today" on the dashboard, the time
-- clock, invoice due dates).
--
-- The fix is to stop reading meaning into the zone name. This adds one
-- column that records the choice itself:
--
--   companies.timezone_set_at   when an owner or admin chose the zone.
--                               NULL: nobody has chosen.
--
-- The application's single rule (shared/lib/datetime.ts,
-- resolveCompanyTimeZone) becomes:
--   chosen      -> the stored zone, whatever it is. Eastern is ordinary.
--   not chosen  -> what the company has always run on: the column default
--                  resolves to Mountain Time, anything else is used as stored.
--
-- ============================== NOBODY'S TIMES MOVE WHEN THIS RUNS ==============================
-- It is not possible to tell, from the data, which rows holding
-- 'America/New_York' are companies really in Eastern time and which are the
-- untouched default. This migration does not guess. Every such row stays
-- "not chosen" and keeps running on Mountain Time, exactly as it does today,
-- until its owner or admin answers the confirm-your-time-zone prompt the
-- application now shows them.
--
-- The backfill marks as chosen only the rows that could not be anything
-- else: a zone that is neither the column default nor the Mountain fallback
-- can only have got there by someone picking it in Settings > Company.
-- 'America/Denver' is left unmarked on purpose: the company profile form
-- used to write the fallback back on every save, so a Denver row may be a
-- choice or may be someone who only fixed their phone number. Marked or
-- not, those rows resolve to the same zone as before; unmarked, their owner
-- is asked once.
--
-- (The backfill is an UPDATE, so set_updated_at moves updated_at on the rows
-- it marks. That is the only side effect.)
--
-- ============================== PRIVILEGES ==============================
-- An existing table: nothing about its row level security or grants changes.
-- Updates to companies are already limited to the company's owners and
-- admins (migration 134), and the new column is written by the same UPDATE
-- as the zone it describes.
--
-- ============================== THE DASHBOARD CHART ==============================
-- get_company_report_daily_series (migration 170) turns every timestamp
-- into a calendar day in UTC. For a company in the United States, a job
-- finished on the evening of the last day of a month is already "tomorrow"
-- in UTC, so the dashboard's performance chart, and the monthly target card
-- that reads its current month, counted it in the next month.
--
-- The function gains a fourth argument, p_time_zone, defaulting to 'UTC'.
-- The body is migration 170's, unchanged except that every
-- `at time zone 'UTC'` (17 of them) is now `at time zone v_tz`.
--
--   - Called with three arguments (the Reports page, and every deployment
--     that predates this change) it behaves exactly as before.
--   - The dashboard passes the company's resolved zone.
--
-- The Reports page is deliberately left on UTC: its headline figures
-- (migration 169) use the same UTC rule, and changing only its charts would
-- make the two halves of that page disagree.
--
-- The old three-argument function is dropped rather than left beside the
-- new one, so there is one function and no ambiguity about which a
-- three-argument call means. Both statements are in this one transaction:
-- there is no moment without the function.
--
-- Before this migration has run, the application's four-argument call is
-- answered "no such function"; it then makes the three-argument call and
-- shows what it showed before.

begin;

-- ---------------------------------------------------------------- the choice
alter table public.companies
  add column if not exists timezone_set_at timestamptz;

comment on column public.companies.timezone_set_at is
  'When an owner or admin chose companies.timezone. NULL: nobody has chosen, and the application runs the company on its fallback zone and asks them to confirm.';

update public.companies
set timezone_set_at = now()
where timezone_set_at is null
  and timezone not in ('America/New_York', 'America/Denver');

-- ------------------------------------------------ the per-day series, zoned
drop function if exists public.get_company_report_daily_series(uuid, date, date);

create or replace function public.get_company_report_daily_series(
  p_company_id uuid,
  p_start_date date,
  p_end_date date,
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

  -- ---------------- the zone a "day" is in ----------------
  --
  -- Checked by using it: a name this server does not know raises, and the
  -- function carries on in UTC (what it did before this migration) instead
  -- of failing the dashboard.
  if p_time_zone is not null and btrim(p_time_zone) <> '' then
    begin
      perform now() at time zone btrim(p_time_zone);
      v_tz := btrim(p_time_zone);
    exception when others then
      v_tz := 'UTC';
    end;
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
      coalesce(e.purchase_date, (e.created_at at time zone v_tz)::date) as d,
      coalesce(sum(coalesce(e.amount, 0)) filter (where e.status = 'submitted'), 0)
        as submitted,
      coalesce(sum(coalesce(e.amount, 0)) filter (
        where e.status in ('approved','reimbursed')), 0) as approved
    from public.expenses e
    where e.company_id = p_company_id
      and e.deleted_at is null
      and e.archived_at is null
      and coalesce(e.purchase_date, (e.created_at at time zone v_tz)::date)
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
    select (j.scheduled_at at time zone v_tz)::date as d, count(*) as n
    from live_jobs j
    where (j.scheduled_at at time zone v_tz)::date between p_start_date and p_end_date
    group by 1
  ),
  completed as (
    select
      case
        when j.completed_at is not null then (j.completed_at at time zone v_tz)::date
        else (j.scheduled_at at time zone v_tz)::date
      end as d,
      count(*) as n
    from live_jobs j
    where j.status = 'completed'
      and case
            when j.completed_at is not null
              then (j.completed_at at time zone v_tz)::date
            else (j.scheduled_at at time zone v_tz)::date
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
      (t.started_at at time zone v_tz)::date as d,
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
      and (t.started_at at time zone v_tz)::date between p_start_date and p_end_date
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
        when lc.sent_at is not null then (lc.sent_at at time zone v_tz)::date
        when e.status in ('sent','approved','declined','converted')
          then (e.created_at at time zone v_tz)::date
        else null
      end as sent_date,
      case
        when e.status not in ('approved','converted') then null
        when lc.approved_at is not null then (lc.approved_at at time zone v_tz)::date
        when lc.sent_at is not null then (lc.sent_at at time zone v_tz)::date
        else (e.created_at at time zone v_tz)::date
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
        and (j.scheduled_at at time zone v_tz)::date between p_start_date and p_end_date
    ), false),
    'openLaborExcluded', coalesce((
      select bool_or(t.duration_minutes is null and t.ended_at is null)
      from public.time_entries t
      where t.company_id = p_company_id
        and t.entry_type = 'job_labor'
        and (t.started_at at time zone v_tz)::date between p_start_date and p_end_date
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

revoke all on function public.get_company_report_daily_series(uuid, date, date, text)
  from public;
revoke all on function public.get_company_report_daily_series(uuid, date, date, text)
  from anon;
grant execute on function public.get_company_report_daily_series(uuid, date, date, text)
  to authenticated, service_role;

commit;

-- The API keeps a list of functions and their arguments; tell it to read the
-- list again so the four-argument call is known straight away.
notify pgrst, 'reload schema';
