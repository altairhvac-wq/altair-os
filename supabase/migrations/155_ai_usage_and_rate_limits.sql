-- Migration 155: durable AI rate limiting and spend accounting.
--
-- ============================== THE DEFECT ==============================
-- lib/ai/guardrails.ts enforced a 10-second cooldown and 10 calls per rolling
-- 5-minute window per (company, user, feature) — in a module-level Map. The
-- file said so itself: "V1 guardrail is process-local".
--
-- On Vercel every cold lambda starts with an empty Map, so the limit is
-- per-instance and effectively unenforced. There is no spend ceiling at all,
-- and although lib/ai/provider.ts already reads prompt_tokens and
-- completion_tokens back from OpenAI, nothing persists them — the accounting
-- hook exists and its output is discarded.
--
-- ============================== WHY POSTGRES, NOT REDIS ==============================
-- The workload is a handful of calls per user per hour behind a 10-second
-- cooldown. A single row-locked upsert is ample. Redis would add a second
-- stateful dependency to operate, secure, back up and restore for no additional
-- safety on this load — and this codebase already has a proven atomic-counter
-- pattern in migration 148's allocator, which this reuses.
--
-- ============================== FAILURE SEMANTICS ==============================
-- Deliberately asymmetric, because the two checks protect different things:
--
--   SPEND CEILING  fails CLOSED. If the ceiling cannot be evaluated, refuse.
--                  An unbounded bill on a shared provider key is worse than a
--                  missing draft.
--   SHORT WINDOW   fails OPEN. If the counter cannot be read, allow. A
--                  transient database hiccup should not disable a UI
--                  affordance, and the ceiling is still the real bound.
--
-- Both degraded paths are reported to the error monitor by the caller.
--
-- ============================== PRIVACY ==============================
-- The usage ledger records WHAT WAS SPENT, never WHAT WAS SAID. There is no
-- prompt column, no completion column, and no place to put one. Token counts,
-- model name, feature name and actor are sufficient for every question spend
-- control needs to answer, and a table of customer prompts would be a far
-- larger liability than the problem it solves.
--
-- ============================== SAFETY ==============================
-- Adds two tables and two functions. Reads and writes no existing table. No
-- policy on any existing table changes.

-- ---------------------------------------------------------------------------
-- 1. Short-window counters
-- ---------------------------------------------------------------------------
--
-- One row per (company, user, feature), mirroring the shape of the in-memory
-- RateLimitEntry it replaces: last request timestamp for the cooldown, plus a
-- rolling window start and count for the burst limit.

create table if not exists public.ai_rate_limit_counters (
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  feature text not null,
  last_request_at timestamptz,
  window_started_at timestamptz,
  window_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (company_id, user_id, feature),
  constraint ai_rate_limit_counters_window_count_check check (window_count >= 0),
  constraint ai_rate_limit_counters_feature_length_check
    check (char_length(feature) between 1 and 64)
);

comment on table public.ai_rate_limit_counters is
  'Durable replacement for the process-local AI rate limiter. One row per (company, user, feature); advanced atomically by check_and_record_ai_request so the limit holds across serverless instances.';

alter table public.ai_rate_limit_counters enable row level security;

-- No policies: reached only through the SECURITY DEFINER function below.
revoke all on table public.ai_rate_limit_counters from public;
revoke all on table public.ai_rate_limit_counters from anon;
revoke all on table public.ai_rate_limit_counters from authenticated;
grant all on table public.ai_rate_limit_counters to service_role;

-- ---------------------------------------------------------------------------
-- 2. Usage ledger
-- ---------------------------------------------------------------------------

create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  -- Nullable: some AI work runs from cron with no user actor.
  user_id uuid references public.profiles (id) on delete set null,
  feature text not null,
  model text,
  prompt_tokens integer not null default 0,
  completion_tokens integer not null default 0,
  total_tokens integer generated always as (prompt_tokens + completion_tokens) stored,
  created_at timestamptz not null default now(),
  constraint ai_usage_events_prompt_tokens_check check (prompt_tokens >= 0),
  constraint ai_usage_events_completion_tokens_check check (completion_tokens >= 0),
  constraint ai_usage_events_feature_length_check
    check (char_length(feature) between 1 and 64)
);

