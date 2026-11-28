-- Migration 209: what visitors DO on the public site, and an opt-in email list
-- for the free calculators.
--
-- Website audit 2026-11-12, items 12 and 10.
--
-- ============================ PART 1: ENGAGEMENT ============================
-- web_analytics_events (202) records that a page was opened and that someone
-- began the signup form. It cannot say whether anyone played the video,
-- pressed a trial button, used a calculator or downloaded a template, so every
-- decision about the site has been a guess. This part lets the same table
-- carry those actions.
--
--   event_name   six new names, each one deliberate action by a visitor.
--   event_label  WHICH video / calculator / template / button. A short
--                machine slug chosen by our own code (never free text, never
--                a value the visitor typed): the calculator's slug, the
--                template's id, a button's name.
--
-- Nothing a visitor enters is ever stored here. A "calculator_used" event
-- says the labor-rate calculator was used; it does not carry the wage typed
-- into it. Everything 202 and 206 established still holds: hashed browser
-- ids only, no IP address, no user agent, service role only, the owner's own
-- browsers excluded from every figure.
--
-- ======================= PART 2: RESOURCE SUBSCRIBERS =======================
-- A calculator visitor can ask to have their result emailed to them, and can
-- separately tick a box to hear about new tools. Only people who tick the box
-- are stored, and only as "pending" until they press the confirmation link in
-- that email (double opt-in). The address is the only personal data kept.
-- Calculator inputs are NOT stored: they travel in the request, go into the
-- one email and are gone.
--
-- No token column: the confirm and unsubscribe links are signed from the row
-- id with the server's HMAC secret (lib/resources/subscribers.ts), so there is
-- no stored token to leak and a link in an old email keeps working.
--
-- Additive only. Applying this migration changes no existing row.

-- ---------------------------------------------------------------- part 1

alter table public.web_analytics_events
  drop constraint if exists web_analytics_events_event_name_check;

alter table public.web_analytics_events
  add constraint web_analytics_events_event_name_check
  check (event_name in (
    'pageview',
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
  add column if not exists event_label text;

alter table public.web_analytics_events
  drop constraint if exists web_analytics_events_event_label_format;

alter table public.web_analytics_events
  add constraint web_analytics_events_event_label_format
  check (event_label is null or event_label ~ '^[a-z0-9][a-z0-9_-]{0,63}$');

comment on column public.web_analytics_events.event_label is
  'Which video, calculator, template or button the event is about. A slug chosen by application code; never visitor input.';

create index if not exists web_analytics_events_engagement_idx
  on public.web_analytics_events (event_name, event_label, occurred_at desc)
  where event_name not in ('pageview', 'signup_started', 'signup_completed');

-- One round trip for the engagement table on the Platform analytics page.
-- Same rules as platform_web_analytics_summary (206): the owner's own browsers
-- are left out, and only anonymous public traffic is counted.
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
      and e.event_name not in ('pageview', 'signup_started', 'signup_completed')
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

comment on function public.platform_web_analytics_engagement(timestamptz, timestamptz) is
  'Counts of deliberate visitor actions (video plays, trial-button clicks, calculator use, downloads) by event and label. Public traffic only, owner browsers excluded. Service role only.';

revoke all on function public.platform_web_analytics_engagement(timestamptz, timestamptz) from public;
revoke all on function public.platform_web_analytics_engagement(timestamptz, timestamptz) from anon;
revoke all on function public.platform_web_analytics_engagement(timestamptz, timestamptz) from authenticated;
grant execute on function public.platform_web_analytics_engagement(timestamptz, timestamptz) to service_role;

-- ---------------------------------------------------------------- part 2

create table if not exists public.resource_email_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  status text not null default 'pending',
  source text not null,
  consent_text text not null,
  created_at timestamptz not null default now(),
  last_requested_at timestamptz not null default now(),
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  constraint resource_email_subscribers_email_shape
    check (
      email = lower(email)
      and char_length(email) between 6 and 254
      and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    ),
  constraint resource_email_subscribers_status_check
    check (status in ('pending', 'confirmed', 'unsubscribed')),
  constraint resource_email_subscribers_source_format
    check (source ~ '^[a-z0-9][a-z0-9_-]{0,63}$'),
  constraint resource_email_subscribers_consent_len
    check (char_length(consent_text) between 10 and 400)
);

comment on table public.resource_email_subscribers is
  'People who ticked "send me new tools" on a free calculator. Double opt-in: pending until the emailed link is pressed. Email address only; no calculator inputs. Service role only.';

create unique index if not exists resource_email_subscribers_email_idx
  on public.resource_email_subscribers (email);

create index if not exists resource_email_subscribers_status_idx
  on public.resource_email_subscribers (status, created_at desc);

alter table public.resource_email_subscribers enable row level security;

revoke all on table public.resource_email_subscribers from public;
revoke all on table public.resource_email_subscribers from anon;
revoke all on table public.resource_email_subscribers from authenticated;
grant all on table public.resource_email_subscribers to service_role;
