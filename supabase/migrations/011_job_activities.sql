-- Append-only operational activity log for jobs.
-- Records workflow events (creation, assignment, status changes) for timelines.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'job_activity_type') then
    create type public.job_activity_type as enum (
      'job_created',
      'technician_assigned',
      'start_route',
      'start_work',
      'complete_job',
      'status_changed',
      'job_cancelled'
    );
  end if;
end $$;

create table if not exists public.job_activities (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  event_type public.job_activity_type not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists job_activities_job_id_created_at_idx
  on public.job_activities (job_id, created_at desc);

create index if not exists job_activities_company_id_idx
  on public.job_activities (company_id);

alter table public.job_activities enable row level security;

drop policy if exists "company members can read job activities" on public.job_activities;
create policy "company members can read job activities"
on public.job_activities
for select
to authenticated
using (public.is_active_company_member(company_id));

drop policy if exists "company members can insert job activities" on public.job_activities;
create policy "company members can insert job activities"
on public.job_activities
for insert
to authenticated
with check (public.is_active_company_member(company_id));

grant select, insert on table public.job_activities to authenticated;
grant all on table public.job_activities to service_role;