comment on table public.ai_usage_events is
  'AI token accounting. Records what was SPENT, never what was said: there is no prompt or completion column and none should be added. Written by record_ai_usage after each successful provider call.';

-- The month-to-date ceiling query: company plus a created_at range.
create index if not exists ai_usage_events_company_created_at_idx
  on public.ai_usage_events (company_id, created_at desc);

-- Per-company, per-feature reporting.
create index if not exists ai_usage_events_company_feature_created_at_idx
  on public.ai_usage_events (company_id, feature, created_at desc);

alter table public.ai_usage_events enable row level security;

revoke all on table public.ai_usage_events from public;
revoke all on table public.ai_usage_events from anon;

-- Readable by company members who can already see company administration, so
-- an owner can answer "what is this costing us". Writes go through the
-- SECURITY DEFINER recorder only — a client that could INSERT here could
-- forge usage and evade the ceiling.
create policy "company admins can read ai usage"
on public.ai_usage_events
for select
to authenticated
using (
  public.is_active_company_member(company_id)
  and public.can_manage_billing(company_id)
);

grant select on table public.ai_usage_events to authenticated;
grant all on table public.ai_usage_events to service_role;

-- ---------------------------------------------------------------------------
-- 3. Per-company ceiling
-- ---------------------------------------------------------------------------

create table if not exists public.company_ai_limits (
  company_id uuid primary key references public.companies (id) on delete cascade,
  -- Null means "use the platform default" rather than "unlimited", so a missing
  -- row can never mean uncapped spend.
  monthly_token_ceiling bigint,
  updated_at timestamptz not null default now(),
  constraint company_ai_limits_ceiling_check
    check (monthly_token_ceiling is null or monthly_token_ceiling > 0)
);

comment on table public.company_ai_limits is
  'Optional per-company monthly AI token ceiling. A NULL ceiling means the platform default applies — never unlimited, so a company with no row cannot spend without bound.';

alter table public.company_ai_limits enable row level security;

revoke all on table public.company_ai_limits from public;
revoke all on table public.company_ai_limits from anon;

create policy "company admins can read ai limits"
on public.company_ai_limits
for select
to authenticated
using (
  public.is_active_company_member(company_id)
  and public.can_manage_billing(company_id)
);

grant select on table public.company_ai_limits to authenticated;
grant all on table public.company_ai_limits to service_role;

-- ---------------------------------------------------------------------------
-- 4. The gate
-- ---------------------------------------------------------------------------

