-- Generated creative: the request ledger and the quality record.
--
-- ===================== WHAT THIS IS FOR =====================
-- Higgsfield produces creative. Migration 181 gave it the only kind it can
-- ever have — `asset_source`, a connection content is NEVER delivered to —
-- and this migration builds the two things an asset source needs that a
-- publisher does not: a record of what we ASKED FOR, and a record of whether
-- what came back was any good.
--
-- Nothing here is a publish path. There is no delivery state, no provider
-- post id, no permalink, and no column that could hold one. The publishing
-- ledger is `marketing_channel_deliveries` (143) and it is reached only by
-- providers whose `integration_kind` is `publisher`.
--
-- ===================== WHAT THIS EXTENDS =====================
-- It does not create a second media architecture. Bytes live where 144 put
-- them: the private `marketing-media` bucket, referenced by
-- `marketing_media_assets`. A candidate POINTS at one of those rows once the
-- bytes land, using the composite-key tenancy rule 145 established. No object
-- key, no signed URL and no filesystem path appears in this migration.
--
-- ============ THE LEARNING LOOP IS NOT BUILT HERE ============
-- The eventual workflow is Director request → prompt builder → candidates →
-- human review → an approved library that gets better because it remembers
-- what worked. Only the DATA MODEL for that exists here. There is no scoring
-- job, no ranking, and no automatic promotion — and the two columns that
-- would tempt one (`quality_score`, `performance_metadata`) are shaped so
-- that a future loop cannot mistake an absence of judgement for a judgement.

-- ================================================ generation requests

create table if not exists public.creative_generation_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,

  -- The enum is shared with publishing because a provider is a provider; what
  -- it can DO lives on `marketing_connected_accounts.integration_kind` (181),
  -- not on the label. There is deliberately no CHECK pinning this column to
  -- one provider name: that would fork the vocabulary that
  -- `shared/types/integration-provider.ts` exists to keep single, and would
  -- have to be rewritten by migration for every future generator.
  --
  -- The structural alternative — carrying a connected-account id and a
  -- composite FK that includes `integration_kind` — was rejected because a
  -- request must outlive the credential that served it: a disconnected
  -- Higgsfield workspace must not take the record of what it produced, or its
  -- cost, with it. The gate is `mayRequestGenerationFrom` in
  -- `shared/types/creative-asset.ts`, which derives the allowed set from the
  -- capability matrix rather than from a name written here.
  provider public.marketing_connected_provider not null,

  -- WHAT ASKED FOR THIS. A bounded machine token ('director_brief', and
  -- whatever the next caller is) plus that thing's own id.
  --
  -- `source_id` is deliberately NOT a foreign key. The things that can ask
  -- for creative live in different tables — a brief, a campaign, a bare
  -- operator request with no row at all — and a polymorphic reference cannot
  -- be expressed as one constraint. Storing it as text and being honest that
  -- it is unresolved beats storing it as a uuid that implies an integrity
  -- guarantee nothing enforces.
  source_kind text not null,
  source_id text,

  -- THE REPRODUCIBILITY RECORD. A candidate nobody can regenerate is a dead
  -- end: the whole value of the quality loop is being able to ask "what did
  -- we send that produced the good one?". Prompt, negative prompt, model and
  -- settings are that answer, kept together with the outcome.
  prompt text not null,
  negative_prompt text,
  model text,
  settings jsonb not null default '{}'::jsonb,

  requested_by uuid references public.profiles (id) on delete set null,

  request_state text not null default 'queued',

  -- The provider's own handle for the job. Null until it gives us one, which
  -- is why the uniqueness below is partial.
  provider_job_id text,

  -- ==================== COST IS RECORDED, NEVER INFERRED ====================
  -- Both nullable, neither defaulted, and unconstrained in scale so the
  -- provider's reported figure is stored as the provider reported it rather
  -- than rounded into a different number than the one on their invoice.
  --
  -- A zero written where nothing was reported is not a missing value, it is a
  -- FALSE value — and it would roll up silently into a spend total somebody
  -- makes budget decisions from. "We do not know what this cost" and "this
  -- was free" are different facts and the schema keeps them different.
  cost_credits numeric,
  cost_usd numeric,

  -- Operator-facing prose rendered in a browser, bounded for the same reason
  -- `capability_detail` is bounded in 143: a bounded field cannot absorb an
  -- upstream error body wholesale, which is the realistic way a credential
  -- would ever end up in one.
  error_detail text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Set when the request reaches any terminal state. Named for 143's
  -- vocabulary: settled means "stopped moving", not "succeeded".
  settled_at timestamptz,

  constraint creative_generation_requests_state_check
    check (request_state in ('queued', 'generating', 'complete', 'failed', 'cancelled')),
  constraint creative_generation_requests_source_kind_check
    check (source_kind ~ '^[a-z][a-z0-9_]*$' and char_length(source_kind) <= 64),
  -- A request with no prompt cannot be reproduced, compared, or learned from.
  constraint creative_generation_requests_prompt_check
    check (char_length(prompt) > 0),
  constraint creative_generation_requests_error_len_check
    check (error_detail is null or char_length(error_detail) <= 1000),
  constraint creative_generation_requests_cost_check
    check (
      (cost_credits is null or cost_credits >= 0)
      and (cost_usd is null or cost_usd >= 0)
    )
);

