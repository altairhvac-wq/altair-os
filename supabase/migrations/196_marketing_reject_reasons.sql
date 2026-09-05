-- 196: the reject button starts teaching — reasons, tags, and the decision
-- channel learns the marketing_post subject.
--
-- ==================== WHY (verified, not assumed) ====================
-- Rejecting a draft today writes exactly two facts: status='archived' and
-- archived_at. No reason, no actor, no decision-channel row — the agent
-- platform never learns a draft was rejected, let alone why. Meanwhile the
-- platform's whole learning design (Altair-agent-platform
-- docs/quality-learning/06-HUMAN-FEEDBACK-STRATEGY.md) needs exactly one
-- thing from this side: the founder's one-tap reason riding the
-- ALREADY-BUILT decision pull (agent_marketing_decisions, migration 142) —
-- quality-learning open decision OD-3, default "extend the channel".
--
-- ==================== WHAT THIS ADDS (all additive) ====================
-- 1. subject_kind 'marketing_post' joins the decision-channel CHECK, so a
--    reject-with-reason can ride the existing transport. ('marketing_post'
--    is the name three of the four planning docs agree on; the fourth said
--    'draft_post' and lost the vote — recorded here so nobody relitigates.)
-- 2. marketing_posts.archived_reason (text) + archived_tags (jsonb array):
--    the one-tap primary reason and optional weakness tags, nullable —
--    every existing row and every reasonless archive stays valid. The
--    initial reason vocabulary lives in shared/types (code), NOT in a
--    CHECK: the taxonomy is expected to be revised, and labels, once
--    collected under a version, are the one acknowledged irreversibility —
--    versioning belongs to the reader, not the schema.
-- 3. marketing_channel_deliveries.published_text (text): the copy AS
--    PUBLISHED, so a founder edit before publishing is itself a label (the
--    drafted-vs-published diff), joined by delivery row — the only
--    channel-truthful join (channel_target is wrong on 9 of 14 verified
--    deliveries).
--
-- ==================== DOWN MIGRATION (for the record) ====================
-- alter table public.marketing_posts drop column if exists archived_reason;
-- alter table public.marketing_posts drop column if exists archived_tags;
-- alter table public.marketing_channel_deliveries drop column if exists published_text;
-- alter table public.agent_marketing_decisions drop constraint agent_marketing_decisions_subject_kind_check;
-- alter table public.agent_marketing_decisions add constraint agent_marketing_decisions_subject_kind_check
--   check (subject_kind in ('approval', 'recommendation', 'video_render'));
-- (Reversing the CHECK requires no 'marketing_post' rows to exist yet;
-- rows are learning signal, not authorization, and may also simply be left.)

alter table public.agent_marketing_decisions
  drop constraint if exists agent_marketing_decisions_subject_kind_check;

alter table public.agent_marketing_decisions
  add constraint agent_marketing_decisions_subject_kind_check
  check (subject_kind in ('approval', 'recommendation', 'video_render', 'marketing_post'));

alter table public.marketing_posts
  add column if not exists archived_reason text
    check (archived_reason is null or char_length(archived_reason) <= 200);

alter table public.marketing_posts
  add column if not exists archived_tags jsonb
    check (archived_tags is null or jsonb_typeof(archived_tags) = 'array');

comment on column public.marketing_posts.archived_reason is
  'One-tap primary reject reason (vocabulary versioned in shared/types/marketing-reject-reasons.ts, not here). Null = archived without a reason, exactly as every archive before this column.';

comment on column public.marketing_posts.archived_tags is
  'Optional weakness tags accompanying the reason, as a JSON array of strings. Null, never [], when none were given.';

alter table public.marketing_channel_deliveries
  add column if not exists published_text text
    check (published_text is null or char_length(published_text) <= 10000);

comment on column public.marketing_channel_deliveries.published_text is
  'The post copy AS PUBLISHED on this delivery — a founder edit before publishing is itself a label (drafted vs published diff). Null for deliveries settled before this column existed: unknown, not unedited.';
