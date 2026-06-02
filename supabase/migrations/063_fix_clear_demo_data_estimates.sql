-- Fix clear demo data: remove estimates/invoices/jobs tied to demo customers, not only is_demo rows.
-- Field-created estimates on demo customers keep is_demo = false and block customer delete (ON DELETE RESTRICT).
-- Same pattern as 062 time_entries: delete demo-scoped dependents before parent demo entities.

create or replace function public.clear_company_demo_data(p_company_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_deps text;
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

  -- time_entries: demo rows and rows linked to demo jobs (062)
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

  -- invoices: payments/line items/activities for demo-scoped invoices, then invoices
  delete from public.invoice_payments ip
  using public.invoices i
  where ip.invoice_id = i.id
    and i.company_id = p_company_id
    and (
      i.is_demo = true
      or i.customer_id in (
        select c.id
        from public.customers c
        where c.company_id = p_company_id
          and c.is_demo = true
      )
      or i.job_id in (
        select j.id
        from public.jobs j
        where j.company_id = p_company_id
          and j.is_demo = true
      )
    );

  delete from public.invoice_line_items ili
  using public.invoices i
  where ili.invoice_id = i.id
    and i.company_id = p_company_id
    and (
      ili.is_demo = true
      or i.is_demo = true
      or i.customer_id in (
        select c.id
        from public.customers c
        where c.company_id = p_company_id
          and c.is_demo = true
      )
      or i.job_id in (
        select j.id
        from public.jobs j
        where j.company_id = p_company_id
          and j.is_demo = true
      )
    );

  delete from public.invoice_activities ia
  using public.invoices i
  where ia.invoice_id = i.id
    and i.company_id = p_company_id
    and (
      i.is_demo = true
      or i.customer_id in (
        select c.id
        from public.customers c
        where c.company_id = p_company_id
          and c.is_demo = true
      )
      or i.job_id in (
        select j.id
        from public.jobs j
        where j.company_id = p_company_id
          and j.is_demo = true
      )
    );

  delete from public.invoices i
  where i.company_id = p_company_id
    and (
      i.is_demo = true
      or i.customer_id in (
        select c.id
        from public.customers c
        where c.company_id = p_company_id
          and c.is_demo = true
      )
      or i.job_id in (
        select j.id
        from public.jobs j
        where j.company_id = p_company_id
          and j.is_demo = true
      )
    );

  -- estimates: line items/activities for demo-scoped estimates, then estimates
  delete from public.estimate_line_items eli
  using public.estimates e
  where eli.estimate_id = e.id
    and e.company_id = p_company_id
    and (
      eli.is_demo = true
      or e.is_demo = true
      or e.customer_id in (
        select c.id
        from public.customers c
        where c.company_id = p_company_id
          and c.is_demo = true
      )
      or e.job_id in (
        select j.id
        from public.jobs j
        where j.company_id = p_company_id
          and j.is_demo = true
      )
    );

  delete from public.estimate_activities ea
  using public.estimates e
  where ea.estimate_id = e.id
    and e.company_id = p_company_id
    and (
      e.is_demo = true
      or e.customer_id in (
        select c.id
        from public.customers c
        where c.company_id = p_company_id
          and c.is_demo = true
      )
      or e.job_id in (
        select j.id
        from public.jobs j
        where j.company_id = p_company_id
          and j.is_demo = true
      )
    );

  delete from public.estimates e
  where e.company_id = p_company_id
    and (
      e.is_demo = true
      or e.customer_id in (
        select c.id
        from public.customers c
        where c.company_id = p_company_id
          and c.is_demo = true
      )
      or e.job_id in (
        select j.id
        from public.jobs j
        where j.company_id = p_company_id
          and j.is_demo = true
      )
    );

  -- jobs: activities/materials/dispatch on demo jobs or demo-customer jobs, then jobs
  delete from public.job_activities ja
  where ja.company_id = p_company_id
    and (
      ja.is_demo = true
      or ja.job_id in (
        select j.id
        from public.jobs j
        where j.company_id = p_company_id
          and (
            j.is_demo = true
            or j.customer_id in (
              select c.id
              from public.customers c
              where c.company_id = p_company_id
                and c.is_demo = true
            )
          )
      )
    );

  delete from public.job_materials jm
  where jm.company_id = p_company_id
    and (
      jm.is_demo = true
      or jm.job_id in (
        select j.id
        from public.jobs j
        where j.company_id = p_company_id
          and (
            j.is_demo = true
            or j.customer_id in (
              select c.id
              from public.customers c
              where c.company_id = p_company_id
                and c.is_demo = true
            )
          )
      )
    );

  delete from public.dispatch_assignments da
  where da.company_id = p_company_id
    and (
      da.is_demo = true
      or da.job_id in (
        select j.id
        from public.jobs j
        where j.company_id = p_company_id
          and (
            j.is_demo = true
            or j.customer_id in (
              select c.id
              from public.customers c
              where c.company_id = p_company_id
                and c.is_demo = true
            )
          )
      )
    );

  delete from public.customer_equipment ce
  where ce.company_id = p_company_id
    and (
      ce.is_demo = true
      or ce.customer_id in (
        select c.id
        from public.customers c
        where c.company_id = p_company_id
          and c.is_demo = true
      )
    );

  delete from public.jobs j
  where j.company_id = p_company_id
    and (
      j.is_demo = true
      or j.customer_id in (
        select c.id
        from public.customers c
        where c.company_id = p_company_id
          and c.is_demo = true
      )
    );

  -- Defensive check before customer delete (ON DELETE RESTRICT on jobs/estimates/invoices)
  select string_agg(blocker, '; ' order by blocker)
  into v_deps
  from (
    select format(
      'estimates=%s (demo=%s, user_on_demo_customer=%s)',
      count(*),
      count(*) filter (where e.is_demo),
      count(*) filter (where not e.is_demo)
    ) as blocker
    from public.estimates e
    where e.company_id = p_company_id
      and e.customer_id in (
        select c.id
        from public.customers c
        where c.company_id = p_company_id
          and c.is_demo = true
      )
    having count(*) > 0

    union all

    select format(
      'invoices=%s (demo=%s, user_on_demo_customer=%s)',
      count(*),
      count(*) filter (where i.is_demo),
      count(*) filter (where not i.is_demo)
    ) as blocker
    from public.invoices i
    where i.company_id = p_company_id
      and i.customer_id in (
        select c.id
        from public.customers c
        where c.company_id = p_company_id
          and c.is_demo = true
      )
    having count(*) > 0

    union all

    select format(
      'jobs=%s (demo=%s, user_on_demo_customer=%s)',
      count(*),
      count(*) filter (where j.is_demo),
      count(*) filter (where not j.is_demo)
    ) as blocker
    from public.jobs j
    where j.company_id = p_company_id
      and j.customer_id in (
        select c.id
        from public.customers c
        where c.company_id = p_company_id
          and c.is_demo = true
      )
    having count(*) > 0
  ) blockers;

  if v_deps is not null then
    raise exception
      'Clear demo data blocked: records still reference demo customers (%). Re-run after resolving dependencies.',
      v_deps;
  end if;

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
