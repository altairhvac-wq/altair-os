-- The duplicate guard for agent-proposed reel drafts.
--
-- ==================== WHAT IT PROMISES ====================
-- At most ONE agent-proposed post per (company, video, channel), for the whole
-- life of that post. Re-running the integration cycle cannot produce a second
-- draft, and the route does not have to read before it writes: it inserts and
-- reads 23505 as "already done", so Postgres arbitrates and there is no
-- read-then-write window. Migration 144 claims media reservations the same way.
--
-- ==================== WHY THE PREDICATE IS source_type ====================
-- Not `status = 'draft'`. That version is creatable and looks equivalent, and it
-- is wrong: the moment the founder publishes, the row leaves `draft`, leaves the
-- index, and the next cycle cheerfully creates a second post for a reel that has
-- already gone out. Scoping by source_type survives the whole lifecycle.
--
-- Not unscoped, either. Four posts already carry a video and THREE of them are
-- `instagram` on the same asset, so an unscoped unique index cannot be created
-- against existing data. Those rows are `product_update`; this predicate leaves
-- them alone, which is both what makes the index creatable and the correct
-- behaviour — a guard on unattended proposals has no business policing posts a
-- human made by hand.
--
-- `deleted_at is null` so a soft-deleted draft does not block a fresh proposal.
create unique index if not exists marketing_posts_agent_daily_reel_key
  on public.marketing_posts (company_id, video_media_asset_id, channel_target)
  where source_type = 'agent_daily_reel'
    and deleted_at is null;

comment on index public.marketing_posts_agent_daily_reel_key is
  'One agent-proposed draft per (company, video, channel). The route inserts and treats 23505 as ALREADY_EXISTS, so a repeated integration cycle converges instead of duplicating.';
