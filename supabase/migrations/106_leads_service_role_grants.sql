-- Automation Phase 1.1: allow service_role reads/writes on leads for reminder evaluation cron.
-- RLS remains enabled; service_role bypasses RLS for trusted server-side automation.

grant all on table public.leads to service_role;
