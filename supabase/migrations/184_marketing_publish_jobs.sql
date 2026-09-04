-- The publish queue: when work runs, who holds it, and what to do when it
-- fails. Extends 143's publishing model; it does not replace any of it.
--
-- ============== WHY THIS IS NOT COLUMNS ON THE DELIVERY LEDGER ==============
-- `marketing_channel_deliveries` (143) is a LEDGER. A row is claimed
-- immediately before an external call and settled immediately after, and its
-- entire value comes from being an immutable account of what was attempted. A
-- row sitting in `in_flight` is not a defect: it is the ledger correctly
-- saying "an external write began and never reported back", which is the one
-- state the old publish-then-mark sequence could not represent at all.
--
-- Scheduling state is the opposite kind of data. A lease is taken and
-- dropped, an attempt counter climbs, a backoff pushes a timestamp forward, a
-- worker name is written and erased. Hanging those columns on the ledger would
-- mean the row that answers "what did we attempt, and what happened?" is
-- rewritten several times per attempt by a process that is not attempting
-- anything — and the question the ledger exists to answer stops having a
-- trustworthy answer.
--
-- One column makes the damage concrete. `decideDelivery` measures staleness
-- from `marketing_channel_deliveries.created_at`; a queue that touched the
-- ledger row on requeue would reset the reconciliation clock on a claim that
-- may already have published. The ledger would then report a five-minute-old
-- attempt as fresh, and the operator would never be told to go look.
--
-- So: two tables, one key.
--
-- ==================== ONE KEY, DELIBERATELY IDENTICAL ====================
-- `unique (company_id, marketing_post_id, provider)` here is character for
-- character 143's `marketing_channel_deliveries_unique`. That is not
-- tidiness. It means the queue can hold at most one job for exactly the unit
-- of work the ledger can hold at most one claim for, so the queue can never
-- outrun the ledger and can never enqueue a second job for work that is
-- already claimed. Two different keys would permit a second queue row for a
-- post whose delivery is already `in_flight`, and the only thing between that
-- row and a duplicate post would be a code path remembering to check.
--
-- The ordering that follows is worth stating plainly: THE QUEUE DECIDES WHEN,
-- THE LEDGER DECIDES WHETHER. Nothing in this table authorizes an external
-- write. A leased job still has to claim a delivery, and 143's unique
-- constraint is what refuses it.
--
-- ================ THE VOCABULARY, AND WHAT IT DOES NOT MEAN ================
-- `job_state` uses the required queue vocabulary. Three of its words already
-- mean something else in this schema, so the mapping is written down rather
-- than assumed:
--
--   job_state           marketing_posts.status   delivery_state (143)
--   ------------------  ----------------------   --------------------
--   draft               draft                    (no row yet)
--   ready_for_approval  ready                    (no row yet)
--   approved            ready                    (no row yet)
--   scheduled           scheduled                (no row yet)
--   publishing          scheduled                in_flight
--   published           posted                   posted | draft
--   failed              failed                   failed | (no row)
--   cancelled           archived                 (no row)
--
-- "draft" now names three things about three different subjects:
--   marketing_posts.status = 'draft'  the COPY is still being written
--   delivery_state = 'draft'          it REACHED the provider and sits there
--                                     unpublished for a human to finish
--   job_state = 'draft'               the QUEUE ENTRY exists and has not been
--                                     offered for approval
-- None of the three implies either of the others.
--
-- "published" is the honest gap. This vocabulary has no word for "the
-- provider accepted it as an unpublished draft", so a draft-only channel
-- settles its job to `published` meaning ONLY that the queue has nothing left
-- to do. Whether anything is live is answered by `delivery_state`, never by
-- `job_state`, and any read that treats `job_state = 'published'` as "it is
-- on the platform" is wrong for every provider whose capability is
-- `draft_only`.
--
-- "approved" has no counterpart at all: `marketing_post_status` (087) has no
-- approval label, so `ready_for_approval` and `approved` both project onto
-- `ready`. This table is the only place the approval of a specific piece of
-- content to a specific provider is recorded — which is why
-- `shared/types/publish-job.ts` refuses the `draft -> scheduled` transition
-- outright rather than leaving the approval gate to an application check.
--
-- There is a fourth vocabulary in the same neighbourhood, and it is NOT this
-- one. `marketing_content_packages.package_state` (182) is
-- draft/approved/publishing/published/archived, and it describes the CREATIVE
-- BUNDLE as a whole — one package fans out to many posts across many
-- providers. `job_state` describes ONE (post, provider) pair's trip through
-- the queue. A package can legitimately read `published` while a job for one
-- of its providers is still `scheduled`, or `failed`. The words are shared;
-- the subject is not, and no read should treat one as a proxy for the other.
--
-- ===================== scheduled_for IS NOT run_after =====================
-- `scheduled_for` is the intended publication time: an operator's decision,
-- shown in the UI, never moved by anything mechanical. `run_after` is the
-- earliest instant a runner may take the row, and a backoff pushes it forward
-- on every failure. Collapsing them would let a retry silently rewrite the
-- time a human chose, and the UI would then report a publication time nobody
-- asked for.

