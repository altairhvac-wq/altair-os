-- dispatch_assignments was created without role grants; PostgREST returns 42501 before RLS runs.
grant select, insert, update, delete on table public.dispatch_assignments to authenticated;
grant all on table public.dispatch_assignments to service_role;
