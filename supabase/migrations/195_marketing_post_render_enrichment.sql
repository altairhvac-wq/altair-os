-- Marketing card enrichment for agent-rendered posts: what the render cost,
-- agent-platform's own render-quality verdict, and the Director's stated
-- reasoning for the content's format/treatment.
--
-- ==================== WRITTEN ONLY ON INSERT, NEVER ON UPDATE ====================
-- All three columns are populated exclusively by /api/agent/draft-posts, at
-- the same moment it creates a draft post (createAgentDraftMarketingPost).
-- That function never updates an existing row — migration 147's header
-- explains why: a founder may have already rewritten the post by the time a
-- retried cycle runs, and overwriting anything on that row would undo a
-- human decision. These three columns follow the same rule by construction:
-- nothing in this codebase ever UPDATEs them, so every existing post keeps
-- exactly the value it already has (null, for every row that predates this
-- migration) for as long as it exists.
--
-- ==================== NULL MEANS "NOT KNOWN", NEVER "ZERO" OR "STUB" ====================
-- All three are nullable with no default, and stay null for: every
-- pre-existing post, every hand-authored post, and any agent-rendered post
-- whose render this platform could not price or classify (the agent side
-- attaches a value only when it actually has one — never a guess). Nothing
-- backfills these for historical rows.
--
-- ==================== quality_state IS NOT THE 185 COLUMN OF THE SAME NAME ====================
-- migration 185's creative_generation_candidates.quality_state is a human's
-- review verdict on a generated image ('pending_review' / 'approved' /
-- 'rejected'). This column is agent-platform's own automated
-- STUB / REVIEWABLE_CREATIVE / PRODUCTION_READY classification of a finished
-- VIDEO render (src/video/quality-classification.ts in that repository) —
-- a different fact, about a different kind of asset, that happens to share a
-- name. See the column comment below; do not conflate the two.

alter table public.marketing_posts
  add column if not exists cost_usd numeric,
  add column if not exists quality_state text,
  add column if not exists director_rationale text;

-- Idempotent via drop-then-add, matching migration 194's own convention for a
-- CHECK constraint — re-running this file converges rather than failing.
alter table public.marketing_posts
  drop constraint if exists marketing_posts_cost_usd_check;
alter table public.marketing_posts
  add constraint marketing_posts_cost_usd_check
    check (cost_usd is null or cost_usd >= 0);

alter table public.marketing_posts
  drop constraint if exists marketing_posts_quality_state_check;
alter table public.marketing_posts
  add constraint marketing_posts_quality_state_check
    check (
      quality_state is null
      or quality_state in ('STUB', 'REVIEWABLE_CREATIVE', 'PRODUCTION_READY')
    );

-- Mirrors video-plan.ts's own directorRationale.max(2000) on the agent-
-- platform side, so a value this column will accept is a value that source
-- could actually have produced.
alter table public.marketing_posts
  drop constraint if exists marketing_posts_director_rationale_len;
alter table public.marketing_posts
  add constraint marketing_posts_director_rationale_len
    check (director_rationale is null or char_length(director_rationale) <= 2000);

comment on column public.marketing_posts.cost_usd is
  'Estimated USD cost of the render behind this post, read by agent-platform from its own cost ledger (the businessObjective key video.render_job:<jobId> video.ts stamps on every reservation/settlement for that job) and sent once at draft-creation time. Null for every post created before this column existed, for any hand-authored post, and for an agent-rendered post whose cost this platform could not determine — never fabricated for those. Never written after the initial insert.';

comment on column public.marketing_posts.quality_state is
  'agent-platform''s own automated render-quality verdict for the video behind this post: STUB, REVIEWABLE_CREATIVE, or PRODUCTION_READY (src/video/quality-classification.ts in that repository). NOT the same vocabulary as creative_generation_candidates.quality_state (migration 185), which records a HUMAN''s review of a generated IMAGE using a different set of values (pending_review/approved/rejected) — same column name, unrelated fact, different table. Null when agent-platform was not configured to classify the render, or the post predates this column. Never written after the initial insert.';

comment on column public.marketing_posts.director_rationale is
  'The Director''s own stated reasoning for this content''s format and treatment, carried from agent-platform''s content.video_plan artifact (video-plan.ts) when the render traces back to one. Null for a post with no such recorded Director decision — a hand-authored post, a post from before this column existed, or a plan drafted without Director involvement. Never written after the initial insert.';
