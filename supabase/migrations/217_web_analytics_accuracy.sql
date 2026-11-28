-- 217: website analytics accuracy (owner 2026-11-24: "time on site ... 9 seconds", "0 return people",
-- "resets at 5pm instead of midnight"). Replaces platform_web_analytics_summary (206) and
-- platform_web_analytics_engagement (209); adds the page_engaged event and its engaged_ms column.
--
-- What changes in the figures (same function signatures, so the app keeps working before and after):
--   * Time on site: the visible time each page reports when it is hidden or left (page_engaged), over
--     ALL visits. Before, it was first-to-last pageview over 2+ page visits only, so the last page and
--     every one-page visit counted as nothing.
--   * Bounce: a visit that lasted under 10 seconds, saw one page and did nothing. Playing the video or
--     using a calculator on one page is no longer a bounce.
--   * Returning visitors: anyone who started a visit 30+ minutes after their first visit we hold, the
--     same day or later. Before, a visitor whose first visit fell inside the period was always "new".
--   * Days, "today" and the daily charts run midnight to midnight in p_tz (the app passes
--     America/Denver). Before, they cut at midnight UTC, which is 5 pm in Denver.
--   * Customers opening estimate and invoice links, sign-in and password pages and the technician
--     screens are no longer counted as website visits.
--
-- Idempotent: safe to run twice. Service role only, like 206/209.

alter table public.web_analytics_events
  drop constraint if exists web_analytics_events_event_name_check;

alter table public.web_analytics_events
  add constraint web_analytics_events_event_name_check
  check (event_name in (
    'pageview',
    'page_engaged',
    'signup_started',
    'signup_completed',
    'cta_click',
    'video_play',
    'calculator_used',
    'template_download',
    'results_email_requested',
    'boss_share'
  ));

alter table public.web_analytics_events
  add column if not exists engaged_ms integer;

alter table public.web_analytics_events
  drop constraint if exists web_analytics_events_engaged_ms_check;

-- Only page_engaged carries a time, and never more than 30 minutes per report.
alter table public.web_analytics_events
  add constraint web_analytics_events_engaged_ms_check
  check (
    (event_name = 'page_engaged' and engaged_ms between 1 and 1800000)
    or (event_name <> 'page_engaged' and engaged_ms is null)
  );

comment on column public.web_analytics_events.engaged_ms is
  'page_engaged only: milliseconds the page was visible since the last report (217). Never more than 30 minutes per row.';


-- One definition of "a page of the public website", used by every figure (217). Customer estimate and
-- invoice links, sign-in and password pages, first-run setup and the technician screens are not.
create or replace function public.web_analytics_is_site_path(p_path text)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $fn$
  select p_path not in ('/login', '/forgot-password', '/reset-password', '/setup', '/install',
                        '/activate-subscription', '/estimate-approval', '/invoice-payment', '/technician', '/tech')
     and p_path not like '/auth/%'
     and p_path not like '/estimate-approval/%'
     and p_path not like '/invoice-payment/%'
     and p_path not like '/technician/%'
     and p_path not like '/tech/%';
$fn$;

revoke all on function public.web_analytics_is_site_path(text) from public;
revoke all on function public.web_analytics_is_site_path(text) from anon;
revoke all on function public.web_analytics_is_site_path(text) from authenticated;
grant execute on function public.web_analytics_is_site_path(text) to service_role;

