-- The Agent Platform's own liveness signal, separate from any business data.
--
-- ==================== WHY THIS IS NOT THE MARKETING SNAPSHOT ====================
-- `agent_marketing_snapshots` already carries a "generatedAt" the Command
-- surface reads via `isSnapshotFresh` — but that freshness window is 24 HOURS
-- (`MS_PER_DAY`), sized for business data that only changes when there is
-- something to report. A silent, always-on gateway with nothing queued is
-- honestly "fresh" by that measure for a full day even if the process died
-- ninety seconds after the last snapshot. A queued Chief question deserves a
-- much tighter, purpose-built answer to "is the platform actually alive right
-- now", so this is a dedicated row the platform writes on its own short
-- interval regardless of whether any queue has real work.
--
-- ==================== ONE ROW PER COMPANY, ALWAYS CURRENT ====================
-- Unlike the three pull queues, this is not a queue at all: there is nothing
-- to pull, no cursor, no backlog. The platform POSTS its own current state and
-- this table holds only the LATEST one, upserted on `company_id`. No bigserial
-- sequence exists here on purpose — the 42501 sequence-grant class bug
-- (migration 190) only bites tables that need one, and this table does not.
--
-- ==================== WHAT "queues" HOLDS ====================
-- A small JSON array, one entry per gateway runner (questions, work-requests,
-- decisions+snapshot, heartbeat itself), each `{name, enabled, disabledReason,
-- consecutiveFailures}`. This is what turns a stale timestamp into an
-- ACTIONABLE status: "DEGRADED — work-requests: RUN_CHIEF_WORK is not set",
-- not just "last seen 8 minutes ago".

create table if not exists public.agent_platform_heartbeats (
  company_id uuid not null references public.companies (id) on delete cascade,
  -- When the platform believes this heartbeat was current, not when the row
  -- was written — the two are the same in practice, but the platform's clock
  -- is the one honest about network latency to itself.
  reported_at timestamptz not null,
  -- Bounded JSON: a handful of small objects, never operator- or model-authored
  -- text. Capped defensively regardless.
  queues jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  -- The primary key IS the one-row-per-company guarantee, stated as its own
  -- constraint (rather than inline on the column) so it reads identically to
  -- every other agent-bridge table's tenancy check.
  constraint agent_platform_heartbeats_pkey primary key (company_id),
  constraint agent_platform_heartbeats_queues_size_check
    check (pg_column_size(queues) <= 4096)
);

create index if not exists agent_platform_heartbeats_reported_at_idx
  on public.agent_platform_heartbeats (reported_at);

alter table public.agent_platform_heartbeats enable row level security;

-- Read-only for operators, exactly like the other agent-bridge tables: the
-- founder can SEE the platform's status, never edit it out from under it.
drop policy if exists "dispatchers can read platform heartbeats"
  on public.agent_platform_heartbeats;
create policy "dispatchers can read platform heartbeats"
  on public.agent_platform_heartbeats
  for select
  to authenticated
  using (
    public.is_active_company_member(company_id)
    and public.can_dispatch_jobs(company_id)
  );

grant select on table public.agent_platform_heartbeats to authenticated;
revoke insert, update, delete on table public.agent_platform_heartbeats from authenticated;
revoke all on table public.agent_platform_heartbeats from anon;
grant all on table public.agent_platform_heartbeats to service_role;

comment on table public.agent_platform_heartbeats is
  'The Agent Platform''s own liveness signal: one row per company, upserted on a short interval regardless of queued work, so a dead or unreachable platform is visible in minutes rather than inferred from a day-old business snapshot.';
