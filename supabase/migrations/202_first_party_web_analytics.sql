-- Migration 202: first-party, cookieless web analytics for the Platform owner.
--
-- ===================== WHY =====================
-- Altair had no record of website traffic at all: no visitors, no referrers,
-- no UTM campaigns, no signup-start events, no active-user counts. The owner
-- is about to drive traffic from YouTube / TikTok / Facebook and could not
-- tell which video produced a signup. Vercel Web Analytics is not enabled and
-- the Meta Pixel reports to Meta, not to us. This adds the smallest store that
-- answers those questions.
--
-- ===================== WHAT IS STORED (AND WHAT IS NOT) =====================
-- Stored: event name, a sanitised path (token pages reduced to their prefix,
-- no query string), the referrer HOST only, UTM parameters, a channel label,
-- a coarse device class, an HMAC of a random browser-generated visitor id,
-- an HMAC of a per-tab session id, and — for signed-in product use only — the
-- user id.
-- Not stored: IP addresses, user agents, full referrer URLs, query strings,
-- emails, names, or anything typed into a form.
--
-- Platform owners are excluded at ingest, as are non-production hosts, bots,
-- and browsers sending Global Privacy Control / Do Not Track.
--
-- ===================== WHO CAN READ IT =====================
-- Nobody but the service role. These rows are platform-wide (anonymous
-- visitors belong to no company), so the tenant pattern of an authenticated
-- SELECT narrowed by company does not apply; there is no authenticated grant
-- and no policy for it. The Platform analytics page reads them through
-- platform_web_analytics_summary with the service role, after the app has
-- authorised a platform admin. Reviewed exception in
-- scripts/verify-integration-migrations.mjs (PLATFORM_ONLY_TABLES).
--
-- ===================== RETENTION =====================
-- Not swept yet. At current volume this is small; a retention sweep belongs in
-- billing-maintenance once traffic justifies it (documented follow-up).

create table if not exists public.web_analytics_events (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  event_name text not null,
  path text not null,
  referrer_host text,
  channel text not null default 'unknown',
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  visitor_hash text not null,
  session_hash text,
  device text not null default 'unknown',
  is_returning boolean,
  user_id uuid references auth.users (id) on delete set null,
  dedupe_key text not null,
  constraint web_analytics_events_event_name_check
    check (event_name in ('pageview', 'signup_started', 'signup_completed')),
  constraint web_analytics_events_channel_check
    check (channel in ('direct', 'search', 'social', 'email', 'paid', 'referral', 'internal', 'unknown')),
  constraint web_analytics_events_device_check
    check (device in ('mobile', 'tablet', 'desktop', 'unknown')),
  constraint web_analytics_events_path_len
    check (char_length(path) between 1 and 512),
  constraint web_analytics_events_field_lengths
    check (
      coalesce(char_length(referrer_host), 0) <= 255
      and coalesce(char_length(utm_source), 0) <= 100
      and coalesce(char_length(utm_medium), 0) <= 100
      and coalesce(char_length(utm_campaign), 0) <= 150
      and coalesce(char_length(utm_content), 0) <= 150
      and coalesce(char_length(utm_term), 0) <= 150
      and coalesce(char_length(session_hash), 0) <= 128
      and char_length(dedupe_key) between 8 and 80
    ),
  constraint web_analytics_events_visitor_hash_len
    check (char_length(visitor_hash) between 16 and 128)
);

comment on table public.web_analytics_events is
  'First-party cookieless analytics: pageviews and signup funnel events. Hashed visitor/session ids only; no IP, user agent, query string or form data. Service role only; read by the Platform analytics page.';

-- One row per client event id: a retried beacon cannot double-count.
create unique index if not exists web_analytics_events_dedupe_key_idx
  on public.web_analytics_events (dedupe_key);

create index if not exists web_analytics_events_occurred_at_idx
  on public.web_analytics_events (occurred_at desc);

create index if not exists web_analytics_events_name_occurred_at_idx
  on public.web_analytics_events (event_name, occurred_at desc);

create index if not exists web_analytics_events_user_occurred_at_idx
  on public.web_analytics_events (user_id, occurred_at desc)
  where user_id is not null;

alter table public.web_analytics_events enable row level security;

revoke all on table public.web_analytics_events from public;
revoke all on table public.web_analytics_events from anon;
revoke all on table public.web_analytics_events from authenticated;
grant all on table public.web_analytics_events to service_role;

-- ===================== AGGREGATION =====================
-- One round trip for the whole traffic / funnel / product-usage picture, so the
-- Platform page never pulls raw rows. Days are UTC. "Public" traffic is
-- anonymous visitors (user_id null); product usage is signed-in users.
-- Channel, device and campaign are attributed by each visitor's FIRST event in
-- the range, so one person is one row per breakdown.

create or replace function public.platform_web_analytics_summary(
  p_from timestamptz,
  p_to timestamptz
)
returns jsonb
language sql
stable
set search_path = public, pg_temp
as $$
  with ev as (
    select *
    from public.web_analytics_events e
    where e.occurred_at >= p_from
      and e.occurred_at < p_to
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
          and occurred_at >= date_trunc('day', p_to, 'UTC') and occurred_at < p_to
      ),
      'last_7_days', (
        select count(distinct visitor_hash) from public.web_analytics_events
        where user_id is null
          and occurred_at >= p_to - interval '7 days' and occurred_at < p_to
      ),
      'last_30_days', (
        select count(distinct visitor_hash) from public.web_analytics_events
        where user_id is null
          and occurred_at >= p_to - interval '30 days' and occurred_at < p_to
      )
    ),
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'day', to_char(d.day, 'YYYY-MM-DD'),
        'pageviews', coalesce(x.pageviews, 0),
        'visitors', coalesce(x.visitors, 0)
      ) order by d.day), '[]'::jsonb)
      from days d
      left join (
        select date_trunc('day', occurred_at, 'UTC') as day,
          count(*) filter (where event_name = 'pageview') as pageviews,
          count(distinct visitor_hash) as visitors
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

comment on function public.platform_web_analytics_summary(timestamptz, timestamptz) is
  'Platform analytics: traffic, attribution, funnel and product-usage aggregates over web_analytics_events for [p_from, p_to). Service role only.';

revoke all on function public.platform_web_analytics_summary(timestamptz, timestamptz) from public;
revoke all on function public.platform_web_analytics_summary(timestamptz, timestamptz) from anon;
revoke all on function public.platform_web_analytics_summary(timestamptz, timestamptz) from authenticated;
grant execute on function public.platform_web_analytics_summary(timestamptz, timestamptz) to service_role;
