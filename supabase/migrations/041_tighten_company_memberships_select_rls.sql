-- Stage 2: tighten company_memberships SELECT RLS.
--
-- Removes broad tenant roster visibility ("company members can view memberships").
-- Preserves:
--   - self membership read (004)
--   - invite-email pending read (030)
--   - owner/admin full read (manage policy 038 + explicit SELECT below)
--   - dispatcher assignable roster read (active, non-customer, linked users only)
--   - notification fan-out via list_active_member_user_ids_by_roles (040)

drop policy if exists "company members can view memberships" on public.company_memberships;

create policy "owners and admins can view all memberships"
on public.company_memberships
for select
to authenticated
using (
  public.has_company_role(
    company_id,
    array['owner', 'admin']::public.company_role[]
  )
);

create policy "dispatchers can view assignable memberships"
on public.company_memberships
for select
to authenticated
using (
  public.has_company_role(
    company_id,
    array['dispatcher']::public.company_role[]
  )
  and status = 'active'
  and user_id is not null
  and role <> 'customer'::public.company_role
);
