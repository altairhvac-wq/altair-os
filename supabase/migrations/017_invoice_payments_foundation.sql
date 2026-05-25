-- Invoice payments: ledger table, payment method enum, activity event, RLS, grants.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'invoice_payment_method') then
    create type public.invoice_payment_method as enum (
      'cash',
      'check',
      'card',
      'bank_transfer',
      'other'
    );
  end if;
end $$;

create table if not exists public.invoice_payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  payment_method public.invoice_payment_method not null,
  payment_date date not null default current_date,
  reference text,
  notes text,
  recorded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists invoice_payments_invoice_id_payment_date_idx
  on public.invoice_payments (invoice_id, payment_date desc, created_at desc);

create index if not exists invoice_payments_company_id_idx
  on public.invoice_payments (company_id);

alter table public.invoice_payments enable row level security;

drop policy if exists "company members can read invoice payments" on public.invoice_payments;
create policy "company members can read invoice payments"
on public.invoice_payments
for select
to authenticated
using (public.is_active_company_member(company_id));

drop policy if exists "company members can insert invoice payments" on public.invoice_payments;
create policy "company members can insert invoice payments"
on public.invoice_payments
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
      and e.enumlabel = 'payment_recorded'
  ) then
    alter type public.invoice_activity_type add value if not exists 'payment_recorded';
  end if;
end $$;

grant select, insert on table public.invoice_payments to authenticated;
grant all on table public.invoice_payments to service_role;
