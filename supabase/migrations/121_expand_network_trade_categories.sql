-- Expand Altair Community / Network business-category allowlists.
-- Preserves all existing Title Case values; adds local service categories
-- (cleaning, restoration, property services, etc.) for directory, invites,
-- and partner CRM. Does not touch companies.trade (signup bootstrap keys).
--
-- Constraint history:
--   network_profiles.trade_type  — unnamed CHECK in 073_network_referrals_v1.sql
--   network_partners.trade_type  — unnamed CHECK in 002_app_core.sql
--   network_invites.trade_category — unnamed CHECK in 076_network_invites_v1.sql
-- PostgreSQL auto-names those single-column CHECKs as
--   {table}_{column}_check
-- (confirmed for network_profiles by ERROR 42710 on the prior ADD attempt).
--
-- Do not filter drops via pg_get_constraintdef(... ILIKE '%… in%'):
-- PostgreSQL reconstructs IN lists as "= ANY (ARRAY[...])", so that filter
-- matches nothing and the subsequent ADD fails with duplicate constraint.

alter table public.network_profiles
  drop constraint if exists network_profiles_trade_type_check;

alter table public.network_profiles
  add constraint network_profiles_trade_type_check
  check (
    trade_type in (
      'HVAC',
      'Plumbing',
      'Electrical',
      'General Contracting',
      'Cleaning Services',
      'Janitorial Services',
      'Carpet Cleaning',
      'Window Cleaning',
      'Pressure Washing',
      'Landscaping',
      'Lawn Care',
      'Roofing',
      'Painting',
      'Flooring',
      'Handyman Services',
      'Pest Control',
      'Restoration',
      'Water Damage Restoration',
      'Fire and Smoke Restoration',
      'Property Management',
      'Real Estate',
      'Appliance Repair',
      'Garage Door Services',
      'Locksmith',
      'Pool and Spa Services',
      'Moving Services',
      'Junk Removal',
      'Home Inspection',
      'Concrete and Masonry',
      'Excavation',
      'Fencing',
      'Drywall',
      'Insulation',
      'Solar',
      'Security Systems',
      'Other'
    )
  );

alter table public.network_partners
  drop constraint if exists network_partners_trade_type_check;

alter table public.network_partners
  add constraint network_partners_trade_type_check
  check (
    trade_type in (
      'HVAC',
      'Plumbing',
      'Electrical',
      'General Contracting',
      'Cleaning Services',
      'Janitorial Services',
      'Carpet Cleaning',
      'Window Cleaning',
      'Pressure Washing',
      'Landscaping',
      'Lawn Care',
      'Roofing',
      'Painting',
      'Flooring',
      'Handyman Services',
      'Pest Control',
      'Restoration',
      'Water Damage Restoration',
      'Fire and Smoke Restoration',
      'Property Management',
      'Real Estate',
      'Appliance Repair',
      'Garage Door Services',
      'Locksmith',
      'Pool and Spa Services',
      'Moving Services',
      'Junk Removal',
      'Home Inspection',
      'Concrete and Masonry',
      'Excavation',
      'Fencing',
      'Drywall',
      'Insulation',
      'Solar',
      'Security Systems',
      'Other'
    )
  );

alter table public.network_invites
  drop constraint if exists network_invites_trade_category_check;

alter table public.network_invites
  add constraint network_invites_trade_category_check
  check (
    trade_category in (
      'HVAC',
      'Plumbing',
      'Electrical',
      'General Contracting',
      'Cleaning Services',
      'Janitorial Services',
      'Carpet Cleaning',
      'Window Cleaning',
      'Pressure Washing',
      'Landscaping',
      'Lawn Care',
      'Roofing',
      'Painting',
      'Flooring',
      'Handyman Services',
      'Pest Control',
      'Restoration',
      'Water Damage Restoration',
      'Fire and Smoke Restoration',
      'Property Management',
      'Real Estate',
      'Appliance Repair',
      'Garage Door Services',
      'Locksmith',
      'Pool and Spa Services',
      'Moving Services',
      'Junk Removal',
      'Home Inspection',
      'Concrete and Masonry',
      'Excavation',
      'Fencing',
      'Drywall',
      'Insulation',
      'Solar',
      'Security Systems',
      'Other'
    )
  );
