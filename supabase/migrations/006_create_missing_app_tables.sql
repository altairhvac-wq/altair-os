-- Create missing Phase 2 app tables (customers, jobs, billing, dispatch, network)
-- Prerequisites (must already exist):
--   - 001_core_auth.sql (companies, profiles, company_memberships, set_updated_at)
--   - 002a_rls_helpers.sql (is_active_company_member, has_company_role)
-- Does NOT include: auth/core RLS policies, bootstrap functions, RLS helper functions

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$ begin
  create type public.customer_status as enum ('active', 'inactive', 'lead');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.job_status as enum (
    'scheduled',
    'dispatched',
    'in_progress',
    'completed',
    'cancelled'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.job_priority as enum ('low', 'normal', 'high', 'urgent');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.estimate_status as enum (
    'draft',
    'sent',
    'approved',
    'declined',
    'expired',
    'converted'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.invoice_status as enum (
    'draft',
    'sent',
    'viewed',
    'partially_paid',
    'paid',
    'overdue',
    'void'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.expense_status as enum (
    'draft',
    'submitted',
    'approved',
    'rejected',
    'reimbursed'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.expense_category as enum (
    'materials',
    'fuel',
    'tools',
    'meals',
    'lodging',
    'vehicle',
    'office',
    'other'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.receipt_status as enum ('missing', 'attached', 'pending');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.time_entry_status as enum (
    'active',
    'pending',
    'approved',
    'rejected'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.dispatch_assignment_status as enum (
    'active',
    'completed',
    'cancelled',
    'unassigned'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.relationship_status as enum (
    'preferred',
    'active',
    'pending',
    'paused'
  );
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  email text not null default '',
  phone text not null default '',
  company_name text,
  status public.customer_status not null default 'lead',
  address_line1 text not null default '',
  city text not null default '',
  state text not null default '',
  postal_code text not null default '',
  tags text[] not null default '{}'::text[],
  notes text,
  total_jobs integer not null default 0 check (total_jobs >= 0),
  total_revenue numeric(12, 2) not null default 0 check (total_revenue >= 0),
  last_service_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete restrict,
  job_number text not null,
  service_address text not null default '',
  city text not null default '',
  state text not null default '',
  postal_code text not null default '',
  job_type text not null default '',
  scheduled_at timestamptz not null,
  status public.job_status not null default 'scheduled',
  priority public.job_priority not null default 'normal',
  description text,
  notes text,
  assigned_technician_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, job_number)
);

create table if not exists public.estimates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete restrict,
  job_id uuid references public.jobs (id) on delete set null,
  estimate_number text not null,
  status public.estimate_status not null default 'draft',
  line_items jsonb not null default '[]'::jsonb,
  subtotal numeric(12, 2) not null default 0 check (subtotal >= 0),
  tax numeric(12, 2) not null default 0 check (tax >= 0),
  total numeric(12, 2) not null default 0 check (total >= 0),
  valid_until date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, estimate_number)
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete restrict,
  job_id uuid references public.jobs (id) on delete set null,
  invoice_number text not null,
  job_type text not null default '',
  status public.invoice_status not null default 'draft',
  line_items jsonb not null default '[]'::jsonb,
  subtotal numeric(12, 2) not null default 0 check (subtotal >= 0),
  tax numeric(12, 2) not null default 0 check (tax >= 0),
  total numeric(12, 2) not null default 0 check (total >= 0),
  amount_paid numeric(12, 2) not null default 0 check (amount_paid >= 0),
  balance_due numeric(12, 2) not null default 0 check (balance_due >= 0),
  issued_at timestamptz not null default now(),
  due_date date not null,
  paid_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, invoice_number)
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  job_id uuid references public.jobs (id) on delete set null,
  technician_id uuid not null references public.profiles (id) on delete restrict,
  expense_number text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  purchase_date date not null,
  merchant text not null default '',
  category public.expense_category not null default 'other',
  receipt_status public.receipt_status not null default 'missing',
  receipt_file_name text,
  receipt_storage_path text,
  status public.expense_status not null default 'draft',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, expense_number)
);

create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  job_id uuid references public.jobs (id) on delete set null,
  technician_id uuid not null references public.profiles (id) on delete restrict,
  entry_number text not null,
  clock_in_at timestamptz not null,
  clock_out_at timestamptz,
  total_hours numeric(8, 2) check (total_hours is null or total_hours >= 0),
  is_overtime boolean not null default false,
  status public.time_entry_status not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, entry_number),
  check (clock_out_at is null or clock_out_at >= clock_in_at)
);

