-- Core tenant/auth tables were created without service_role grants.
-- PostgREST returns 42501 before RLS runs, so platform admin (service role) saw 0 companies/users.
grant all on table public.companies to service_role;
grant all on table public.profiles to service_role;
grant all on table public.company_memberships to service_role;
