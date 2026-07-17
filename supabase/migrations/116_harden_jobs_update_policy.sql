-- Migration 116: remove technician direct-UPDATE path from jobs RLS.
--
-- Security context
-- ----------------
-- Finding A (Critical): the "dispatchers or assigned technicians can update
-- jobs" policy (migration 046) grants assigned technicians unrestricted
-- column-level UPDATE on the jobs table.  Any column that is not explicitly
-- guarded by WITH CHECK can be written directly by any technician who is
-- assigned to the job.
--
-- Prerequisites
-- -------------
-- This migration must only be applied AFTER:
--   1. Migration 115 (transition_job_workflow_status RPC) is deployed.
--   2. The application is updated to route all technician workflow transitions
--      through the new RPC (updateJobWorkflowStatus uses rpc() not .update()).
--   3. The change has been verified in production – no technician workflow
--      action (En Route, Arrived, Start Work, Complete) should fail.
--
-- What changes
-- ------------
-- The existing broad UPDATE policy is replaced with a dispatcher-only policy.
-- Technicians no longer have a direct table-level UPDATE path on jobs; they
-- must use the transition_job_workflow_status SECURITY DEFINER RPC which
-- enforces the transition matrix, role/assignment checks, and atomicity.
--
-- What does NOT change
-- --------------------
-- • Dispatchers (owner, admin, dispatcher role) retain full table-level UPDATE
--   so that all existing dispatcher workflows (job form edits, archive,
--   restore, trash, cancel, reopen, status correction) continue to work.
-- • The RLS SELECT policy is unchanged.
-- • The RLS DELETE policy is unchanged.
-- • The prevent_jobs_company_id_change trigger (migration 114) remains.
-- • The transition_job_workflow_status RPC enforces its own security checks
--   inside SECURITY DEFINER context so it does not depend on RLS for the
--   technician write path.
--
-- Residual findings not addressed by this migration
-- --------------------------------------------------
-- Finding D: cancelJobAction in app/actions/job-lifecycle.ts calls cancelJob()
--   which issues a direct .update() on jobs (dispatcher-gated at the action
--   layer).  After this migration it remains a valid dispatcher path but still
--   bypasses the RPC orchestration.  Routing it through the RPC is the next
--   atomic-start/complete phase.
--
-- Finding E: finalize_job_dispatch_assignments is callable by any active
--   member.  The RPC transition path no longer calls it from the application;
--   a follow-up migration should tighten its grant to dispatchers only.
--
-- Finding F: workflow orchestration non-atomicity (labor, invoice, notify)
--   remains in application code and is flagged for the subsequent phase.

drop policy if exists "dispatchers or assigned technicians can update jobs"
  on public.jobs;

create policy "dispatchers can update jobs"
on public.jobs
for update
to authenticated
using (
  public.is_active_company_member(company_id)
  and public.can_dispatch_jobs(company_id)
)
with check (
  public.is_active_company_member(company_id)
  and public.can_dispatch_jobs(company_id)
);