create table if not exists public.dispatch_assignments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  technician_id uuid not null references public.profiles (id) on delete restrict,
  assigned_by uuid references public.profiles (id) on delete set null,
  status public.dispatch_assignment_status not null default 'active',
  scheduled_start timestamptz not null,
  scheduled_end timestamptz,
  assigned_at timestamptz not null default now(),
  unassigned_at timestamptz,
  sort_order integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (scheduled_end is null or scheduled_end >= scheduled_start)
);

create table if not exists public.network_partners (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  linked_company_id uuid references public.companies (id) on delete set null,
  partner_company_name text not null,
  contact_name text not null default '',
  email text not null default '',
  phone text not null default '',
  trade_type text not null,
  service_area text not null default '',
  city text not null default '',
  state text not null default '',
  relationship_status public.relationship_status not null default 'pending',
  jobs_completed_together integer not null default 0 check (jobs_completed_together >= 0),
  revenue_generated_together numeric(12, 2) not null default 0
    check (revenue_generated_together >= 0),
  last_worked_date date,
  rating numeric(2, 1) not null default 0 check (rating >= 0 and rating <= 5),
  trust_score integer not null default 0 check (trust_score >= 0 and trust_score <= 100),
  license_number text,
  insured boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    trade_type in (
      'HVAC',
      'Plumbing',
      'Electrical',
      'Roofing',
      'General Contracting',
      'Landscaping',
      'Painting'
    )
  )
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists customers_company_id_idx on public.customers (company_id);
create index if not exists customers_company_id_status_idx
  on public.customers (company_id, status);

create index if not exists jobs_company_id_idx on public.jobs (company_id);
create index if not exists jobs_company_id_status_idx on public.jobs (company_id, status);
create index if not exists jobs_company_id_scheduled_at_idx
  on public.jobs (company_id, scheduled_at);
create index if not exists jobs_customer_id_idx on public.jobs (customer_id);
create index if not exists jobs_assigned_technician_id_idx
  on public.jobs (assigned_technician_id);

create index if not exists estimates_company_id_idx on public.estimates (company_id);
create index if not exists estimates_company_id_status_idx
  on public.estimates (company_id, status);
create index if not exists estimates_customer_id_idx on public.estimates (customer_id);

create index if not exists invoices_company_id_idx on public.invoices (company_id);
create index if not exists invoices_company_id_status_idx on public.invoices (company_id, status);
create index if not exists invoices_customer_id_idx on public.invoices (customer_id);
create index if not exists invoices_job_id_idx on public.invoices (job_id);

create index if not exists expenses_company_id_idx on public.expenses (company_id);
create index if not exists expenses_company_id_status_idx on public.expenses (company_id, status);
create index if not exists expenses_technician_id_idx on public.expenses (technician_id);
create index if not exists expenses_job_id_idx on public.expenses (job_id);

create index if not exists time_entries_company_id_idx on public.time_entries (company_id);
create index if not exists time_entries_company_id_status_idx
  on public.time_entries (company_id, status);
create index if not exists time_entries_technician_id_idx on public.time_entries (technician_id);
create index if not exists time_entries_job_id_idx on public.time_entries (job_id);

create index if not exists dispatch_assignments_company_id_idx
  on public.dispatch_assignments (company_id);
create index if not exists dispatch_assignments_company_id_status_idx
  on public.dispatch_assignments (company_id, status);
create index if not exists dispatch_assignments_job_id_idx
  on public.dispatch_assignments (job_id);
create index if not exists dispatch_assignments_technician_id_idx
  on public.dispatch_assignments (technician_id);

