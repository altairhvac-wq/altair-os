-- Expense receipt foundation: activity log, schema relaxations, grants.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'expense_activity_type') then
    create type public.expense_activity_type as enum (
      'expense_receipt_uploaded'
    );
  end if;
end $$;

create table if not exists public.expense_activities (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  expense_id uuid not null references public.expenses (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  event_type public.expense_activity_type not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists expense_activities_expense_id_created_at_idx
  on public.expense_activities (expense_id, created_at desc);

create index if not exists expense_activities_company_id_idx
  on public.expense_activities (company_id);

alter table public.expense_activities enable row level security;

drop policy if exists "company members can read expense activities" on public.expense_activities;
create policy "company members can read expense activities"
on public.expense_activities
for select
to authenticated
using (public.is_active_company_member(company_id));

drop policy if exists "company members can insert expense activities" on public.expense_activities;
create policy "company members can insert expense activities"
on public.expense_activities
for insert
to authenticated
with check (public.is_active_company_member(company_id));

grant select, insert on table public.expense_activities to authenticated;
grant all on table public.expense_activities to service_role;

alter table public.expenses
  add column if not exists customer_id uuid references public.customers (id) on delete set null;

alter table public.expenses
  alter column amount drop not null;

alter table public.expenses
  alter column purchase_date drop not null;

create index if not exists expenses_customer_id_idx
  on public.expenses (customer_id)
  where customer_id is not null;

create index if not exists expenses_company_customer_created_at_idx
  on public.expenses (company_id, customer_id, created_at desc)
  where customer_id is not null;

-- expenses was created without role grants; PostgREST returns 42501 before RLS runs.
grant select, insert, update, delete on table public.expenses to authenticated;
grant all on table public.expenses to service_role;

alter type public.expense_activity_type add value if not exists 'expense_receipt_uploaded';
