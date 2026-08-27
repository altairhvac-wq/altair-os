-- Migration 165: close the last PUBLIC EXECUTE on a SECURITY DEFINER function.
--
-- ============================== HOW IT WAS FOUND ==============================
-- Not by reading the migration. Migration 030 (and 031, which replaced it) ends
-- with
--
--     grant execute on function public.current_user_profile_email() to authenticated;
--
-- which looks like the privilege was set deliberately. It was — but a grant does
-- not remove the default, and PostgreSQL's default for a new function is EXECUTE
-- to PUBLIC. The ACL in the database reads
--
--     =X/postgres | postgres=X/postgres | authenticated=X/postgres
--
-- and that leading `=X` is PUBLIC. So `anon` could call it, and did: it answered
-- HTTP 200 to a request carrying nothing but the project's public URL and anon
-- key.
--
-- scripts/verify-function-privileges-live.mjs found it by asking the database
-- rather than reading the file — which is the entire reason that script exists
-- alongside the offline one. Migration 159 fixed exactly this shape on
-- get_company_dashboard_aggregates; this is the same defect, five years of
-- migrations earlier.
--
-- ============================== WHAT WAS EXPOSED ==============================
-- Being honest about the blast radius: nothing, today. The function is
--
--     select ... from public.profiles p where p.id = auth.uid()
--
-- and under `anon` auth.uid() is null, so the identity CTE is empty and it
-- returns null. An anonymous caller learned nothing.
--
-- That is not a reason to leave it. It is a SECURITY DEFINER function — it runs
-- as the owner, with RLS on profiles bypassed — sitting on the unauthenticated
-- surface. Its safety depends entirely on the current body continuing to filter
-- by auth.uid(). One future edit that reads a second row, or accepts a
-- parameter, turns a null into a leak, and nothing would have flagged it.
--
-- ============================== WHY REVOKING IS SAFE ==============================
-- Every caller is checked:
--
--   030  four policies on company_memberships, all `to authenticated`. An
--        anonymous request never evaluates them, so none of them can start
--        raising "permission denied for function" where it used to return no
--        rows.
--   093  can_access_platform_admin, which is SECURITY DEFINER — it executes as
--        the owner, so the nested call is authorized as the owner regardless of
--        who called the outer function.
--
-- service_role is granted as well, so a server-side privileged path that reaches
-- it through a policy is unaffected.

begin;

revoke all on function public.current_user_profile_email()
  from public;
revoke all on function public.current_user_profile_email()
  from anon;
grant execute on function public.current_user_profile_email()
  to authenticated, service_role;

commit;