-- One row per provider job. The same lesson 143 records for deliveries: a
-- webhook or a poller that reports the same job twice must not be able to
-- register it twice, and the constraint is the guard rather than a code path
-- remembering to look first. Partial because the id does not exist yet while
-- the request is still `queued` — and several queued requests are ordinary.
create unique index if not exists creative_generation_requests_provider_job_key
  on public.creative_generation_requests (company_id, provider, provider_job_id)
  where provider_job_id is not null;

-- `id` is already the primary key, so (id, company_id) is trivially unique.
-- The index exists because the candidate table's composite foreign key needs
-- its referenced pair covered — the rule migration 145 established, which is
-- what lets the database enforce tenancy rather than merely record it.
create unique index if not exists creative_generation_requests_id_company_key
  on public.creative_generation_requests (id, company_id);

create index if not exists creative_generation_requests_company_state_idx
  on public.creative_generation_requests (company_id, request_state);

-- Jobs the poller has to keep asking about, and the set a stuck-request sweep
-- would read. Partial because finished requests accumulate forever and none
-- of them are ever the answer to "what is still running?".
create index if not exists creative_generation_requests_active_idx
  on public.creative_generation_requests (company_id, created_at)
  where request_state in ('queued', 'generating');

drop trigger if exists creative_generation_requests_set_updated_at
  on public.creative_generation_requests;
create trigger creative_generation_requests_set_updated_at
before update on public.creative_generation_requests
for each row execute function public.set_updated_at();

alter table public.creative_generation_requests enable row level security;

-- Read follows the posture 143 and 144 set: dispatchers can see that work was
-- requested and what it cost, because "why are we spending this?" is an
-- operational question. Writes are service-role only — a generation request is
-- created by server-side code that has already authorized the caller and bound
-- the company.
drop policy if exists "dispatchers can read creative generation requests"
  on public.creative_generation_requests;
create policy "dispatchers can read creative generation requests"
  on public.creative_generation_requests
  for select
  to authenticated
  using (
    public.is_active_company_member(company_id)
    and public.can_dispatch_jobs(company_id)
  );

-- RLS narrows an existing privilege; it does not create one. Without this
-- grant the policy above is silently inert — the trap migration 143 documents
-- at lines 147-151.
grant select on table public.creative_generation_requests to authenticated;
revoke insert, update, delete on table public.creative_generation_requests from authenticated;
revoke all on table public.creative_generation_requests from anon;
grant all on table public.creative_generation_requests to service_role;

-- ================================================ generation candidates