-- -------------------------------------------------- FK target uniqueness
-- `id` is already the primary key, so (id, company_id) is trivially unique.
-- The index exists because a composite foreign key needs its referenced pair
-- covered — the rule migration 145 established. This is what lets the
-- database enforce tenancy rather than merely record it.
create unique index if not exists marketing_posts_id_company_key
  on public.marketing_posts (id, company_id);

-- ---------------------------------------------------------------- the queue
create table if not exists public.marketing_publish_jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  -- No single-column FK here: the composite one below carries the reference
  -- AND the same-company rule together. Two foreign keys to the same parent
  -- would be redundant and would disagree about deletion behaviour.
  marketing_post_id uuid not null,
  -- Nullable: a hand-authored post has no package behind it. Same-company is
  -- enforced by the composite foreign key added below.
  --
  -- 182 also put `content_package_id` on `marketing_posts`, and the overlap is
  -- deliberate rather than an oversight. That column is the post's CURRENT
  -- provenance and moves if the post is re-linked; this one is what the job
  -- was enqueued FROM and must not change afterwards, or the record of what
  -- was queued would be rewritten by an edit made after the fact. It also
  -- keeps the runner's work-list query on this table alone — the partial
  -- index below is useless if every candidate row needs a join to be read.
  content_package_id uuid,
  provider public.marketing_connected_provider not null,
  -- Which connection this is meant to go out through. Matches 143's posture:
  -- a single-column FK with `on delete set null`, because connections really
  -- are deleted individually (the Facebook no-pages placeholder is cleared
  -- outright) and a job must survive that rather than block it. A composite
  -- key cannot express it: `set null` nulls EVERY referencing column unless a
  -- column list is given, and `company_id` is not null, so the delete would
  -- fail instead of proceeding — the same trap 145 documents.
  connected_account_id uuid references public.marketing_connected_accounts (id) on delete set null,
  job_state text not null default 'draft',
  -- Attempts MADE. Zero until the first worker settles one.
  attempt smallint not null default 0,
  -- Per-provider, copied from the capability matrix at enqueue time so a
  -- later change to that table cannot retroactively grant a job more attempts
  -- against a provider that has already rejected it. Reddit enqueues 1.
  max_attempts smallint not null default 3,
  -- NOT NULL, and it stays that way through a settle. The runner's work list
  -- orders by this column, so a row without one has no defined place in the
  -- queue. That makes "no next run" unwriteable here, which is the point: a
  -- settle that tried to clear it would be refused by this constraint on the
  -- write that records the outcome of an external call already made, leaving
  -- the row `publishing` and leased over finished work. So a terminal outcome
  -- does not touch this column at all — `decideJobOutcome` omits it rather
  -- than nulling it, and the stale value is harmless because a terminal row is
  -- never a candidate again (the runnable index below is partial on
  -- `job_state = 'scheduled'`).
  run_after timestamptz not null default now(),
  lease_expires_at timestamptz,
  leased_by text,
  last_error text,
  scheduled_for timestamptz,
  requires_approval boolean not null default true,
  approved_by uuid references public.profiles (id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketing_publish_jobs_state_check
    check (job_state in ('draft', 'ready_for_approval', 'approved', 'scheduled', 'publishing', 'published', 'failed', 'cancelled')),
  -- The ceiling is load-bearing, not cosmetic. The backoff in
  -- `shared/types/publish-job.ts` doubles per attempt with no clamp, because
  -- a clamp would plateau and a plateau is not strictly increasing. What
  -- bounds the delay is this CHECK: at most six attempts means at most a
  -- 32-minute wait, decided by the schema rather than by a ceiling that
  -- would break the monotonicity the runner depends on.
  constraint marketing_publish_jobs_max_attempts_sane
    check (max_attempts between 1 and 6),
  constraint marketing_publish_jobs_attempt_sane
    check (attempt >= 0 and attempt <= max_attempts),
  -- Same bound and same reasoning as 143's failure_detail: operator-facing
  -- prose rendered in a browser, and a bounded field cannot absorb an
  -- upstream error body wholesale — which is the realistic way a token would
  -- ever end up in one.
  constraint marketing_publish_jobs_last_error_len
    check (last_error is null or char_length(last_error) <= 1000),
  constraint marketing_publish_jobs_leased_by_len
    check (leased_by is null or char_length(leased_by) <= 200),
  -- A lease is a pair. Half a lease — an expiry with no holder, or a holder
  -- with no expiry — is a row that either can never be reclaimed or can be
  -- reclaimed while someone still owns it.
  constraint marketing_publish_jobs_lease_pairs
    check ((lease_expires_at is null) = (leased_by is null)),
  -- Same argument for approval: an approval time with no approver is an
  -- audit record that cannot answer the only question anyone asks of it.
  constraint marketing_publish_jobs_approval_pairs
    check ((approved_by is null) = (approved_at is null)),
  -- Character for character 143's marketing_channel_deliveries_unique.
  constraint marketing_publish_jobs_unique
    unique (company_id, marketing_post_id, provider)
);

