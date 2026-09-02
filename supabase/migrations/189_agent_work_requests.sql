-- Operator requests for Agent Platform work (cross-repo integration).
--
-- The queue an operator uses to say "run the spend review" from Marketing
-- Command. The platform runs laptop-side behind NAT and cannot be pushed to,
-- so it PULLS from here on its next cycle — the same shape as migration 142's
-- decision queue and 188's conversation queue.
--
-- A REQUEST IS NOT AN EXECUTION, AND IT IS NOT AN APPROVAL. Writing a row here
-- records that a human asked for a named piece of read/analysis work. Whether
-- anything actually runs is decided entirely on the platform side, where each
-- runner keeps its own consent gate (RUN_CONTENT_PERFORMANCE,
-- RUN_FINANCE_REPORT). Those gates are NOT bypassed by this table: a request
-- for work whose gate is off comes back refused, having spent nothing. Two
-- independent humans therefore have to agree before a model is ever paid —
-- one in the browser, one at the laptop.
--
-- CLOSED VOCABULARY. `kind` is a CHECK-constrained enum of parameterless,
-- non-publishing analysis runs. There is no free-text command, no argument
-- and no shell here, so this queue cannot become arbitrary execution. Adding
-- a kind is a migration and a code change, deliberately.
--
-- IDEMPOTENT BY CONSTRUCTION. `request_key` is unique per company: a
-- double-clicked button is one row, and `applied_at` makes a re-pull a no-op.
-- `seq` is the monotonic cursor the platform polls with, so delivery needs no
-- acknowledgement protocol.
--
-- Service-role only, matching migrations 142 and 188.

create table if not exists public.agent_work_requests (
  id uuid primary key default gen_random_uuid(),
  -- Monotonic delivery cursor, polled with `?after=`.
  seq bigserial not null,
  company_id uuid not null references public.companies (id) on delete cascade,
  -- Stable idempotency key: one request per logical click per company.
  request_key text not null,
  kind text not null,
  -- Why the operator asked. Context for the audit trail, never a parameter:
  -- nothing on the platform side reads this as an instruction.
  note text,
  -- The authenticated human who asked. Altair OS is the only system here with
  -- real users, so this is where accountability is recorded.
  requested_by_user_id uuid references auth.users (id) on delete set null,
  requested_by_email text,
  requested_at timestamptz not null default now(),
  -- Stamped by the platform once it has decided the request's fate. Null
  -- means "the platform has not run since this was asked", which is the
  -- honest state between the click and the next cycle.
  applied_at timestamptz,
  -- What the platform did. 'refused' is a first-class outcome — most often
  -- the runner's consent gate is off — and 'failed' is kept distinct from it
  -- because a run that broke and a run that was never allowed to start are
  -- different facts, and collapsing them would hide one of them. Each carries
  -- its reason so the operator is told the truth rather than left waiting.
  outcome text,
  outcome_detail text,
  constraint agent_work_requests_key_unique
    unique (company_id, request_key),
  constraint agent_work_requests_kind_check
    check (kind in ('performance_review', 'finance_report')),
  constraint agent_work_requests_outcome_check
    check (outcome is null or outcome in ('completed', 'refused', 'failed')),
  -- An outcome and an applied timestamp arrive together or not at all.
  constraint agent_work_requests_applied_shape
    check (
      (applied_at is null and outcome is null)
      or (applied_at is not null and outcome is not null)
    ),
  constraint agent_work_requests_note_length_check
    check (note is null or char_length(note) <= 1000),
  constraint agent_work_requests_detail_length_check
    check (outcome_detail is null or char_length(outcome_detail) <= 2000)
);

create index if not exists agent_work_requests_seq_idx
  on public.agent_work_requests (company_id, seq);

create index if not exists agent_work_requests_unapplied_idx
  on public.agent_work_requests (company_id, applied_at)
  where applied_at is null;

alter table public.agent_work_requests enable row level security;

-- Operators read their own company's requests so the surface can show what
-- was asked and what came back. Every write is the server's: the request is
-- created by a server action that has already checked Marketing access, and
-- the outcome is written by the platform through the service role.
drop policy if exists "dispatchers can read work requests"
  on public.agent_work_requests;
create policy "dispatchers can read work requests"
  on public.agent_work_requests
  for select
  to authenticated
  using (
    public.is_active_company_member(company_id)
    and public.can_dispatch_jobs(company_id)
  );

grant select on table public.agent_work_requests to authenticated;
revoke insert, update, delete on table public.agent_work_requests from authenticated;
revoke all on table public.agent_work_requests from anon;
grant all on table public.agent_work_requests to service_role;

comment on table public.agent_work_requests is
  'Operator requests for named Agent Platform analysis runs. Pulled by the platform, which honours each runner''s own consent gate. Creating a row here never itself runs, publishes or spends anything.';
