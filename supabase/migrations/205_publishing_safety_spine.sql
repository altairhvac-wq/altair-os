-- 204: the publishing safety spine — per-channel pause and policy approvals.
--
-- ==================== WHAT THIS ADDS ====================
-- 1. A per-channel PAUSE on marketing_connected_accounts. The deployment-wide
--    switch (MARKETING_PUBLISH_MODE) stops everything; this stops ONE
--    destination without touching its credential or its `status`, which is
--    what an operator needs when a channel misbehaves and the others should
--    keep running. Checked by lib/publishing/gate.ts (assertConnectionReady)
--    and by the legacy Meta action loaders.
--
--    `publishing_paused` pauses the ROW: every provider that publishes through
--    it. A Facebook Page row also serves Instagram (the Business account id is
--    in its metadata), so pausing Instagram ALONE is a metadata entry rather
--    than a column:
--        metadata.publishingPausedProviders = { "instagram": "<reason>" }
--    The reader is shared/types/marketing-channel-connection.ts
--    (decidePublishingPause). This file adds no constraint on that key; jsonb
--    shape is validated at the one write site (setConnectionPublishingPause).
--
-- 2. A non-human approver on marketing_publish_jobs. `approved_by` is a
--    profile id and must stay one — a policy is not a person and must never be
--    disguised as one. `approved_by_policy` names the policy instead
--    ('policy:auto-approve'), and the approval-pairs CHECK from 184 is widened
--    so an approval is recorded with EXACTLY ONE approver: a person or a
--    policy, never both, never neither.
--
-- Idempotent and additive. Nothing here is destructive; the only dropped
-- object is a CHECK that is immediately re-added in a strictly wider form.

alter table public.marketing_connected_accounts
  add column if not exists publishing_paused boolean not null default false;

alter table public.marketing_connected_accounts
  add column if not exists publishing_paused_reason text;

alter table public.marketing_connected_accounts
  drop constraint if exists marketing_connected_accounts_publishing_paused_reason_len;
alter table public.marketing_connected_accounts
  add constraint marketing_connected_accounts_publishing_paused_reason_len
    check (publishing_paused_reason is null or char_length(publishing_paused_reason) <= 500);

comment on column public.marketing_connected_accounts.publishing_paused is
  'Operator pause for EVERY provider that publishes through this row. Checked by the publish gate and the legacy publish actions; independent of status and of the credential. The deployment-wide pause is MARKETING_PUBLISH_MODE.';

comment on column public.marketing_connected_accounts.publishing_paused_reason is
  'Why the row is paused, in the operator''s words (or the automation''s, when the publisher pauses a channel after exhausted attempts or a credential failure). Never contains credentials.';

-- ---------------------------------------------------------------- jobs ----

alter table public.marketing_publish_jobs
  add column if not exists approved_by_policy text;

alter table public.marketing_publish_jobs
  drop constraint if exists marketing_publish_jobs_approved_by_policy_shape;
alter table public.marketing_publish_jobs
  add constraint marketing_publish_jobs_approved_by_policy_shape
    check (
      approved_by_policy is null
      or (approved_by_policy like 'policy:%' and char_length(approved_by_policy) <= 100)
    );

-- Exactly one approver, or none — and approved_at present iff there is one.
alter table public.marketing_publish_jobs
  drop constraint if exists marketing_publish_jobs_approval_pairs;
alter table public.marketing_publish_jobs
  add constraint marketing_publish_jobs_approval_pairs
    check (
      (approved_at is null) = (approved_by is null and approved_by_policy is null)
    );

alter table public.marketing_publish_jobs
  drop constraint if exists marketing_publish_jobs_single_approver;
alter table public.marketing_publish_jobs
  add constraint marketing_publish_jobs_single_approver
    check (approved_by is null or approved_by_policy is null);

comment on column public.marketing_publish_jobs.approved_by_policy is
  'The NON-HUMAN approver, when a policy rather than a person approved this job: the literal ''policy:auto-approve'' (MARKETING_AUTO_APPROVE_SOURCES). Mutually exclusive with approved_by, which stays a profile id. A job approved by a policy is still refused by the gate unless approved_at is set, and the gate still requires live mode and a ready, unpaused connection.';