create or replace function public.platform_web_analytics_summary(
  p_from timestamptz,
  p_to timestamptz,
  p_tz text default 'UTC'
)
returns jsonb
language sql
stable
set search_path = public, pg_temp
as $$
  with internal as (
    select visitor_hash from public.web_analytics_internal_visitors
  ),
  ev_all as (
    select *
    from public.web_analytics_events e
    where e.occurred_at >= p_from
      and e.occurred_at < p_to
  ),
  ev as (
    select * from ev_all a
    where not exists (select 1 from internal i where i.visitor_hash = a.visitor_hash)
  ),
  pub as (
    -- Public website traffic only. Customers opening an estimate or invoice
    -- link, people signing in or resetting a password, and the technician
    -- screens are not website visits (217).
    select * from ev
    where user_id is null
      and public.web_analytics_is_site_path(path)
  ),
  first_touch as (
    select distinct on (visitor_hash)
      visitor_hash, channel, device, referrer_host,
      utm_source, utm_medium, utm_campaign
    from pub
    order by visitor_hash, occurred_at
  ),
  signups as (
    select distinct visitor_hash from ev where event_name = 'signup_completed'
  ),
  sess as (
    select
      session_hash,
      min(visitor_hash) as visitor_hash,
      min(occurred_at) as started_at,
      max(occurred_at) as ended_at,
      count(*) filter (where event_name = 'pageview') as pages,
      -- Visible time reported by the page_engaged beacon (217), in seconds.
      coalesce(sum(engaged_ms) filter (where event_name = 'page_engaged'), 0) / 1000.0 as engaged_seconds,
      -- Deliberate actions: a video played, a calculator used, a button pressed, signup started.
      count(*) filter (where event_name not in ('pageview', 'page_engaged', 'signup_completed')) as actions,
      coalesce(array_agg(path order by occurred_at) filter (where event_name = 'pageview'), array[]::text[]) as paths,
      (array_agg(channel order by occurred_at))[1] as channel,
      (array_agg(referrer_host order by occurred_at))[1] as referrer_host,
      (array_agg(utm_source order by occurred_at))[1] as utm_source,
      (array_agg(utm_medium order by occurred_at))[1] as utm_medium,
      (array_agg(utm_campaign order by occurred_at))[1] as utm_campaign,
      (array_agg(device order by occurred_at))[1] as device,
      (array_agg(is_returning order by occurred_at))[1] as is_returning,
      bool_or(event_name = 'signup_started') as signup_started,
      bool_or(event_name = 'signup_completed') as signup_completed
    from pub
    where session_hash is not null
    group by session_hash
  ),
  -- Time on site per visit: the visible time the browser reported when it has
  -- one (217), otherwise first-to-last event (older visits, browsers that
  -- never report). An engaged visit (217, the usual definition) lasted 10
  -- seconds or more, saw 2+ pages, or did something; anything else bounced.
  sess_t as (
    select s.*,
      case when s.engaged_seconds > 0 then s.engaged_seconds
           else extract(epoch from s.ended_at - s.started_at) end as seconds,
      (s.pages > 1 or s.actions > 0 or s.signup_completed
        or greatest(s.engaged_seconds, extract(epoch from s.ended_at - s.started_at)) >= 10) as engaged
    from sess s
  ),
  -- A visitor is returning when they started a visit at least 30 minutes
  -- after their first visit we still hold: same day or a later day (217).
  -- The browser's own flag missed same-day returns and the period's first
  -- event was always the "new" one.
  visitor_history as (
    select e.visitor_hash, min(e.occurred_at) as first_seen_at
    from public.web_analytics_events e
    where e.occurred_at < p_to
      and e.user_id is null
      and e.visitor_hash in (select visitor_hash from pub)
    group by e.visitor_hash
  ),
  visitor_returns as (
    select h.visitor_hash,
      bool_or(s.started_at >= h.first_seen_at + interval '30 minutes') as returned
    from visitor_history h
    join sess s on s.visitor_hash = h.visitor_hash
    group by h.visitor_hash
  ),
  days as (
    -- Calendar days in p_tz (217; was UTC, which cut the owner's day at 5 pm).
    select generate_series(
      (p_from at time zone p_tz)::date,
      ((p_to - interval '1 microsecond') at time zone p_tz)::date,
      interval '1 day'
    )::date as day
  )
  select jsonb_build_object(
    'tracking_since', (select min(occurred_at) from public.web_analytics_events),
    'last_event_at', (select max(occurred_at) from public.web_analytics_events),
    'totals', (
      select jsonb_build_object(
        'pageviews', count(*) filter (where event_name = 'pageview'),
        'visitors', count(distinct visitor_hash),
        'sessions', count(distinct session_hash)
      )
      from pub
    ),
    'windows', jsonb_build_object(
      'today', (
        select count(distinct visitor_hash) from public.web_analytics_events
        where user_id is null
          and public.web_analytics_is_site_path(path)
          and not exists (select 1 from internal i where i.visitor_hash = web_analytics_events.visitor_hash)
          and occurred_at >= (date_trunc('day', p_to at time zone p_tz) at time zone p_tz) and occurred_at < p_to
      ),
      'last_7_days', (
        select count(distinct visitor_hash) from public.web_analytics_events
        where user_id is null
          and public.web_analytics_is_site_path(path)
          and not exists (select 1 from internal i where i.visitor_hash = web_analytics_events.visitor_hash)
          and occurred_at >= p_to - interval '7 days' and occurred_at < p_to
      ),
      'last_30_days', (
        select count(distinct visitor_hash) from public.web_analytics_events
        where user_id is null
          and public.web_analytics_is_site_path(path)
          and not exists (select 1 from internal i where i.visitor_hash = web_analytics_events.visitor_hash)
          and occurred_at >= p_to - interval '30 days' and occurred_at < p_to
      )
    ),
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'day', to_char(d.day, 'YYYY-MM-DD'),
        'pageviews', coalesce(x.pageviews, 0),
        'visitors', coalesce(x.visitors, 0),
        'sessions', coalesce(x.sessions, 0)
      ) order by d.day), '[]'::jsonb)
      from days d
      left join (
        select (occurred_at at time zone p_tz)::date as day,
          count(*) filter (where event_name = 'pageview') as pageviews,
          count(distinct visitor_hash) as visitors,
          count(distinct session_hash) as sessions
        from pub
        group by 1
      ) x on x.day = d.day
    ),
    'top_pages', (
      select coalesce(jsonb_agg(t order by t.pageviews desc), '[]'::jsonb)
      from (
        select path, count(*) as pageviews, count(distinct visitor_hash) as visitors
        from pub
        where event_name = 'pageview'
        group by path
        order by count(*) desc
        limit 15
      ) t
    ),
    'referrers', (
      select coalesce(jsonb_agg(t order by t.visitors desc), '[]'::jsonb)
      from (
        select referrer_host as host, count(*) as visitors
        from first_touch
        where referrer_host is not null and channel not in ('internal', 'direct')
        group by referrer_host
        order by count(*) desc
        limit 15
      ) t
    ),
    'channels', (
      select coalesce(jsonb_agg(t order by t.visitors desc), '[]'::jsonb)
      from (
        select channel, count(*) as visitors
        from first_touch
        group by channel
      ) t
    ),
    'devices', (
      select coalesce(jsonb_agg(t order by t.visitors desc), '[]'::jsonb)
      from (
        select device, count(*) as visitors
        from first_touch
        group by device
      ) t
    ),
    'returning', (
      select jsonb_build_object(
        'returning_visitors', count(*) filter (where r.returned),
        'new_visitors', count(*) filter (where not r.returned),
        'unknown_visitors', 0
      )
      from visitor_returns r
    ),
    'campaigns', (
      select coalesce(jsonb_agg(t order by t.visitors desc), '[]'::jsonb)
      from (
        select f.utm_source as source, f.utm_medium as medium, f.utm_campaign as campaign,
          count(*) as visitors,
          count(*) filter (where s.visitor_hash is not null) as signups
        from first_touch f
        left join signups s on s.visitor_hash = f.visitor_hash
        where f.utm_source is not null or f.utm_campaign is not null
        group by f.utm_source, f.utm_medium, f.utm_campaign
        order by count(*) desc
        limit 25
      ) t
    ),
    'funnel', (
      select jsonb_build_object(
        'visitors', count(distinct visitor_hash) filter (where user_id is null),
        'pricing_visitors', count(distinct visitor_hash) filter (where event_name = 'pageview' and path = '/pricing'),
        'signup_page_visitors', count(distinct visitor_hash) filter (where event_name = 'pageview' and path = '/signup'),
        'signup_started_visitors', count(distinct visitor_hash) filter (where event_name = 'signup_started'),
        'signup_completed_visitors', count(distinct visitor_hash) filter (where event_name = 'signup_completed')
      )
      from ev
    ),
    'channel_signups', (
      select coalesce(jsonb_agg(t order by t.signups desc), '[]'::jsonb)
      from (
        select f.channel, count(*) as visitors,
          count(*) filter (where s.visitor_hash is not null) as signups
        from first_touch f
        left join signups s on s.visitor_hash = f.visitor_hash
        group by f.channel
      ) t
    ),
    'excluded', (
      select jsonb_build_object(
        'visitors', count(distinct a.visitor_hash),
        'pageviews', count(*) filter (where a.event_name = 'pageview'),
        'marked_browsers', (select count(*) from internal)
      )
      from ev_all a
      where exists (select 1 from internal i where i.visitor_hash = a.visitor_hash)
    ),
    'engagement', (
      select jsonb_build_object(
        'sessions', count(*),
        'bounced_sessions', count(*) filter (where not engaged),
        'avg_pages', round(avg(pages)::numeric, 2),
        'median_seconds', percentile_cont(0.5) within group (order by seconds),
        'avg_seconds', round(avg(seconds)::numeric, 1),
        'timed_sessions', count(*) filter (where engaged_seconds > 0)
      )
      from sess_t
      where pages > 0
    ),
    'landing_pages', (
      select coalesce(jsonb_agg(t order by t.sessions desc), '[]'::jsonb)
      from (
        select paths[1] as path,
          count(*) as sessions,
          count(*) filter (where not engaged) as bounces,
          count(*) filter (where signup_started) as signup_starts,
          count(*) filter (where signup_completed) as signups
        from sess_t
        where pages > 0
        group by paths[1]
        order by count(*) desc
        limit 15
      ) t
    ),
    'exit_pages', (
      select coalesce(jsonb_agg(t order by t.sessions desc), '[]'::jsonb)
      from (
        select paths[array_length(paths, 1)] as path, count(*) as sessions
        from sess
        where pages > 1
        group by 1
        order by count(*) desc
        limit 15
      ) t
    ),
    'hourly', (
      select coalesce(jsonb_agg(jsonb_build_object('hour', h.hour, 'visitors', coalesce(x.visitors, 0)) order by h.hour), '[]'::jsonb)
      from generate_series(0, 23) as h(hour)
      left join (
        select extract(hour from occurred_at at time zone p_tz)::int as hour, count(distinct visitor_hash) as visitors
        from pub
        group by 1
      ) x on x.hour = h.hour
    ),
    'recent_sessions', (
      select coalesce(jsonb_agg(t order by t.started_at desc), '[]'::jsonb)
      from (
        select s.started_at, s.channel, s.referrer_host, s.utm_source, s.utm_medium, s.utm_campaign, s.device,
          (s.started_at >= h.first_seen_at + interval '30 minutes') as is_returning,
          s.pages, round(s.seconds::numeric, 0) as seconds,
          s.paths[1:15] as paths,
          s.signup_started, s.signup_completed, s.engaged
        from sess_t s
        left join visitor_history h on h.visitor_hash = s.visitor_hash
        where s.pages > 0
        order by s.started_at desc
        limit 100
      ) t
    ),
    'app', jsonb_build_object(
      'dau', (
        select count(distinct user_id) from public.web_analytics_events
        where user_id is not null and occurred_at >= p_to - interval '1 day' and occurred_at < p_to
      ),
      'wau', (
        select count(distinct user_id) from public.web_analytics_events
        where user_id is not null and occurred_at >= p_to - interval '7 days' and occurred_at < p_to
      ),
      'mau', (
        select count(distinct user_id) from public.web_analytics_events
        where user_id is not null and occurred_at >= p_to - interval '30 days' and occurred_at < p_to
      ),
      'active_user_ids', (
        select coalesce(jsonb_agg(distinct user_id), '[]'::jsonb)
        from ev where user_id is not null
      ),
      'daily_active_users', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'day', to_char(d.day, 'YYYY-MM-DD'),
          'users', coalesce(x.users, 0)
        ) order by d.day), '[]'::jsonb)
        from days d
        left join (
          select (occurred_at at time zone p_tz)::date as day, count(distinct user_id) as users
          from ev where user_id is not null
          group by 1
        ) x on x.day = d.day
      ),
      'features', (
        select coalesce(jsonb_agg(t order by t.users desc, t.views desc), '[]'::jsonb)
        from (
          select coalesce(nullif(split_part(path, '/', 2), ''), 'home') as area,
            count(distinct user_id) as users,
            count(*) as views
          from ev
          where user_id is not null and event_name = 'pageview'
          group by 1
          order by count(distinct user_id) desc, count(*) desc
          limit 30
        ) t
      )
    )
  );
