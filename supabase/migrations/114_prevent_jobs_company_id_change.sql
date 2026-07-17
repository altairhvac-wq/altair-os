-- Security fix: make jobs.company_id immutable after creation.
--
-- Vulnerability: RLS on public.jobs governs which rows an actor may UPDATE
-- (via USING) and what the resulting row must satisfy (via WITH CHECK), but
-- neither clause pins individual columns to their prior values. The "update
-- jobs" policy's WITH CHECK re-evaluates public.is_active_company_member(company_id)
-- and public.can_dispatch_jobs(company_id)/assigned_technician_id against the
-- NEW row, not against OLD.company_id. Nothing in the schema currently stops
-- a dispatcher/admin who is an active member of two companies (e.g. via
-- multiple company_memberships rows) from re-pointing an existing job's
-- company_id to a different tenant they also belong to, silently moving the
-- job (and its downstream billing/audit trail) across the tenant boundary.
--
-- Fix: a BEFORE UPDATE trigger that rejects any UPDATE attempting to change
-- company_id, regardless of the caller's role or company memberships. This
-- makes tenant identity immutable at the database level, independent of RLS
-- policy correctness. No application workflow currently sets company_id in a
-- jobs UPDATE payload (job status transitions, archive/restore, trash, and
-- form edits all filter by company_id but never write it), so this trigger
-- has no effect on legitimate flows -- it only closes the mutation path.

create or replace function public.prevent_jobs_company_id_change()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if OLD.company_id is distinct from NEW.company_id then
    raise exception 'jobs.company_id is immutable after creation'
      using errcode = '42501';
  end if;

  return NEW;
end;
$$;

drop trigger if exists prevent_jobs_company_id_change on public.jobs;
create trigger prevent_jobs_company_id_change
  before update on public.jobs
  for each row
  execute function public.prevent_jobs_company_id_change();
