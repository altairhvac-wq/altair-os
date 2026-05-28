-- SECURITY DEFINER RPC for notification role-targeted fan-out.
-- Lets notification recipient resolution bypass membership RLS once policies tighten,
-- while still requiring the caller to be an active company member.

create or replace function public.list_active_member_user_ids_by_roles(
  p_company_id uuid,
  p_roles public.company_role[]
)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select cm.user_id
  from public.company_memberships cm
  where cm.company_id = p_company_id
    and cm.status = 'active'
    and cm.user_id is not null
    and cm.role = any (p_roles)
    and public.is_active_company_member(p_company_id);
$$;

revoke all on function public.list_active_member_user_ids_by_roles(uuid, public.company_role[]) from public;
grant execute on function public.list_active_member_user_ids_by_roles(uuid, public.company_role[]) to authenticated;
