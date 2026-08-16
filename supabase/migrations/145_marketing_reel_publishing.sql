-- Reel publishing: a marketing post can name the video it publishes, and a
-- delivery can remember the provider-side media object it created.
--
-- ===================== WHY A COLUMN AND NOT A JOIN TABLE =====================
-- A Reel is ONE post publishing ONE video. Migration 143's duplicate guard is
-- `unique (company_id, marketing_post_id, provider)`, so a Reel that shares a
-- marketing post with a text or photo post could never claim its own delivery
-- row — publishing the Reel would read as a duplicate of the text post. A Reel
-- is therefore its own marketing post, and a single nullable column on
-- `marketing_posts` is the whole relationship. No new table, no new unique
-- constraint, and 143's guard keeps working unchanged.
--
-- =============== THE SAME-COMPANY RULE IS A FOREIGN KEY ===============
-- The requirement is that a marketing post and its video belong to the same
-- company. That could have been an application check. It is a COMPOSITE
-- FOREIGN KEY instead — (video_media_asset_id, company_id) referencing
-- (id, company_id) — so a cross-company reference is not merely refused by the
-- code path we remembered to guard: it cannot be written by any path at all,
-- including a service-role script, a manual SQL fix, or a future backfill.
--
-- ==================== WHAT IS STILL NOT STORED ====================
-- Nothing here holds a signed URL, a public URL, or a filesystem path. The
-- post names an ASSET by id; the bytes are reached only through a grant minted
-- at publish time and discarded. `provider_media_id` is Meta's own identifier
-- for an object on Meta's side — an identity, not a capability.

-- ---------------------------------------------------- FK target uniqueness
-- `id` is already the primary key, so (id, company_id) is trivially unique.
-- The index exists because a composite foreign key needs its referenced pair
-- to be covered — this is what lets the database enforce tenancy rather than
-- merely record it.
create unique index if not exists marketing_media_assets_id_company_key
  on public.marketing_media_assets (id, company_id);

-- ------------------------------------------------------ the post reference
alter table public.marketing_posts
  add column if not exists video_media_asset_id uuid;

-- Idempotent because `add constraint` has no `if not exists`. Re-running this
-- migration must converge, not fail.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'marketing_posts_video_media_asset_fkey'
      and conrelid = 'public.marketing_posts'::regclass
  ) then
    alter table public.marketing_posts
      add constraint marketing_posts_video_media_asset_fkey
      foreign key (video_media_asset_id, company_id)
      references public.marketing_media_assets (id, company_id)
      -- NO ACTION, deliberately, and not RESTRICT.
      --
      -- There is no application path that deletes a media asset; the only
      -- deletion is the cascade from `companies`, which removes the posts and
      -- the assets in the same statement. NO ACTION defers its check to the
      -- end of that statement and therefore sees both gone. RESTRICT checks
      -- immediately and cannot be deferred, so it would block company
      -- deletion outright.
      --
      -- SET NULL was rejected: on a composite key it nulls EVERY referencing
      -- column unless a column list is given, and `company_id` is NOT NULL —
      -- so the delete would fail with a constraint violation instead.
      on delete no action
      on update no action;
  end if;
end $$;

-- Partial: most posts have no video, and the index exists to answer "is this
-- asset in use?" rather than to scan the table.
create index if not exists marketing_posts_video_media_asset_idx
  on public.marketing_posts (video_media_asset_id)
  where video_media_asset_id is not null;

-- ------------------------------------------------ provider-side media ids
-- WHY THIS IS SEPARATE FROM provider_post_id.
--
-- Both Reel flows create a provider-side object BEFORE anything is published:
-- Facebook reserves a `video_id` in its start phase, Instagram creates a
-- container. Publishing is a later, separate call. If the process dies in
-- between, `provider_post_id` is correctly still null — nothing was published
-- — and without this column there would be no record that an object exists at
-- Meta at all. The operator would be told to go reconcile with no identifier
-- to reconcile against.
--
-- Recorded while the delivery is still `in_flight`, which is the only window
-- in which it is knowable.
alter table public.marketing_channel_deliveries
  add column if not exists provider_media_id text;

comment on column public.marketing_channel_deliveries.provider_media_id is
  'Provider-side id of the media object created before publishing (Facebook video_id, Instagram container id). Written while the delivery is in_flight so a claim that never settles still names something an operator can inspect at the provider. Not a capability and not a URL.';

comment on column public.marketing_posts.video_media_asset_id is
  'The rendered video this post publishes, as a marketing_media_assets id. Enforced same-company by a composite foreign key on (video_media_asset_id, company_id) — a cross-tenant reference is rejected by the database, not by application code. Never a URL and never a filesystem path; bytes are reached only through a short-lived grant minted at publish time.';
