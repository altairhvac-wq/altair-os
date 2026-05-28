-- Atomic dispatch assignment and finalization helpers.
-- Row-lock job during assign; finalize clears assigned_technician_id on cancel.

create or replace function public.assign_job_to_technician(
  p_company_id uuid,
  p_job_id uuid,
  p_technician_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_job public.jobs%rowtype;
  v_now timestamptz := now();
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_active_company_member(p_company_id) then
    raise exception 'You do not have permission to perform this action.';
  end if;

  if not public.has_company_role(
    p_company_id,
    array['owner', 'admin', 'dispatcher']::public.company_role[]
  ) then
    raise exception 'You do not have permission to assign jobs.';
  end if;

  if not exists (
    select 1
    from public.company_memberships cm
    where cm.company_id = p_company_id
      and cm.user_id = p_technician_id
      and cm.status = 'active'
      and cm.role <> 'customer'::public.company_role
  ) then
    raise exception 'Selected technician is not an active member of this company.';
  end if;

  select *
  into v_job
  from public.jobs j
  where j.company_id = p_company_id
    and j.id = p_job_id
  for update;

  if not found then
    raise exception 'Job was not found.';
  end if;

  if v_job.status = 'cancelled'::public.job_status then
    raise exception 'Cancelled jobs cannot be reassigned.';
  end if;

  if v_job.status = 'completed'::public.job_status then
    raise exception 'Completed jobs cannot be reassigned.';
  end if;

  if v_job.assigned_technician_id = p_technician_id
    and exists (
      select 1
      from public.dispatch_assignments da
      where da.company_id = p_company_id
        and da.job_id = p_job_id
        and da.status = 'active'::public.dispatch_assignment_status
        and da.technician_id = p_technician_id
    )
  then
    return jsonb_build_object(
      'changed', false,
      'job_id', p_job_id,
      'previous_technician_id', v_job.assigned_technician_id
    );
  end if;

  update public.dispatch_assignments
  set
    status = 'cancelled'::public.dispatch_assignment_status,
    unassigned_at = v_now,
    updated_at = v_now
  where company_id = p_company_id
    and job_id = p_job_id
    and status = 'active'::public.dispatch_assignment_status;

  update public.jobs
  set assigned_technician_id = p_technician_id
  where company_id = p_company_id
    and id = p_job_id;

  insert into public.dispatch_assignments (
    company_id,
    job_id,
    technician_id,
    assigned_by,
    status,
    scheduled_start,
    assigned_at
  )
  values (
    p_company_id,
    p_job_id,
    p_technician_id,
    v_user_id,
    'active'::public.dispatch_assignment_status,
    v_job.scheduled_at,
    v_now
  );

  return jsonb_build_object(
    'changed', true,
    'job_id', p_job_id,
    'previous_technician_id', v_job.assigned_technician_id,
    'customer_id', v_job.customer_id,
    'job_number', v_job.job_number
  );
end;
$$;

revoke all on function public.assign_job_to_technician(uuid, uuid, uuid) from public;
grant execute on function public.assign_job_to_technician(uuid, uuid, uuid) to authenticated;

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
