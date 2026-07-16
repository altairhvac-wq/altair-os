-- CRITICAL #3 (part 2): durable disposition for stale-but-captured Stripe checkouts.
--
-- Migration 112 gave every invoice at most one active Payment Attempt and invalidated
-- attempts when the underlying invoice changed, but invalidating a Postgres row does not
-- expire the corresponding Stripe Checkout Session. A customer can still complete a
-- session Stripe considers open after Altair has invalidated its local attempt (manual
-- payment recorded, invoice edited, invoice voided). Before this migration the webhook
-- responded to that race by marking the provider event "ignored" — Stripe kept the
-- captured money, Altair kept no durable record of it.
--
-- This migration adds a narrowly scoped `payment_reconciliations` table plus an atomic
-- RPC so a conclusively paid-but-stale Checkout Session always produces a durable
-- "requires_review" record instead of a silently ignored provider event.

create table public.payment_reconciliations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  invoice_id uuid not null references public.invoices (id) on delete restrict,
  payment_attempt_id uuid not null references public.payment_attempts (id) on delete restrict,
  provider_event_id uuid not null references public.payment_provider_events (id) on delete restrict,
  provider text not null default 'stripe',
  provider_checkout_session_id text not null,
  provider_payment_id text,
  captured_amount numeric(12, 2) not null check (captured_amount > 0),
  currency text not null default 'usd',
  reason_code text not null,
  status text not null default 'requires_review',
  created_at timestamptz not null default now(),
  constraint payment_reconciliations_provider_check
    check (provider in ('stripe')),
  constraint payment_reconciliations_reason_code_check
    check (
      reason_code in (
        'attempt_invalidated',
        'invoice_not_payable',
        'amount_mismatch',
        'balance_conflict'
      )
    ),
  constraint payment_reconciliations_status_check
    check (status in ('requires_review')),
  constraint payment_reconciliations_provider_event_id_unique
    unique (provider_event_id)
);

-- Idempotency: a given Stripe Checkout Session can only ever produce one durable
-- reconciliation record, even under concurrent/duplicate webhook delivery.
create unique index payment_reconciliations_provider_session_uidx
  on public.payment_reconciliations (provider, provider_checkout_session_id);

create index payment_reconciliations_company_id_idx
  on public.payment_reconciliations (company_id);

create index payment_reconciliations_invoice_id_idx
  on public.payment_reconciliations (invoice_id, created_at desc);

create index payment_reconciliations_status_idx
  on public.payment_reconciliations (status);

alter table public.payment_reconciliations enable row level security;

-- Read-only for billing managers, scoped to their own company. No insert/update/delete
-- policy exists for authenticated/anon, and grants below only ever expose SELECT to
-- authenticated — the atomic RPC (service_role only) is the sole write path.
create policy "billing managers can read payment reconciliations"
on public.payment_reconciliations
for select
to authenticated
using (
  public.is_active_company_member(company_id)
  and public.can_manage_billing(company_id)
);

revoke all on table public.payment_reconciliations from authenticated;
revoke all on table public.payment_reconciliations from anon;

grant select on table public.payment_reconciliations to authenticated;
grant all on table public.payment_reconciliations to service_role;

comment on table public.payment_reconciliations is
  'Durable "requires review" record for Stripe Checkout Sessions that conclusively captured funds but could no longer be safely applied as a normal invoice payment (stale/invalidated Payment Attempt, voided or non-payable invoice, or an amount/balance conflict). Written only by record_payment_reconciliation_atomic via service_role. This is a manual-review audit record, not a refund, credit, or automated resolution workflow.';

comment on column public.payment_reconciliations.reason_code is
  'Why the captured payment could not be recorded normally: attempt_invalidated (Payment Attempt was invalidated/expired/failed by the time Stripe reported payment), invoice_not_payable (invoice was void/paid/cancelled), amount_mismatch (captured amount no longer matches the invoice balance due), balance_conflict (the atomic invoice payment RPC rejected the payment due to a recognized stale-state conflict).';

comment on column public.payment_reconciliations.status is
  'Fixed at requires_review for this beta-sized implementation. No automated resolution workflow exists; a human must review and resolve out of band.';

-- New terminal provider-event disposition: a captured-but-stale checkout resolves to a
-- durable reconciliation record instead of being marked "ignored".
alter table public.payment_provider_events
  drop constraint if exists payment_provider_events_processing_status_check;

alter table public.payment_provider_events
  add constraint payment_provider_events_processing_status_check
  check (
    processing_status in (
      'received',
      'processing',
      'processed',
      'failed',
      'ignored',
      'reconciliation_required'
    )
  );

comment on column public.payment_provider_events.processing_status is
  'Webhook processing lifecycle: received -> processing -> processed | failed | ignored | reconciliation_required. reconciliation_required means Stripe captured funds that could not be safely applied as a normal invoice payment; see payment_reconciliations.';

