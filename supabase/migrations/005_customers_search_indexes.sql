-- Customers: secondary address line + search indexes for tenant-scoped lookups

alter table public.customers
  add column if not exists address_line2 text not null default '';

create index if not exists customers_company_id_name_idx
  on public.customers (company_id, name);

create index if not exists customers_company_id_phone_idx
  on public.customers (company_id, phone);