create or replace function public.check_and_record_ai_request(
  p_company_id uuid,
  p_feature text,
  p_cooldown_seconds integer,
  p_window_seconds integer,
  p_window_limit integer,
  p_default_monthly_token_ceiling bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := now();
  v_row public.ai_rate_limit_counters%rowtype;
  v_window_started timestamptz;
  v_window_count integer;
  v_ceiling bigint;
  v_used bigint;
  v_month_start timestamptz;
begin
  if v_user_id is null then
    raise exception 'insufficient_permission';
  end if;

  if p_company_id is null then
    raise exception 'company_id_required';
  end if;

  if not public.is_active_company_member(p_company_id) then
    raise exception 'insufficient_permission';
  end if;

  -- ------------------------------------------------------------------
  -- Spend ceiling first. It is the expensive-to-be-wrong check, so it is
  -- evaluated before any counter is advanced — a request refused for spend
  -- must not consume window budget.
  -- ------------------------------------------------------------------
  select l.monthly_token_ceiling into v_ceiling
  from public.company_ai_limits l
  where l.company_id = p_company_id;

  v_ceiling := coalesce(v_ceiling, p_default_monthly_token_ceiling);
  v_month_start := date_trunc('month', v_now);

  select coalesce(sum(u.total_tokens), 0) into v_used
  from public.ai_usage_events u
  where u.company_id = p_company_id
    and u.created_at >= v_month_start;

  if v_ceiling is not null and v_used >= v_ceiling then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'monthly_ceiling_reached',
      'monthlyTokensUsed', v_used,
      'monthlyTokenCeiling', v_ceiling
    );
  end if;

  -- ------------------------------------------------------------------
  -- Short window. FOR UPDATE serializes concurrent requests for the same
  -- (company, user, feature) so two instances cannot both see room for the
  -- last slot — which is the entire failure of the in-memory version.
  -- ------------------------------------------------------------------
  select * into v_row
  from public.ai_rate_limit_counters c
  where c.company_id = p_company_id
    and c.user_id = v_user_id
    and c.feature = p_feature
  for update;

  if found then
    if v_row.last_request_at is not null
       and v_now < v_row.last_request_at + make_interval(secs => p_cooldown_seconds)
    then
      return jsonb_build_object(
        'allowed', false,
        'reason', 'cooldown',
        'monthlyTokensUsed', v_used,
        'monthlyTokenCeiling', v_ceiling
      );
    end if;

    if v_row.window_started_at is null
       or v_now > v_row.window_started_at + make_interval(secs => p_window_seconds)
    then
      v_window_started := v_now;
      v_window_count := 0;
    else
      v_window_started := v_row.window_started_at;
      v_window_count := v_row.window_count;
    end if;

    if v_window_count >= p_window_limit then
      return jsonb_build_object(
        'allowed', false,
        'reason', 'rate_limited',
        'monthlyTokensUsed', v_used,
        'monthlyTokenCeiling', v_ceiling
      );
    end if;

    update public.ai_rate_limit_counters c
    set last_request_at = v_now,
        window_started_at = v_window_started,
        window_count = v_window_count + 1,
        updated_at = v_now
    where c.company_id = p_company_id
      and c.user_id = v_user_id
      and c.feature = p_feature;
  else
    insert into public.ai_rate_limit_counters (
      company_id, user_id, feature,
      last_request_at, window_started_at, window_count, updated_at
    )
    values (p_company_id, v_user_id, p_feature, v_now, v_now, 1, v_now)
    on conflict (company_id, user_id, feature) do update
      set last_request_at = v_now,
          window_count = public.ai_rate_limit_counters.window_count + 1,
          updated_at = v_now;
  end if;

  return jsonb_build_object(
    'allowed', true,
    'reason', null,
    'monthlyTokensUsed', v_used,
    'monthlyTokenCeiling', v_ceiling
  );
end;
$$;

comment on function public.check_and_record_ai_request(uuid, text, integer, integer, integer, bigint) is
  'Atomic AI admission check: monthly token ceiling first, then per-(company,user,feature) cooldown and rolling window under a row lock. Durable across serverless instances, unlike the process-local Map it replaces.';

-- ---------------------------------------------------------------------------
-- 5. The recorder
-- ---------------------------------------------------------------------------

create or replace function public.record_ai_usage(
  p_company_id uuid,
  p_feature text,
  p_model text,
  p_prompt_tokens integer,
  p_completion_tokens integer
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if p_company_id is null then
    raise exception 'company_id_required';
  end if;

  -- An authenticated caller must belong to the company. A null actor is the
  -- service-role path (cron-driven marketing AI), already authorized upstream.
  if v_user_id is not null
     and not public.is_active_company_member(p_company_id)
  then
    raise exception 'insufficient_permission';
  end if;

  insert into public.ai_usage_events (
    company_id, user_id, feature, model, prompt_tokens, completion_tokens
  )
  values (
    p_company_id,
    v_user_id,
    p_feature,
    nullif(trim(coalesce(p_model, '')), ''),
    greatest(coalesce(p_prompt_tokens, 0), 0),
    greatest(coalesce(p_completion_tokens, 0), 0)
  );
end;
$$;

comment on function public.record_ai_usage(uuid, text, text, integer, integer) is
  'Appends one AI usage row. Records tokens, model, feature and actor — never prompt or completion text.';

revoke all on function public.check_and_record_ai_request(uuid, text, integer, integer, integer, bigint) from public;
revoke all on function public.record_ai_usage(uuid, text, text, integer, integer) from public;

grant execute on function public.check_and_record_ai_request(uuid, text, integer, integer, integer, bigint)
  to authenticated, service_role;
grant execute on function public.record_ai_usage(uuid, text, text, integer, integer)
  to authenticated, service_role;
