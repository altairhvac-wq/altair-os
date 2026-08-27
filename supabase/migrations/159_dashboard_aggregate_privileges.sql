-- Migration 159: restore the intended privileges on the dashboard aggregate RPC.
--
-- ============================== HOW THE GAP OPENED ==============================
-- Migration 151 created public.get_company_dashboard_aggregates and, in the same
-- file, set its privileges:
--
--     revoke all on function public.get_company_dashboard_aggregates(uuid, timestamptz) from public;
--     grant execute on function public.get_company_dashboard_aggregates(uuid, timestamptz)
--       to authenticated, service_role;
--
-- 151 was never applied to production, because its body referenced three columns
-- that do not exist and every call raised. Migration 158 replaced the function
-- and fixed those columns, but carried no GRANT — deliberately, on the reasoning
-- that CREATE OR REPLACE preserves the existing grant.
--
-- That reasoning is correct, and it does not apply here. In production there was
-- no existing grant to preserve: 151 never ran, so 158's CREATE OR REPLACE was a
-- CREATE. A function created without an explicit grant has a null ACL and
-- inherits the default, and the default for functions includes EXECUTE to
-- PUBLIC.
--
-- Verified rather than assumed — a throwaway function created in a restored copy
-- of this database came back with:
--
--     acl            (null = inherits default)
--     authenticated  can execute
--     anon           can execute
--
-- So in production today this function is executable by anon.
--
-- ============================== WHAT THE EXPOSURE ACTUALLY IS ==============================
-- Not a data leak. The function's first act is to return an empty result when
-- auth.uid() is null, and its second is to raise unless the caller is an active
-- member of the company being asked about. An anonymous caller gets
-- {"invoices":{},"estimates":{},"expenses":{}} and nothing else.
--
-- It is a posture defect, and worth closing on its own terms: a SECURITY DEFINER
-- function runs with the owner's authority, and the set of roles that may invoke
-- one should be a decision someone wrote down, not whatever the schema default
-- happened to be on the day it was created. Migration 148 is the reason this
-- repository treats that as a rule — it shipped a privileged helper reachable by
-- `authenticated` that leaked across tenants.
--
-- ============================== SIGNATURE ==============================
-- Taken from the database, not inferred:
--
--     select p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')'
--     -> get_company_dashboard_aggregates(p_company_id uuid, p_reference timestamp with time zone)
--
-- GRANT and REVOKE take the identity argument types, so the target is
-- (uuid, timestamptz) — the same spelling migration 151 used.
--
-- ============================== SCOPE ==============================
-- Privileges only. No function is created, replaced or dropped, no policy is
-- touched, and no behaviour changes for any caller that is supposed to have
-- access. This reproduces exactly the end state 151 intended, which is also the
-- state a project that DID receive 151 is already in — so applying it is safe
-- whether or not 151 ever ran.

begin;

-- Removes the inherited default. This is the line that actually closes the gap:
-- anon and every other role reach this function through PUBLIC, not through a
-- grant of their own.
revoke all on function public.get_company_dashboard_aggregates(uuid, timestamptz)
  from public;

-- Redundant today, and deliberately kept. anon holds no explicit grant, so the
-- revoke above is what denies it — but naming anon makes the intent legible, and
-- protects against a future ALTER DEFAULT PRIVILEGES that grants to anon
-- directly, which the PUBLIC revoke would not catch.
revoke all on function public.get_company_dashboard_aggregates(uuid, timestamptz)
  from anon;

-- The two roles migration 151 named. `authenticated` is the application: every
-- caller is a signed-in user rendering their own dashboard
-- (lib/database/queries/dashboard-aggregates.ts uses the user-scoped client).
-- `service_role` is included to match 151 exactly, so a project that received
-- 151 and one that received 158 end up identical.
grant execute on function public.get_company_dashboard_aggregates(uuid, timestamptz)
  to authenticated, service_role;

commit;
