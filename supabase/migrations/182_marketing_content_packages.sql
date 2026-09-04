-- Content packages: the parent of a provider fan-out.
--
-- ===================== WHAT THIS DOES NOT DO =====================
-- It does NOT change what a marketing post is. Migration 145's header settled
-- that: one `marketing_posts` row is ONE publishable unit for ONE provider,
-- and migration 143's `unique (company_id, marketing_post_id, provider)` is
-- built on it. Nothing here touches either. A package sits ABOVE the posts —
-- one package, N posts, one post per destination — so the duplicate guard
-- keeps arbitrating exactly what it always did.
--
-- The alternative was tempting and wrong: let one post carry many providers.
-- It cannot. A post shared between two providers can claim only one delivery
-- row, so the second publish reads as a duplicate of the first and is refused
-- — the post looks publishable forever and never publishes.
--
-- ======================== WHY A TABLE AT ALL ========================
-- The Agent Platform does not produce "a Facebook post". It produces a piece
-- of content — video, caption, title, transcript, hashtags, CTA, and the
-- provenance of how it came to exist — and WHICH surfaces receive it is a
-- separate, later, revisable decision. With no parent row there is nowhere to
-- record that four posts are the same piece of work, so approving it means
-- approving four things, and withdrawing it means remembering all four.
--
-- ==================== WHAT LIVES IN `brief` ====================
-- The columns here are the ones the database must reason about: tenancy, the
-- source identity that makes a repeated agent cycle converge, the lifecycle
-- state, and who approved it. Everything else in the package contract —
-- description, caption, hashtags, tags, transcript, WebVTT captions, CTA,
-- destination providers, requested publish time, approval requirement, SEO
-- metadata, provenance — is the `brief` payload. Its shape is
-- `ContentPackage` in shared/types/publishing-package.ts, and no query plans
-- on it, which is exactly why it is one jsonb column and not eighteen.
--
-- ==================== WHAT IS NOT STORED ====================
-- No signed URLs, no public URLs, no filesystem paths, no tokens. Assets are
-- named by `marketing_media_assets` id, and the bytes behind them are reached
-- only through a grant minted at publish time and discarded — migration 144's
-- rule, unchanged.

-- ------------------------------------------------------------------ package
create table if not exists public.marketing_content_packages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,

  title text not null,

  -- REUSES `public.marketing_post_source` rather than declaring a parallel
  -- enum. A package and the posts it fans out to must give the same answer to
  -- "where did this come from": migration 147's duplicate guard is scoped to
  -- `source_type = 'agent_daily_reel'`, and a package filed under a private
  -- second vocabulary would be reasoning about a different thing than the
  -- posts it produced. A second enum is also a second list to widen — the
  -- drift documented at the top of shared/types/integration-provider.ts.
  source_type public.marketing_post_source not null default 'manual',

  -- The platform artifact this package was built from, as a bare uuid. The
  -- platform spells it `art_<uuid>`; the prefix is stripped before it lands
  -- here, matching what /api/agent/draft-posts already does for
  -- `marketing_posts.source_id`. Nullable: a hand-authored package has no
  -- artifact behind it.
  source_id uuid,

  brief jsonb not null default '{}'::jsonb,

  package_state text not null default 'draft',

  created_by uuid references public.profiles (id) on delete set null,
  approved_by uuid references public.profiles (id) on delete set null,
  approved_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint marketing_content_packages_state_check
    check (package_state in ('draft', 'approved', 'publishing', 'published', 'archived')),
  constraint marketing_content_packages_title_len
    check (char_length(title) > 0 and char_length(title) <= 300),
  -- `brief` is addressed with jsonb object operators throughout. A scalar or
  -- an array stored here would not fail on write and would not fail on read
  -- either — it would return null for every key, so a package would render as
  -- one with no caption, no CTA and no destinations rather than as broken.
  constraint marketing_content_packages_brief_is_object
    check (jsonb_typeof(brief) = 'object'),
  -- Approval is one fact recorded in two columns, and half of it is not an
  -- approval. A row naming an approver with no timestamp cannot answer "when
  -- was this cleared to publish", which is the question an audit asks.
  constraint marketing_content_packages_approval_pair
    check ((approved_by is null) = (approved_at is null))
);

