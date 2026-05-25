-- Customer activity log and invoice_paid milestone event.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'customer_activity_type') then
    create type public.customer_activity_type as enum (
      'customer_created'
    );
  end if;
end $$;

create table if not exists public.customer_activities (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  event_type public.customer_activity_type not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists customer_activities_customer_id_created_at_idx
  on public.customer_activities (customer_id, created_at desc);

create index if not exists customer_activities_company_id_idx
  on public.customer_activities (company_id);

alter table public.customer_activities enable row level security;

drop policy if exists "company members can read customer activities" on public.customer_activities;
create policy "company members can read customer activities"
on public.customer_activities
for select
to authenticated
using (public.is_active_company_member(company_id));

drop policy if exists "company members can insert customer activities" on public.customer_activities;
create policy "company members can insert customer activities"
on public.customer_activities
for insert
to authenticated
with check (public.is_active_company_member(company_id));

do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'invoice_activity_type'
      and e.enumlabel = 'invoice_paid'
  ) then
    alter type public.invoice_activity_type add value if not exists 'invoice_paid';
  end if;
end $$;

grant select, insert on table public.customer_activities to authenticated;
grant all on table public.customer_activities to service_role;
