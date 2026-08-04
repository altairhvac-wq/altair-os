-- Persist Stripe card-decline telemetry on payment_attempts.
-- payment_intent.payment_failed updates these columns; status stays active while
-- Checkout can still succeed. See lib/payments/payment-intent-failure.ts for
-- attention / noise rules (Dashboard wiring is a later step).

alter table public.payment_attempts
  add column if not exists card_failure_count integer not null default 0
    check (card_failure_count >= 0),
  add column if not exists last_card_failure_at timestamptz,
  add column if not exists last_card_failure_code text,
  add column if not exists last_card_failure_message text;

create index if not exists payment_attempts_stripe_payment_intent_id_idx
  on public.payment_attempts (provider, stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

comment on column public.payment_attempts.card_failure_count is
  'Count of payment_intent.payment_failed events linked to this attempt. Does not flip status to failed while Checkout may still succeed.';

comment on column public.payment_attempts.last_card_failure_at is
  'Timestamp of the most recent linked Stripe card/payment failure for this attempt.';

comment on column public.payment_attempts.last_card_failure_code is
  'Stripe decline_code or last_payment_error.code from the most recent failure (safe operational code, not PAN data).';

comment on column public.payment_attempts.last_card_failure_message is
  'Sanitized Stripe last_payment_error.message from the most recent failure (truncated).';
