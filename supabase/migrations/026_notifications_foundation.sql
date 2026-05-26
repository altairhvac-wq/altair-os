-- Notifications foundation: in-app operational alerts, company-scoped RLS.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'notification_type') then
    create type public.notification_type as enum (
      'job_assigned',
      'job_completed',
      'estimate_approved',
      'invoice_paid',
      'expense_submitted',
      'expense_rejected',
      'time_clocked_in',
      'time_clocked_out'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'notification_entity_type') then
    create type public.notification_entity_type as enum (
      'job',
      'customer',
      'estimate',
      'invoice',
      'expense',
      'time_entry'
    );
  end if;
end $$;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete cascade,
  role_target public.company_role,
  type public.notification_type not null,
  title text not null,
  message text not null,
  entity_type public.notification_entity_type,
  entity_id uuid,
  read_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (user_id is not null or role_target is not null)
);

create index if not exists notifications_company_user_created_at_idx
  on public.notifications (company_id, user_id, created_at desc)
  where user_id is not null;

create index if not exists notifications_company_user_unread_idx
  on public.notifications (company_id, user_id)
  where user_id is not null and read_at is null;

create index if not exists notifications_company_role_target_created_at_idx
  on public.notifications (company_id, role_target, created_at desc)
  where role_target is not null;

alter table public.notifications enable row level security;

drop policy if exists "users can read their notifications" on public.notifications;
create policy "users can read their notifications"
on public.notifications
for select
to authenticated
using (
  public.is_active_company_member(company_id)
  and (
    user_id = auth.uid()
    or (
      role_target is not null
      and public.has_company_role(company_id, array[role_target]::public.company_role[])
    )
  )
);

drop policy if exists "users can update their notifications" on public.notifications;
create policy "users can update their notifications"
on public.notifications
for update
to authenticated
using (
  public.is_active_company_member(company_id)
  and (
    user_id = auth.uid()
    or (
      role_target is not null
      and public.has_company_role(company_id, array[role_target]::public.company_role[])
    )
  )
)
with check (
  public.is_active_company_member(company_id)
  and (
    user_id = auth.uid()
    or (
      role_target is not null
      and public.has_company_role(company_id, array[role_target]::public.company_role[])
    )
  )
);

drop policy if exists "company members can insert notifications" on public.notifications;
create policy "company members can insert notifications"
on public.notifications
for insert
to authenticated
with check (public.is_active_company_member(company_id));

grant select, insert, update on table public.notifications to authenticated;
grant all on table public.notifications to service_role;
