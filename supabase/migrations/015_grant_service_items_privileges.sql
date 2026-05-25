-- service_items grants are in 013; re-apply in case migration ran before grants were added.
grant select, insert, update, delete on table public.service_items to authenticated;
grant all on table public.service_items to service_role;
