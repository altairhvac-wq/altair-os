-- Migration 115: atomic job workflow transition RPC.
--
-- Security context
-- ----------------
-- Finding A (Critical): the "dispatchers or assigned technicians can update jobs"
-- RLS policy grants assigned technicians unrestricted column-level UPDATE.  Any
-- column that is not guarded by WITH CHECK can be written directly—status,
-- timestamps, customer linkage, schedule fields, lifecycle flags.
--
-- Finding B (Critical): a direct table UPDATE bypasses the entire application
-- orchestration layer: the transition matrix, activity events, dispatch
-- finalization, labor cleanup, and invoice automation.
--
-- Finding C (High): no company-match invariant on jobs.customer_id; a
-- technician with the broad UPDATE policy could point a job at a customer from
-- another tenant (migration 114 only pins company_id).
--
-- Finding E (High): finalize_job_dispatch_assignments is callable by any active
-- member without role or assignment checks.
--
-- Fix strategy (Option D – hybrid phased)
-- ----------------------------------------
-- Step 1 (this migration): introduce transition_job_workflow_status, a
-- SECURITY DEFINER RPC that atomically enforces:
--   • authentication and active company membership
--   • role + assignment: caller must be a dispatcher (owner/admin/dispatcher)
--     OR the technician/subcontractor explicitly assigned to the job
--   • expected-status optimistic lock (prevents concurrent double-transitions)
--   • terminal-state protection (completed/cancelled → anything is rejected)
--   • transition matrix (valid (from_status, action_id) pairs only)
--   • atomic write: status, timestamps, completion notes, assignment
--     finalization, and job_activities insert in one transaction
--
-- Step 2 (application): route updateJobWorkflowStatus through this RPC.
-- Step 3 (operations): verify in production.
-- Step 4 (migration 116): drop the technician path from the UPDATE policy.
--
-- Until migration 116 is applied the broad RLS policy remains in place as a
-- fallback so that no outage occurs if there is a gap between deploying the
-- application code and applying the hardening migration.

