-- Parameterized Chief work requests (cross-repo contract v2).
--
-- The first two kinds were deliberately parameterless: a browser button can
-- name an analysis but must not invent a topic. What changed is WHO fills the
-- parameters — the operator now asks the Chief of Staff in their own words in
-- Marketing Command, and the platform's `chief:respond` converts that message
-- into one of a CLOSED set of typed request kinds, each carrying zod-validated
-- params (the operator's topic, an audience, a format). The kind stays a CHECK
-- enum; `params` is data those gated runners read — never a command, never
-- executed, and both sides re-validate it per kind before anything runs.
--
-- EVERY NEW KIND STAGES DRAFTS AND PUBLISHES NOTHING. Each keeps its own
-- consent gate on the platform (RUN_RESEARCH_TOPIC, RUN_DIRECTOR_FORMAT,
-- RUN_CREATE_VIDEO, RUN_YOUTUBE_DRAFT, RUN_SEO_DRAFT, RUN_SOCIAL_DRAFT,
-- RUN_CONTENT_CAMPAIGN), exactly the two-consent shape the first two kinds
-- established: the browser can ask, only the laptop can agree.
--
-- Rows queued by the Chief on the operator's behalf carry a request_key of
-- the form 'chief-cmd:<questionId>:<n>-<kind>' — deterministic, so a replayed
-- answer run cannot double-queue — and a null requested_by_user_id (the
-- asking human is recorded in requested_by_email from the conversation row).
--
-- Migration 189 is patched in-repo with the same shape for fresh
-- environments; this migration upgrades already-applied ones.

alter table public.agent_work_requests
  add column if not exists params jsonb;

alter table public.agent_work_requests
  drop constraint if exists agent_work_requests_params_size_check;
alter table public.agent_work_requests
  add constraint agent_work_requests_params_size_check
    check (params is null or pg_column_size(params) <= 8192);

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
      'content_campaign'
    ));

comment on column public.agent_work_requests.params is
  'Typed per-kind parameters (contract v2), validated on enqueue and again by the platform before running. Data for a gated runner — never a command.';
