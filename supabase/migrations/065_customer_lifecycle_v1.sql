-- Customer lifecycle V1: archive, restore, and safe delete.

alter table public.customers
  add column if not exists archived_at timestamptz;

create index if not exists customers_company_id_archived_at_idx
  on public.customers (company_id, archived_at)
  where archived_at is not null;

alter type public.customer_activity_type add value if not exists 'customer_archived';
alter type public.customer_activity_type add value if not exists 'customer_restored';
alter type public.customer_activity_type add value if not exists 'customer_deleted';
