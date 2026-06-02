-- Fix clear demo data: delete time entries linked to demo jobs before job deletion.
-- Non-demo job_labor rows on demo jobs would get job_id set null (ON DELETE SET NULL)
-- and violate time_entries_check1 (job_labor requires job_id).

create or replace function public.clear_company_demo_data(p_company_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_company_id is null then
    raise exception 'Company id is required';
  end if;

  if not public.has_company_role(
    p_company_id,
    array['owner', 'admin']::public.company_role[]
  ) then
    raise exception 'Insufficient permissions to clear demo data';
  end if;

  delete from public.time_activities
  where company_id = p_company_id
    and (
      time_entry_id in (
        select te.id
        from public.time_entries te
        where te.company_id = p_company_id
          and (
            te.is_demo = true
            or te.job_id in (
              select j.id
              from public.jobs j
              where j.company_id = p_company_id
                and j.is_demo = true
            )
          )
      )
      or job_id in (
        select j.id
        from public.jobs j
        where j.company_id = p_company_id
          and j.is_demo = true
      )
    );

  delete from public.time_entries
  where company_id = p_company_id
    and (
      is_demo = true
      or job_id in (
        select j.id
        from public.jobs j
        where j.company_id = p_company_id
          and j.is_demo = true
      )
    );

  delete from public.notifications
  where company_id = p_company_id
    and is_demo = true;

  delete from public.invoice_payments
  where company_id = p_company_id
    and is_demo = true;

  delete from public.invoice_line_items
  where company_id = p_company_id
    and is_demo = true;

  delete from public.invoice_activities ia
  using public.invoices i
  where ia.invoice_id = i.id
    and i.company_id = p_company_id
    and i.is_demo = true;

  delete from public.invoices
  where company_id = p_company_id
    and is_demo = true;

  delete from public.estimate_line_items
  where company_id = p_company_id
    and is_demo = true;

  delete from public.estimate_activities ea
  using public.estimates e
  where ea.estimate_id = e.id
    and e.company_id = p_company_id
    and e.is_demo = true;

  delete from public.estimates
  where company_id = p_company_id
    and is_demo = true;

  delete from public.job_activities
  where company_id = p_company_id
    and is_demo = true;

  delete from public.job_materials
  where company_id = p_company_id
    and is_demo = true;

  delete from public.dispatch_assignments
  where company_id = p_company_id
    and is_demo = true;

  delete from public.customer_equipment
  where company_id = p_company_id
    and is_demo = true;

  delete from public.jobs
  where company_id = p_company_id
    and is_demo = true;

  delete from public.customers
  where company_id = p_company_id
    and is_demo = true;

  delete from public.service_items
  where company_id = p_company_id
    and is_demo = true;

  update public.companies
  set settings = coalesce(settings, '{}'::jsonb) - 'demoData'
  where id = p_company_id;
end;
$$;