$$;

-- The 209 engagement table lists deliberate actions; the new time beacon is not one.
create or replace function public.platform_web_analytics_engagement(
  p_from timestamptz,
  p_to timestamptz
)
returns jsonb
language sql
stable
set search_path = public, pg_temp
as $$
  with internal as (
    select visitor_hash from public.web_analytics_internal_visitors
  ),
  ev as (
    select e.event_name, e.event_label, e.visitor_hash
    from public.web_analytics_events e
    where e.occurred_at >= p_from
      and e.occurred_at < p_to
      and e.user_id is null
      and e.event_name not in ('pageview', 'page_engaged', 'signup_started', 'signup_completed')
      and not exists (select 1 from internal i where i.visitor_hash = e.visitor_hash)
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'event', g.event_name,
        'label', g.event_label,
        'events', g.events,
        'visitors', g.visitors
      )
      order by g.events desc, g.event_name, g.event_label
    ),
    '[]'::jsonb
  )
  from (
    select
      event_name,
      coalesce(event_label, '') as event_label,
      count(*) as events,
      count(distinct visitor_hash) as visitors
    from ev
    group by event_name, coalesce(event_label, '')
  ) g;
$$;

revoke all on function public.platform_web_analytics_summary(timestamptz, timestamptz, text) from public;
revoke all on function public.platform_web_analytics_summary(timestamptz, timestamptz, text) from anon;
revoke all on function public.platform_web_analytics_summary(timestamptz, timestamptz, text) from authenticated;
grant execute on function public.platform_web_analytics_summary(timestamptz, timestamptz, text) to service_role;

revoke all on function public.platform_web_analytics_engagement(timestamptz, timestamptz) from public;
revoke all on function public.platform_web_analytics_engagement(timestamptz, timestamptz) from anon;
revoke all on function public.platform_web_analytics_engagement(timestamptz, timestamptz) from authenticated;
grant execute on function public.platform_web_analytics_engagement(timestamptz, timestamptz) to service_role;
