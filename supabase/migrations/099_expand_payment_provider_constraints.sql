-- Phase 0.8: expand provider constraints to allow stripe (no runtime processing yet).
-- Source/status constraints unchanged until provider payment rows are inserted.

alter table public.invoice_payments
  drop constraint if exists invoice_payments_provider_check;

alter table public.invoice_payments
  add constraint invoice_payments_provider_check
  check (provider is null or provider in ('manual', 'stripe'));

alter table public.payment_provider_events
  drop constraint if exists payment_provider_events_provider_check;

alter table public.payment_provider_events
  add constraint payment_provider_events_provider_check
  check (provider in ('manual', 'stripe'));

comment on column public.payment_provider_events.provider is
  'Payment provider identifier. Phase 0.8: manual and stripe allowed; webhook ingestion not yet wired.';
