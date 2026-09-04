-- Adds the `schedule_mutation` work-request kind (cross-repo contract v2,
-- extended): the operator changes the Chief's standing content-production
-- schedule — cadence, focus theme, pause state, autonomous render limits —
-- from one sentence in Marketing Command chat, instead of a fixed set of
-- one-off drafting requests.
--
-- Chat-only, like every parameterized kind before it: there is no button for
-- this in OPERATOR_BUTTON_KINDS (shared/types/agent-work-request.ts) — the
-- Chief queues it from the operator's own message, carrying the sentence
-- verbatim as `params.instruction`. The platform interprets it with a model
-- call and enforces every numeric ceiling deterministically AFTER that call
-- (validateContentGoalsMutation, agent-platform's content-goals.ts) — an
-- instruction that would exceed one is refused and nothing is written, the
-- same two-consent, fail-closed shape RUN_CONTENT_GOALS_MUTATION names.
--
-- Additive only: widens the existing kind CHECK constraint (191's own
-- pattern) by one literal. No column added, no row touched, no existing
-- kind's behavior changes.

alter table public.agent_work_requests
  drop constraint if exists agent_work_requests_kind_check;
alter table public.agent_work_requests
  add constraint agent_work_requests_kind_check
    check (kind in (
      'performance_review',
      'finance_report',
      'research_topic',
      'director_plan',
      'create_video',
      'youtube_draft',
      'seo_draft',
      'content_campaign',
      'schedule_mutation'
    ));
