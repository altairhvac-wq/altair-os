-- Migration 173: durable rate limiting for unauthenticated surfaces.
--
-- ============================== WHAT IS UNPROTECTED TODAY ==============================
-- Every one of these can be called by anyone, as often as they like:
--
--   loginAction                            password guessing, user enumeration
--   signupAction                           account-creation flooding
--   requestPasswordResetAction             mail flooding against any address
--   updatePasswordAction                   reset-token guessing
--   submitPublicEstimateApprovalAction     approval-token guessing, and it
--                                          WRITES a signature and converts an
--                                          estimate into a job
--   createPublicInvoiceCheckoutSessionAction  payment-token guessing, and it
--                                          creates Stripe checkout sessions
--   the public estimate and invoice token PAGES   token enumeration
--
-- Supabase applies some limits of its own to auth calls -- the login path
-- already handles over_email_send_rate_limit -- but those are the provider's,
-- they do not cover our own token surfaces, and they are not something this
-- application can reason about or tune.
--
-- ============================== WHY THIS IS IN POSTGRES ==============================
-- A counter in module scope is per-instance. The application runs serverless on
-- Vercel, where instances are created and discarded per request burst, so an
-- in-memory limiter is bypassed by concurrency alone -- the attacker does not
-- even have to try. Migration 155 made the same move for AI requests and the
-- reasoning is identical.
--
-- The counter is advanced by a single INSERT ... ON CONFLICT DO UPDATE that
-- returns the post-update state, so two concurrent requests cannot both read
-- "count = 4" and both write 5.
--
-- ============================== NO RAW IDENTIFIERS ARE STORED ==============================
-- The subject column holds a HASH, never an address, an email or a token. The
-- caller hashes before it gets here (lib/security/public-rate-limit.ts), so a
-- database dump reveals which buckets were busy and nothing about who was in
-- them. Nothing in this table is readable by anon or authenticated at all.
--
-- ============================== PRIVILEGES ==============================
-- Unlike the reports aggregates, this is NOT called by a signed-in user: by
-- definition the caller has no session. It is therefore service_role only, and
-- the server action that calls it is the boundary. A browser cannot reach the
-- function to advance, read or reset a counter.

begin;

create table if not exists public.public_request_rate_limits (
  -- The endpoint being protected, e.g. 'auth.login'.
  scope text not null,
  -- The dimension within that endpoint: 'ip', 'email', 'token'.
  dimension text not null,
  -- A hash of the subject. NEVER the subject itself.
  subject_hash text not null,
  window_started_at timestamptz not null default now(),
  window_count integer not null default 0,
  last_request_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (scope, dimension, subject_hash),
  constraint public_request_rate_limits_scope_len
    check (char_length(scope) between 1 and 64),
  constraint public_request_rate_limits_dimension_len
    check (char_length(dimension) between 1 and 16),
  constraint public_request_rate_limits_subject_len
    check (char_length(subject_hash) between 16 and 128),
  constraint public_request_rate_limits_count_check
    check (window_count >= 0)
);

comment on table public.public_request_rate_limits is
  'Durable counters for unauthenticated endpoints. One row per (scope, dimension, subject hash); advanced atomically by check_public_request_rate_limit so a limit holds across serverless instances. subject_hash is a hash — never an IP, email or token.';

-- The sweep below, and nothing else, reads by time.
create index if not exists public_request_rate_limits_updated_at_idx
  on public.public_request_rate_limits (updated_at);

alter table public.public_request_rate_limits enable row level security;

-- No policies: reached only through the SECURITY DEFINER function below.
revoke all on table public.public_request_rate_limits from public;
revoke all on table public.public_request_rate_limits from anon;
revoke all on table public.public_request_rate_limits from authenticated;
grant all on table public.public_request_rate_limits to service_role;

-- ---------------------------------------------------------------------------
-- Check and advance, atomically
-- ---------------------------------------------------------------------------
--
-- Returns { allowed, count, limit, retryAfterSeconds }.
--
-- The window is fixed, not sliding: when it expires the counter restarts. A
-- sliding window would need per-request rows, which is a much larger table for
-- a control whose job is to make brute force impractical rather than to meter
-- precisely.
--
-- A request that is REFUSED still advances the counter. Otherwise an attacker
-- at the limit could keep trying forever at exactly the limit rate; making
-- refusals count means sustained abuse extends its own lockout.

create or replace function public.check_public_request_rate_limit(
  p_scope text,
  p_dimension text,
  p_subject_hash text,
  p_window_seconds integer,
  p_limit integer
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $function$
declare
  v_now timestamptz := now();
  v_window_start timestamptz;
  v_count integer;
begin
  if p_scope is null or p_dimension is null or p_subject_hash is null then
    raise exception 'rate_limit_arguments_required';
  end if;

  if p_window_seconds is null or p_window_seconds < 1
     or p_limit is null or p_limit < 1 then
    raise exception 'rate_limit_bounds_required';
  end if;

  insert into public.public_request_rate_limits as existing (
    scope, dimension, subject_hash,
    window_started_at, window_count, last_request_at, updated_at
  )
  values (p_scope, p_dimension, p_subject_hash, v_now, 1, v_now, v_now)
  on conflict (scope, dimension, subject_hash) do update
    set
      -- Expired window: restart. Otherwise: advance.
      window_started_at = case
        when existing.window_started_at
             < v_now - make_interval(secs => p_window_seconds)
          then v_now
        else existing.window_started_at
      end,
      window_count = case
        when existing.window_started_at
             < v_now - make_interval(secs => p_window_seconds)
          then 1
        else existing.window_count + 1
      end,
      last_request_at = v_now,
      updated_at = v_now
  returning window_started_at, window_count
  into v_window_start, v_count;

  return jsonb_build_object(
    'allowed', v_count <= p_limit,
    'count', v_count,
    'limit', p_limit,
    'retryAfterSeconds',
      greatest(
        0,
        ceil(
          extract(
            epoch from (
              v_window_start + make_interval(secs => p_window_seconds) - v_now
            )
          )
        )::integer
      )
  );
end;
$function$;

revoke all on function public.check_public_request_rate_limit(
  text, text, text, integer, integer
) from public;
revoke all on function public.check_public_request_rate_limit(
  text, text, text, integer, integer
) from anon;
revoke all on function public.check_public_request_rate_limit(
  text, text, text, integer, integer
) from authenticated;
grant execute on function public.check_public_request_rate_limit(
  text, text, text, integer, integer
) to service_role;

-- ---------------------------------------------------------------------------
-- Sweep
-- ---------------------------------------------------------------------------
--
-- Counters are only meaningful inside their window. Rows untouched for a day
-- cannot affect any decision, and keeping them would turn a rate limiter into a
-- log of which hashed subjects visited and when — which is exactly the record
-- this table was designed not to hold.

create or replace function public.sweep_public_request_rate_limits(
  p_older_than_hours integer default 24
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
  delete from public.public_request_rate_limits
  where updated_at < now() - make_interval(hours => greatest(1, p_older_than_hours));
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$function$;

revoke all on function public.sweep_public_request_rate_limits(integer) from public;
revoke all on function public.sweep_public_request_rate_limits(integer) from anon;
revoke all on function public.sweep_public_request_rate_limits(integer)
  from authenticated;
grant execute on function public.sweep_public_request_rate_limits(integer)
  to service_role;

commit;
