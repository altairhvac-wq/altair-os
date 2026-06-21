-- Marketing Hub: OAuth state tokens (service_role only, no OAuth routes yet).

create table public.marketing_oauth_states (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  provider public.marketing_connected_provider not null,
  state_hash text not null unique,
  redirect_path text,
  status text not null default 'pending',
  created_by uuid not null references public.profiles (id) on delete cascade,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint marketing_oauth_states_status_check
    check (status in ('pending', 'consumed', 'expired')),
  constraint marketing_oauth_states_expires_after_created_check
    check (expires_at > created_at)
);

create index marketing_oauth_states_company_id_provider_idx
  on public.marketing_oauth_states (company_id, provider);

create index marketing_oauth_states_expires_at_idx
  on public.marketing_oauth_states (expires_at);

create index marketing_oauth_states_pending_idx
  on public.marketing_oauth_states (expires_at)
  where status = 'pending';

alter table public.marketing_oauth_states enable row level security;

revoke all on table public.marketing_oauth_states from authenticated;
revoke all on table public.marketing_oauth_states from anon;

grant all on table public.marketing_oauth_states to service_role;
