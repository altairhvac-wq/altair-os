-- Time clock foundation: simple company-scoped employee clock in/out shifts.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'time_clock_shift_status') then
    create type public.time_clock_shift_status as enum (
      'open',
      'closed'
    );
  end if;
end $$;

create table if not exists public.time_clock_entries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete restrict,
  clock_in_at timestamptz not null default now(),
  clock_out_at timestamptz,
  status public.time_clock_shift_status not null default 'open',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (clock_out_at is null or clock_out_at >= clock_in_at),
  check (
    (status = 'open' and clock_out_at is null)
    or (status = 'closed' and clock_out_at is not null)
  )
);

create index if not exists time_clock_entries_company_id_clock_in_at_idx
  on public.time_clock_entries (company_id, clock_in_at desc);

create index if not exists time_clock_entries_company_id_user_id_clock_in_at_idx
  on public.time_clock_entries (company_id, user_id, clock_in_at desc);

create unique index if not exists time_clock_entries_one_open_per_user_idx
  on public.time_clock_entries (company_id, user_id)
  where status = 'open';

drop trigger if exists time_clock_entries_set_updated_at on public.time_clock_entries;
create trigger time_clock_entries_set_updated_at
before update on public.time_clock_entries
for each row execute function public.set_updated_at();

alter table public.time_clock_entries enable row level security;

drop policy if exists "company members can read time clock entries" on public.time_clock_entries;
create policy "company members can read time clock entries"
on public.time_clock_entries
for select
to authenticated
using (public.is_active_company_member(company_id));

drop policy if exists "company members can insert own time clock entries" on public.time_clock_entries;
create policy "company members can insert own time clock entries"
on public.time_clock_entries
for insert
to authenticated
with check (
  public.is_active_company_member(company_id)
  and user_id = auth.uid()
);

drop policy if exists "users can update own time clock entries" on public.time_clock_entries;
create policy "users can update own time clock entries"
on public.time_clock_entries
for update
to authenticated
using (
  public.is_active_company_member(company_id)
  and user_id = auth.uid()
)
with check (
  public.is_active_company_member(company_id)
  and user_id = auth.uid()
);

grant select, insert, update on table public.time_clock_entries to authenticated;
grant all on table public.time_clock_entries to service_role;
