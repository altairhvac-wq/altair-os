-- Migration 203: retention sweep for public.web_analytics_events (migration 202).
--
-- ===================== WHY =====================
-- 202 shipped with no retention: every pageview and signup event was kept
-- forever. The rows are hashed and carry no IP or user agent, but an unbounded
-- log of who visited which page is still more than the analytics page needs,
-- and the table would grow without limit.
--
-- ===================== THE POLICY =====================
-- Keep 25 months. The page's longest range is the last 12 months; 25 keeps
-- that window and the 12 months before it, so a year can be compared with the
-- year before, plus a month of slack. The
-- number is passed in by lib/database/services/retention-sweeps.ts so it is
-- decided in reviewed application code, next to the other retention periods,
-- not inside the database.
--
-- ===================== WHY BATCHED =====================
-- One call deletes at most p_batch_size of the OLDEST expired rows and returns
-- how many it deleted. The daily billing-maintenance cron calls it repeatedly
-- within a small time budget and stops when a call deletes fewer rows than the
-- batch size. Each call is its own short transaction, so a large first sweep
-- (or a backlog after the cron was down) never holds one long delete open
-- against a table the public beacon writes to. A backlog the budget does not
-- clear is picked up the next day.
--
-- ===================== WHO CAN CALL IT =====================
-- service_role only, like the table. SECURITY INVOKER: the service role
-- already owns delete rights on the table, so the function needs no elevated
-- privileges of its own.

create or replace function public.sweep_web_analytics_events(
  p_retain_months integer,
  p_batch_size integer default 2000
)
returns integer
language plpgsql
volatile
set search_path = public, pg_temp
as $function$
declare
  v_deleted integer;
begin
  if p_retain_months is null or p_retain_months < 1 then
    raise exception 'web_analytics_retention_months_required';
  end if;

  if p_batch_size is null or p_batch_size < 1 or p_batch_size > 10000 then
    raise exception 'web_analytics_sweep_batch_size_out_of_range';
  end if;

  with expired as (
    select e.id
    from public.web_analytics_events e
    where e.occurred_at < now() - make_interval(months => p_retain_months)
    order by e.occurred_at
    limit p_batch_size
  )
  delete from public.web_analytics_events t
  using expired
  where t.id = expired.id;

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$function$;

comment on function public.sweep_web_analytics_events(integer, integer) is
  'Deletes up to p_batch_size web_analytics_events rows older than p_retain_months, oldest first, and returns the count. Called in a loop by the billing-maintenance cron. Service role only.';

revoke all on function public.sweep_web_analytics_events(integer, integer) from public;
revoke all on function public.sweep_web_analytics_events(integer, integer) from anon;
revoke all on function public.sweep_web_analytics_events(integer, integer) from authenticated;
grant execute on function public.sweep_web_analytics_events(integer, integer) to service_role;
