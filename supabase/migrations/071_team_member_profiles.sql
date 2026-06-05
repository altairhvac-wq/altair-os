-- Team member profile fields for operational management (V1).

alter table public.company_memberships
  add column if not exists member_notes text;

alter table public.company_memberships
  add column if not exists available_for_dispatch boolean not null default true;

alter table public.company_memberships
  add column if not exists emergency_on_call boolean not null default false;

alter table public.company_memberships
  add column if not exists certifications text[] not null default '{}';

comment on column public.company_memberships.member_notes is
  'Optional internal notes visible on the team member profile. Owner/admin editable.';

comment on column public.company_memberships.available_for_dispatch is
  'Operational flag for dispatch recommendations. Not a scheduling system.';

comment on column public.company_memberships.emergency_on_call is
  'Operational flag for on-call dispatch recommendations.';

comment on column public.company_memberships.certifications is
  'Simple editable certification labels (e.g. EPA 608, NATE). No expiration tracking in V1.';

-- Office staff need read access to membership rows for team member profiles.
create policy "office staff can view company memberships"
on public.company_memberships
for select
to authenticated
using (
  public.has_company_role(
    company_id,
    array['office_staff']::public.company_role[]
  )
);
