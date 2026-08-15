-- Agent Platform marketing snapshot ingest (cross-repo integration, milestone 1).
--
-- The Altair Agent Platform runs laptop-side behind NAT and cannot be called
-- into, so it PUSHES a read model outward to this deployment. This table is
-- where that read model lands.
--
-- ONE ROW PER COMPANY, deliberately. A snapshot is a full state projection,
-- not an event: the newest one supersedes the last, so an upsert keyed by
-- company is both the storage and the idempotency mechanism. Re-sending the
-- same snapshot is a no-op, and a missed push self-heals on the next cycle —
-- which removes retries, ordering guarantees and an outbox from the design.
-- History is deliberately NOT kept here; the platform's own durable store is
-- the system of record, and duplicating its history in a cache would create
-- two answers to "what happened".
--
-- Service-role only, matching migration 133's posture: authenticated sessions
-- get no direct grants, and all access flows through server-only code that has
-- already authorized the caller. Widening to tenant RLS later is additive.
--
-- The payload carries no provider token, no signed URL and no local filesystem
-- path — the producing contract forbids all three by construction and the
-- receiving route re-validates the envelope before anything is stored.

create table if not exists public.agent_marketing_snapshots (
  company_id uuid primary key references public.companies (id) on delete cascade,
  -- The Agent Platform's OWN company identifier, which lives in a different
  -- id space from this database's uuids (it is a configured slug, e.g.
  -- 'altair'). Recorded so a mismatch is visible rather than silently mapped.
  platform_company_id text not null,
  contract_version integer not null,
  -- The producing platform's clock reading. The monotonic guard: a snapshot
  -- older than the stored one is refused as superseded.
  produced_at timestamptz not null,
  received_at timestamptz not null default now(),
  -- Item rows the receiving parser could not read and dropped. Non-zero means
  -- the two contract mirrors have drifted; surfaced rather than swallowed.
  dropped_items integer not null default 0,
  payload_bytes integer not null default 0,
  snapshot jsonb not null,
  constraint agent_marketing_snapshots_version_check
    check (contract_version >= 1),
  constraint agent_marketing_snapshots_dropped_check
    check (dropped_items >= 0)
);

create index if not exists agent_marketing_snapshots_received_desc_idx
  on public.agent_marketing_snapshots (received_at desc);

alter table public.agent_marketing_snapshots enable row level security;

revoke all on table public.agent_marketing_snapshots from authenticated;
revoke all on table public.agent_marketing_snapshots from anon;
grant all on table public.agent_marketing_snapshots to service_role;

comment on table public.agent_marketing_snapshots is
  'Latest marketing read model pushed by the Altair Agent Platform. One row per company; newest produced_at wins. Service-role only; never contains credentials, signed URLs, or local paths.';