-- Atomically records a stale-capture reconciliation and flips the owning provider event
-- to reconciliation_required in the same transaction. Never commits one without the
-- other, and is idempotent per Checkout Session and per provider-event row.
create or replace function public.record_payment_reconciliation_atomic(
  p_company_id uuid,
  p_invoice_id uuid,
  p_payment_attempt_id uuid,
  p_provider_event_id uuid,
  p_provider_checkout_session_id text,
  p_captured_amount numeric,
  p_reason_code text,
  p_provider text default 'stripe',
  p_provider_payment_id text default null,
  p_currency text default 'usd'
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_provider text;
  v_session_id text;
  v_amount numeric(12, 2);
  v_currency text;
  v_existing_id uuid;
  v_existing_invoice_id uuid;
  v_existing_attempt_id uuid;
  v_existing_company_id uuid;
  v_invoice_ok boolean;
  v_attempt_ok boolean;
  v_event_ok boolean;
  v_reconciliation_id uuid;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'insufficient_permission';
  end if;

  v_provider := coalesce(nullif(trim(p_provider), ''), 'stripe');

  if v_provider <> 'stripe' then
    raise exception 'reconciliation_invalid_provider';
  end if;

  v_session_id := nullif(trim(p_provider_checkout_session_id), '');

  if v_session_id is null then
    raise exception 'reconciliation_invalid_session';
  end if;

  v_amount := round(p_captured_amount, 2);

  if v_amount is null or v_amount <= 0 then
    raise exception 'reconciliation_invalid_amount';
  end if;

  if p_reason_code is null or p_reason_code not in (
    'attempt_invalidated', 'invoice_not_payable', 'amount_mismatch', 'balance_conflict'
  ) then
    raise exception 'reconciliation_invalid_reason';
  end if;

  v_currency := coalesce(lower(nullif(trim(p_currency), '')), 'usd');

  -- Idempotency fast path: same Checkout Session already reconciled (duplicate/retried
  -- webhook delivery). Return the existing row's true identity rather than echoing input.
  select id, invoice_id, payment_attempt_id, company_id
  into v_existing_id, v_existing_invoice_id, v_existing_attempt_id, v_existing_company_id
  from public.payment_reconciliations
  where provider = v_provider
    and provider_checkout_session_id = v_session_id;

  if v_existing_id is not null then
    if v_existing_company_id <> p_company_id then
      raise exception 'reconciliation_company_mismatch';
    end if;

    update public.payment_provider_events
    set processing_status = 'reconciliation_required',
        company_id = p_company_id
    where id = p_provider_event_id
      and processing_status is distinct from 'reconciliation_required';

    return jsonb_build_object(
      'reconciliation_id', v_existing_id,
      'invoice_id', v_existing_invoice_id,
      'payment_attempt_id', v_existing_attempt_id,
      'status', 'requires_review',
      'created', false
    );
  end if;

  -- Defense in depth: the webhook is server-side and already resolved these
  -- relationships, but the database must still verify financial ownership rather than
  -- trust the caller's company/invoice/attempt pairing blindly.
  select exists(
    select 1 from public.invoices i
    where i.id = p_invoice_id and i.company_id = p_company_id
  ) into v_invoice_ok;

  if not v_invoice_ok then
    raise exception 'reconciliation_invoice_mismatch';
  end if;

  select exists(
    select 1 from public.payment_attempts pa
    where pa.id = p_payment_attempt_id
      and pa.company_id = p_company_id
      and pa.invoice_id = p_invoice_id
  ) into v_attempt_ok;

  if not v_attempt_ok then
    raise exception 'reconciliation_attempt_mismatch';
  end if;

  select exists(
    select 1 from public.payment_provider_events pe
    where pe.id = p_provider_event_id
  ) into v_event_ok;

  if not v_event_ok then
    raise exception 'reconciliation_event_not_found';
  end if;

  insert into public.payment_reconciliations (
    company_id,
    invoice_id,
    payment_attempt_id,
    provider_event_id,
    provider,
    provider_checkout_session_id,
    provider_payment_id,
    captured_amount,
    currency,
    reason_code,
    status
  )
  values (
    p_company_id,
    p_invoice_id,
    p_payment_attempt_id,
    p_provider_event_id,
    v_provider,
    v_session_id,
    nullif(trim(p_provider_payment_id), ''),
    v_amount,
    v_currency,
    p_reason_code,
    'requires_review'
  )
  returning id into v_reconciliation_id;

  update public.payment_provider_events
  set processing_status = 'reconciliation_required',
      company_id = p_company_id
  where id = p_provider_event_id;

  return jsonb_build_object(
    'reconciliation_id', v_reconciliation_id,
    'invoice_id', p_invoice_id,
    'payment_attempt_id', p_payment_attempt_id,
    'status', 'requires_review',
    'created', true
  );
exception
  when unique_violation then
    select id, invoice_id, payment_attempt_id, company_id
    into v_existing_id, v_existing_invoice_id, v_existing_attempt_id, v_existing_company_id
    from public.payment_reconciliations
    where provider = v_provider
      and provider_checkout_session_id = v_session_id;

    if v_existing_id is not null and v_existing_company_id = p_company_id then
      update public.payment_provider_events
      set processing_status = 'reconciliation_required',
          company_id = p_company_id
      where id = p_provider_event_id
        and processing_status is distinct from 'reconciliation_required';

      return jsonb_build_object(
        'reconciliation_id', v_existing_id,
        'invoice_id', v_existing_invoice_id,
        'payment_attempt_id', v_existing_attempt_id,
        'status', 'requires_review',
        'created', false
      );
    end if;

    raise;
end;
$$;

revoke all on function public.record_payment_reconciliation_atomic(
  uuid, uuid, uuid, uuid, text, numeric, text, text, text, text
) from public;

grant execute on function public.record_payment_reconciliation_atomic(
  uuid, uuid, uuid, uuid, text, numeric, text, text, text, text
) to service_role;

comment on function public.record_payment_reconciliation_atomic(
  uuid, uuid, uuid, uuid, text, numeric, text, text, text, text
) is
  'Atomically records a durable requires_review reconciliation for a captured-but-stale Stripe Checkout Session and flips the owning payment_provider_events row to reconciliation_required. service_role only; called from the Stripe webhook handler after it has classified a paid session as a recognized business-state conflict. Idempotent per (provider, provider_checkout_session_id).';
