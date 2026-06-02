-- Customer trash lifecycle: soft delete before permanent removal.

alter table public.customers
  add column if not exists deleted_at timestamptz,
  add column if not exists delete_after timestamptz;

create index if not exists customers_company_id_deleted_at_idx
  on public.customers (company_id, deleted_at);

create index if not exists customers_company_id_delete_after_idx
  on public.customers (company_id, delete_after)
  where deleted_at is not null;

alter type public.customer_activity_type add value if not exists 'customer_moved_to_trash';
alter type public.customer_activity_type add value if not exists 'customer_restored_from_trash';
alter type public.customer_activity_type add value if not exists 'customer_permanently_deleted';
