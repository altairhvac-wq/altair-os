-- Migration 218: a company's business numbers.
--
-- ============================ WHAT THIS IS ============================
-- One row per company holding the numbers the owner prices from: what they
-- charge for an hour, their service call fee, their parts markup, what the
-- shop costs each month, and the handful of inputs those come from (average
-- wage, payroll costs, billed and unbilled hours, how many technicians).
--
-- Until now the product had nowhere to keep any of these. A labor rate lived
-- in the owner's head and was typed onto every estimate; the service call fee
-- was a line they remembered to add; nothing knew what an hour cost. The
-- guided setup fills this row, Settings > Business numbers edits it, and the
-- estimate, price book, job profit and dashboard read from it. One home.
--
-- ============================ WHAT IS STORED ============================
-- Inputs and decisions, never results. "What an hour costs you", the
-- suggested rate and the break-even job count are worked out from this row
-- by the same code the public calculators use (shared/lib/business-numbers),
-- so the website and the product cannot give two answers and a stored result
-- can never go stale against its inputs.
--
-- Money is whole cents. Percentages are percent (25 means 25%).
--
-- ============================ WHO MAY DO WHAT ============================
-- This row holds wages, costs and margins. Only an owner or an admin may read
-- it; a technician, dispatcher or office member reads nothing. Nobody writes
-- it with their own session: the application writes through the service role
-- after it has checked the caller is an owner or admin of this company
-- (app/actions/business-numbers.ts), the same split every table since 179
-- uses.
--
-- Additive only. Applying this migration changes no existing row, and it can
-- be run twice.

create table if not exists public.company_business_numbers (
  company_id uuid not null references public.companies (id) on delete cascade,

  -- ---- what the company charges
  -- Billed labor, per hour.
  labor_rate_cents integer,
  -- Evenings, weekends and holidays: the labor rate is multiplied by this.
  after_hours_multiplier numeric(4, 2),
  -- The fee for coming out.
  service_call_fee_cents integer,
  -- True when the fee is taken off the bill if the customer goes ahead.
  service_call_credited boolean not null default false,
  -- Added on top of what a part cost. 50 means a $10 part sells for $15.
  parts_markup_percent numeric(6, 2),

  -- ---- what the work costs
  -- A technician's hourly wage, averaged across the crew.
  average_wage_cents integer,
  -- Payroll taxes, workers' comp and benefits, on top of the wage.
  payroll_burden_percent numeric(5, 2),
  -- Per technician, per week.
  billed_hours_per_week numeric(5, 1),
  unbilled_hours_per_week numeric(5, 1),
  -- Field technicians, the owner included when they run calls.
  technician_count integer,
  -- Rent, trucks, insurance, software, office: everything that is not a
  -- technician's pay or a job's parts.
  monthly_overhead_cents integer,
  -- The share of each billed dollar the owner means to keep.
  target_net_margin_percent numeric(5, 2),

  -- ---- the monthly target
  average_job_revenue_cents integer,
  -- The share of a job's price its own parts and labor use up.
  job_variable_cost_percent numeric(5, 2),

  -- ---- the guided setup
  -- Which steps are done or skipped: {"shop": "done", "rate": "skipped", ...}.
  setup_steps jsonb not null default '{}'::jsonb,
  setup_completed_at timestamptz,
  setup_dismissed_at timestamptz,

  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint company_business_numbers_pkey primary key (company_id),

  constraint company_business_numbers_labor_rate_range
    check (labor_rate_cents is null or labor_rate_cents between 0 and 10000000),
  constraint company_business_numbers_after_hours_range
    check (after_hours_multiplier is null or after_hours_multiplier between 1 and 5),
  constraint company_business_numbers_service_call_range
    check (service_call_fee_cents is null or service_call_fee_cents between 0 and 10000000),
  constraint company_business_numbers_markup_range
    check (parts_markup_percent is null or parts_markup_percent between 0 and 1000),
  constraint company_business_numbers_wage_range
    check (average_wage_cents is null or average_wage_cents between 0 and 10000000),
  constraint company_business_numbers_burden_range
    check (payroll_burden_percent is null or payroll_burden_percent between 0 and 200),
  constraint company_business_numbers_billed_hours_range
    check (billed_hours_per_week is null or billed_hours_per_week between 0 and 168),
  constraint company_business_numbers_unbilled_hours_range
    check (unbilled_hours_per_week is null or unbilled_hours_per_week between 0 and 168),
  constraint company_business_numbers_technician_count_range
    check (technician_count is null or technician_count between 1 and 10000),
  constraint company_business_numbers_overhead_range
    check (monthly_overhead_cents is null or monthly_overhead_cents between 0 and 2000000000),
  constraint company_business_numbers_margin_range
    check (target_net_margin_percent is null or (target_net_margin_percent >= 0 and target_net_margin_percent < 100)),
  constraint company_business_numbers_average_job_range
    check (average_job_revenue_cents is null or average_job_revenue_cents between 0 and 2000000000),
  constraint company_business_numbers_variable_cost_range
    check (job_variable_cost_percent is null or (job_variable_cost_percent >= 0 and job_variable_cost_percent < 100)),
  constraint company_business_numbers_setup_steps_object
    check (jsonb_typeof(setup_steps) = 'object')
);

comment on table public.company_business_numbers is
  'One row per company: the numbers the owner prices from. Owner/admin read; service-role write after an application check.';

drop trigger if exists company_business_numbers_set_updated_at on public.company_business_numbers;
create trigger company_business_numbers_set_updated_at
  before update on public.company_business_numbers
  for each row execute function public.set_updated_at();

alter table public.company_business_numbers enable row level security;

-- RLS narrows a privilege; it does not create one. Grant the read, then let
-- the policy below cut it down to owners and admins of the row's company.
-- Supabase grants ALL on a new public table to authenticated by default,
-- which includes TRUNCATE (and row level security does not stop a truncate).
-- So everything is taken away first, and only the read is given back. The
-- second revoke repeats part of the first on purpose: it is the line
-- scripts/verify-integration-migrations.mjs looks for on every tenant table.
revoke all on table public.company_business_numbers from public;
revoke all on table public.company_business_numbers from anon;
revoke all on table public.company_business_numbers from authenticated;
revoke insert, update, delete on table public.company_business_numbers from authenticated;
grant select on table public.company_business_numbers to authenticated;
grant all on table public.company_business_numbers to service_role;

drop policy if exists "owners and admins can view business numbers" on public.company_business_numbers;

create policy "owners and admins can view business numbers"
on public.company_business_numbers
for select
to authenticated
using (
  public.has_company_role(
    company_id,
    array['owner', 'admin']::public.company_role[]
  )
);
