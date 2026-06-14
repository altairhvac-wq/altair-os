-- Network Referrals V1: discoverable profiles, referral tracking, and lead handoff.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.network_referral_urgency as enum (
  'low',
  'normal',
  'urgent',
  'emergency'
);

create type public.network_referral_status as enum (
  'sent',
  'accepted',
  'declined',
  'converted',
  'won',
  'lost',
  'cancelled'
);

alter type public.lead_source add value if not exists 'network_referral';

-- ---------------------------------------------------------------------------
-- Network profiles (company directory entries)
-- ---------------------------------------------------------------------------

create table public.network_profiles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references public.companies (id) on delete cascade,
  display_name text not null,
  trade_type text not null default 'General Contracting',
  service_area text not null default '',
  city text not null default '',
  state text not null default '',
  bio text,
  is_visible boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    trade_type in (
      'HVAC',
      'Plumbing',
      'Electrical',
      'Roofing',
      'General Contracting',
      'Landscaping',
      'Painting'
    )
  )
);

create index network_profiles_is_visible_idx
  on public.network_profiles (is_visible)
  where is_visible = true;

create index network_profiles_company_id_idx
  on public.network_profiles (company_id);

-- ---------------------------------------------------------------------------
-- Network referrals
-- ---------------------------------------------------------------------------

create table public.network_referrals (
  id uuid primary key default gen_random_uuid(),
  source_company_id uuid not null references public.companies (id) on delete cascade,
  target_company_id uuid not null references public.companies (id) on delete cascade,
  source_user_id uuid not null references public.profiles (id) on delete restrict,
  target_lead_id uuid references public.leads (id) on delete set null,
  source_network_profile_id uuid references public.network_profiles (id) on delete set null,
  target_network_profile_id uuid references public.network_profiles (id) on delete set null,
  customer_name text not null,
  customer_phone text not null default '',
  customer_email text not null default '',
  service_address text not null default '',
  city text not null default '',
  state text not null default '',
  zip text not null default '',
  requested_service text not null,
  urgency public.network_referral_urgency not null default 'normal',
  notes text,
  incentive_note text,
  status public.network_referral_status not null default 'sent',
  decline_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (source_company_id <> target_company_id)
);

create index network_referrals_source_company_id_created_at_idx
  on public.network_referrals (source_company_id, created_at desc);

create index network_referrals_target_company_id_created_at_idx
  on public.network_referrals (target_company_id, created_at desc);

create index network_referrals_target_lead_id_idx
  on public.network_referrals (target_lead_id)
  where target_lead_id is not null;

create unique index network_referrals_target_lead_id_unique_idx
  on public.network_referrals (target_lead_id)
  where target_lead_id is not null;

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

drop trigger if exists network_profiles_set_updated_at on public.network_profiles;
create trigger network_profiles_set_updated_at
before update on public.network_profiles
for each row execute function public.set_updated_at();

drop trigger if exists network_referrals_set_updated_at on public.network_referrals;
create trigger network_referrals_set_updated_at
before update on public.network_referrals
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS helpers
-- ---------------------------------------------------------------------------

create or replace function public.can_send_network_referrals(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_company_role(
    target_company_id,
    array['owner', 'admin']::public.company_role[]
  );
$$;

create or replace function public.is_visible_network_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.network_profiles np
    where np.id = target_profile_id
      and np.is_visible = true
  );
$$;

revoke all on function public.can_send_network_referrals(uuid) from public;
revoke all on function public.is_visible_network_profile(uuid) from public;
grant execute on function public.can_send_network_referrals(uuid) to authenticated;
grant execute on function public.is_visible_network_profile(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS: network_profiles
-- ---------------------------------------------------------------------------

alter table public.network_profiles enable row level security;

create policy "company admins can read own network profile"
  on public.network_profiles
  for select
  using (public.has_company_role(company_id, array['owner', 'admin']::public.company_role[]));

create policy "authenticated users can read visible network profiles"
  on public.network_profiles
  for select
  using (is_visible = true);

create policy "company admins can insert own network profile"
  on public.network_profiles
  for insert
  with check (public.has_company_role(company_id, array['owner', 'admin']::public.company_role[]));

create policy "company admins can update own network profile"
  on public.network_profiles
  for update
  using (public.has_company_role(company_id, array['owner', 'admin']::public.company_role[]))
  with check (public.has_company_role(company_id, array['owner', 'admin']::public.company_role[]));

-- ---------------------------------------------------------------------------
-- RLS: network_referrals
-- ---------------------------------------------------------------------------

alter table public.network_referrals enable row level security;

create policy "source company admins can read sent referrals"
  on public.network_referrals
  for select
  using (public.can_send_network_referrals(source_company_id));

create policy "target lead managers can read received referrals"
  on public.network_referrals
  for select
  using (public.can_manage_customers(target_company_id));

create policy "source company admins can insert referrals"
  on public.network_referrals
  for insert
  with check (
    public.can_send_network_referrals(source_company_id)
    and source_user_id = auth.uid()
    and source_company_id <> target_company_id
    and (
      target_network_profile_id is null
      or public.is_visible_network_profile(target_network_profile_id)
    )
  );

create policy "target lead managers can update received referral status"
  on public.network_referrals
  for update
  using (public.can_manage_customers(target_company_id))
  with check (public.can_manage_customers(target_company_id));

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant select, insert, update on public.network_profiles to authenticated;
grant select, insert, update on public.network_referrals to authenticated;
grant all on table public.network_profiles to service_role;
grant all on table public.network_referrals to service_role;
