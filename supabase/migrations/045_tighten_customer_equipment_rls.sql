-- Customer + Equipment Workflow Hardening: role-aware RLS for customers and customer_equipment.
--
-- Replaces company-member-only policies with:
--   - customer managers (owner/admin/dispatcher/office_staff) for CRUD
--   - assigned technicians/subcontractors for read (customers on assigned jobs)
--   - assigned technicians for equipment write during active assigned jobs
-- Preserves tenant isolation via company_id checks.

create or replace function public.can_manage_customers(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_company_role(
    target_company_id,
    array['owner', 'admin', 'dispatcher', 'office_staff']::public.company_role[]
  );
$$;

create or replace function public.has_assigned_job_for_customer(
  target_company_id uuid,
  target_customer_id uuid
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
      and j.customer_id = target_customer_id
      and j.assigned_technician_id = auth.uid()
  );
$$;

create or replace function public.can_write_customer_equipment_on_job(
  target_company_id uuid,
  target_customer_id uuid,
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
      and j.customer_id = target_customer_id
      and j.assigned_technician_id = auth.uid()
      and j.status not in ('completed'::public.job_status, 'cancelled'::public.job_status)
  );
$$;

create or replace function public.enforce_customer_equipment_company_match()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.customers c
    where c.id = new.customer_id
      and c.company_id = new.company_id
  ) then
    raise exception 'Customer does not belong to this company workspace.';
  end if;

  return new;
end;
$$;

revoke all on function public.can_manage_customers(uuid) from public;
revoke all on function public.has_assigned_job_for_customer(uuid, uuid) from public;
revoke all on function public.can_write_customer_equipment_on_job(uuid, uuid, uuid) from public;
grant execute on function public.can_manage_customers(uuid) to authenticated;
grant execute on function public.has_assigned_job_for_customer(uuid, uuid) to authenticated;
grant execute on function public.can_write_customer_equipment_on_job(uuid, uuid, uuid) to authenticated;

-- customers
drop policy if exists "company members can read customers" on public.customers;
drop policy if exists "company members can insert customers" on public.customers;
drop policy if exists "company members can update customers" on public.customers;
drop policy if exists "company members can delete customers" on public.customers;

create policy "customer managers can read customers"
on public.customers
for select
to authenticated
using (public.can_manage_customers(company_id));

create policy "assigned technicians can read customers on assigned jobs"
on public.customers
for select
to authenticated
using (
  public.has_assigned_job_for_customer(company_id, id)
);

create policy "customer managers can insert customers"
on public.customers
for insert
to authenticated
with check (public.can_manage_customers(company_id));

create policy "customer managers can update customers"
on public.customers
for update
to authenticated
using (public.can_manage_customers(company_id))
with check (public.can_manage_customers(company_id));

create policy "customer managers can delete customers"
on public.customers
for delete
to authenticated
using (public.can_manage_customers(company_id));

-- customer_equipment
drop policy if exists "company members can read customer equipment" on public.customer_equipment;
drop policy if exists "company members can insert customer equipment" on public.customer_equipment;
drop policy if exists "company members can update customer equipment" on public.customer_equipment;

drop trigger if exists customer_equipment_enforce_company_match on public.customer_equipment;
create trigger customer_equipment_enforce_company_match
before insert or update on public.customer_equipment
for each row
execute function public.enforce_customer_equipment_company_match();

create policy "customer managers can read customer equipment"
on public.customer_equipment
for select
to authenticated
using (public.can_manage_customers(company_id));

create policy "assigned technicians can read customer equipment"
on public.customer_equipment
for select
to authenticated
using (
  public.has_assigned_job_for_customer(company_id, customer_id)
);

create policy "customer managers can insert customer equipment"
on public.customer_equipment
for insert
to authenticated
with check (public.can_manage_customers(company_id));

create policy "assigned technicians can insert customer equipment on active jobs"
on public.customer_equipment
for insert
to authenticated
with check (
  job_id is not null
  and public.can_write_customer_equipment_on_job(company_id, customer_id, job_id)
);

create policy "customer managers can update customer equipment"
on public.customer_equipment
for update
to authenticated
using (public.can_manage_customers(company_id))
with check (public.can_manage_customers(company_id));

create policy "assigned technicians can update customer equipment on active jobs"
on public.customer_equipment
for update
to authenticated
using (
  public.has_assigned_job_for_customer(company_id, customer_id)
)
with check (
  job_id is not null
  and public.can_write_customer_equipment_on_job(company_id, customer_id, job_id)
);