-- `id` is already the primary key, so (id, company_id) is trivially unique.
-- The index exists because a composite foreign key needs its referenced pair
-- covered — the rule migration 145 established. This is what lets the
-- database ENFORCE that a package and its assets, and a package and its
-- posts, belong to the same company, rather than merely recording that they
-- are supposed to.
create unique index if not exists marketing_content_packages_id_company_key
  on public.marketing_content_packages (id, company_id);

-- ======================= THE CONVERGENCE KEY =======================
-- One package per (company, source type, artifact). A repeated agent cycle
-- re-sends the same artifact and hits this index, so the writer can insert
-- and read 23505 as "already done" — no read-then-write window, Postgres
-- arbitrates. Migrations 144 and 147 claim their idempotency the same way.
--
-- Partial on `source_id is not null` because a hand-authored package has no
-- artifact, and in a unique index every null is distinct anyway — the
-- predicate says so explicitly rather than relying on the reader knowing it.
--
-- An `archived` package still occupies the key, deliberately. Archiving is a
-- human deciding this piece of content will not go out; letting the next
-- cycle mint a second package for the same artifact would resurrect exactly
-- what was withdrawn, and the resulting fan-out would collide with the first
-- package's posts one provider at a time under 143's guard — a confusing
-- failure, far away, long after the decision that caused it.
create unique index if not exists marketing_content_packages_source_key
  on public.marketing_content_packages (company_id, source_type, source_id)
  where source_id is not null;

create index if not exists marketing_content_packages_company_state_idx
  on public.marketing_content_packages (company_id, package_state);

drop trigger if exists marketing_content_packages_set_updated_at
  on public.marketing_content_packages;
create trigger marketing_content_packages_set_updated_at
before update on public.marketing_content_packages
for each row execute function public.set_updated_at();

alter table public.marketing_content_packages enable row level security;

-- Same posture as deliveries and media assets (143, 144): dispatchers can SEE
-- what the platform proposed and what state it is in, because "did today's
-- content get approved?" is an operational question. Writes are service-role
-- only — a package is authored by the server-side agent path, and approval
-- runs through a Server Action that holds the service-role client after it
-- has checked the caller.
drop policy if exists "dispatchers can read marketing content packages"
  on public.marketing_content_packages;
create policy "dispatchers can read marketing content packages"
  on public.marketing_content_packages
  for select
  to authenticated
  using (
    public.is_active_company_member(company_id)
    and public.can_dispatch_jobs(company_id)
  );

-- RLS narrows an existing privilege; it does not create one. Without this
-- grant the policy above is silently inert — the trap migration 143 documents
-- at lines 147-151.
grant select on table public.marketing_content_packages to authenticated;
revoke insert, update, delete on table public.marketing_content_packages from authenticated;
revoke all on table public.marketing_content_packages from anon;
grant all on table public.marketing_content_packages to service_role;

