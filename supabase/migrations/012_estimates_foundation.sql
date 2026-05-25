-- Estimates foundation: normalized line items, activity log, status enum fix, grants.

-- Replace expired with cancelled in estimate_status enum.
do $$
begin
  if exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'estimate_status'
      and e.enumlabel = 'expired'
  ) then
    alter type public.estimate_status rename value 'expired' to 'cancelled';
  end if;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'estimate_status'
      and e.enumlabel = 'cancelled'
  ) then
    alter type public.estimate_status add value if not exists 'cancelled';
  end if;
end $$;

create table if not exists public.estimate_line_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  estimate_id uuid not null references public.estimates (id) on delete cascade,
  sort_order integer not null default 0,
  description text not null,
  quantity numeric(10, 2) not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists estimate_line_items_estimate_id_sort_order_idx
  on public.estimate_line_items (estimate_id, sort_order);

create index if not exists estimate_line_items_company_id_idx
  on public.estimate_line_items (company_id);

-- Migrate legacy jsonb line items into normalized rows when present.
insert into public.estimate_line_items (
  company_id,
  estimate_id,
  sort_order,
  description,
  quantity,
  unit_price
)
select
  e.company_id,
  e.id,
  (item.ordinality - 1)::integer,
  coalesce(item.value ->> 'description', ''),
  greatest(coalesce((item.value ->> 'quantity')::numeric, 1), 0.01),
  greatest(coalesce((item.value ->> 'unitPrice')::numeric, (item.value ->> 'unit_price')::numeric, 0), 0)
from public.estimates e
cross join lateral jsonb_array_elements(e.line_items) with ordinality as item(value, ordinality)
where jsonb_array_length(e.line_items) > 0
  and not exists (
    select 1
    from public.estimate_line_items eli
    where eli.estimate_id = e.id
  );

alter table public.estimates drop column if exists line_items;

create index if not exists estimates_job_id_idx on public.estimates (job_id);

drop trigger if exists estimate_line_items_set_updated_at on public.estimate_line_items;
create trigger estimate_line_items_set_updated_at
before update on public.estimate_line_items
for each row execute function public.set_updated_at();

alter table public.estimate_line_items enable row level security;

drop policy if exists "company members can read estimate line items" on public.estimate_line_items;
create policy "company members can read estimate line items"
on public.estimate_line_items
for select
to authenticated
using (public.is_active_company_member(company_id));

drop policy if exists "company members can insert estimate line items" on public.estimate_line_items;
create policy "company members can insert estimate line items"
on public.estimate_line_items
for insert
to authenticated
with check (public.is_active_company_member(company_id));

drop policy if exists "company members can update estimate line items" on public.estimate_line_items;
create policy "company members can update estimate line items"
on public.estimate_line_items
for update
to authenticated
using (public.is_active_company_member(company_id))
with check (public.is_active_company_member(company_id));

drop policy if exists "company members can delete estimate line items" on public.estimate_line_items;
create policy "company members can delete estimate line items"
on public.estimate_line_items
for delete
to authenticated
using (public.is_active_company_member(company_id));

do $$
begin
  if not exists (select 1 from pg_type where typname = 'estimate_activity_type') then
    create type public.estimate_activity_type as enum (
      'estimate_created',
      'status_changed',
      'estimate_sent',
      'estimate_approved',
      'estimate_declined',
      'estimate_cancelled',
      'estimate_converted'
    );
  end if;
end $$;

create table if not exists public.estimate_activities (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  estimate_id uuid not null references public.estimates (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  event_type public.estimate_activity_type not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists estimate_activities_estimate_id_created_at_idx
  on public.estimate_activities (estimate_id, created_at desc);

create index if not exists estimate_activities_company_id_idx
  on public.estimate_activities (company_id);

alter table public.estimate_activities enable row level security;

drop policy if exists "company members can read estimate activities" on public.estimate_activities;
create policy "company members can read estimate activities"
on public.estimate_activities
for select
to authenticated
using (public.is_active_company_member(company_id));

drop policy if exists "company members can insert estimate activities" on public.estimate_activities;
create policy "company members can insert estimate activities"
on public.estimate_activities
for insert
to authenticated
with check (public.is_active_company_member(company_id));

grant select, insert, update, delete on table public.estimates to authenticated;
grant all on table public.estimates to service_role;

grant select, insert, update, delete on table public.estimate_line_items to authenticated;
grant all on table public.estimate_line_items to service_role;

grant select, insert on table public.estimate_activities to authenticated;
grant all on table public.estimate_activities to service_role;