create unique index if not exists dispatch_assignments_one_active_per_job_idx
  on public.dispatch_assignments (job_id)
  where status = 'active';

create index if not exists network_partners_company_id_idx on public.network_partners (company_id);
create index if not exists network_partners_company_id_status_idx
  on public.network_partners (company_id, relationship_status);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

drop trigger if exists jobs_set_updated_at on public.jobs;
create trigger jobs_set_updated_at
before update on public.jobs
for each row execute function public.set_updated_at();

drop trigger if exists estimates_set_updated_at on public.estimates;
create trigger estimates_set_updated_at
before update on public.estimates
for each row execute function public.set_updated_at();

drop trigger if exists invoices_set_updated_at on public.invoices;
create trigger invoices_set_updated_at
before update on public.invoices
for each row execute function public.set_updated_at();

drop trigger if exists expenses_set_updated_at on public.expenses;
create trigger expenses_set_updated_at
before update on public.expenses
for each row execute function public.set_updated_at();

drop trigger if exists time_entries_set_updated_at on public.time_entries;
create trigger time_entries_set_updated_at
before update on public.time_entries
for each row execute function public.set_updated_at();

drop trigger if exists dispatch_assignments_set_updated_at on public.dispatch_assignments;
create trigger dispatch_assignments_set_updated_at
before update on public.dispatch_assignments
for each row execute function public.set_updated_at();

drop trigger if exists network_partners_set_updated_at on public.network_partners;
create trigger network_partners_set_updated_at
before update on public.network_partners
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: app tables (tenant isolation via company_memberships)
-- ---------------------------------------------------------------------------

alter table public.customers enable row level security;
alter table public.jobs enable row level security;
alter table public.estimates enable row level security;
alter table public.invoices enable row level security;
alter table public.expenses enable row level security;
alter table public.time_entries enable row level security;
alter table public.dispatch_assignments enable row level security;
alter table public.network_partners enable row level security;

drop policy if exists "company members can read customers" on public.customers;
create policy "company members can read customers"
on public.customers
for select
to authenticated
using (public.is_active_company_member(company_id));

drop policy if exists "company members can insert customers" on public.customers;
create policy "company members can insert customers"
on public.customers
for insert
to authenticated
with check (public.is_active_company_member(company_id));

drop policy if exists "company members can update customers" on public.customers;
create policy "company members can update customers"
on public.customers
for update
to authenticated
using (public.is_active_company_member(company_id))
with check (public.is_active_company_member(company_id));

drop policy if exists "company members can delete customers" on public.customers;
create policy "company members can delete customers"
on public.customers
for delete
to authenticated
using (public.is_active_company_member(company_id));

drop policy if exists "company members can read jobs" on public.jobs;
create policy "company members can read jobs"
on public.jobs
for select
to authenticated
using (public.is_active_company_member(company_id));

drop policy if exists "company members can insert jobs" on public.jobs;
create policy "company members can insert jobs"
on public.jobs
for insert
to authenticated
with check (public.is_active_company_member(company_id));

drop policy if exists "company members can update jobs" on public.jobs;
create policy "company members can update jobs"
on public.jobs
for update
to authenticated
using (public.is_active_company_member(company_id))
with check (public.is_active_company_member(company_id));

drop policy if exists "company members can delete jobs" on public.jobs;
create policy "company members can delete jobs"
on public.jobs
for delete
to authenticated
using (public.is_active_company_member(company_id));

drop policy if exists "company members can read estimates" on public.estimates;
create policy "company members can read estimates"
on public.estimates
for select
to authenticated
using (public.is_active_company_member(company_id));

drop policy if exists "company members can insert estimates" on public.estimates;
create policy "company members can insert estimates"
on public.estimates
for insert
to authenticated
with check (public.is_active_company_member(company_id));

drop policy if exists "company members can update estimates" on public.estimates;
create policy "company members can update estimates"
on public.estimates
for update
to authenticated
using (public.is_active_company_member(company_id))
with check (public.is_active_company_member(company_id));

drop policy if exists "company members can delete estimates" on public.estimates;
create policy "company members can delete estimates"
on public.estimates
for delete
to authenticated
using (public.is_active_company_member(company_id));

