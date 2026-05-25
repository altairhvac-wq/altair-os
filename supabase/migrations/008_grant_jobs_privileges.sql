-- jobs was created without role grants; PostgREST returns 42501 before RLS runs.
grant select, insert, update, delete on table public.jobs to authenticated;
grant all on table public.jobs to service_role;
