-- Proof that migration 145's same-company rule is enforced by the DATABASE.
--
-- ===================== WHY A PROOF AND NOT A UNIT TEST =====================
-- The claim being made is "a marketing post cannot reference another company's
-- video". Application code cannot demonstrate that — it can only demonstrate
-- that the one path we remembered to guard refuses. The claim is about every
-- path, including a service-role script and a manual SQL fix, so the only
-- thing that can prove it is the database refusing the write itself.
--
-- This runs against a THROWAWAY local Postgres, never a hosted project. It
-- creates its own minimal stand-ins for `companies`, `marketing_posts` and
-- `marketing_media_assets` — enough columns for the constraint under test and
-- nothing else — then applies the real constraint text from migration 145.
--
--   createdb -h /tmp/pg -p 5433 -U postgres reelproof
--   psql -h /tmp/pg -p 5433 -U postgres -d reelproof -v ON_ERROR_STOP=0 \
--        -f scripts/proof-reel-tenancy.sql
--
-- Every EXPECTED FAILURE below must print an error. A run with no errors means
-- the constraint is not doing anything.

\set ON_ERROR_STOP off

drop table if exists public.marketing_posts cascade;
drop table if exists public.marketing_channel_deliveries cascade;
drop table if exists public.marketing_media_assets cascade;
drop table if exists public.companies cascade;

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null
);

-- Mirrors migration 144's shape for the columns this proof touches.
create table public.marketing_media_assets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  source_job_id text not null,
  object_key text not null,
  upload_state text not null default 'pending',
  constraint marketing_media_assets_unique unique (company_id, source_job_id)
);

-- Mirrors migration 087's shape for the columns this proof touches.
create table public.marketing_posts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  title text not null
);

create table public.marketing_channel_deliveries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  marketing_post_id uuid not null references public.marketing_posts (id) on delete cascade,
  provider text not null,
  delivery_state text not null default 'in_flight'
);

-- ============================ MIGRATION 145 ============================
-- Applied twice, in full, to prove convergence. The second run must be a
-- no-op rather than an error.

create unique index if not exists marketing_media_assets_id_company_key
  on public.marketing_media_assets (id, company_id);

alter table public.marketing_posts
  add column if not exists video_media_asset_id uuid;

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
      on delete no action
      on update no action;
  end if;
end $$;

create index if not exists marketing_posts_video_media_asset_idx
  on public.marketing_posts (video_media_asset_id)
  where video_media_asset_id is not null;

alter table public.marketing_channel_deliveries
  add column if not exists provider_media_id text;

-- ---- second application, verbatim -------------------------------------
create unique index if not exists marketing_media_assets_id_company_key
  on public.marketing_media_assets (id, company_id);
alter table public.marketing_posts
  add column if not exists video_media_asset_id uuid;
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
      on delete no action on update no action;
  end if;
end $$;
create index if not exists marketing_posts_video_media_asset_idx
  on public.marketing_posts (video_media_asset_id)
  where video_media_asset_id is not null;
alter table public.marketing_channel_deliveries
  add column if not exists provider_media_id text;

\echo '=== 145 applied twice without error ==='

-- ============================== FIXTURES ==============================
insert into public.companies (id, name) values
  ('11111111-1111-1111-1111-111111111111', 'Alpha'),
  ('22222222-2222-2222-2222-222222222222', 'Beta');

insert into public.marketing_media_assets (id, company_id, source_job_id, object_key, upload_state)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '11111111-1111-1111-1111-111111111111',
   'render-alpha', '11111111-1111-1111-1111-111111111111/video/render-alpha.mp4', 'stored'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   '22222222-2222-2222-2222-222222222222',
   'render-beta', '22222222-2222-2222-2222-222222222222/video/render-beta.mp4', 'stored');

insert into public.marketing_posts (id, company_id, title) values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc',
   '11111111-1111-1111-1111-111111111111', 'Alpha reel');

\echo ''
\echo '=== 1. EXPECTED SUCCESS: same-company reference ==='
update public.marketing_posts
   set video_media_asset_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
 where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
select title, video_media_asset_id is not null as has_video from public.marketing_posts;

\echo ''
\echo '=== 2. EXPECTED FAILURE: Alpha post pointing at Beta video ==='
update public.marketing_posts
   set video_media_asset_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
 where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

\echo ''
\echo '=== 3. EXPECTED FAILURE: insert with a cross-company video ==='
insert into public.marketing_posts (company_id, title, video_media_asset_id)
values ('11111111-1111-1111-1111-111111111111', 'Sneaky',
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

\echo ''
\echo '=== 4. EXPECTED FAILURE: nonexistent video id ==='
insert into public.marketing_posts (company_id, title, video_media_asset_id)
values ('11111111-1111-1111-1111-111111111111', 'Ghost',
        'dddddddd-dddd-dddd-dddd-dddddddddddd');

\echo ''
\echo '=== 5. EXPECTED SUCCESS: null video is still allowed (text/image posts) ==='
insert into public.marketing_posts (company_id, title)
values ('11111111-1111-1111-1111-111111111111', 'Plain text post');

\echo ''
\echo '=== 6. EXPECTED FAILURE: deleting a video a post still references ==='
delete from public.marketing_media_assets
 where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

\echo ''
\echo '=== 7. EXPECTED SUCCESS: company cascade removes both together ==='
delete from public.companies where id = '11111111-1111-1111-1111-111111111111';
select
  (select count(*) from public.marketing_posts)         as posts_left,
  (select count(*) from public.marketing_media_assets)  as assets_left;

\echo ''
\echo '=== 8. EXPECTED SUCCESS: provider_media_id accepts an id and stays nullable ==='
insert into public.marketing_posts (id, company_id, title)
values ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        '22222222-2222-2222-2222-222222222222', 'Beta reel');
insert into public.marketing_channel_deliveries
  (company_id, marketing_post_id, provider, provider_media_id)
values ('22222222-2222-2222-2222-222222222222',
        'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'facebook', '1234567890');
insert into public.marketing_channel_deliveries
  (company_id, marketing_post_id, provider)
values ('22222222-2222-2222-2222-222222222222',
        'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'instagram');
select provider, coalesce(provider_media_id, '(null)') as media_id
  from public.marketing_channel_deliveries order by provider;
