-- Human decisions on Agent Platform proposals (cross-repo integration, M4).
--
-- Altair OS is where a human decides; the Agent Platform is where the decision
-- takes effect. The platform runs behind NAT and cannot be pushed to, so it
-- PULLS from here on its next cycle. This table is the durable queue between
-- the two.
--
-- A DECISION IS NOT AN INSTRUCTION TO PUBLISH. Recording "approved" here
-- records that a human agreed to a proposal. Whether anything external
-- happens is decided entirely by the Agent Platform's own permission and
-- effect machinery, which requires its own approval binding regardless of
-- what this table says. Nothing in this schema can cause a post, a spend, or
-- any external effect.
--
-- IDEMPOTENT BY CONSTRUCTION. `decision_key` is unique per company: the same
-- decision submitted twice is one row, and the platform's cursor makes a
-- re-pull a no-op. `seq` is a monotonic bigserial the platform polls with
-- `?since=`, so delivery needs no acknowledgement protocol.
--
-- Service-role only, matching migrations 133 and 141.

create table if not exists public.agent_marketing_decisions (
  id uuid primary key default gen_random_uuid(),
  -- Monotonic delivery cursor. The platform asks for everything after the
  -- highest seq it has already applied.
  seq bigserial not null,
  company_id uuid not null references public.companies (id) on delete cascade,
  -- Stable idempotency key: one decision per subject per company.
  decision_key text not null,
  -- Which platform concept this is about. Kept separate from the decision
  -- itself so Task / Artifact / Approval / video states stay distinct, the
  -- same separation the snapshot contract enforces.
  subject_kind text not null,
  subject_id text not null,
  decision text not null,
  -- Optional operator note, e.g. what to change on a REQUEST_EDIT.
  note text,
  -- Actor, recorded because Altair OS is the only system here with real
  -- authenticated users. The platform binds its own approver identity to
  -- this rather than trusting a configured string.
  decided_by_user_id uuid references auth.users (id) on delete set null,
  decided_by_email text,
  decided_at timestamptz not null default now(),
  -- Stamped by the platform after it has durably applied the decision. Null
  -- means "not yet applied", which is the honest state between the click and
  -- the next platform cycle.
  applied_at timestamptz,
  constraint agent_marketing_decisions_key_unique
    unique (company_id, decision_key),
  constraint agent_marketing_decisions_subject_kind_check
    check (subject_kind in ('approval', 'recommendation', 'video_render')),
  constraint agent_marketing_decisions_decision_check
    check (decision in ('APPROVED', 'REJECTED', 'REQUEST_EDIT')),
  constraint agent_marketing_decisions_note_length_check
    check (note is null or char_length(note) <= 1000)
);

create index if not exists agent_marketing_decisions_seq_idx
  on public.agent_marketing_decisions (company_id, seq);

create index if not exists agent_marketing_decisions_unapplied_idx
  on public.agent_marketing_decisions (company_id, applied_at)
  where applied_at is null;

alter table public.agent_marketing_decisions enable row level security;

revoke all on table public.agent_marketing_decisions from authenticated;
revoke all on table public.agent_marketing_decisions from anon;
grant all on table public.agent_marketing_decisions to service_role;

comment on table public.agent_marketing_decisions is
  'Human approve/reject/request-edit decisions on Agent Platform proposals. Pulled by the platform on its next cycle. Recording a decision here never itself publishes anything.';
