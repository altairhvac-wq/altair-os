-- Migration 152: resumable cron checkpoints.
--
-- ============================== THE DEFECT ==============================
-- Two cron handlers iterate every tenant serially with an `await` per company
-- and no time budget:
--
--   evaluateWorkflowRemindersForAllCompanies  -- `select id from companies`,
--                                                unfiltered: EVERY company
--   runDueMarketingTasks                      -- companies with marketing HQ
--
-- Neither can survive its own success. When the platform kills the function
-- mid-loop:
--
--   * every company after the cut silently gets no reminders that day;
--   * `recordPlatformAutomationRunFinished` never runs, so the run record stays
--     'started' forever;
--   * the only symptom is the absence of a finish record, which nothing watches.
--
-- The tail loss is the serious half. A company at position 400 in a serial loop
-- stops receiving workflow reminders entirely, and nothing reports it.
--
-- ============================== WHY A CURSOR IS ENOUGH ==============================
-- No queue, no lock service, no distributed coordination. The per-company work
-- is ALREADY idempotent, which is the property that makes a naive cursor safe:
--
--   * workflow_reminders carries
--       unique (company_id, reminder_kind, source_entity_type, source_entity_id)
--     so re-evaluating a company converges rather than duplicating.
--   * The marketing engine gates each task on getLatestSuccessfulMarketingRun,
--     so a repeated run is a no-op.
--
-- Re-processing a company is therefore harmless, which means the only rule the
-- cursor must obey is: NEVER ADVANCE PAST A COMPANY THAT WAS NOT PROCESSED
-- SUCCESSFULLY. Advancing only on success can re-do work after a crash; it can
-- never skip work. That asymmetry is the whole design.
--
-- ============================== CURSOR ORDERING ==============================
-- The cursor is (created_at, id), not id alone. `companies.id` is a random v4
-- uuid, so ordering by it is arbitrary but stable; created_at alone is not
-- unique. The pair is a total order, which is what a resumable scan needs — the
-- same reasoning as the keyset list indexes in migration 150.
--
-- ============================== SAFETY ==============================
-- Adds one table and widens one CHECK constraint. No customer data is read,
-- written or deleted. No policy or grant on any existing table changes.

-- ---------------------------------------------------------------------------
-- Checkpoint state
-- ---------------------------------------------------------------------------

create table if not exists public.cron_checkpoints (
  automation_key text primary key,
  -- Cursor position: the last company COMPLETED successfully. Null means the
  -- next invocation starts a fresh cycle from the beginning.
  cursor_created_at timestamptz,
  cursor_company_id uuid,
  -- When the current sweep began, so a cycle that never completes is visible.
  cycle_started_at timestamptz,
  -- Set when a sweep reaches the end of the tenant list.
  last_completed_cycle_at timestamptz,
  companies_processed_this_cycle integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint cron_checkpoints_processed_nonnegative
    check (companies_processed_this_cycle >= 0)
);

comment on table public.cron_checkpoints is
  'Resume position for batched tenant-wide cron sweeps. The cursor is the last company processed SUCCESSFULLY, ordered by (created_at, id). Advancing only on success can repeat work after a crash but can never skip a tenant — and the per-company work is idempotent, so repeating is harmless.';

comment on column public.cron_checkpoints.cursor_company_id is
  'Last company completed successfully. Null restarts the cycle from the beginning.';

alter table public.cron_checkpoints enable row level security;

-- Service-role only, exactly like platform_automation_runs. Cron handlers run
-- with the service-role client; nothing in the product reads this.
revoke all on table public.cron_checkpoints from public;
revoke all on table public.cron_checkpoints from anon;
revoke all on table public.cron_checkpoints from authenticated;
grant all on table public.cron_checkpoints to service_role;

-- ---------------------------------------------------------------------------
-- A partial run is a first-class outcome
-- ---------------------------------------------------------------------------
--
-- platform_automation_runs.status was constrained to ('started','succeeded',
-- 'failed'). A batched sweep that hits its time budget is none of those: it did
-- real work and will resume. Recording it as 'succeeded' would hide an
-- unfinished cycle; as 'failed' would page someone about normal operation.
--
-- 'partial' is added so the graceful case is recorded honestly, and so a run
-- still sitting at 'started' means what it should: the function died without
-- getting the chance to say anything.

alter table public.platform_automation_runs
  drop constraint if exists platform_automation_runs_status_check;

alter table public.platform_automation_runs
  add constraint platform_automation_runs_status_check
  check (status in ('started', 'succeeded', 'failed', 'partial'));

-- Finding stuck runs cheaply. A run left at 'started' past its expected
-- duration is the signature of a hard kill.
create index if not exists platform_automation_runs_started_status_idx
  on public.platform_automation_runs (automation_key, started_at desc)
  where status = 'started';
