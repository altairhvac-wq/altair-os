-- Migration 174: a security audit trail for authentication events.
--
-- ============================== THE GAP ==============================
-- membership_activities already records the company-scoped half of this:
-- team_invite_created, invite_accepted, member_role_changed, member_suspended,
-- member_reactivated, company_switched. Those are not duplicated here.
--
-- What has no record at all is everything that happens BEFORE a company
-- context exists, or without one:
--
--   a sign-in succeeding or failing
--   a sign-up
--   a password reset being requested
--   a password actually being changed
--   a request being refused by the rate limiter
--   a public approval or checkout token being used
--
-- So today there is no way to answer "was this account signed into from
-- somewhere unusual", "did a reset get requested before that role change", or
-- "how long had the brute force been running" -- not because the answer is
-- unavailable, but because nothing writes it down.
--
-- membership_activities cannot hold these: its company_id is NOT NULL, and a
-- failed sign-in has no company and often no user.
--
-- ============================== WHAT IS NOT STORED ==============================
-- No password, no token, no session, no email address, no IP address.
--
-- The address and the account named are stored as HASHES, produced by the same
-- helper the rate limiter uses. That is enough to answer the questions that
-- matter -- "the same address", "the same account", "how many, how fast" --
-- and not enough to reconstruct a person's activity from a database dump.
--
-- `reason` is a short bounded code, never a message: provider error strings
-- have been known to carry the submitted address.
--
-- ============================== RETENTION IS A DECISION, NOT A DEFAULT ==============================
-- sweep_security_audit_events takes the retention in days. A default of 180 is
-- offered because an unbounded security log is itself a liability, but how long
-- these must be kept is a legal and policy question this migration cannot
-- answer. Until someone decides, nothing sweeps automatically: the function
-- exists and is not scheduled.
--
-- ============================== PRIVILEGES ==============================
-- service_role only, for both the table and the recorder. These events describe
-- authentication attempts including failures, so a signed-in user reading them
-- for their own company would be reading a list of who tried to get in and
-- when. No read path is exposed until something needs one; today the operator
-- reads them with the service role.

begin;

create table if not exists public.security_audit_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  outcome text not null,
  -- Nullable throughout: a failed sign-in has no established user, and a reset
  -- request may name an address that belongs to nobody.
  user_id uuid references public.profiles (id) on delete set null,
  company_id uuid references public.companies (id) on delete cascade,
  -- A hash of the account identifier. NEVER the address.
  subject_hash text,
  -- A hash of the caller's address. NEVER the address.
  address_hash text,
  -- A short code such as 'invalid_credentials' or 'rate_limited'.
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint security_audit_events_event_type_len
    check (char_length(event_type) between 1 and 64),
  constraint security_audit_events_outcome_check
    check (outcome in ('succeeded', 'failed', 'refused')),
  constraint security_audit_events_reason_len
    check (reason is null or char_length(reason) between 1 and 64),
  constraint security_audit_events_subject_hash_len
    check (subject_hash is null or char_length(subject_hash) between 16 and 128),
  constraint security_audit_events_address_hash_len
    check (address_hash is null or char_length(address_hash) between 16 and 128)
);

comment on table public.security_audit_events is
  'Authentication and public-surface security events. Stores hashes, never an address, email, token or password. Company-scoped membership and role changes live in membership_activities and are not duplicated here.';

-- "What happened to this account", newest first.
create index if not exists security_audit_events_subject_created_at_idx
  on public.security_audit_events (subject_hash, created_at desc)
  where subject_hash is not null;

-- "What came from this address", newest first.
create index if not exists security_audit_events_address_created_at_idx
  on public.security_audit_events (address_hash, created_at desc)
  where address_hash is not null;

-- "What happened recently", and the retention sweep.
create index if not exists security_audit_events_created_at_idx
  on public.security_audit_events (created_at desc);

alter table public.security_audit_events enable row level security;

-- No policies: reached only through the SECURITY DEFINER function below.
revoke all on table public.security_audit_events from public;
revoke all on table public.security_audit_events from anon;
revoke all on table public.security_audit_events from authenticated;
grant all on table public.security_audit_events to service_role;

-- ---------------------------------------------------------------------------
-- Recorder
-- ---------------------------------------------------------------------------
--
-- A function rather than a direct insert so the shape is enforced in one place
-- and the table stays unreachable from any other role. It returns the row id so
-- a caller can correlate, and nothing else.

create or replace function public.record_security_audit_event(
  p_event_type text,
  p_outcome text,
  p_user_id uuid default null,
  p_company_id uuid default null,
  p_subject_hash text default null,
  p_address_hash text default null,
  p_reason text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $function$
declare
  v_id uuid;
begin
  if p_event_type is null or p_outcome is null then
    raise exception 'security_audit_event_required_fields';
  end if;

  insert into public.security_audit_events (
    event_type, outcome, user_id, company_id,
    subject_hash, address_hash, reason, metadata
  )
  values (
    p_event_type, p_outcome, p_user_id, p_company_id,
    p_subject_hash, p_address_hash, p_reason,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$function$;

revoke all on function public.record_security_audit_event(
  text, text, uuid, uuid, text, text, text, jsonb
) from public;
revoke all on function public.record_security_audit_event(
  text, text, uuid, uuid, text, text, text, jsonb
) from anon;
revoke all on function public.record_security_audit_event(
  text, text, uuid, uuid, text, text, text, jsonb
) from authenticated;
grant execute on function public.record_security_audit_event(
  text, text, uuid, uuid, text, text, text, jsonb
) to service_role;

-- ---------------------------------------------------------------------------
-- Retention sweep
-- ---------------------------------------------------------------------------
--
-- Not scheduled. See the retention note in the header: how long these are kept
-- is a decision someone has to make, and picking one here by writing a cron
-- entry would be making it silently.

create or replace function public.sweep_security_audit_events(
  p_retain_days integer default 180
)
returns integer
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $function$
declare
  v_deleted integer;
begin
  if p_retain_days is null or p_retain_days < 1 then
    raise exception 'security_audit_retention_days_required';
  end if;

  delete from public.security_audit_events
  where created_at < now() - make_interval(days => p_retain_days);
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$function$;

revoke all on function public.sweep_security_audit_events(integer) from public;
revoke all on function public.sweep_security_audit_events(integer) from anon;
revoke all on function public.sweep_security_audit_events(integer) from authenticated;
grant execute on function public.sweep_security_audit_events(integer) to service_role;

commit;
