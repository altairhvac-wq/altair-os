-- 206: first-party analytics - the owner's own browsers leave the figures, and session-level detail.
--
-- ==================== WHY ====================
-- The 202 tracker already skips a signed-in platform admin, but the owner also browses the public site signed out (phone,
-- laptop, the tooling used to set up integrations), and every one of those visits counted as a new visitor: on
-- 2026-10-25 most of the "11 visitors" were the owner's setup session plus Search Console's renderer.
--
-- ==================== WHAT THIS ADDS ====================
-- 1. web_analytics_internal_visitors: HMACs of browser ids that belong to the owner. The collect route marks a browser
--    when a platform admin (or a plus-alias of one) is signed in on it, the signup action marks the browser of an
--    owner test signup, and `?altair_analytics=off` sends a one-off `exclude_device` beacon. Service role only.
-- 2. platform_web_analytics_summary replaced (same first two arguments, plus an optional p_tz for the hour-of-day
--    panel): every figure leaves out marked browsers - retroactively, so the owner's earlier visits drop out too -
--    and the result gains `excluded` (what was left out), `engagement` (bounce, pages per session, time on site),
--    `landing_pages`, `exit_pages`, `hourly`, `recent_sessions` (one row per visit: source, entry page, the pages in
--    order, length, signup outcome) and sessions per day.
--
-- Nothing is deleted: excluded rows stay in web_analytics_events (and age out with the 203 retention sweep).
-- Rollback: re-run the function from 202 and drop the table.

create table if not exists public.web_analytics_internal_visitors (
  visitor_hash text primary key,
  reason text not null default 'manual',
  first_marked_at timestamptz not null default now(),
  last_marked_at timestamptz not null default now(),
  constraint web_analytics_internal_visitors_hash_len check (char_length(visitor_hash) between 16 and 128),
  constraint web_analytics_internal_visitors_reason_check check (reason in ('platform_admin', 'internal_account', 'manual'))
);

comment on table public.web_analytics_internal_visitors is
  'Browsers that belong to the owner (HMAC of the analytics browser id). Every event from these is left out of the website figures. Service role only.';

alter table public.web_analytics_internal_visitors enable row level security;

revoke all on table public.web_analytics_internal_visitors from public;
revoke all on table public.web_analytics_internal_visitors from anon;
revoke all on table public.web_analytics_internal_visitors from authenticated;
grant all on table public.web_analytics_internal_visitors to service_role;

-- The 2-argument function from 202 is replaced by the 3-argument one (p_tz has a default, so existing 2-argument calls
-- keep working); drop the old signature first so the call is not ambiguous.
drop function if exists public.platform_web_analytics_summary(timestamptz, timestamptz);

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
    select * from ev where user_id is null
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
  days as (
    select generate_series(
      date_trunc('day', p_from, 'UTC'),
      date_trunc('day', p_to - interval '1 microsecond', 'UTC'),
      interval '1 day'
    ) as day
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
          and not exists (select 1 from internal i where i.visitor_hash = web_analytics_events.visitor_hash)
          and occurred_at >= date_trunc('day', p_to, 'UTC') and occurred_at < p_to
      ),
      'last_7_days', (
        select count(distinct visitor_hash) from public.web_analytics_events
        where user_id is null
          and not exists (select 1 from internal i where i.visitor_hash = web_analytics_events.visitor_hash)
          and occurred_at >= p_to - interval '7 days' and occurred_at < p_to
      ),
      'last_30_days', (
        select count(distinct visitor_hash) from public.web_analytics_events
        where user_id is null
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
        select date_trunc('day', occurred_at, 'UTC') as day,
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
        'returning_visitors', count(distinct visitor_hash) filter (where is_returning is true),
        'new_visitors', count(distinct visitor_hash) filter (where is_returning is false),
        'unknown_visitors', count(distinct visitor_hash) filter (where is_returning is null)
      )
      from (
        select distinct on (visitor_hash) visitor_hash, is_returning
        from pub
        order by visitor_hash, occurred_at
      ) v
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
        'bounced_sessions', count(*) filter (where pages <= 1),
        'avg_pages', round(avg(pages)::numeric, 2),
        'median_seconds', percentile_cont(0.5) within group (
          order by extract(epoch from ended_at - started_at)
        ) filter (where pages > 1),
        'avg_seconds', round((avg(extract(epoch from ended_at - started_at)) filter (where pages > 1))::numeric, 1)
      )
      from sess
      where pages > 0
    ),
    'landing_pages', (
      select coalesce(jsonb_agg(t order by t.sessions desc), '[]'::jsonb)
      from (
        select paths[1] as path,
          count(*) as sessions,
          count(*) filter (where pages <= 1) as bounces,
          count(*) filter (where signup_started) as signup_starts,
          count(*) filter (where signup_completed) as signups
        from sess
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
        select started_at, channel, referrer_host, utm_source, utm_medium, utm_campaign, device, is_returning,
          pages, round(extract(epoch from ended_at - started_at)::numeric, 0) as seconds,
          paths[1:15] as paths,
          signup_started, signup_completed
        from sess
        where pages > 0
        order by started_at desc
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
          select date_trunc('day', occurred_at, 'UTC') as day, count(distinct user_id) as users
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

revoke all on function public.platform_web_analytics_summary(timestamptz, timestamptz, text) from public;
revoke all on function public.platform_web_analytics_summary(timestamptz, timestamptz, text) from anon;
revoke all on function public.platform_web_analytics_summary(timestamptz, timestamptz, text) from authenticated;
grant execute on function public.platform_web_analytics_summary(timestamptz, timestamptz, text) to service_role;
