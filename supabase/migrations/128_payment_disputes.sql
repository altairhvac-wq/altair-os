-- Durable Stripe dispute / inquiry records for Connect direct charges.
-- invoice_payments remains a success-only ledger; disputes live here and link
-- back by PaymentIntent id (and optional invoice_payment / payment_attempt FKs).
-- Written only by the Stripe webhook via service_role. Dashboard attention
-- wiring is a later step.

create table public.payment_disputes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  invoice_id uuid references public.invoices (id) on delete set null,
  invoice_payment_id uuid references public.invoice_payments (id) on delete set null,
  payment_attempt_id uuid references public.payment_attempts (id) on delete set null,
  provider text not null default 'stripe',
  provider_dispute_id text not null,
  provider_charge_id text,
  provider_payment_intent_id text,
  connected_account_id text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null default 'usd',
  reason text,
  status text not null,
  evidence_due_by timestamptz,
  provider_created_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_disputes_provider_check
    check (provider in ('stripe')),
  constraint payment_disputes_status_check
    check (
      status in (
        'warning_needs_response',
        'warning_under_review',
        'warning_closed',
        'needs_response',
        'under_review',
        'won',
        'lost',
        'prevented'
      )
    ),
  constraint payment_disputes_provider_dispute_id_unique
    unique (provider, provider_dispute_id)
);

create index payment_disputes_company_id_idx
  on public.payment_disputes (company_id, created_at desc);

create index payment_disputes_status_idx
  on public.payment_disputes (company_id, status);

create index payment_disputes_invoice_id_idx
  on public.payment_disputes (invoice_id)
  where invoice_id is not null;

create index payment_disputes_payment_intent_id_idx
  on public.payment_disputes (provider, provider_payment_intent_id)
  where provider_payment_intent_id is not null;

drop trigger if exists payment_disputes_set_updated_at
  on public.payment_disputes;
create trigger payment_disputes_set_updated_at
before update on public.payment_disputes
for each row execute function public.set_updated_at();

alter table public.payment_disputes enable row level security;

-- Read-only for billing managers, scoped to their company. Writes are
-- service_role-only from the Stripe webhook upsert path.
create policy "billing managers can read payment disputes"
on public.payment_disputes
for select
to authenticated
using (
  public.is_active_company_member(company_id)
  and public.can_manage_billing(company_id)
);

revoke all on table public.payment_disputes from authenticated;
revoke all on table public.payment_disputes from anon;

grant select on table public.payment_disputes to authenticated;
grant all on table public.payment_disputes to service_role;

comment on table public.payment_disputes is
  'Stripe Connect dispute / inquiry records for Altair invoice payments. Success ledger stays in invoice_payments; this table tracks chargebacks and early-fraud warnings over the dispute lifecycle. Written only by processStripeWebhookEvent via service_role.';

comment on column public.payment_disputes.provider_dispute_id is
  'Stripe Dispute id (du_…). Unique per provider for webhook upsert idempotency.';

comment on column public.payment_disputes.provider_payment_intent_id is
  'Stripe PaymentIntent id (pi_…) linked from the dispute (or via the disputed charge). Matches invoice_payments.provider_payment_id / payment_attempts.stripe_payment_intent_id when resolvable.';

comment on column public.payment_disputes.connected_account_id is
  'Stripe Connect account id from event.account. Required for Express direct-charge disputes.';

comment on column public.payment_disputes.status is
  'Stripe Dispute.status: warning_needs_response, warning_under_review, warning_closed, needs_response, under_review, won, lost, prevented.';

comment on column public.payment_disputes.evidence_due_by is
  'Stripe evidence_details.due_by when present and non-zero; null when Stripe reports no deadline.';
