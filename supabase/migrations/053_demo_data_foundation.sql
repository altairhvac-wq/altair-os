-- Demo data foundation: is_demo markers on operational tables + atomic clear RPC.

alter table public.customers
  add column if not exists is_demo boolean not null default false;

alter table public.customer_equipment
  add column if not exists is_demo boolean not null default false;

alter table public.service_items
  add column if not exists is_demo boolean not null default false;

alter table public.jobs
  add column if not exists is_demo boolean not null default false;

alter table public.dispatch_assignments
  add column if not exists is_demo boolean not null default false;

alter table public.estimates
  add column if not exists is_demo boolean not null default false;

alter table public.estimate_line_items
  add column if not exists is_demo boolean not null default false;

alter table public.invoices
  add column if not exists is_demo boolean not null default false;

alter table public.invoice_line_items
  add column if not exists is_demo boolean not null default false;

alter table public.invoice_payments
  add column if not exists is_demo boolean not null default false;

alter table public.job_activities
  add column if not exists is_demo boolean not null default false;

alter table public.job_materials
  add column if not exists is_demo boolean not null default false;

alter table public.notifications
  add column if not exists is_demo boolean not null default false;

alter table public.time_entries
  add column if not exists is_demo boolean not null default false;

create index if not exists customers_company_demo_idx
  on public.customers (company_id)
  where is_demo = true;

create index if not exists jobs_company_demo_idx
  on public.jobs (company_id)
  where is_demo = true;

-- ---------------------------------------------------------------------------
-- Clear all demo records for a company (owner/admin only, security definer)
-- ---------------------------------------------------------------------------

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

  delete from public.time_activities ta
  using public.time_entries te
  where ta.time_entry_id = te.id
    and te.company_id = p_company_id
    and te.is_demo = true;

  delete from public.time_entries
  where company_id = p_company_id
    and is_demo = true;

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

revoke all on function public.clear_company_demo_data(uuid) from public;
grant execute on function public.clear_company_demo_data(uuid) to authenticated;
