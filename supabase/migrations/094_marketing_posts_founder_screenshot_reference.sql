-- Founder-only product screenshot reference for marketing post drafts.

alter table public.marketing_posts
  add column if not exists founder_screenshot_reference text;

comment on column public.marketing_posts.founder_screenshot_reference is
  'Optional Altair OS product screenshot path or URL for founder_milestone/product_update drafts. Platform admin only.';

create or replace function public.can_write_founder_screenshot_reference(
  target_source_type public.marketing_post_source,
  screenshot_reference text
)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select
    screenshot_reference is null
    or (
      public.can_access_platform_admin()
      and target_source_type in (
        'founder_milestone'::public.marketing_post_source,
        'product_update'::public.marketing_post_source
      )
    );
$$;

revoke all on function public.can_write_founder_screenshot_reference(
  public.marketing_post_source,
  text
) from public;
grant execute on function public.can_write_founder_screenshot_reference(
  public.marketing_post_source,
  text
) to authenticated;

drop policy if exists "dispatchers can insert marketing posts" on public.marketing_posts;

create policy "dispatchers can insert marketing posts"
  on public.marketing_posts
  for insert
  to authenticated
  with check (
    public.is_active_company_member(company_id)
    and public.can_dispatch_jobs(company_id)
    and public.can_write_marketing_post_source(source_type)
    and public.can_write_founder_screenshot_reference(
      source_type,
      founder_screenshot_reference
    )
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
    and public.can_write_founder_screenshot_reference(
      source_type,
      founder_screenshot_reference
    )
  );
