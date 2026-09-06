-- The MEASURED render-QA verdict on an agent-drafted marketing post.
--
-- ==================== WHY A SECOND QA COLUMN AND NOT A REUSE OF 195's ====================
-- migration 195's `quality_state` holds agent-platform's
-- STUB / REVIEWABLE_CREATIVE / PRODUCTION_READY classification. That verdict
-- is derived from PROVENANCE — which ingredients the job spec asked for, and
-- what the renderer said about its own output. It never opens the finished
-- file.
--
-- These columns hold a different fact from a different producer: the Truthline
-- integrity verdict (agent-platform `src/video/integrity-policy.ts`), computed
-- by decoding the delivered master with ffmpeg and measuring it — loudness,
-- peak, speech-band energy, per-frame luma, content hash. Its vocabulary is
-- PASS / FAIL / UNEVALUATED and its meaning is "what measuring this file
-- found", not "what the job asked for".
--
-- The two disagree in exactly the way that matters. Every production render to
-- date classifies REVIEWABLE_CREATIVE — `PRODUCTION_READY` is structurally
-- unreachable because the renderer emits no `media.audible`, and `STUB` only
-- fires on stub ingredients — so 195's column, when populated at all, is a
-- constant carrying no information. The measured verdict is the one that
-- separated a −35.8 LUFS master from a −14.9 one. Collapsing them into one
-- column would force a choice between two different questions; keeping both
-- lets a card say "real ingredients, and the file measures clean".
--
-- ==================== UNEVALUATED IS A STATE, NOT A NULL ====================
-- The whole point of the upstream policy is that "we could not measure this"
-- is a distinct answer from "we measured it and it is fine" and from "we
-- measured it and it is broken". `render_qa_state` therefore accepts
-- UNEVALUATED as a value, and NULL means something else entirely: no measured
-- verdict was transported for this post at all (the gate was off, the post
-- predates this migration, or a human authored it). A reader must never render
-- NULL as a pass — `MarketingTodayView` says "Not measured" for it, out loud.
--
-- ==================== WRITTEN ONLY ON INSERT, NEVER ON UPDATE ====================
-- Same rule as 195, for the same reason (migration 147's header): these are
-- populated exclusively by /api/agent/draft-posts at the moment it creates the
-- draft, and nothing in this codebase ever UPDATEs them. A retried cycle
-- cannot overwrite a row a founder may already have edited. Every pre-existing
-- post keeps NULL for as long as it exists; nothing backfills.

alter table public.marketing_posts
  add column if not exists render_qa_state text,
  add column if not exists render_qa_policy text,
  add column if not exists render_qa_summary text,
  add column if not exists render_qa_advisories jsonb;

-- Idempotent via drop-then-add, matching 194/195's convention — re-running
-- this file converges rather than failing.
alter table public.marketing_posts
  drop constraint if exists marketing_posts_render_qa_state_check;
alter table public.marketing_posts
  add constraint marketing_posts_render_qa_state_check
    check (
      render_qa_state is null
      or render_qa_state in ('PASS', 'FAIL', 'UNEVALUATED')
    );

-- The advisory list is codes, not prose: a JSON array of short SCREAMING_SNAKE
-- finding codes the policy recorded but did not enforce (the WARN rung, e.g.
-- AUDIO_LOUDNESS_OFF_TARGET). Bounded so a malformed sender cannot park an
-- unbounded blob on a marketing row.
alter table public.marketing_posts
  drop constraint if exists marketing_posts_render_qa_advisories_check;
alter table public.marketing_posts
  add constraint marketing_posts_render_qa_advisories_check
    check (
      render_qa_advisories is null
      or (
        jsonb_typeof(render_qa_advisories) = 'array'
        and jsonb_array_length(render_qa_advisories) <= 32
      )
    );

-- Mirrors the route's own MAX_RENDER_QA_SUMMARY_CHARS, so a value this column
-- will accept is a value the only writer could actually have produced.
alter table public.marketing_posts
  drop constraint if exists marketing_posts_render_qa_summary_len;
alter table public.marketing_posts
  add constraint marketing_posts_render_qa_summary_len
    check (render_qa_summary is null or char_length(render_qa_summary) <= 1000);

alter table public.marketing_posts
  drop constraint if exists marketing_posts_render_qa_policy_len;
alter table public.marketing_posts
  add constraint marketing_posts_render_qa_policy_len
    check (render_qa_policy is null or char_length(render_qa_policy) <= 64);

comment on column public.marketing_posts.render_qa_state is
  'Truthline measured integrity verdict for the render behind this post: PASS / FAIL / UNEVALUATED. Produced by decoding and measuring the delivered master (agent-platform src/video/integrity-policy.ts), NOT from provenance — see quality_state (migration 195) for that separate, provenance-derived verdict. NULL means no measured verdict was transported, which is not a pass.';

comment on column public.marketing_posts.render_qa_policy is
  'Version of the integrity policy that produced render_qa_state, e.g. truthline-L0-v2. Thresholds and the armed check-set move with this string, so a verdict is only comparable to another under the same version.';

comment on column public.marketing_posts.render_qa_summary is
  'One-line human-readable summary of the measured verdict, as the policy wrote it.';

comment on column public.marketing_posts.render_qa_advisories is
  'JSON array of finding codes the policy recorded but did not enforce — the WARN rung. Present and empty means measured with nothing to note; NULL means no measured verdict was transported.';
