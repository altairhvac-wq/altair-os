-- Security fix: enforce role immutability during invitation acceptance.
--
-- Vulnerability: the RLS UPDATE policy "users can accept pending invites for
-- their email" validates user_id, status, and invite_email in its WITH CHECK
-- clause, but does NOT constrain the role column. A client communicating
-- directly with PostgREST (bypassing Server Actions) could include an
-- arbitrary role in the PATCH payload and have it accepted, escalating their
-- privileges beyond what was originally granted.
--
-- Fix: a BEFORE UPDATE trigger that, whenever an invited membership
-- transitions to active (invitation acceptance), forcibly resets NEW.role to
-- OLD.role. The stored role becomes the only source of truth; any
-- client-supplied role value is silently discarded at the database level.

create or replace function public.enforce_invited_role_on_acceptance()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if OLD.status = 'invited' and NEW.status = 'active' then
    NEW.role := OLD.role;
  end if;

  return NEW;
end;
$$;

create trigger enforce_invited_role_on_acceptance
  before update on public.company_memberships
  for each row
  execute function public.enforce_invited_role_on_acceptance();
