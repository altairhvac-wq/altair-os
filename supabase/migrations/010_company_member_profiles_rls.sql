-- Allow active company members to read profiles of fellow members in the same company.
-- Required for technician assignment UI (names on jobs list, detail, and dispatch).

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
      and cm_target.status = 'active'
  )
);
