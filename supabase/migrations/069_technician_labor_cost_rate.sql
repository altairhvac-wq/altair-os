-- Optional internal hourly labor cost for technician profitability reporting.

alter table public.company_memberships
  add column if not exists labor_cost_rate_cents integer;

alter table public.company_memberships
  drop constraint if exists company_memberships_labor_cost_rate_cents_nonneg;

alter table public.company_memberships
  add constraint company_memberships_labor_cost_rate_cents_nonneg
  check (labor_cost_rate_cents is null or labor_cost_rate_cents >= 0);

comment on column public.company_memberships.labor_cost_rate_cents is
  'Internal hourly labor cost to the company in cents. Used for profitability reporting. Owner/admin editable.';