-- ------------------------------------------------------ the tenancy rule
-- The requirement is that a job and the post it publishes belong to the same
-- company. That could have been an application check. It is a COMPOSITE
-- FOREIGN KEY instead — (marketing_post_id, company_id) referencing
-- (id, company_id) — so a cross-company reference is not merely refused by
-- the code path we remembered to guard: no path can write it, including a
-- service-role script, a manual fix, or a future backfill.
--
-- CASCADE is safe on a composite key in a way `set null` is not: deleting the
-- parent removes the whole job row and never has to null a not-null column.
--
-- Idempotent because `add constraint` has no `if not exists`. Re-running this
-- migration must converge, not fail.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'marketing_publish_jobs_post_fkey'
      and conrelid = 'public.marketing_publish_jobs'::regclass
  ) then
    alter table public.marketing_publish_jobs
      add constraint marketing_publish_jobs_post_fkey
      foreign key (marketing_post_id, company_id)
      references public.marketing_posts (id, company_id)
      on delete cascade
      on update no action;
  end if;
end $$;

-- ------------------------------------------- the content package reference
-- `content_package_id` names the assembled creative a job publishes. Same
-- tenancy rule, same mechanism: a composite foreign key, so a job for one
-- company can never be pointed at another company's package.
--
-- The referenced pair is already covered by
-- `marketing_content_packages_id_company_key` (182), which is why no index is
-- created here — the same way 182 and 185 lean on 145's
-- `marketing_media_assets_id_company_key` rather than re-declaring it.
--
-- NO ACTION matches the choice 182 made for `marketing_posts_content_package_fkey`,
-- and for the same reasons: the only deletion reaching both sides is the
-- cascade from `companies`, which removes jobs and packages in one statement
-- that a deferred check sees complete; SET NULL on a composite key would try
-- to null the NOT NULL `company_id`; and a package should not be hard-
-- deletable while a job still points at it, because that job may describe
-- something already published.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'marketing_publish_jobs_content_package_fkey'
      and conrelid = 'public.marketing_publish_jobs'::regclass
  ) then
    alter table public.marketing_publish_jobs
      add constraint marketing_publish_jobs_content_package_fkey
      foreign key (content_package_id, company_id)
      references public.marketing_content_packages (id, company_id)
      on delete no action
      on update no action;
  end if;
end $$;

