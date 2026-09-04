-- Tenant-scoped pull indexes for the agent queues.
--
-- WHY: both platform pull queries used to order and limit GLOBALLY and let the
-- route filter the resulting page down to the configured company. That is not
-- the same thing as a company-scoped query, and the difference is a permanent
-- outage: with `limit` older queued rows belonging to another company, every
-- slot of the page was foreign, the route discarded all of them, and the
-- polling company received none of its own work — on every poll, forever,
-- because nothing drains foreign rows and the cursor is always 0.
--
-- The queries now filter `company_id` in SQL BEFORE ordering and limiting
-- (see listQueuedChiefQuestions / listUnappliedWorkRequests). These indexes
-- are what keep that predicate a bounded index scan rather than a filter over
-- a growing global backlog: the leading column is the company, so one tenant's
-- volume cannot affect another tenant's read cost either.
--
-- Index-only changes. No data is read, written, moved or dropped.

-- The Chief conversation pull: one company's queued user turns, by seq.
-- Supersedes agent_chief_messages_pull_idx, whose leading column was `seq`
-- and which therefore could not serve the company predicate.
create index if not exists agent_chief_messages_company_pull_idx
  on public.agent_chief_messages (company_id, seq)
  where role = 'user' and status = 'queued';

drop index if exists public.agent_chief_messages_pull_idx;

-- The work-request pull: one company's undecided requests, by seq.
-- The existing agent_work_requests_unapplied_idx is (company_id, applied_at)
-- and cannot order by seq; this one can, so the pull is a single ordered scan.
create index if not exists agent_work_requests_company_pull_idx
  on public.agent_work_requests (company_id, seq)
  where applied_at is null;

comment on index public.agent_chief_messages_company_pull_idx is
  'Serves the company-scoped question pull. The company must lead: a seq-leading index let one tenant''s backlog starve another.';

comment on index public.agent_work_requests_company_pull_idx is
  'Serves the company-scoped work-request pull. The company must lead: a seq-leading index let one tenant''s backlog starve another.';
