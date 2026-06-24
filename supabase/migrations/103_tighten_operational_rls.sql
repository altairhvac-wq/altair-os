-- Operational workspace RLS hardening: expenses, time_entries, dispatch_assignments.
--
-- Replaces broad is_active_company_member policies with role-aware access aligned to
-- the app permission model (manageBilling, dispatchJobs, field submitter ownership).
-- Preserves tenant isolation via company_id on every policy.

create or replace function public.can_view_company_expenses(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.can_manage_billing(target_company_id)
    or public.can_dispatch_jobs(target_company_id);
$$;

create or replace function public.can_view_company_time_entries(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.can_manage_billing(target_company_id)
    or public.can_dispatch_jobs(target_company_id);
$$;

-- Company-scoped expense numbering bypasses submitter RLS (technicians create receipts).
create or replace function public.generate_expense_number(p_company_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select 'EXP-' || (1013 + coalesce((
    select count(*)::int
    from public.expenses
    where company_id = p_company_id
  ), 0))::text;
$$;

revoke all on function public.can_view_company_expenses(uuid) from public;
revoke all on function public.can_view_company_time_entries(uuid) from public;
revoke all on function public.generate_expense_number(uuid) from public;
grant execute on function public.can_view_company_expenses(uuid) to authenticated;
grant execute on function public.can_view_company_time_entries(uuid) to authenticated;
grant execute on function public.generate_expense_number(uuid) to authenticated;

-- expenses
drop policy if exists "company members can read expenses" on public.expenses;
drop policy if exists "company members can insert expenses" on public.expenses;
drop policy if exists "company members can update expenses" on public.expenses;
drop policy if exists "company members can delete expenses" on public.expenses;

create policy "expense managers and submitters can read expenses"
on public.expenses
for select
to authenticated
using (
  public.is_active_company_member(company_id)
  and (
    public.can_view_company_expenses(company_id)
    or technician_id = auth.uid()
  )
);

create policy "expense managers and field submitters can insert expenses"
on public.expenses
for insert
to authenticated
with check (
  public.is_active_company_member(company_id)
  and (
    public.can_view_company_expenses(company_id)
    or (
      technician_id = auth.uid()
      and public.has_company_role(
        company_id,
        array['technician', 'subcontractor']::public.company_role[]
      )
    )
  )
);

create policy "expense managers and owners can update expenses"
on public.expenses
for update
to authenticated
using (
  public.is_active_company_member(company_id)
  and (
    public.can_view_company_expenses(company_id)
    or technician_id = auth.uid()
  )
)
with check (
  public.is_active_company_member(company_id)
  and (
    public.can_view_company_expenses(company_id)
    or technician_id = auth.uid()
  )
);

create policy "billing managers can delete expenses"
on public.expenses
for delete
to authenticated
using (
  public.is_active_company_member(company_id)
  and public.can_manage_billing(company_id)
);

-- time_entries
drop policy if exists "company members can read time entries" on public.time_entries;
drop policy if exists "company members can insert time entries" on public.time_entries;
drop policy if exists "company members can update time entries" on public.time_entries;
drop policy if exists "company members can delete time entries" on public.time_entries;

create policy "time managers and technicians can read time entries"
on public.time_entries
for select
to authenticated
using (
  public.is_active_company_member(company_id)
  and (
    public.can_view_company_time_entries(company_id)
    or technician_id = auth.uid()
  )
);

create policy "time managers and field technicians can insert time entries"
on public.time_entries
for insert
to authenticated
with check (
  public.is_active_company_member(company_id)
  and (
    public.can_view_company_time_entries(company_id)
    or (
      technician_id = auth.uid()
      and public.has_company_role(
        company_id,
        array['technician', 'subcontractor']::public.company_role[]
      )
    )
  )
);

create policy "time managers and owners can update time entries"
on public.time_entries
for update
to authenticated
using (
  public.is_active_company_member(company_id)
  and (
    public.can_view_company_time_entries(company_id)
    or technician_id = auth.uid()
  )
)
with check (
  public.is_active_company_member(company_id)
  and (
    public.can_view_company_time_entries(company_id)
    or technician_id = auth.uid()
  )
);

create policy "time managers can delete time entries"
on public.time_entries
for delete
to authenticated
using (
  public.is_active_company_member(company_id)
  and public.can_view_company_time_entries(company_id)
);

-- dispatch_assignments
drop policy if exists "company members can read dispatch assignments" on public.dispatch_assignments;
drop policy if exists "company members can insert dispatch assignments" on public.dispatch_assignments;
drop policy if exists "company members can update dispatch assignments" on public.dispatch_assignments;
drop policy if exists "company members can delete dispatch assignments" on public.dispatch_assignments;

create policy "dispatchers and assigned technicians can read dispatch assignments"
on public.dispatch_assignments
for select
to authenticated
using (
  public.is_active_company_member(company_id)
  and (
    public.can_dispatch_jobs(company_id)
    or technician_id = auth.uid()
  )
);

create policy "dispatchers can insert dispatch assignments"
on public.dispatch_assignments
for insert
to authenticated
with check (
  public.is_active_company_member(company_id)
  and public.can_dispatch_jobs(company_id)
);

create policy "dispatchers can update dispatch assignments"
on public.dispatch_assignments
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

create policy "dispatchers can delete dispatch assignments"
on public.dispatch_assignments
for delete
to authenticated
using (
  public.is_active_company_member(company_id)
  and public.can_dispatch_jobs(company_id)
);