-- ------------------------------------------------------------------ assets
-- Which media a package carries, and what each piece is FOR.
--
-- The role is not decoration. It is what tells the fan-out that one asset is
-- the video and another is its cover: a provider with no cover-image concept
-- must drop the thumbnail rather than deliver it, or a one-video package
-- posts the video AND a still frame of that same video. Without a role there
-- is no way to tell those two assets apart.
create table if not exists public.marketing_content_package_assets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  package_id uuid not null,
  media_asset_id uuid not null,

  asset_role text not null,

  -- smallint, and bounded well below its range. Ordering within a role for a
  -- carousel; a bound of 19 is above every provider's ceiling (LinkedIn's 9
  -- is the largest) and stops a sort key from being used as a scratch integer.
  sort_order smallint not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint marketing_content_package_assets_role_check
    check (asset_role in ('primary_video', 'thumbnail', 'image', 'link_card')),
  constraint marketing_content_package_assets_sort_check
    check (sort_order >= 0 and sort_order <= 19),
  -- One asset per slot. Two rows claiming `primary_video` at position 0 is a
  -- package with two primary videos, and nothing downstream could pick.
  constraint marketing_content_package_assets_unique
    unique (package_id, asset_role, sort_order),

  -- ============ TENANCY IS A FOREIGN KEY, NOT A CODE PATH ============
  -- Both references are COMPOSITE on (..., company_id) against a parent
  -- unique on (id, company_id) — migration 145's rule. A cross-company
  -- reference is not merely refused by the branch someone remembered to
  -- write: it cannot be written by any path at all, including a service-role
  -- script, a manual SQL fix, or a future backfill.
  constraint marketing_content_package_assets_package_fkey
    foreign key (package_id, company_id)
      references public.marketing_content_packages (id, company_id)
      -- Deleting a package removes its asset links. The link is not the
      -- media; the `marketing_media_assets` row and the object in the bucket
      -- both survive, and can be reused by another package.
      on delete cascade
      on update no action,

  -- NO ACTION for the media reference, and not RESTRICT — the same reasoning
  -- migration 145 wrote out for `marketing_posts.video_media_asset_id`.
  --
  -- There is no application path that deletes a media asset; the only
  -- deletion is the cascade from `companies`, which removes the packages, the
  -- asset links and the media in one statement. NO ACTION defers its check to
  -- the end of that statement and therefore sees all of them gone. RESTRICT
  -- checks immediately, cannot be deferred, and would block company deletion
  -- outright.
  --
  -- SET NULL was doubly impossible: on a composite key it nulls every
  -- referencing column unless a column list is given, and both `company_id`
  -- and `media_asset_id` are NOT NULL.
  constraint marketing_content_package_assets_media_fkey
    foreign key (media_asset_id, company_id)
      references public.marketing_media_assets (id, company_id)
      on delete no action
      on update no action
);

create index if not exists marketing_content_package_assets_package_idx
  on public.marketing_content_package_assets (package_id, sort_order);

-- Referencing columns under a NO ACTION foreign key are checked on every
-- delete of a parent row. Unindexed, that check is a sequential scan of this
-- table per media asset removed during a company deletion — which is exactly
-- the operation already under a time fence (177, 178).
create index if not exists marketing_content_package_assets_media_idx
  on public.marketing_content_package_assets (media_asset_id);

drop trigger if exists marketing_content_package_assets_set_updated_at
  on public.marketing_content_package_assets;
create trigger marketing_content_package_assets_set_updated_at
before update on public.marketing_content_package_assets
for each row execute function public.set_updated_at();

alter table public.marketing_content_package_assets enable row level security;

drop policy if exists "dispatchers can read marketing content package assets"
  on public.marketing_content_package_assets;
create policy "dispatchers can read marketing content package assets"
  on public.marketing_content_package_assets
  for select
  to authenticated
  using (
    public.is_active_company_member(company_id)
    and public.can_dispatch_jobs(company_id)
  );

grant select on table public.marketing_content_package_assets to authenticated;
revoke insert, update, delete on table public.marketing_content_package_assets from authenticated;
revoke all on table public.marketing_content_package_assets from anon;
grant all on table public.marketing_content_package_assets to service_role;

-- ------------------------------------------------- the post's parent link
-- ==================== NULLABLE, AND NOT UNIQUE ====================
-- Every existing `marketing_posts` row gets null here and stays valid
-- forever. /api/agent/draft-posts never sets this column, so its insert is
-- byte-for-byte the same insert it was before this migration, and migration
-- 147's `marketing_posts_agent_daily_reel_key` still arbitrates its
-- idempotency alone — that route inserts and reads 23505 as ALREADY_EXISTS,
-- so a SECOND unique index over these rows would make 23505 ambiguous and the
-- route would report "already done" for a collision that meant something
-- else entirely.
--
-- ============ WHY NO UNIQUE INDEX IS ADDED HERE ============
-- The obvious guard to reach for — unique over
-- (company_id, video_media_asset_id, channel_target), so one video cannot
-- reach one channel twice — CANNOT be created. Migration 147's header
-- records why: four posts already carry a video and THREE of them are
-- `instagram` on the same asset. Those rows are `product_update`, written by
-- hand before any of this existed. An unscoped unique index over
-- (company_id, video_media_asset_id, channel_target) fails at CREATE time
-- against that live data, and a scoped one would police posts a human made
-- deliberately — which is why 147 scoped itself to `source_type =
-- 'agent_daily_reel'` and left the hand-made rows alone.
--
-- The duplicate that actually matters is already prevented one level up:
-- `buildProviderPosts` in shared/types/publishing-package.ts emits at most one
-- plan per provider, and migration 143's
-- `unique (company_id, marketing_post_id, provider)` refuses a second
-- delivery for any post that slipped through.
alter table public.marketing_posts
  add column if not exists content_package_id uuid;

