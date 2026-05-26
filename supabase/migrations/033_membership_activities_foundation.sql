-- Append-only operational activity log for team membership actions.
-- Records sensitive membership workflow events for audit timelines.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'membership_activity_type') then
    create type public.membership_activity_type as enum (
      'team_invite_created',
      'invite_accepted',
      'member_role_changed',
      'member_suspended',
      'member_reactivated',
      'company_switched'
    );
  end if;
end $$;

create table if not exists public.membership_activities (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  membership_id uuid not null references public.company_memberships (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  event_type public.membership_activity_type not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists membership_activities_membership_id_created_at_idx
  on public.membership_activities (membership_id, created_at desc);

create index if not exists membership_activities_company_id_created_at_idx
  on public.membership_activities (company_id, created_at desc);

alter table public.membership_activities enable row level security;

drop policy if exists "company members can read membership activities" on public.membership_activities;
create policy "company members can read membership activities"
on public.membership_activities
for select
to authenticated
using (public.is_active_company_member(company_id));

drop policy if exists "company members can insert membership activities" on public.membership_activities;
create policy "company members can insert membership activities"
on public.membership_activities
for insert
to authenticated
with check (public.is_active_company_member(company_id));

grant select, insert on table public.membership_activities to authenticated;
grant all on table public.membership_activities to service_role;