create or replace function public.transition_job_workflow_status(
  p_company_id         uuid,
  p_job_id             uuid,
  p_from_status        public.job_status,
  p_action_id          text,
  p_completion_notes   text default null,
  p_follow_up_notes    text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid            uuid    := auth.uid();
  v_job            record;
  v_to_status      public.job_status;
  v_event_type     public.job_activity_type;
  v_is_dispatcher  boolean;
  v_is_assigned    boolean;
  v_notes          text;
  v_follow_up      text;
begin
  -- 1. Authentication --------------------------------------------------------
  if v_uid is null then
    raise exception 'Not authenticated'
      using errcode = '42501';
  end if;

  -- 2. Active company membership --------------------------------------------
  if not public.is_active_company_member(p_company_id) then
    raise exception 'Not a member of this company'
      using errcode = '42501';
  end if;

  -- 3. Fetch and lock the job row -------------------------------------------
  --    FOR UPDATE prevents concurrent transitions on the same job.
  select *
  into   v_job
  from   public.jobs
  where  company_id = p_company_id
    and  id         = p_job_id
  for update;

  if not found then
    raise exception 'Job not found'
      using errcode = 'P0002';
  end if;

  -- 4. Role / assignment check -----------------------------------------------
  --    A dispatcher (owner, admin, or dispatcher role) may transition any job.
  --    A field technician or subcontractor may only transition a job that is
  --    explicitly assigned to them.
  v_is_dispatcher := public.can_dispatch_jobs(p_company_id);

  v_is_assigned := (
    v_job.assigned_technician_id = v_uid
    and public.has_company_role(
          p_company_id,
          array['technician', 'subcontractor']::public.company_role[]
        )
  );

  if not (v_is_dispatcher or v_is_assigned) then
    raise exception 'You do not have permission to perform this action'
      using errcode = '42501';
  end if;

  -- 5. Terminal-state protection ---------------------------------------------
  --    A job that has already reached completed or cancelled cannot be
  --    transitioned further via this RPC (use reopen or lifecycle actions).
  if v_job.status in (
    'completed'::public.job_status,
    'cancelled'::public.job_status
  ) then
    raise exception 'This job is already in a terminal state and cannot be transitioned'
      using errcode = '22000';
  end if;

  -- 6. Optimistic lock -------------------------------------------------------
  --    Reject if the row's current status does not match the caller's expected
  --    from-status.  This surfaces concurrent updates cleanly rather than
  --    silently applying a transition on top of an unexpected state.
  if v_job.status <> p_from_status then
    raise exception 'Job status has changed. Refresh the page and try again.'
      using errcode = '22000';
  end if;

  -- 7. Transition matrix -----------------------------------------------------
  --    Resolve the target status and activity event type; reject any
  --    (from_status, action_id) pair that is not in the allowed transition set.
  case p_action_id

    when 'dispatch' then
      if v_job.status <> 'scheduled'::public.job_status then
        raise exception 'Cannot dispatch a job that is not in scheduled status'
          using errcode = '22000';
      end if;
      v_to_status  := 'dispatched'::public.job_status;
      v_event_type := 'start_route'::public.job_activity_type;

    when 'arrive' then
      if v_job.status <> 'dispatched'::public.job_status then
        raise exception 'Cannot record arrival on a job that is not dispatched'
          using errcode = '22000';
      end if;
      v_to_status  := 'arrived'::public.job_status;
      v_event_type := 'technician_arrived'::public.job_activity_type;

    when 'start_work' then
      if v_job.status <> 'arrived'::public.job_status then
        raise exception 'Cannot start work on a job that has not arrived on site'
          using errcode = '22000';
      end if;
      v_to_status  := 'in_progress'::public.job_status;
      v_event_type := 'work_started'::public.job_activity_type;

    when 'complete' then
      if v_job.status <> 'in_progress'::public.job_status then
        raise exception 'Cannot complete a job that is not in progress'
          using errcode = '22000';
      end if;
      v_to_status  := 'completed'::public.job_status;
      v_event_type := 'work_completed'::public.job_activity_type;

    when 'cancel' then
      -- cancel is valid from any non-terminal status (already guarded above)
      v_to_status  := 'cancelled'::public.job_status;
      v_event_type := 'job_cancelled'::public.job_activity_type;

    else
      raise exception 'Unknown workflow action: %', p_action_id
        using errcode = '22000';

  end case;

  -- 8. Normalise optional text fields ----------------------------------------
  v_notes     := nullif(trim(coalesce(p_completion_notes, '')), '');
  v_follow_up := nullif(trim(coalesce(p_follow_up_notes, '')),  '');

  -- 9. Atomic job update ------------------------------------------------------
  --    Includes status, workflow timestamps, completion notes, and the
  --    assigned_technician_id clear for cancellations — all in one statement.
  update public.jobs
  set
    status = v_to_status,

    assigned_technician_id = case
      when p_action_id = 'cancel' then null
      else assigned_technician_id
    end,

    arrived_at = case
      when p_action_id = 'arrive' then now()
      else arrived_at
    end,

    work_started_at = case
      when p_action_id = 'start_work' then now()
      else work_started_at
    end,

    completed_at = case
      when p_action_id = 'complete' then now()
      else completed_at
    end,

    completion_notes = case
      when p_action_id = 'complete' and v_notes is not null then v_notes
      else completion_notes
    end,

    follow_up_notes = case
      when p_action_id = 'complete' and v_follow_up is not null then v_follow_up
      else follow_up_notes
    end
  where company_id = p_company_id
    and id         = p_job_id;

  -- 10. Finalize dispatch assignments for terminal transitions ----------------
  --     Inline the finalization rather than calling the existing
  --     finalize_job_dispatch_assignments RPC so that everything stays in one
  --     database transaction.
  if p_action_id in ('complete', 'cancel') then

    update public.dispatch_assignments
    set
      status        = v_to_status::text::public.dispatch_assignment_status,
      unassigned_at = case
        when p_action_id = 'cancel' then now()
        else unassigned_at
      end
    where company_id = p_company_id
      and job_id     = p_job_id
      and status     = 'active'::public.dispatch_assignment_status;

  end if;

  -- 11. Activity record -------------------------------------------------------
  --     Insert the audit trail entry in the same transaction so it is always
  --     present when the status change is visible to readers.
  insert into public.job_activities (
    company_id,
    job_id,
    actor_id,
    event_type,
    metadata
  ) values (
    p_company_id,
    p_job_id,
    v_uid,
    v_event_type,
    jsonb_strip_nulls(jsonb_build_object(
      'job_id',            p_job_id,
      'from_status',       v_job.status,
      'to_status',         v_to_status,
      'action_id',         p_action_id,
      'completion_notes',  case
                             when p_action_id = 'complete' then v_notes
                             else null
                           end,
      'follow_up_notes',   case
                             when p_action_id = 'complete' then v_follow_up
                             else null
                           end
    ))
  );

end;
$$;

revoke all on function public.transition_job_workflow_status(
  uuid, uuid, public.job_status, text, text, text
) from public;

grant execute on function public.transition_job_workflow_status(
  uuid, uuid, public.job_status, text, text, text
) to authenticated;
