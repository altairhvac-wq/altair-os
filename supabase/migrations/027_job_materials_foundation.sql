-- Job materials foundation: consumption ledger, append-only access, activity enum.

create table if not exists public.job_materials (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete set null,
  job_id uuid not null references public.jobs (id) on delete cascade,
  service_item_id uuid references public.service_items (id) on delete set null,
  name text not null,
  description text,
  quantity numeric(10, 2) not null default 1 check (quantity > 0),
  unit_cost numeric(12, 2) check (unit_cost is null or unit_cost >= 0),
  unit_price numeric(12, 2) not null default 0 check (unit_price >= 0),
  taxable boolean not null default true,
  added_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists job_materials_company_job_idx
  on public.job_materials (company_id, job_id);

create index if not exists job_materials_job_created_at_idx
  on public.job_materials (job_id, created_at desc);

create index if not exists job_materials_service_item_id_idx
  on public.job_materials (service_item_id)
  where service_item_id is not null;

drop trigger if exists job_materials_set_updated_at on public.job_materials;
create trigger job_materials_set_updated_at
before update on public.job_materials
for each row execute function public.set_updated_at();

alter table public.job_materials enable row level security;

drop policy if exists "company members can read job materials" on public.job_materials;
create policy "company members can read job materials"
on public.job_materials
for select
to authenticated
using (public.is_active_company_member(company_id));

drop policy if exists "company members can insert job materials" on public.job_materials;
create policy "company members can insert job materials"
on public.job_materials
for insert
to authenticated
with check (public.is_active_company_member(company_id));

grant select, insert on table public.job_materials to authenticated;
grant all on table public.job_materials to service_role;

alter type public.job_activity_type add value if not exists 'job_material_added';
