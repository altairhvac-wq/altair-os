-- Harden marketing_posts RLS: founder-only source types require platform admin.
-- Keep in sync with lib/database/platform-admin.ts (PLATFORM_ADMIN_EMAILS).

create or replace function public.can_access_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select lower(trim(coalesce(
    auth.jwt() ->> 'email',
    public.current_user_profile_email(),
    ''
  ))) = any (
    array['altairhvac@gmail.com']::text[]
  );
$$;

create or replace function public.can_write_marketing_post_source(
  target_source_type public.marketing_post_source
)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select
    target_source_type not in (
      'founder_milestone'::public.marketing_post_source,
      'product_update'::public.marketing_post_source
    )
    or public.can_access_platform_admin();
$$;

revoke all on function public.can_access_platform_admin() from public;
grant execute on function public.can_access_platform_admin() to authenticated;

revoke all on function public.can_write_marketing_post_source(public.marketing_post_source) from public;
grant execute on function public.can_write_marketing_post_source(public.marketing_post_source) to authenticated;

drop policy if exists "dispatchers can insert marketing posts" on public.marketing_posts;

create policy "dispatchers can insert marketing posts"
  on public.marketing_posts
  for insert
  to authenticated
  with check (
    public.is_active_company_member(company_id)
    and public.can_dispatch_jobs(company_id)
    and public.can_write_marketing_post_source(source_type)
  );

drop policy if exists "dispatchers can update marketing posts" on public.marketing_posts;

create policy "dispatchers can update marketing posts"
  on public.marketing_posts
  for update
  to authenticated
  using (
    public.is_active_company_member(company_id)
    and public.can_dispatch_jobs(company_id)
    and public.can_write_marketing_post_source(source_type)
  )
  with check (
    public.is_active_company_member(company_id)
    and public.can_dispatch_jobs(company_id)
    and public.can_write_marketing_post_source(source_type)
  );
