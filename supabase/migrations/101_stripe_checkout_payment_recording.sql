-- Phase 1.5: Stripe checkout payment recording via record_invoice_payment_atomic (service_role path).

alter table public.invoice_payments
  drop constraint if exists invoice_payments_source_check;

alter table public.invoice_payments
  add constraint invoice_payments_source_check
  check (source in ('manual', 'stripe'));

drop function if exists public.record_invoice_payment_atomic(
  uuid,
  uuid,
  numeric,
  text,
  date,
  text,
  text,
  timestamptz,
  text
);

create or replace function public.record_invoice_payment_atomic(
  p_company_id uuid,
  p_invoice_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_payment_date date,
  p_reference text default null,
  p_notes text default null,
  p_expected_updated_at timestamptz default null,
  p_idempotency_key text default null,
  p_source text default 'manual',
  p_provider text default null,
  p_provider_checkout_session_id text default null,
  p_provider_payment_id text default null,
  p_provider_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_invoice public.invoices%rowtype;
  v_previous_status public.invoice_status;
  v_payment_method public.invoice_payment_method;
  v_source text;
  v_provider text;
  v_amount numeric(12, 2);
  v_new_amount_paid numeric(12, 2);
  v_new_balance_due numeric(12, 2);
  v_new_status public.invoice_status;
  v_new_paid_at timestamptz;
  v_payment_id uuid;
  v_now timestamptz := now();
begin
  v_source := coalesce(nullif(trim(p_source), ''), 'manual');

  if v_source not in ('manual', 'stripe') then
    raise exception 'payment_amount_invalid';
  end if;

  if v_source = 'stripe' then
    if auth.role() is distinct from 'service_role' then
      raise exception 'insufficient_permission';
    end if;

    v_provider := coalesce(nullif(trim(p_provider), ''), 'stripe');

    if v_provider <> 'stripe' then
      raise exception 'payment_amount_invalid';
    end if;

    if p_provider_checkout_session_id is null
      or nullif(trim(p_provider_checkout_session_id), '') is null then
      raise exception 'payment_amount_invalid';
    end if;

    if p_idempotency_key is null or nullif(trim(p_idempotency_key), '') is null then
      raise exception 'payment_amount_invalid';
    end if;
  else
    if v_user_id is null then
      raise exception 'insufficient_permission';
    end if;

    if not public.can_manage_billing(p_company_id) then
      raise exception 'insufficient_permission';
    end if;

    v_provider := nullif(trim(coalesce(p_provider, '')), '');
  end if;

  v_amount := round(p_amount, 2);

  if v_amount is null or v_amount <= 0 then
    raise exception 'payment_amount_invalid';
  end if;

  if p_payment_date is null then
    raise exception 'payment_amount_invalid';
  end if;

  begin
    v_payment_method := p_payment_method::public.invoice_payment_method;
  exception
    when invalid_text_representation then
      raise exception 'payment_amount_invalid';
  end;

  if p_idempotency_key is not null then
    select ip.id
    into v_payment_id
    from public.invoice_payments ip
    where ip.company_id = p_company_id
      and ip.idempotency_key = p_idempotency_key;

    if found then
      raise exception 'duplicate_payment_idempotency_key';
    end if;
  end if;

  if v_source = 'stripe' then
    select ip.id
    into v_payment_id
    from public.invoice_payments ip
    where ip.company_id = p_company_id
      and ip.provider = 'stripe'
      and ip.provider_checkout_session_id = nullif(trim(p_provider_checkout_session_id), '');

    if found then
      raise exception 'duplicate_payment_idempotency_key';
    end if;

    if p_provider_payment_id is not null
      and nullif(trim(p_provider_payment_id), '') is not null then
      select ip.id
      into v_payment_id
      from public.invoice_payments ip
      where ip.company_id = p_company_id
        and ip.provider = 'stripe'
        and ip.provider_payment_id = nullif(trim(p_provider_payment_id), '');

      if found then
        raise exception 'duplicate_payment_idempotency_key';
      end if;
    end if;
  end if;

  select *
  into v_invoice
  from public.invoices i
  where i.company_id = p_company_id
    and i.id = p_invoice_id
  for update;

  if not found then
    raise exception 'invoice_not_found';
  end if;

  v_previous_status := v_invoice.status;

  if v_invoice.status not in (
    'sent'::public.invoice_status,
    'partially_paid'::public.invoice_status,
    'overdue'::public.invoice_status
  ) then
    raise exception 'invoice_not_payable';
  end if;

  if round(v_invoice.amount_paid + v_invoice.balance_due, 2)
    <> round(v_invoice.total, 2) then
    raise exception 'invoice_not_payable';
  end if;

  if p_expected_updated_at is not null
    and v_invoice.updated_at is distinct from p_expected_updated_at then
    raise exception 'invoice_concurrency_conflict';
  end if;

  if v_amount > v_invoice.balance_due then
    raise exception 'payment_exceeds_balance';
  end if;

  v_new_amount_paid := round(v_invoice.amount_paid + v_amount, 2);
  v_new_balance_due := round(greatest(v_invoice.total - v_new_amount_paid, 0), 2);

  if v_new_balance_due <= 0 then
    v_new_status := 'paid'::public.invoice_status;
    v_new_paid_at := p_payment_date::timestamptz;
  else
    v_new_status := 'partially_paid'::public.invoice_status;
    v_new_paid_at := v_invoice.paid_at;
  end if;

  if v_source = 'stripe' then
    insert into public.invoice_payments (
      company_id,
      invoice_id,
      amount,
      payment_method,
      payment_date,
      reference,
      notes,
      recorded_by,
      source,
      provider,
      provider_checkout_session_id,
      provider_payment_id,
      idempotency_key,
      status,
      provider_metadata
    )
    values (
      p_company_id,
      p_invoice_id,
      v_amount,
      v_payment_method,
      p_payment_date,
      nullif(trim(p_reference), ''),
      nullif(trim(p_notes), ''),
      null,
      'stripe',
      'stripe',
      nullif(trim(p_provider_checkout_session_id), ''),
      nullif(trim(p_provider_payment_id), ''),
      p_idempotency_key,
      'succeeded',
      coalesce(p_provider_metadata, '{}'::jsonb)
    )
    returning id into v_payment_id;
  else
    insert into public.invoice_payments (
      company_id,
      invoice_id,
      amount,
      payment_method,
      payment_date,
      reference,
      notes,
      recorded_by,
      idempotency_key
    )
    values (
      p_company_id,
      p_invoice_id,
      v_amount,
      v_payment_method,
      p_payment_date,
      nullif(trim(p_reference), ''),
      nullif(trim(p_notes), ''),
      v_user_id,
      p_idempotency_key
    )
    returning id into v_payment_id;
  end if;

  update public.invoices
  set
    amount_paid = v_new_amount_paid,
    balance_due = v_new_balance_due,
    status = v_new_status,
    paid_at = v_new_paid_at,
    updated_at = v_now
  where company_id = p_company_id
    and id = p_invoice_id;

  return jsonb_build_object(
    'payment_id', v_payment_id,
    'invoice_id', p_invoice_id,
    'previous_status', v_previous_status,
    'new_status', v_new_status,
    'amount_paid', v_new_amount_paid,
    'balance_due', v_new_balance_due,
    'paid_at', v_new_paid_at
  );
exception
  when unique_violation then
    if p_idempotency_key is not null
      or p_provider_checkout_session_id is not null
      or p_provider_payment_id is not null then
      raise exception 'duplicate_payment_idempotency_key';
    end if;
    raise;
end;
$$;

revoke all on function public.record_invoice_payment_atomic(
  uuid,
  uuid,
  numeric,
  text,
  date,
  text,
  text,
  timestamptz,
  text,
  text,
  text,
  text,
  text,
  jsonb
) from public;

grant execute on function public.record_invoice_payment_atomic(
  uuid,
  uuid,
  numeric,
  text,
  date,
  text,
  text,
  timestamptz,
  text,
  text,
  text,
  text,
  text,
  jsonb
) to authenticated, service_role;

comment on function public.record_invoice_payment_atomic(
  uuid,
  uuid,
  numeric,
  text,
  date,
  text,
  text,
  timestamptz,
  text,
  text,
  text,
  text,
  text,
  jsonb
) is
  'Atomic invoice payment recording. Manual path requires authenticated billing permission; Stripe checkout path requires service_role and provider metadata.';
