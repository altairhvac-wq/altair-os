-- Marketing Hub: connected accounts metadata foundation (no OAuth tokens).

create type public.marketing_connected_provider as enum (
  'facebook',
  'instagram',
  'google_business'
);

create type public.marketing_connected_account_status as enum (
  'connected',
  'expired',
  'disconnected',
  'error'
);

create table public.marketing_connected_accounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  provider public.marketing_connected_provider not null,
  provider_account_id text,
  provider_account_name text,
  provider_resource_id text,
  provider_resource_name text,
  status public.marketing_connected_account_status not null default 'disconnected',
  scopes text[] not null default '{}',
  token_expires_at timestamptz,
  connected_by uuid references public.profiles (id) on delete set null,
  connected_at timestamptz,
  disconnected_at timestamptz,
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index marketing_connected_accounts_company_provider_resource_uidx
  on public.marketing_connected_accounts (company_id, provider, provider_resource_id)
  where provider_resource_id is not null;

create index marketing_connected_accounts_company_id_provider_idx
  on public.marketing_connected_accounts (company_id, provider);

create index marketing_connected_accounts_status_idx
  on public.marketing_connected_accounts (status);

drop trigger if exists marketing_connected_accounts_set_updated_at
  on public.marketing_connected_accounts;
create trigger marketing_connected_accounts_set_updated_at
before update on public.marketing_connected_accounts
for each row execute function public.set_updated_at();

alter table public.marketing_connected_accounts enable row level security;

create policy "dispatchers can read marketing connected accounts"
  on public.marketing_connected_accounts
  for select
  to authenticated
  using (
    public.is_active_company_member(company_id)
    and public.can_dispatch_jobs(company_id)
  );

create policy "company admins can insert marketing connected accounts"
  on public.marketing_connected_accounts
  for insert
  to authenticated
  with check (
    public.is_active_company_member(company_id)
    and public.has_company_role(company_id, array['owner', 'admin']::public.company_role[])
  );

create policy "company admins can update marketing connected accounts"
  on public.marketing_connected_accounts
  for update
  to authenticated
  using (
    public.is_active_company_member(company_id)
    and public.has_company_role(company_id, array['owner', 'admin']::public.company_role[])
  )
  with check (
    public.is_active_company_member(company_id)
    and public.has_company_role(company_id, array['owner', 'admin']::public.company_role[])
  );

create policy "company admins can delete marketing connected accounts"
  on public.marketing_connected_accounts
  for delete
  to authenticated
  using (
    public.is_active_company_member(company_id)
    and public.has_company_role(company_id, array['owner', 'admin']::public.company_role[])
  );

grant select, insert, update, delete on table public.marketing_connected_accounts to authenticated;
grant all on table public.marketing_connected_accounts to service_role;