create table if not exists public.creative_generation_candidates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,

  request_id uuid not null,

  -- Null until the bytes actually land in the private bucket. An asset is
  -- registered here ONCE, when there is something real to register — a
  -- candidate that only exists at the provider has no row in
  -- `marketing_media_assets` to point at, and inventing one would put a
  -- reference in the schema to bytes this deployment cannot reach.
  media_asset_id uuid,

  -- The provider's own id for this candidate, knowable before any transfer.
  -- It is what lets a re-poll recognise a candidate it already recorded.
  provider_asset_id text,

  -- ==================== QUALITY IS A HUMAN FACT ====================
  quality_state text not null default 'pending_review',

  -- NULLABLE, AND DELIBERATELY WITHOUT A DEFAULT.
  --
  -- A `not null default 0` here would be the single most damaging line in this
  -- migration. Every unreviewed candidate would read as reviewed and scored
  -- zero: indistinguishable from a reviewer looking at something and calling
  -- it worthless. Every future ranking would drop them, every future "learn
  -- from what scored well" pass would be learning from a column default, and
  -- nothing in the data would reveal it — a 0 looks exactly like a judgement.
  --
  -- Null says the true thing: nobody has judged this. Zero is a judgement, and
  -- judgements have authors.
  quality_score numeric,

  -- Required alongside a rejection. A rejection with no reason teaches the
  -- next prompt nothing, and the reason IS the product of a review.
  rejection_reason text,

  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,

  -- Where an approved asset is cleared for use, and how it performed once
  -- used. Opaque jsonb on purpose: the loop that will read them does not
  -- exist yet, and inventing its schema now means guessing and then migrating
  -- away from the guess. An empty object is the honest starting value.
  approved_uses jsonb not null default '{}'::jsonb,
  performance_metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint creative_generation_candidates_quality_state_check
    check (quality_state in ('pending_review', 'approved', 'rejected')),
  constraint creative_generation_candidates_score_range_check
    check (quality_score is null or (quality_score >= 0 and quality_score <= 1)),
  -- A score on an unreviewed candidate would later be indistinguishable from a
  -- human's. If a provider ever hands us its own aesthetic number, it belongs
  -- in `performance_metadata`, not in the column that means "a person judged
  -- this".
  constraint creative_generation_candidates_unscored_pending_check
    check (quality_score is null or quality_state <> 'pending_review'),
  -- APPROVAL MUST NAME A PERSON. This is the structural half of the rule that
  -- generated creative never approves itself; the application half is
  -- `decideCandidatePromotion` in `shared/types/creative-asset.ts`.
  --
  -- Rejection is held to a weaker rule on purpose — `reviewed_at` but not
  -- `reviewed_by` — because a rejection can legitimately be automatic (a
  -- provider returning a broken or empty result), and forcing a fake reviewer
  -- id onto that would corrupt exactly the authorship record the constraint
  -- above exists to protect. Only approval grants use, so only approval
  -- requires an author.
  constraint creative_generation_candidates_approval_author_check
    check (
      quality_state <> 'approved'
      or (reviewed_by is not null and reviewed_at is not null)
    ),
  constraint creative_generation_candidates_decided_at_check
    check (quality_state = 'pending_review' or reviewed_at is not null),
  constraint creative_generation_candidates_rejection_reason_check
    check (
      (quality_state <> 'rejected' or rejection_reason is not null)
      and (rejection_reason is null or char_length(rejection_reason) <= 1000)
    )
);

-- ------------------------------------------------------- tenancy by key
-- The same-company rule is a FOREIGN KEY, not an application check — the
-- reasoning written out in migration 145. A cross-company reference is not
-- merely refused by the code path we remembered to guard: it cannot be
-- written by any path at all, including a service-role script or a manual
-- fix.
--
-- Idempotent because `add constraint` has no `if not exists`; re-running this
-- migration must converge, not fail.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'creative_generation_candidates_request_fkey'
      and conrelid = 'public.creative_generation_candidates'::regclass
  ) then
    alter table public.creative_generation_candidates
      add constraint creative_generation_candidates_request_fkey
      foreign key (request_id, company_id)
      references public.creative_generation_requests (id, company_id)
      -- CASCADE here, unlike 145's media reference: a candidate has no
      -- meaning without the request that asked for it, so an orphan is not a
      -- state worth preserving. Company deletion removes both tables by their
      -- own cascade from `companies`; this one simply agrees with it.
      on delete cascade
      on update no action;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'creative_generation_candidates_media_asset_fkey'
      and conrelid = 'public.creative_generation_candidates'::regclass
  ) then
    alter table public.creative_generation_candidates
      add constraint creative_generation_candidates_media_asset_fkey
      foreign key (media_asset_id, company_id)
      references public.marketing_media_assets (id, company_id)
      -- NO ACTION for the reason 145 records: SET NULL on a composite key
      -- nulls every referencing column, and `company_id` is NOT NULL, so the
      -- delete would fail; RESTRICT cannot be deferred and would block company
      -- deletion outright. NO ACTION defers to end of statement and sees both
      -- rows gone.
      on delete no action
      on update no action;
  end if;
end $$;

