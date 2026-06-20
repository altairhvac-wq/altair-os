-- Network V2 Phase 2: optional accepting_referrals flag on network_profiles.

alter table public.network_profiles
  add column if not exists accepting_referrals boolean not null default true;