drop policy if exists "company members can read invoices" on public.invoices;
create policy "company members can read invoices"
on public.invoices
for select
to authenticated
using (public.is_active_company_member(company_id));

drop policy if exists "company members can insert invoices" on public.invoices;
create policy "company members can insert invoices"
on public.invoices
for insert
to authenticated
with check (public.is_active_company_member(company_id));

drop policy if exists "company members can update invoices" on public.invoices;
create policy "company members can update invoices"
on public.invoices
for update
to authenticated
using (public.is_active_company_member(company_id))
with check (public.is_active_company_member(company_id));

drop policy if exists "company members can delete invoices" on public.invoices;
create policy "company members can delete invoices"
on public.invoices
for delete
to authenticated
using (public.is_active_company_member(company_id));

drop policy if exists "company members can read expenses" on public.expenses;
create policy "company members can read expenses"
on public.expenses
for select
to authenticated
using (public.is_active_company_member(company_id));

drop policy if exists "company members can insert expenses" on public.expenses;
create policy "company members can insert expenses"
on public.expenses
for insert
to authenticated
with check (public.is_active_company_member(company_id));

drop policy if exists "company members can update expenses" on public.expenses;
create policy "company members can update expenses"
on public.expenses
for update
to authenticated
using (public.is_active_company_member(company_id))
with check (public.is_active_company_member(company_id));

drop policy if exists "company members can delete expenses" on public.expenses;
create policy "company members can delete expenses"
on public.expenses
for delete
to authenticated
using (public.is_active_company_member(company_id));

drop policy if exists "company members can read time entries" on public.time_entries;
create policy "company members can read time entries"
on public.time_entries
for select
to authenticated
using (public.is_active_company_member(company_id));

drop policy if exists "company members can insert time entries" on public.time_entries;
create policy "company members can insert time entries"
on public.time_entries
for insert
to authenticated
with check (public.is_active_company_member(company_id));

drop policy if exists "company members can update time entries" on public.time_entries;
create policy "company members can update time entries"
on public.time_entries
for update
to authenticated
using (public.is_active_company_member(company_id))
with check (public.is_active_company_member(company_id));

drop policy if exists "company members can delete time entries" on public.time_entries;
create policy "company members can delete time entries"
on public.time_entries
for delete
to authenticated
using (public.is_active_company_member(company_id));

drop policy if exists "company members can read dispatch assignments" on public.dispatch_assignments;
create policy "company members can read dispatch assignments"
on public.dispatch_assignments
for select
to authenticated
using (public.is_active_company_member(company_id));

drop policy if exists "company members can insert dispatch assignments" on public.dispatch_assignments;
create policy "company members can insert dispatch assignments"
on public.dispatch_assignments
for insert
to authenticated
with check (public.is_active_company_member(company_id));

drop policy if exists "company members can update dispatch assignments" on public.dispatch_assignments;
create policy "company members can update dispatch assignments"
on public.dispatch_assignments
for update
to authenticated
using (public.is_active_company_member(company_id))
with check (public.is_active_company_member(company_id));

drop policy if exists "company members can delete dispatch assignments" on public.dispatch_assignments;
create policy "company members can delete dispatch assignments"
on public.dispatch_assignments
for delete
to authenticated
using (public.is_active_company_member(company_id));

drop policy if exists "company members can read network partners" on public.network_partners;
create policy "company members can read network partners"
on public.network_partners
for select
to authenticated
using (public.is_active_company_member(company_id));

drop policy if exists "company members can insert network partners" on public.network_partners;
create policy "company members can insert network partners"
on public.network_partners
for insert
to authenticated
with check (public.is_active_company_member(company_id));

drop policy if exists "company members can update network partners" on public.network_partners;
create policy "company members can update network partners"
on public.network_partners
for update
to authenticated
using (public.is_active_company_member(company_id))
with check (public.is_active_company_member(company_id));

drop policy if exists "company members can delete network partners" on public.network_partners;
create policy "company members can delete network partners"
on public.network_partners
for delete
to authenticated
using (public.is_active_company_member(company_id));
