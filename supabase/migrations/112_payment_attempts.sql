-- Phase 2B: durable Stripe payment attempts.
-- An invoice may have at most one ACTIVE payment attempt at a time, so repeated
-- "Pay Now" clicks reuse a single Stripe Checkout Session instead of creating a race
-- between two sessions that can both successfully charge the customer.

create table public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  status text not null default 'active',
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'usd',
  provider text not null default 'stripe',
  provider_account_id text,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  expires_at timestamptz not null,
  completed_at timestamptz,
  invalidated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_attempts_status_check
    check (status in ('active', 'completed', 'expired', 'invalidated', 'failed')),
  constraint payment_attempts_provider_check
    check (provider in ('stripe'))
);

-- Rule 1: at most one active payment attempt per invoice. Enforced at the database
-- level so concurrent "Pay Now" clicks cannot both claim an active attempt.
create unique index payment_attempts_one_active_per_invoice_uidx
  on public.payment_attempts (company_id, invoice_id)
  where status = 'active';

create unique index payment_attempts_checkout_session_uidx
  on public.payment_attempts (provider, stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create index payment_attempts_invoice_id_idx
  on public.payment_attempts (invoice_id, created_at desc);

create index payment_attempts_company_id_idx
  on public.payment_attempts (company_id);

drop trigger if exists payment_attempts_set_updated_at on public.payment_attempts;
create trigger payment_attempts_set_updated_at
before update on public.payment_attempts
for each row execute function public.set_updated_at();

alter table public.payment_attempts enable row level security;

create policy "billing managers can read payment attempts"
on public.payment_attempts
for select
to authenticated
using (
  public.is_active_company_member(company_id)
  and public.can_manage_billing(company_id)
);

revoke all on table public.payment_attempts from authenticated;
revoke all on table public.payment_attempts from anon;

grant select on table public.payment_attempts to authenticated;
grant all on table public.payment_attempts to service_role;

comment on table public.payment_attempts is
  'One row per Stripe Checkout attempt for an invoice. At most one active attempt per invoice (Rule 1). Rows are written by service_role only; callers must authorize before creating attempts. See lib/payments/payment-attempts-service.ts.';

comment on column public.payment_attempts.status is
  'Lifecycle: active -> completed | expired | invalidated | failed. Only one active row per invoice at a time.';

-- Rule 4: any invoice amount/balance/status change invalidates the active attempt so
-- the next payment click creates a fresh attempt against the current invoice state.
-- Implemented as a trigger (not app code) so it applies regardless of which code path
-- updates the invoice: manual payments, Stripe payments, voids, or edits.
create or replace function public.invalidate_payment_attempts_on_invoice_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if (
    old.status is distinct from new.status
    or old.balance_due is distinct from new.balance_due
    or old.amount_paid is distinct from new.amount_paid
    or old.total is distinct from new.total
  ) then
    update public.payment_attempts
    set status = 'invalidated',
        invalidated_at = now()
    where invoice_id = new.id
      and company_id = new.company_id
      and status = 'active';
  end if;

  return new;
end;
$$;

drop trigger if exists invoices_invalidate_payment_attempts on public.invoices;
create trigger invoices_invalidate_payment_attempts
after update on public.invoices
for each row execute function public.invalidate_payment_attempts_on_invoice_change();

comment on function public.invalidate_payment_attempts_on_invoice_change() is
  'Invalidates the active Stripe payment attempt whenever an invoice amount, balance, or status changes (edits, void, manual payments, Stripe payments). Guarantees Payment Attempt Rule 4 regardless of which code path updates the invoice.';
