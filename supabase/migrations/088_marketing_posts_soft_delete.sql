-- Marketing Hub: soft delete foundation for marketing_posts.

alter table public.marketing_posts
  add column if not exists deleted_at timestamptz;

create index if not exists marketing_posts_company_id_deleted_at_idx
  on public.marketing_posts (company_id, deleted_at);
