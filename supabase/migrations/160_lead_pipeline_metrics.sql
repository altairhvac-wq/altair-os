-- Migration 160: aggregate the lead pipeline in the database.
--
-- ============================== THE DEFECT THIS CLOSES ==============================
-- LeadsPageView derives three whole-tenant figures from the array it was handed:
--
--     buildLeadPipelineMetrics(leads, ...)   totals, won/lost, conversion rate,
--                                            follow-ups due, per-source performance
--     buildLeadsGlanceStats({ leads, ... })  a count for every list pill
--
-- The array comes from listLeads, which has no .limit(). PostgREST caps an
-- unfiltered response at 1,000 rows and reports the truncation in a Content-Range
-- header that nothing in the application reads. So on a tenant with more than
-- 1,000 leads every one of those figures is computed over the newest 1,000 and
-- rendered as the whole book -- and because the list is ordered created_at desc,
-- the rows dropped are the OLDEST, which is where won and lost leads accumulate.
-- A conversion rate is exactly the statistic that skews worst under that cut.
--
-- Paging the list fixes the list. It does not fix the metrics: a page of 50
-- cannot produce a tenant-wide conversion rate. The aggregate has to happen
-- where the rows are.
--
-- ============================== WHY AN RPC AND NOT COUNTS ==============================
-- Everything here except source performance is expressible as a head count, and
-- the pills are counted that way. Source performance is a GROUP BY over nine
-- sources with three buckets each, which PostgREST cannot express; the
-- alternatives were 27 count round-trips or reading every lead's source column
-- back to the server, and the second one is the unbounded read this migration
-- exists to remove.
--
-- ============================== THE TIME ZONE STAYS IN TYPESCRIPT ==============================
-- "Follow-up due" is company-time-zone-dependent. This function does NOT compute
-- a zone: it takes p_follow_up_cutoff, the instant the shipped helper
-- getLeadFollowUpDueCutoff already produces (getDayBoundsInTimeZone(tz).end).
-- A date-in-zone comparison and an instant comparison against the last moment of
-- that day are the same test, so there is one zone rule in the codebase and it is
-- the TypeScript one. Passing a cutoff rather than a zone name also means this
-- function has no opinion about DST, and cannot drift from the client.
--
-- ============================== THE WON / LOST RULES, AS WRITTEN ==============================
-- Copied from shared/lib/leads/lead-metrics.ts, expanded:
--
--   isLeadWon   = status = 'won'  OR (isLeadClosed(status) AND wonAt  is not null)
--   isLeadLost  = status = 'lost' OR (isLeadClosed(status) AND lostAt is not null)
--   isLeadClosed(status) = status in ('won','lost')
--
--   wonLeads  = count(isLeadWon)
--             = status = 'won' OR (status = 'lost' AND won_at is not null)
--   lostLeads = count(isLeadLost AND NOT isLeadWon)
--             = status = 'lost' AND won_at is null
--
-- The second line is not a simplification chosen for convenience; it is what the
-- TypeScript evaluates to, case by case:
--   status='won'   -> isLeadWon true, so excluded from lostLeads regardless
--   status='lost'  -> isLeadLost true; isLeadWon iff won_at is set
--   otherwise      -> isLeadClosed false, so neither
-- verify-lead-filters-live asserts this against the real builder over a fixture
-- that includes both of the odd combinations, rather than trusting the algebra.
--
-- sourcePerformance keeps won and lost as the UNFILTERED predicates (a lead that
-- is both counts in both), because that is what the per-source loop does. Only
-- the top-level lostLeads applies the "and not won" exclusion. That asymmetry is
-- in the original; reproducing it is the point.
--
-- ============================== PRIVILEGES ==============================
-- Created with an explicit revoke/grant rather than relying on the default,
-- which is PUBLIC EXECUTE. Migration 158 created a function without one and
-- anon could call it (fixed by 159); scripts/verify-function-grants.mjs now
-- fails any migration that repeats it. Ordering matters: the grants come after
-- the revokes, in the same transaction as the create.

begin;

create or replace function public.get_company_lead_pipeline_metrics(
  p_company_id uuid,
  p_follow_up_cutoff timestamptz
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $function$
declare
  v_user_id uuid := auth.uid();
  v_totals jsonb := '{}'::jsonb;
  v_sources jsonb := '[]'::jsonb;
begin
  if p_company_id is null then
    raise exception 'company_id_required';
  end if;

  if p_follow_up_cutoff is null then
    raise exception 'follow_up_cutoff_required';
  end if;

  -- A null actor gets zeros rather than a bypass. This function only reads, and
  -- every application caller is a signed-in user rendering their own pipeline.
  if v_user_id is null then
    return jsonb_build_object('totals', v_totals, 'sources', v_sources);
  end if;

  if not public.is_active_company_member(p_company_id) then
    raise exception 'insufficient_permission';
  end if;

  -- Lifecycle scope: isActiveLeadRecord = no deletedAt and no archivedAt.
  -- Identical to the scope listLeads applies before the metrics ever ran.
  select jsonb_build_object(
    'totalLeads', count(*),
    'wonLeads', count(*) filter (
      where l.status = 'won'::public.lead_status
         or (l.status = 'lost'::public.lead_status and l.won_at is not null)
    ),
    'lostLeads', count(*) filter (
      where l.status = 'lost'::public.lead_status and l.won_at is null
    ),
    'followUpsDue', count(*) filter (
      where l.status not in ('won'::public.lead_status, 'lost'::public.lead_status)
        and l.next_follow_up_at is not null
        and l.next_follow_up_at <= p_follow_up_cutoff
    )
  )
  into v_totals
  from public.leads l
  where l.company_id = p_company_id
    and l.deleted_at is null
    and l.archived_at is null;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'source', s.source,
        'total', s.total,
        'won', s.won,
        'lost', s.lost
      )
    ),
    '[]'::jsonb
  )
  into v_sources
  from (
    select
      l.source::text as source,
      count(*) as total,
      count(*) filter (
        where l.status = 'won'::public.lead_status
           or (l.status = 'lost'::public.lead_status and l.won_at is not null)
      ) as won,
      count(*) filter (
        where l.status = 'lost'::public.lead_status
           or (l.status = 'won'::public.lead_status and l.lost_at is not null)
      ) as lost
    from public.leads l
    where l.company_id = p_company_id
      and l.deleted_at is null
      and l.archived_at is null
    group by l.source
  ) s;

  -- Ordering and the derived rates (conversionRate, topSourceInsight) are left
  -- to the shipped TypeScript. They are pure functions of these counts, and
  -- re-deriving rounding rules in SQL is how two versions of a percentage start
  -- disagreeing in the fourth decimal place.
  return jsonb_build_object('totals', v_totals, 'sources', v_sources);
end;
$function$;

revoke all on function public.get_company_lead_pipeline_metrics(uuid, timestamptz)
  from public;
revoke all on function public.get_company_lead_pipeline_metrics(uuid, timestamptz)
  from anon;
grant execute on function public.get_company_lead_pipeline_metrics(uuid, timestamptz)
  to authenticated, service_role;

commit;
