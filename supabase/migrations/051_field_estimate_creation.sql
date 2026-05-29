-- Allow assigned technicians to create draft estimates linked to their assigned jobs.

create or replace function public.can_create_field_estimates(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_company_role(
    target_company_id,
    array['technician', 'subcontractor']::public.company_role[]
  );
$$;

create or replace function public.is_assigned_technician_for_job(
  target_company_id uuid,
  target_job_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.jobs j
    where j.company_id = target_company_id
      and j.id = target_job_id
      and j.assigned_technician_id = auth.uid()
      and j.status <> 'cancelled'
  );
$$;

revoke all on function public.can_create_field_estimates(uuid) from public;
revoke all on function public.is_assigned_technician_for_job(uuid, uuid) from public;
grant execute on function public.can_create_field_estimates(uuid) to authenticated;
grant execute on function public.is_assigned_technician_for_job(uuid, uuid) to authenticated;

create policy "assigned technicians can insert draft estimates for assigned jobs"
on public.estimates
for insert
to authenticated
with check (
  public.is_active_company_member(company_id)
  and public.can_create_field_estimates(company_id)
  and status = 'draft'
  and job_id is not null
  and public.is_assigned_technician_for_job(company_id, job_id)
  and exists (
    select 1
    from public.jobs j
    where j.id = job_id
      and j.company_id = company_id
      and j.customer_id = customer_id
  )
);

create policy "assigned technicians can insert line items for field draft estimates"
on public.estimate_line_items
for insert
to authenticated
with check (
  public.is_active_company_member(company_id)
  and exists (
    select 1
    from public.estimates e
    where e.id = estimate_id
      and e.company_id = company_id
      and e.status = 'draft'
      and e.job_id is not null
      and public.is_assigned_technician_for_job(e.company_id, e.job_id)
  )
);
