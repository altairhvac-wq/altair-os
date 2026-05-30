-- companies UPDATE was policy-protected but never granted to authenticated;
-- PostgREST returns 42501 before RLS runs (blocks settings updates + demo seed marker).

grant update on table public.companies to authenticated;
