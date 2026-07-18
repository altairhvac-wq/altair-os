-- Migration 118: restrict finalize_job_dispatch_assignments to dispatcher roles.
--
-- Security context
-- ----------------
-- Finding E: finalize_job_dispatch_assignments is a SECURITY DEFINER RPC granted
-- to authenticated.  It previously verified only auth.uid() and
-- is_active_company_member(...).  Any active company member (including a
-- technician) could invoke it via PostgREST and update dispatch assignments or,
-- on cancel, clear jobs.assigned_technician_id — bypassing table RLS.
--
-- Fix
-- ---
-- Add the same role gate already used by assign_job_to_technician:
--   has_company_role(company, {owner, admin, dispatcher})
--
-- Preserved
-- ---------
-- • Function signature, parameters, return type
-- • Dispatch finalization / cancellation behavior
-- • EXECUTE grant to authenticated (authorization is enforced inside the
--   function, matching assign_job_to_technician; company roles cannot be
--   expressed as PostgreSQL role grants)

create or replace function public.finalize_job_dispatch_assignments(
  p_company_id uuid,
  p_job_id uuid,
  p_final_status public.dispatch_assignment_status
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_active_company_member(p_company_id) then
    raise exception 'You do not have permission to perform this action.';
  end if;

  if not public.has_company_role(
    p_company_id,
    array['owner', 'admin', 'dispatcher']::public.company_role[]
  ) then
    raise exception 'You do not have permission to finalize dispatch assignments.';
  end if;

  if p_final_status not in (
    'completed'::public.dispatch_assignment_status,
    'cancelled'::public.dispatch_assignment_status
  ) then
    raise exception 'Invalid assignment final status.';
  end if;

  update public.dispatch_assignments
  set
    status = p_final_status,
    unassigned_at = case
      when p_final_status = 'cancelled'::public.dispatch_assignment_status then v_now
      else unassigned_at
    end,
    updated_at = v_now
  where company_id = p_company_id
    and job_id = p_job_id
    and status = 'active'::public.dispatch_assignment_status;

  if p_final_status = 'cancelled'::public.dispatch_assignment_status then
    update public.jobs
    set assigned_technician_id = null
    where company_id = p_company_id
      and id = p_job_id;
  end if;
end;
$$;

revoke all on function public.finalize_job_dispatch_assignments(uuid, uuid, public.dispatch_assignment_status) from public;
grant execute on function public.finalize_job_dispatch_assignments(uuid, uuid, public.dispatch_assignment_status) to authenticated;
