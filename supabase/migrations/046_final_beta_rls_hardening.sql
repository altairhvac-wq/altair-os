-- Final beta security pass: role-aware RLS for billing, jobs, customer activities, notifications.
-- Aligns direct Supabase client access with app permission model (manageBilling, dispatchJobs, assigned jobs).

create or replace function public.can_manage_billing(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_company_role(
    target_company_id,
    array['owner', 'admin', 'office_staff']::public.company_role[]
  );
$$;

create or replace function public.can_dispatch_jobs(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_company_role(
    target_company_id,
    array['owner', 'admin', 'dispatcher']::public.company_role[]
  );
$$;

create or replace function public.can_view_operational_jobs(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.can_manage_billing(target_company_id)
    or public.can_dispatch_jobs(target_company_id)
    or public.can_manage_customers(target_company_id);
$$;

create or replace function public.can_insert_company_notification(
  target_company_id uuid,
  target_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_active_company_member(target_company_id)
    and (
      public.can_dispatch_jobs(target_company_id)
      or public.can_manage_billing(target_company_id)
      or public.has_company_role(
        target_company_id,
        array['technician', 'subcontractor']::public.company_role[]
      )
    )
    and (
      target_user_id is null
      or exists (
        select 1
        from public.company_memberships cm
        where cm.company_id = target_company_id
          and cm.user_id = target_user_id
          and cm.status = 'active'
      )
    );
$$;

revoke all on function public.can_manage_billing(uuid) from public;
revoke all on function public.can_dispatch_jobs(uuid) from public;
revoke all on function public.can_view_operational_jobs(uuid) from public;
revoke all on function public.can_insert_company_notification(uuid, uuid) from public;
grant execute on function public.can_manage_billing(uuid) to authenticated;
grant execute on function public.can_dispatch_jobs(uuid) to authenticated;
grant execute on function public.can_view_operational_jobs(uuid) to authenticated;
grant execute on function public.can_insert_company_notification(uuid, uuid) to authenticated;

-- jobs
drop policy if exists "company members can read jobs" on public.jobs;
drop policy if exists "company members can insert jobs" on public.jobs;
drop policy if exists "company members can update jobs" on public.jobs;
drop policy if exists "company members can delete jobs" on public.jobs;

create policy "operational roles and assigned technicians can read jobs"
on public.jobs
for select
to authenticated
using (
  public.is_active_company_member(company_id)
  and (
    public.can_view_operational_jobs(company_id)
    or assigned_technician_id = auth.uid()
  )
);

create policy "dispatchers can insert jobs"
on public.jobs
for insert
to authenticated
with check (
  public.is_active_company_member(company_id)
  and public.can_dispatch_jobs(company_id)
);

create policy "dispatchers or assigned technicians can update jobs"
on public.jobs
for update
to authenticated
using (
  public.is_active_company_member(company_id)
  and (
    public.can_dispatch_jobs(company_id)
    or assigned_technician_id = auth.uid()
  )
)
with check (
  public.is_active_company_member(company_id)
  and (
    public.can_dispatch_jobs(company_id)
    or assigned_technician_id = auth.uid()
  )
);

create policy "dispatchers can delete jobs"
on public.jobs
for delete
to authenticated
using (
  public.is_active_company_member(company_id)
  and public.can_dispatch_jobs(company_id)
);

-- estimates
drop policy if exists "company members can read estimates" on public.estimates;
drop policy if exists "company members can insert estimates" on public.estimates;
drop policy if exists "company members can update estimates" on public.estimates;
drop policy if exists "company members can delete estimates" on public.estimates;

create policy "billing managers can read estimates"
on public.estimates
for select
to authenticated
using (
  public.is_active_company_member(company_id)
  and public.can_manage_billing(company_id)
);

create policy "billing managers can insert estimates"
on public.estimates
for insert
to authenticated
with check (
  public.is_active_company_member(company_id)
  and public.can_manage_billing(company_id)
);

create policy "billing managers can update estimates"
on public.estimates
for update
to authenticated
using (
  public.is_active_company_member(company_id)
  and public.can_manage_billing(company_id)
)
with check (
  public.is_active_company_member(company_id)
  and public.can_manage_billing(company_id)
);

create policy "billing managers can delete estimates"
on public.estimates
for delete
to authenticated
using (
  public.is_active_company_member(company_id)
  and public.can_manage_billing(company_id)
);

-- estimate_line_items
drop policy if exists "company members can read estimate line items" on public.estimate_line_items;
drop policy if exists "company members can insert estimate line items" on public.estimate_line_items;
drop policy if exists "company members can update estimate line items" on public.estimate_line_items;
drop policy if exists "company members can delete estimate line items" on public.estimate_line_items;

create policy "billing managers can read estimate line items"
on public.estimate_line_items
for select
to authenticated
using (
  public.is_active_company_member(company_id)
  and public.can_manage_billing(company_id)
);

create policy "billing managers can insert estimate line items"
on public.estimate_line_items
for insert
to authenticated
with check (
  public.is_active_company_member(company_id)
  and public.can_manage_billing(company_id)
);

create policy "billing managers can update estimate line items"
on public.estimate_line_items
for update
to authenticated
using (
  public.is_active_company_member(company_id)
  and public.can_manage_billing(company_id)
)
with check (
  public.is_active_company_member(company_id)
  and public.can_manage_billing(company_id)
);

create policy "billing managers can delete estimate line items"
on public.estimate_line_items
for delete
to authenticated
using (
  public.is_active_company_member(company_id)
  and public.can_manage_billing(company_id)
);

-- invoices
drop policy if exists "company members can read invoices" on public.invoices;
drop policy if exists "company members can insert invoices" on public.invoices;
drop policy if exists "company members can update invoices" on public.invoices;
drop policy if exists "company members can delete invoices" on public.invoices;

create policy "billing managers can read invoices"
on public.invoices
for select
to authenticated
using (
  public.is_active_company_member(company_id)
  and public.can_manage_billing(company_id)
);

create policy "billing managers can insert invoices"
on public.invoices
for insert
to authenticated
with check (
  public.is_active_company_member(company_id)
  and public.can_manage_billing(company_id)
);

create policy "billing managers can update invoices"
on public.invoices
for update
to authenticated
using (
  public.is_active_company_member(company_id)
  and public.can_manage_billing(company_id)
)
with check (
  public.is_active_company_member(company_id)
  and public.can_manage_billing(company_id)
);

create policy "billing managers can delete invoices"
on public.invoices
for delete
to authenticated
using (
  public.is_active_company_member(company_id)
  and public.can_manage_billing(company_id)
);

-- invoice_line_items
drop policy if exists "company members can read invoice line items" on public.invoice_line_items;
drop policy if exists "company members can insert invoice line items" on public.invoice_line_items;
drop policy if exists "company members can update invoice line items" on public.invoice_line_items;
drop policy if exists "company members can delete invoice line items" on public.invoice_line_items;

create policy "billing managers can read invoice line items"
on public.invoice_line_items
for select
to authenticated
using (
  public.is_active_company_member(company_id)
  and public.can_manage_billing(company_id)
);

create policy "billing managers can insert invoice line items"
on public.invoice_line_items
for insert
to authenticated
with check (
  public.is_active_company_member(company_id)
  and public.can_manage_billing(company_id)
);

create policy "billing managers can update invoice line items"
on public.invoice_line_items
for update
to authenticated
using (
  public.is_active_company_member(company_id)
  and public.can_manage_billing(company_id)
)
with check (
  public.is_active_company_member(company_id)
  and public.can_manage_billing(company_id)
);

create policy "billing managers can delete invoice line items"
on public.invoice_line_items
for delete
to authenticated
using (
  public.is_active_company_member(company_id)
  and public.can_manage_billing(company_id)
);

-- invoice_payments
drop policy if exists "company members can read invoice payments" on public.invoice_payments;
drop policy if exists "company members can insert invoice payments" on public.invoice_payments;

create policy "billing managers can read invoice payments"
on public.invoice_payments
for select
to authenticated
using (
  public.is_active_company_member(company_id)
  and public.can_manage_billing(company_id)
);

create policy "billing managers can insert invoice payments"
on public.invoice_payments
for insert
to authenticated
with check (
  public.is_active_company_member(company_id)
  and public.can_manage_billing(company_id)
);

-- customer_activities (read aligned with customer access; insert remains member-wide for audit append)
drop policy if exists "company members can read customer activities" on public.customer_activities;

create policy "customer managers can read customer activities"
on public.customer_activities
for select
to authenticated
using (public.can_manage_customers(company_id));

create policy "assigned technicians can read customer activities on assigned jobs"
on public.customer_activities
for select
to authenticated
using (
  public.has_assigned_job_for_customer(company_id, customer_id)
);

-- notifications
drop policy if exists "company members can insert notifications" on public.notifications;

create policy "workflow roles can insert notifications for company members"
on public.notifications
for insert
to authenticated
with check (
  public.can_insert_company_notification(company_id, user_id)
);