-- Idempotent because `add constraint` has no `if not exists`. Re-running this
-- migration must converge, not fail.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'marketing_posts_content_package_fkey'
      and conrelid = 'public.marketing_posts'::regclass
  ) then
    alter table public.marketing_posts
      add constraint marketing_posts_content_package_fkey
      foreign key (content_package_id, company_id)
      references public.marketing_content_packages (id, company_id)
      -- NO ACTION for the same reason 145 chose it: the only deletion that
      -- reaches both sides is the cascade from `companies`, which removes the
      -- posts and the packages in one statement, and a deferred check sees
      -- both gone. RESTRICT would block company deletion; SET NULL on a
      -- composite key would try to null the NOT NULL `company_id`.
      --
      -- It also means a package cannot be hard-deleted while posts point at
      -- it, which is correct: those posts may already be published, and the
      -- package is the only record of what they were. Withdrawal is
      -- `package_state = 'archived'`, not a delete.
      on delete no action
      on update no action;
  end if;
end $$;

-- Partial: most posts belong to no package, and the index exists to answer
-- "what did this package produce?" rather than to scan the table.
create index if not exists marketing_posts_content_package_idx
  on public.marketing_posts (content_package_id)
  where content_package_id is not null;

comment on table public.marketing_content_packages is
  'One finished piece of content, parent to one marketing_posts row per destination provider. Does not change what a post is: migration 145 keeps one post = one publishable unit for one provider, and 143 unique (company_id, marketing_post_id, provider) keeps arbitrating duplicates unchanged. Unique (company_id, source_type, source_id) where source_id is not null makes a repeated agent cycle converge instead of duplicating.';

comment on column public.marketing_content_packages.brief is
  'The ContentPackage payload from shared/types/publishing-package.ts, minus the columns promoted out of it for the database to reason about. Carries description, caption, hashtags, tags, transcript, WebVTT captions, CTA, destination providers, requested publish time, approval requirement, SEO metadata and provenance. Never a signed URL, a public URL, a filesystem path, or a credential.';

comment on column public.marketing_content_packages.source_type is
  'Reuses public.marketing_post_source rather than a parallel enum, so a package and the posts it produces give the same answer to "where did this come from" — migration 147 duplicate guard is scoped by this vocabulary.';

comment on table public.marketing_content_package_assets is
  'Which media a package carries and what each piece is for. Both foreign keys are composite on (..., company_id), so a cross-tenant reference is rejected by the database rather than by application code. The media reference is on delete no action for the reason migration 145 records: the only deletion reaching it is the company cascade, and a deferred check sees both sides gone.';

comment on column public.marketing_content_package_assets.asset_role is
  'primary_video, thumbnail, image or link_card. Mirrored character for character by ASSET_ROLES in shared/types/publishing-package.ts, which the fan-out reads to decide the media kind and to drop a thumbnail for a provider that has no cover-image concept. The role is what the fan-out reasons about; the referenced marketing_media_assets row records what the object actually IS. A writer must pair them — an image role pointing at a video row would have the fan-out offer a still to a surface and the transport hand it an MP4.';

comment on column public.marketing_posts.content_package_id is
  'The content package this post was fanned out from, or null. Nullable and NOT unique on purpose: every pre-existing post keeps a null, /api/agent/draft-posts never writes it and is unaffected, and migration 147 marketing_posts_agent_daily_reel_key remains the only unique index over these rows so that route can keep reading 23505 as ALREADY_EXISTS. Same-company enforced by a composite foreign key on (content_package_id, company_id).';