-- ------------------------------------------------------------------ indexes
-- THE RUNNER'S ACTUAL QUERY: due work, oldest first.
--
--   select ... from public.marketing_publish_jobs
--    where job_state = 'scheduled' and run_after <= now()
--    order by run_after
--
-- Partial on purpose. Every other state — including the terminal ones, which
-- accumulate forever — is absent from the index entirely, so the work list
-- stays proportional to the work outstanding rather than to the history. The
-- predicate is a constant comparison, not `now()`, because a partial index
-- predicate has to be immutable; the time bound belongs in the query.
create index if not exists marketing_publish_jobs_runnable_idx
  on public.marketing_publish_jobs (run_after, company_id)
  where job_state = 'scheduled';

-- RECLAIMING EXPIRED LEASES: rows whose worker is gone.
--
--   select ... from public.marketing_publish_jobs
--    where job_state = 'publishing' and lease_expires_at <= now()
--
-- Reclaiming releases the LEASE, not the ledger's claim. The row returns to
-- `scheduled`, and when it is picked up again `decideDelivery` sees the
-- unsettled `in_flight` delivery and answers NEEDS_RECONCILIATION — so a
-- reclaim can surface abandoned work without ever becoming a republish.
create index if not exists marketing_publish_jobs_expired_lease_idx
  on public.marketing_publish_jobs (lease_expires_at)
  where job_state = 'publishing';

-- The operator's view of one company's queue.
create index if not exists marketing_publish_jobs_company_state_idx
  on public.marketing_publish_jobs (company_id, job_state, run_after);

drop trigger if exists marketing_publish_jobs_set_updated_at
  on public.marketing_publish_jobs;
create trigger marketing_publish_jobs_set_updated_at
before update on public.marketing_publish_jobs
for each row execute function public.set_updated_at();

alter table public.marketing_publish_jobs enable row level security;

-- Read follows 143's posture exactly: dispatchers can see the queue, because
-- "when is this going out, and why hasn't it?" is an operational question.
-- Writes are service-role only — a job is enqueued, leased and settled by the
-- server-side runner, never by a browser.
drop policy if exists "dispatchers can read marketing publish jobs"
  on public.marketing_publish_jobs;
create policy "dispatchers can read marketing publish jobs"
  on public.marketing_publish_jobs
  for select
  to authenticated
  using (
    public.is_active_company_member(company_id)
    and public.can_dispatch_jobs(company_id)
  );

-- The SELECT policy above is only reachable if the role also holds a
-- table-level GRANT: RLS narrows an existing privilege, it does not create
-- one. Without this line the dispatcher-read policy would be silently inert
-- (143 lines 147-151).
grant select on table public.marketing_publish_jobs to authenticated;
revoke insert, update, delete on table public.marketing_publish_jobs from authenticated;
revoke all on table public.marketing_publish_jobs from anon;
grant all on table public.marketing_publish_jobs to service_role;

comment on table public.marketing_publish_jobs is
  'The publish queue: mutable scheduling state (lease, attempt, backoff, run_after) for one (company, post, provider) unit of work. Keyed identically to marketing_channel_deliveries so the queue can never outrun the ledger. The queue decides WHEN; the ledger decides WHETHER anything may be sent.';

comment on column public.marketing_publish_jobs.job_state is
  'Queue lifecycle only. published means the queue has nothing left to do, NOT that the content is live — for a draft_only channel it is not. delivery_state on marketing_channel_deliveries is the only authority on what exists at the provider.';

comment on column public.marketing_publish_jobs.run_after is
  'Earliest instant a runner may take this row. Moved forward by backoff on every failure, and never cleared: settling a job to published or failed leaves the last value in place, because this column is not null and a terminal row is never taken again. Distinct from scheduled_for, which is the publication time a human chose and which no retry may rewrite.';

comment on column public.marketing_publish_jobs.scheduled_for is
  'The intended publication time, as chosen by an operator. Never modified by a retry or a backoff.';

comment on column public.marketing_publish_jobs.lease_expires_at is
  'When this job stops being owned. Set longer than every pollBudgetMs in the capability matrix: a lease that expired while a legitimate poll was still running would be reclaimed by a second worker and publish the same content twice.';

comment on column public.marketing_publish_jobs.content_package_id is
  'The assembled creative this job publishes, or null for a hand-authored post. Same-company enforced by a composite foreign key on (content_package_id, company_id). The package''s own package_state describes the whole bundle across every provider and is not a proxy for this job_state.';
