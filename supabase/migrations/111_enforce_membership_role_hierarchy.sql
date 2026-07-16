-- Security fix: enforce membership role hierarchy at the database level.
--
-- Vulnerability: migration 038's "owners and admins can manage memberships"
-- policy grants FOR ALL (including UPDATE) to any owner/admin, with USING and
-- WITH CHECK clauses that only verify company membership + role ("owner" or
-- "admin"). Neither clause inspects the role column being written or the
-- relationship between the actor's role and the target/new role. The
-- self-promotion and role-hierarchy protections in
-- lib/database/services/member-role-guard.ts (validateMemberRoleChange,
-- canActorEditMemberRole) are TypeScript-only: an authenticated admin can
-- bypass app/actions/memberships.ts entirely and PATCH company_memberships
-- directly through PostgREST with role: "owner" (or any other role), and the
-- database currently accepts it.
--
-- Fix: a BEFORE UPDATE trigger that mirrors the existing app-level hierarchy
-- rules and rejects unauthorized role transitions before Postgres evaluates
-- the RLS WITH CHECK clause. This makes the database (not the Server Action)
-- the source of truth for who may change whose role to what, for every role
-- update path -- including pending invitations that have not yet reached the
-- invited -> active acceptance transition already covered by migration 110.
--
-- Rules enforced (identical to member-role-guard.ts):
--   - No one may change their own role (self-promotion / self-demotion).
--   - A non-owner actor may not change the role of a member whose current
--     role rank is >= the actor's own rank (equal-or-higher access).
--   - A non-owner actor may not assign a role whose rank exceeds the actor's
--     own rank (cannot grant access beyond your own level, including "owner").
--   - Owners are unrestricted, matching the intended workflow (owners may
--     promote/demote anyone).
--   - Updates performed with no authenticated actor (auth.uid() is null --
--     service-role/administrative contexts already authorized separately)
--     are left untouched; this trigger only constrains user-driven PostgREST
--     role changes.
--
-- This does not change bootstrap, invitations, or company creation: those
-- flows INSERT new membership rows (bootstrap_company_for_new_user,
-- createTeamInvite) rather than UPDATE existing ones, so this UPDATE trigger
-- never fires for them.

create or replace function public.company_membership_role_rank(p_role public.company_role)
returns integer
language sql
immutable
set search_path = public
as $$
  select case p_role
    when 'owner' then 100
    when 'admin' then 80
    when 'dispatcher' then 60
    when 'office_staff' then 50
    when 'technician' then 40
    when 'subcontractor' then 30
    when 'customer' then 10
  end;
$$;

revoke all on function public.company_membership_role_rank(public.company_role) from public;

create or replace function public.enforce_membership_role_escalation_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_role public.company_role;
begin
  if NEW.role is distinct from OLD.role then
    if v_actor_id is null then
      return NEW;
    end if;

    if OLD.user_id = v_actor_id or NEW.user_id = v_actor_id then
      raise exception 'You cannot change your own role.'
        using errcode = '42501';
    end if;

    select cm.role into v_actor_role
    from public.company_memberships cm
    where cm.company_id = NEW.company_id
      and cm.user_id = v_actor_id
      and cm.status = 'active'
    limit 1;

    if v_actor_role is null or v_actor_role not in ('owner', 'admin') then
      raise exception 'You do not have permission to change member roles.'
        using errcode = '42501';
    end if;

    if v_actor_role <> 'owner' then
      if public.company_membership_role_rank(OLD.role)
          >= public.company_membership_role_rank(v_actor_role) then
        raise exception 'You cannot change the role of a member with equal or higher access.'
          using errcode = '42501';
      end if;

      if public.company_membership_role_rank(NEW.role)
          > public.company_membership_role_rank(v_actor_role) then
        raise exception 'You cannot assign a role higher than your own.'
          using errcode = '42501';
      end if;
    end if;
  end if;

  return NEW;
end;
$$;

revoke all on function public.enforce_membership_role_escalation_guard() from public;

drop trigger if exists enforce_membership_role_escalation_guard on public.company_memberships;
create trigger enforce_membership_role_escalation_guard
  before update on public.company_memberships
  for each row
  execute function public.enforce_membership_role_escalation_guard();
