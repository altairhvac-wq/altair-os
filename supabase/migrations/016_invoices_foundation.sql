-- Invoices foundation: normalized line items, activity log, estimate link, tax rate, grants.

do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'invoice_status'
      and e.enumlabel = 'cancelled'
  ) then
    alter type public.invoice_status add value if not exists 'cancelled';
  end if;
end $$;

alter table public.invoices
  add column if not exists estimate_id uuid references public.estimates (id) on delete set null,
  add column if not exists tax_rate numeric(5, 2) not null default 0
    check (tax_rate >= 0 and tax_rate <= 100),
  add column if not exists issue_date date;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'invoices'
      and column_name = 'tax'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'invoices'
      and column_name = 'tax_amount'
  ) then
    alter table public.invoices rename column tax to tax_amount;
  end if;
end $$;

alter table public.invoices
  add column if not exists tax_amount numeric(12, 2) not null default 0
    check (tax_amount >= 0);

update public.invoices
set issue_date = coalesce(issue_date, issued_at::date, current_date)
where issue_date is null;

alter table public.invoices
  alter column issue_date set default current_date,
  alter column issue_date set not null;

alter table public.invoices
  alter column due_date set default (current_date + interval '30 days');

create unique index if not exists invoices_company_id_estimate_id_unique_idx
  on public.invoices (company_id, estimate_id)
  where estimate_id is not null;

create index if not exists invoices_estimate_id_idx
  on public.invoices (estimate_id);

create table if not exists public.invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  service_item_id uuid references public.service_items (id) on delete set null,
  name text not null,
  description text,
  quantity numeric(12, 2) not null default 1 check (quantity > 0),
  unit_price numeric(12, 2) not null default 0 check (unit_price >= 0),
  taxable boolean not null default true,
  line_total numeric(12, 2) not null default 0 check (line_total >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists invoice_line_items_invoice_id_sort_order_idx
  on public.invoice_line_items (invoice_id, sort_order);

create index if not exists invoice_line_items_company_id_idx
  on public.invoice_line_items (company_id);

create index if not exists invoice_line_items_service_item_id_idx
  on public.invoice_line_items (service_item_id);

-- Migrate legacy jsonb line items into normalized rows when present.
insert into public.invoice_line_items (
  company_id,
  invoice_id,
  sort_order,
  name,
  description,
  quantity,
  unit_price,
  taxable,
  line_total
)
select
  i.company_id,
  i.id,
  (item.ordinality - 1)::integer,
  coalesce(item.value ->> 'description', item.value ->> 'name', ''),
  nullif(trim(coalesce(item.value ->> 'description', '')), ''),
  greatest(coalesce((item.value ->> 'quantity')::numeric, 1), 0.01),
  greatest(
    coalesce(
      (item.value ->> 'unitPrice')::numeric,
      (item.value ->> 'unit_price')::numeric,
      0
    ),
    0
  ),
  coalesce((item.value ->> 'taxable')::boolean, true),
  round(
    greatest(coalesce((item.value ->> 'quantity')::numeric, 1), 0.01)
    * greatest(
      coalesce(
        (item.value ->> 'unitPrice')::numeric,
        (item.value ->> 'unit_price')::numeric,
        0
      ),
      0
    ),
    2
  )
from public.invoices i
cross join lateral jsonb_array_elements(i.line_items) with ordinality as item(value, ordinality)
where jsonb_array_length(i.line_items) > 0
  and not exists (
    select 1
    from public.invoice_line_items ili
    where ili.invoice_id = i.id
  );

alter table public.invoices drop column if exists line_items;
alter table public.invoices drop column if exists job_type;
alter table public.invoices drop column if exists issued_at;

alter table public.invoice_line_items enable row level security;

drop policy if exists "company members can read invoice line items" on public.invoice_line_items;
create policy "company members can read invoice line items"
on public.invoice_line_items
for select
to authenticated
using (public.is_active_company_member(company_id));

drop policy if exists "company members can insert invoice line items" on public.invoice_line_items;
create policy "company members can insert invoice line items"
on public.invoice_line_items
for insert
to authenticated
with check (public.is_active_company_member(company_id));

drop policy if exists "company members can update invoice line items" on public.invoice_line_items;
create policy "company members can update invoice line items"
on public.invoice_line_items
for update
to authenticated
using (public.is_active_company_member(company_id))
with check (public.is_active_company_member(company_id));

drop policy if exists "company members can delete invoice line items" on public.invoice_line_items;
create policy "company members can delete invoice line items"
on public.invoice_line_items
for delete
to authenticated
using (public.is_active_company_member(company_id));

do $$
begin
  if not exists (select 1 from pg_type where typname = 'invoice_activity_type') then
    create type public.invoice_activity_type as enum (
      'invoice_created',
      'invoice_sent',
      'status_changed',
      'invoice_converted_from_estimate',
      'invoice_voided',
      'invoice_cancelled'
    );
  end if;
end $$;

create table if not exists public.invoice_activities (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  event_type public.invoice_activity_type not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists invoice_activities_invoice_id_created_at_idx
  on public.invoice_activities (invoice_id, created_at desc);

create index if not exists invoice_activities_company_id_idx
  on public.invoice_activities (company_id);

alter table public.invoice_activities enable row level security;

drop policy if exists "company members can read invoice activities" on public.invoice_activities;
create policy "company members can read invoice activities"
on public.invoice_activities
for select
to authenticated
using (public.is_active_company_member(company_id));

drop policy if exists "company members can insert invoice activities" on public.invoice_activities;
create policy "company members can insert invoice activities"
on public.invoice_activities
for insert
to authenticated
with check (public.is_active_company_member(company_id));

grant select, insert, update, delete on table public.invoices to authenticated;
grant all on table public.invoices to service_role;

grant select, insert, update, delete on table public.invoice_line_items to authenticated;
grant all on table public.invoice_line_items to service_role;

grant select, insert on table public.invoice_activities to authenticated;
grant all on table public.invoice_activities to service_role;