-- One candidate per stored asset. Bytes land once; two candidates claiming the
-- same object would make "which review applies to this file?" unanswerable.
create unique index if not exists creative_generation_candidates_media_asset_key
  on public.creative_generation_candidates (company_id, media_asset_id)
  where media_asset_id is not null;

-- The same registration guard as the request's provider job id: a re-poll that
-- sees the same candidate twice must not be able to insert it twice.
create unique index if not exists creative_generation_candidates_provider_asset_key
  on public.creative_generation_candidates (company_id, request_id, provider_asset_id)
  where provider_asset_id is not null;

create index if not exists creative_generation_candidates_request_idx
  on public.creative_generation_candidates (company_id, request_id);

-- The review queue. Partial because a reviewed candidate is never in it, and
-- the reviewed set grows without bound while the queue should not.
create index if not exists creative_generation_candidates_pending_idx
  on public.creative_generation_candidates (company_id, created_at)
  where quality_state = 'pending_review';

drop trigger if exists creative_generation_candidates_set_updated_at
  on public.creative_generation_candidates;
create trigger creative_generation_candidates_set_updated_at
before update on public.creative_generation_candidates
for each row execute function public.set_updated_at();

alter table public.creative_generation_candidates enable row level security;

-- Dispatchers may SEE candidates and their review state. They cannot reach the
-- bytes: nothing in this table is a capability, and 144's bucket has no policy
-- for them. Reviewing is a write, and writes are service-role only, behind a
-- Server Action that has checked the caller's permission.
drop policy if exists "dispatchers can read creative generation candidates"
  on public.creative_generation_candidates;
create policy "dispatchers can read creative generation candidates"
  on public.creative_generation_candidates
  for select
  to authenticated
  using (
    public.is_active_company_member(company_id)
    and public.can_dispatch_jobs(company_id)
  );

grant select on table public.creative_generation_candidates to authenticated;
revoke insert, update, delete on table public.creative_generation_candidates from authenticated;
revoke all on table public.creative_generation_candidates from anon;
grant all on table public.creative_generation_candidates to service_role;

-- ================================================================ comments

comment on table public.creative_generation_requests is
  'One row per creative generation asked of an asset-source provider (Higgsfield). Records what was requested, by whom, and what the provider said it cost. This is not a publishing ledger: an asset source can never receive content, and no column here can hold a published post id.';

comment on column public.creative_generation_requests.source_kind is
  'Bounded machine token naming what asked for this generation. Not an enum: the set of callers is not known yet, and an enum extended by migration for each new caller creates the friction that makes callers reuse a label that does not describe them.';

comment on column public.creative_generation_requests.source_id is
  'The asking thing''s own id, as text. Deliberately not a foreign key — the possible sources live in different tables and some have no row at all, so a polymorphic reference cannot be expressed as one constraint.';

comment on column public.creative_generation_requests.cost_credits is
  'What the provider reported this generation cost in its own credits. NULL means the provider reported nothing, which is not the same as free. Never inferred, never defaulted, never rounded.';

comment on column public.creative_generation_requests.cost_usd is
  'What the provider reported this generation cost in dollars. NULL means unreported, not zero — a fabricated zero would roll up into a spend figure someone makes budget decisions from.';

comment on table public.creative_generation_candidates is
  'One row per candidate a generation produced, with the human review that decides whether it may be used. media_asset_id is null until the bytes land in the private marketing-media bucket; an asset is registered here exactly once.';

comment on column public.creative_generation_candidates.quality_score is
  'Reviewer score in [0,1]. NULLABLE WITH NO DEFAULT, deliberately: an unreviewed candidate has no score, and a defaulted 0 would be indistinguishable from a reviewer judging it worthless — poisoning every future ranking with a column default that looks exactly like a human judgement.';

comment on column public.creative_generation_candidates.quality_state is
  'pending_review until a person decides. approved is the only state that grants use and is the only one that must name a reviewer; rejection may be automatic, so it requires a timestamp and a reason but not an author.';

comment on column public.creative_generation_candidates.approved_uses is
  'Where an approved asset is cleared to be used. Opaque until the quality loop that reads it exists; an empty object is the honest starting value.';

comment on column public.creative_generation_candidates.performance_metadata is
  'How this asset performed once used. Opaque for now, and the correct home for any provider-supplied aesthetic number — quality_score means a person judged this, and must not be written by a machine.';
