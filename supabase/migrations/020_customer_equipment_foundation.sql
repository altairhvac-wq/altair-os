-- Customer equipment log + related customer activity event types.

create table if not exists public.customer_equipment (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  job_id uuid references public.jobs (id) on delete set null,
  name text not null,
  equipment_type text,
  brand text,
  model_number text,
  serial_number text,
  install_date date,
  warranty_expires_at date,
  location text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customer_equipment_company_customer_idx
  on public.customer_equipment (company_id, customer_id);

create index if not exists customer_equipment_customer_active_idx
  on public.customer_equipment (customer_id, is_active);

create index if not exists customer_equipment_job_id_idx
  on public.customer_equipment (job_id)
  where job_id is not null;

drop trigger if exists customer_equipment_set_updated_at on public.customer_equipment;
create trigger customer_equipment_set_updated_at
before update on public.customer_equipment
for each row execute function public.set_updated_at();

alter table public.customer_equipment enable row level security;

drop policy if exists "company members can read customer equipment" on public.customer_equipment;
create policy "company members can read customer equipment"
on public.customer_equipment
for select
to authenticated
using (public.is_active_company_member(company_id));

drop policy if exists "company members can insert customer equipment" on public.customer_equipment;
create policy "company members can insert customer equipment"
on public.customer_equipment
for insert
to authenticated
with check (public.is_active_company_member(company_id));

drop policy if exists "company members can update customer equipment" on public.customer_equipment;
create policy "company members can update customer equipment"
on public.customer_equipment
for update
to authenticated
using (public.is_active_company_member(company_id))
with check (public.is_active_company_member(company_id));

grant select, insert, update on table public.customer_equipment to authenticated;
grant all on table public.customer_equipment to service_role;

alter type public.customer_activity_type add value if not exists 'equipment_added';
alter type public.customer_activity_type add value if not exists 'equipment_updated';
alter type public.customer_activity_type add value if not exists 'warranty_expiration_recorded';
