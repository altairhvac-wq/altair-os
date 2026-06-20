-- Marketing Hub V1: post draft foundation and company-scoped RLS.

create type public.marketing_post_status as enum (
  'draft',
  'ready',
  'scheduled',
  'posted',
  'failed',
  'archived'
);

create type public.marketing_channel as enum (
  'facebook',
  'instagram',
  'google_business',
  'website',
  'general'
);

create type public.marketing_post_source as enum (
  'manual',
  'completed_job',
  'seasonal',
  'service_area',
  'project_gallery',
  'other'
);

create table public.marketing_posts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  title text not null,
  channel_target public.marketing_channel not null default 'general',
  post_text text not null default '',
  suggested_hashtags text[] not null default '{}',
  call_to_action text,
  status public.marketing_post_status not null default 'draft',
  source_type public.marketing_post_source not null default 'manual',
  source_id uuid,
  scheduled_at timestamptz,
  posted_at timestamptz,
  archived_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index marketing_posts_company_id_status_idx
  on public.marketing_posts (company_id, status)
  where archived_at is null;

create index marketing_posts_company_id_scheduled_at_idx
  on public.marketing_posts (company_id, scheduled_at)
  where archived_at is null
    and scheduled_at is not null;

create index marketing_posts_company_id_archived_at_idx
  on public.marketing_posts (company_id, archived_at)
  where archived_at is not null;

drop trigger if exists marketing_posts_set_updated_at on public.marketing_posts;
create trigger marketing_posts_set_updated_at
before update on public.marketing_posts
for each row execute function public.set_updated_at();

alter table public.marketing_posts enable row level security;

create policy "dispatchers can read marketing posts"
  on public.marketing_posts
  for select
  to authenticated
  using (
    public.is_active_company_member(company_id)
    and public.can_dispatch_jobs(company_id)
  );

create policy "dispatchers can insert marketing posts"
  on public.marketing_posts
  for insert
  to authenticated
  with check (
    public.is_active_company_member(company_id)
    and public.can_dispatch_jobs(company_id)
  );

create policy "dispatchers can update marketing posts"
  on public.marketing_posts
  for update
  to authenticated
  using (
    public.is_active_company_member(company_id)
    and public.can_dispatch_jobs(company_id)
  )
  with check (
    public.is_active_company_member(company_id)
    and public.can_dispatch_jobs(company_id)
  );

create policy "dispatchers can delete marketing posts"
  on public.marketing_posts
  for delete
  to authenticated
  using (
    public.is_active_company_member(company_id)
    and public.can_dispatch_jobs(company_id)
  );

grant select, insert, update, delete on table public.marketing_posts to authenticated;
grant all on table public.marketing_posts to service_role;
