-- customers was created without role grants; PostgREST returns 42501 before RLS runs.
grant select, insert, update, delete on table public.customers to authenticated;
grant all on table public.customers to service_role;
