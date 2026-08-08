-- Restore the companies UPDATE policy that exists in the repo's migration
-- history (002_app_core.sql) but is MISSING from the live database.
--
-- Symptom in production: Settings -> Company -> "Save company profile" fails
-- for owners with the raw PostgREST error "Cannot coerce the result to a
-- single JSON object" (PGRST116). Root cause: with RLS enabled and no UPDATE
-- policy on public.companies, the UPDATE matches zero rows, so the
-- .update().select().single() chain returns no row.
--
-- Live policies observed on public.companies (2026-08-08):
--   "members can view their companies"            SELECT
--   "users can view companies with pending invite" SELECT
-- (no UPDATE policy at all)
--
-- Idempotent: safe to re-run.

drop policy if exists "owners and admins can update companies" on public.companies;

create policy "owners and admins can update companies"
on public.companies
for update
to authenticated
using (
  public.has_company_role(
    id,
    array['owner', 'admin']::public.company_role[]
  )
)
with check (
  public.has_company_role(
    id,
    array['owner', 'admin']::public.company_role[]
  )
);

-- Also re-assert the grant from 054_grant_companies_update.sql in case the
-- live database predates it (policies are useless without the table grant).
grant update on table public.companies to authenticated;
