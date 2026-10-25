-- Website drafts from the agent bridge: the two keys that make them converge.
--
-- ===================== WHAT THIS IS FOR =====================
-- /api/agent/draft-posts now accepts channel 'website'. For that channel the
-- bridge writes ONE marketing_content_packages row (the SEO brief: slug, meta
-- title, meta description, keywords, body) and ONE marketing_posts draft with
-- channel_target = 'website' pointing at it through content_package_id
-- (migration 182). Nothing here publishes anything: the post is 'draft', the
-- package is 'draft', and the only publisher of a page remains the
-- altair_site adapter behind a recorded human approval.
--
-- ===================== WHY TWO NEW UNIQUE INDEXES =====================
-- The bridge's idempotency rule is "insert, and read 23505 as ALREADY_EXISTS"
-- (migrations 144, 147, 182). Both existing arbiters are blind to a website
-- draft:
--
--   * 182's package key is (company_id, source_type, source_id), partial on
--     source_id — the platform ARTIFACT uuid. The bridge converges on the
--     render/plan JOB id (`sourceJobId`, text, the same identity migration
--     144 keys media on), and an article may carry no artifact at all.
--   * 147's post key is (company_id, video_media_asset_id, channel_target).
--     An article has no video, and nulls are distinct in a unique index, so
--     two cycles would mint two website drafts for one brief.
--
-- So: a package converges on (company_id, source_job_id), and a post
-- converges on (company_id, content_package_id, channel_target) — one post
-- per destination per package, which is exactly the one-package-N-posts
-- shape 182's header describes.
--
-- ============ WHY THIS DOES NOT MAKE 147's 23505 AMBIGUOUS ============
-- 182's header warned against a second unique index over the agent reel rows,
-- because the route reads 23505 as "already done" and could not tell which
-- key fired. The post index below is partial on content_package_id IS NOT
-- NULL, and the bridge sets content_package_id ONLY on website posts, which
-- carry no video. A reel row (video, no package) is covered by 147 alone; a
-- website row (package, no video) by this index alone. No row is under both.
-- No existing row has a content_package_id (nothing inserted packages before
-- this), so the index creates cleanly against live data.

alter table public.marketing_content_packages
  add column if not exists source_job_id text;

-- Same shape rule the media ingest applies to the job id it keys on
-- (isSafeSourceJobId in shared/types/marketing-media.ts). Idempotent because
-- `add constraint` has no `if not exists`.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'marketing_content_packages_source_job_id_shape'
      and conrelid = 'public.marketing_content_packages'::regclass
  ) then
    alter table public.marketing_content_packages
      add constraint marketing_content_packages_source_job_id_shape
      check (
        source_job_id is null
        or source_job_id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$'
      );
  end if;
end $$;

create unique index if not exists marketing_content_packages_source_job_key
  on public.marketing_content_packages (company_id, source_job_id)
  where source_job_id is not null;

-- Scoped to agent-bridge rows (source_type 'agent_daily_reel'): production
-- already holds two hand-run site-canary posts (source_type 'other') for one
-- package and channel, the publish and the revision of the September test
-- article, each with its own delivery and publish job. That history stays;
-- the key only has to make the BRIDGE converge, and every bridge insert uses
-- the agent source type.
create unique index if not exists marketing_posts_content_package_channel_key
  on public.marketing_posts (company_id, content_package_id, channel_target)
  where content_package_id is not null
    and deleted_at is null
    and source_type = 'agent_daily_reel';

comment on column public.marketing_content_packages.source_job_id is
  'The agent-platform job this package was drafted from, when the bridge wrote it. Unique per company where not null, so a repeated cycle converges on one package (the route inserts and reads 23505 as ALREADY_EXISTS). Null for hand-authored packages. Distinct from source_id, which is the artifact uuid.';

comment on index public.marketing_posts_content_package_channel_key is
  'One post per (company, package, channel) for posts that belong to a package. Partial on content_package_id, so migration 147 agent reel rows (video, no package) stay under their own key and 23505 remains unambiguous for each.';
