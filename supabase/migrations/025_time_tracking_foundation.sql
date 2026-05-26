-- Time tracking foundation: segment-based entries, activity log, grants.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'time_entry_type') then
    create type public.time_entry_type as enum (
      'clock',
      'break',
      'job_labor'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'time_activity_type') then
    create type public.time_activity_type as enum (
      'technician_clocked_in',
      'technician_clocked_out',
      'break_started',
      'break_ended',
      'job_labor_started',
      'job_labor_ended'
    );
  end if;
end $$;

-- Replace legacy approval-style time_entries with segment-based entries.
drop table if exists public.time_entries cascade;

create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  technician_id uuid not null references public.profiles (id) on delete restrict,
  job_id uuid references public.jobs (id) on delete set null,
  entry_type public.time_entry_type not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_minutes integer check (duration_minutes is null or duration_minutes >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ended_at is null or ended_at >= started_at),
  check (entry_type <> 'job_labor' or job_id is not null)
);

create index time_entries_company_id_idx on public.time_entries (company_id);
create index time_entries_technician_id_idx on public.time_entries (technician_id);
create index time_entries_job_id_idx on public.time_entries (job_id)
  where job_id is not null;
create index time_entries_company_technician_started_at_idx
  on public.time_entries (company_id, technician_id, started_at desc);
create unique index time_entries_one_active_per_technician_idx
  on public.time_entries (company_id, technician_id)
  where ended_at is null;

drop trigger if exists time_entries_set_updated_at on public.time_entries;
create trigger time_entries_set_updated_at
before update on public.time_entries
for each row execute function public.set_updated_at();

alter table public.time_entries enable row level security;

drop policy if exists "company members can read time entries" on public.time_entries;
create policy "company members can read time entries"
on public.time_entries
for select
to authenticated
using (public.is_active_company_member(company_id));

drop policy if exists "company members can insert time entries" on public.time_entries;
create policy "company members can insert time entries"
on public.time_entries
for insert
to authenticated
with check (public.is_active_company_member(company_id));

drop policy if exists "company members can update time entries" on public.time_entries;
create policy "company members can update time entries"
on public.time_entries
for update
to authenticated
using (public.is_active_company_member(company_id))
with check (public.is_active_company_member(company_id));

drop policy if exists "company members can delete time entries" on public.time_entries;
create policy "company members can delete time entries"
on public.time_entries
for delete
to authenticated
using (public.is_active_company_member(company_id));

grant select, insert, update, delete on table public.time_entries to authenticated;
grant all on table public.time_entries to service_role;

create table if not exists public.time_activities (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  time_entry_id uuid not null references public.time_entries (id) on delete cascade,
  technician_id uuid not null references public.profiles (id) on delete restrict,
  job_id uuid references public.jobs (id) on delete set null,
  actor_id uuid references public.profiles (id) on delete set null,
  event_type public.time_activity_type not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists time_activities_time_entry_id_created_at_idx
  on public.time_activities (time_entry_id, created_at desc);

create index if not exists time_activities_company_id_idx
  on public.time_activities (company_id);

create index if not exists time_activities_technician_id_created_at_idx
  on public.time_activities (technician_id, created_at desc);

alter table public.time_activities enable row level security;

drop policy if exists "company members can read time activities" on public.time_activities;
create policy "company members can read time activities"
on public.time_activities
for select
to authenticated
using (public.is_active_company_member(company_id));

drop policy if exists "company members can insert time activities" on public.time_activities;
create policy "company members can insert time activities"
on public.time_activities
for insert
to authenticated
with check (public.is_active_company_member(company_id));

grant select, insert on table public.time_activities to authenticated;
grant all on table public.time_activities to service_role;
