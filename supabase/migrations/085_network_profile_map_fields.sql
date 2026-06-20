-- Network V2 Phase 2: map-ready optional fields on network_profiles.
-- Approximate city/ZIP placement only — no street addresses on this table.

alter table public.network_profiles
  add column if not exists postal_code text,
  add column if not exists latitude numeric(9, 6),
  add column if not exists longitude numeric(9, 6),
  add column if not exists location_precision text not null default 'none',
  add column if not exists show_on_map boolean not null default false;

alter table public.network_profiles
  drop constraint if exists network_profiles_location_precision_check;

alter table public.network_profiles
  add constraint network_profiles_location_precision_check
  check (location_precision in ('none', 'city', 'zip'));
