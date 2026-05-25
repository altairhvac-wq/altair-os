-- Price book foundation + estimate tax rate + line item enhancements.

create table if not exists public.service_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  description text,
  unit_price numeric(12, 2) not null default 0 check (unit_price >= 0),
  taxable boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists service_items_company_id_idx
  on public.service_items (company_id);

create index if not exists service_items_company_id_is_active_idx
  on public.service_items (company_id, is_active);

drop trigger if exists service_items_set_updated_at on public.service_items;
create trigger service_items_set_updated_at
before update on public.service_items
for each row execute function public.set_updated_at();

alter table public.service_items enable row level security;

drop policy if exists "company members can read service items" on public.service_items;
create policy "company members can read service items"
on public.service_items
for select
to authenticated
using (public.is_active_company_member(company_id));

drop policy if exists "company members can insert service items" on public.service_items;
create policy "company members can insert service items"
on public.service_items
for insert
to authenticated
with check (public.is_active_company_member(company_id));

drop policy if exists "company members can update service items" on public.service_items;
create policy "company members can update service items"
on public.service_items
for update
to authenticated
using (public.is_active_company_member(company_id))
with check (public.is_active_company_member(company_id));

drop policy if exists "company members can delete service items" on public.service_items;
create policy "company members can delete service items"
on public.service_items
for delete
to authenticated
using (public.is_active_company_member(company_id));

grant select, insert, update, delete on table public.service_items to authenticated;
grant all on table public.service_items to service_role;

alter table public.estimates
  add column if not exists tax_rate numeric(5, 2) not null default 0
  check (tax_rate >= 0 and tax_rate <= 100);

alter table public.estimate_line_items
  add column if not exists service_item_id uuid references public.service_items (id) on delete set null,
  add column if not exists name text not null default '',
  add column if not exists taxable boolean not null default true;

update public.estimate_line_items
set name = description
where name = '';

create index if not exists estimate_line_items_service_item_id_idx
  on public.estimate_line_items (service_item_id);
