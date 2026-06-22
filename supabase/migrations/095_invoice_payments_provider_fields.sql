-- Phase 0.3: provider-ready metadata on invoice_payments (manual-only constraints for now).

alter table public.invoice_payments
  add column if not exists source text not null default 'manual';

alter table public.invoice_payments
  add column if not exists provider text;

alter table public.invoice_payments
  add column if not exists provider_payment_id text;

alter table public.invoice_payments
  add column if not exists provider_checkout_session_id text;

alter table public.invoice_payments
  add column if not exists idempotency_key text;

alter table public.invoice_payments
  add column if not exists status text not null default 'succeeded';

alter table public.invoice_payments
  add column if not exists fee_amount numeric(12, 2);

alter table public.invoice_payments
  add column if not exists net_amount numeric(12, 2);

alter table public.invoice_payments
  add column if not exists provider_metadata jsonb not null default '{}'::jsonb;

alter table public.invoice_payments
  drop constraint if exists invoice_payments_source_check;

alter table public.invoice_payments
  add constraint invoice_payments_source_check
  check (source in ('manual'));

alter table public.invoice_payments
  drop constraint if exists invoice_payments_status_check;

alter table public.invoice_payments
  add constraint invoice_payments_status_check
  check (status in ('succeeded'));

alter table public.invoice_payments
  drop constraint if exists invoice_payments_provider_check;

alter table public.invoice_payments
  add constraint invoice_payments_provider_check
  check (provider is null or provider in ('manual'));

alter table public.invoice_payments
  drop constraint if exists invoice_payments_fee_amount_check;

alter table public.invoice_payments
  add constraint invoice_payments_fee_amount_check
  check (fee_amount is null or fee_amount >= 0);

alter table public.invoice_payments
  drop constraint if exists invoice_payments_net_amount_check;

alter table public.invoice_payments
  add constraint invoice_payments_net_amount_check
  check (net_amount is null or net_amount >= 0);

create unique index if not exists invoice_payments_company_idempotency_key_uidx
  on public.invoice_payments (company_id, idempotency_key)
  where idempotency_key is not null;

create unique index if not exists invoice_payments_provider_payment_id_uidx
  on public.invoice_payments (company_id, provider, provider_payment_id)
  where provider_payment_id is not null;

create unique index if not exists invoice_payments_provider_checkout_session_id_uidx
  on public.invoice_payments (company_id, provider, provider_checkout_session_id)
  where provider_checkout_session_id is not null;
