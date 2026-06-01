-- Technician specialties V1: company-scoped trade skills on memberships.

alter table public.company_memberships
  add column if not exists technician_specialties text[] not null default '{}';

alter table public.company_memberships
  drop constraint if exists company_memberships_technician_specialties_allowed;

alter table public.company_memberships
  add constraint company_memberships_technician_specialties_allowed
  check (
    technician_specialties <@ array[
      'HVAC',
      'Plumbing',
      'Electrical',
      'Refrigeration',
      'Controls',
      'Maintenance',
      'Install',
      'Service',
      'General Service'
    ]::text[]
  );
