-- Team management must list suspended members with profile details so owners/admins
-- can reactivate them. Migration 010 required fellow memberships to be active, which
-- hid suspended members from the profiles join used by listCompanyMembers.

drop policy if exists "company members can view fellow member profiles" on public.profiles;

create policy "company members can view fellow member profiles"
on public.profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.company_memberships cm_viewer
    join public.company_memberships cm_target
      on cm_target.company_id = cm_viewer.company_id
    where cm_viewer.user_id = auth.uid()
      and cm_viewer.status = 'active'
      and cm_target.user_id = profiles.id
  )
);
