-- Lead pipeline V1: leads, lead activities, and company-scoped RLS.

create type public.lead_status as enum (
  'new',
  'contacted',
  'scheduled',
  'estimate_sent',
  'won',
  'lost'
);

create type public.lead_source as enum (
  'website',
  'google',
  'facebook',
  'referral',
  'door_hanger',
  'yard_sign',
  'truck_wrap',
  'other'
);

create type public.lead_activity_type as enum (
  'lead_created',
  'call_logged',
  'email_logged',
  'note_added',
  'status_changed',
  'follow_up_changed',
  'estimate_created',
  'converted',
  'won',
  'lost'
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  assigned_user_id uuid references public.profiles (id) on delete set null,
  first_name text not null,
  last_name text not null,
  company_name text,
  email text not null default '',
  phone text not null default '',
  source public.lead_source not null default 'other',
  status public.lead_status not null default 'new',
  notes text,
  last_contacted_at timestamptz,
  next_follow_up_at timestamptz,
  converted_customer_id uuid references public.customers (id) on delete set null,
  won_at timestamptz,
  lost_at timestamptz,
  lost_reason text,
  archived_at timestamptz,
  deleted_at timestamptz,
  delete_after timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index leads_company_id_status_idx
  on public.leads (company_id, status)
  where deleted_at is null;

create index leads_company_id_next_follow_up_at_idx
  on public.leads (company_id, next_follow_up_at)
  where deleted_at is null
    and status not in ('won', 'lost');

create index leads_company_id_archived_at_idx
  on public.leads (company_id, archived_at)
  where archived_at is not null;

create index leads_company_id_deleted_at_idx
  on public.leads (company_id, deleted_at);

create index leads_company_id_delete_after_idx
  on public.leads (company_id, delete_after)
  where deleted_at is not null;

create index leads_converted_customer_id_idx
  on public.leads (converted_customer_id)
  where converted_customer_id is not null;

create table public.lead_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  activity_type public.lead_activity_type not null,
  note text,
  created_by uuid references public.profiles (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index lead_activities_lead_id_created_at_idx
  on public.lead_activities (lead_id, created_at desc);

create index lead_activities_company_id_created_at_idx
  on public.lead_activities (company_id, created_at desc);

alter table public.leads enable row level security;
alter table public.lead_activities enable row level security;

create policy "lead managers can read leads"
  on public.leads
  for select
  using (public.can_manage_customers(company_id));

create policy "lead managers can insert leads"
  on public.leads
  for insert
  with check (public.can_manage_customers(company_id));

create policy "lead managers can update leads"
  on public.leads
  for update
  using (public.can_manage_customers(company_id))
  with check (public.can_manage_customers(company_id));

create policy "lead managers can delete leads"
  on public.leads
  for delete
  using (public.can_manage_customers(company_id));

create policy "lead managers can read lead activities"
  on public.lead_activities
  for select
  using (public.can_manage_customers(company_id));

create policy "lead managers can insert lead activities"
  on public.lead_activities
  for insert
  with check (public.can_manage_customers(company_id));

grant select, insert, update, delete on public.leads to authenticated;
grant select, insert on public.lead_activities to authenticated;
