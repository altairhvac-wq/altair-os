-- Public customer invoice payment links (V1 foundation — view-only until processor wired).

create table if not exists public.invoice_payment_tokens (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  token_hash text not null unique,
  customer_email text not null check (char_length(trim(customer_email)) between 3 and 320),
  expires_at timestamptz not null,
  revoked_at timestamptz null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists invoice_payment_tokens_invoice_id_idx
  on public.invoice_payment_tokens (invoice_id, created_at desc);

create index if not exists invoice_payment_tokens_company_invoice_idx
  on public.invoice_payment_tokens (company_id, invoice_id);

alter table public.invoice_payment_tokens enable row level security;

create policy "billing managers can read invoice payment tokens"
on public.invoice_payment_tokens
for select
to authenticated
using (
  public.is_active_company_member(company_id)
  and public.can_manage_billing(company_id)
);

create policy "billing managers can insert invoice payment tokens"
on public.invoice_payment_tokens
for insert
to authenticated
with check (
  public.is_active_company_member(company_id)
  and public.can_manage_billing(company_id)
);

create policy "billing managers can update invoice payment tokens"
on public.invoice_payment_tokens
for update
to authenticated
using (
  public.is_active_company_member(company_id)
  and public.can_manage_billing(company_id)
)
with check (
  public.is_active_company_member(company_id)
  and public.can_manage_billing(company_id)
);

grant select, insert, update on table public.invoice_payment_tokens to authenticated;
grant all on table public.invoice_payment_tokens to service_role;

create or replace function public.hash_invoice_payment_token(p_raw_token text)
returns text
language sql
immutable
set search_path = public, extensions
as $$
  select encode(digest(trim(p_raw_token), 'sha256'), 'hex');
$$;

create or replace function public.get_public_invoice_payment_view(p_raw_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token_hash text;
  v_token public.invoice_payment_tokens%rowtype;
  v_invoice public.invoices%rowtype;
  v_company public.companies%rowtype;
  v_line_items jsonb;
  v_state text;
begin
  if coalesce(trim(p_raw_token), '') = '' then
    return jsonb_build_object('state', 'invalid');
  end if;

  v_token_hash := public.hash_invoice_payment_token(p_raw_token);

  select *
  into v_token
  from public.invoice_payment_tokens t
  where t.token_hash = v_token_hash;

  if not found then
    return jsonb_build_object('state', 'invalid');
  end if;

  if v_token.revoked_at is not null then
    return jsonb_build_object('state', 'revoked');
  end if;

  if v_token.expires_at <= now() then
    return jsonb_build_object('state', 'expired');
  end if;

  v_state := 'valid';

  select *
  into v_invoice
  from public.invoices i
  where i.id = v_token.invoice_id
    and i.company_id = v_token.company_id;

  if not found then
    return jsonb_build_object('state', 'invalid');
  end if;

  if v_invoice.status in (
    'draft'::public.invoice_status,
    'void'::public.invoice_status,
    'cancelled'::public.invoice_status
  ) then
    return jsonb_build_object(
      'state',
      'unavailable',
      'message',
      'This invoice is no longer available for online payment.'
    );
  end if;

  select *
  into v_company
  from public.companies c
  where c.id = v_token.company_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', li.id,
        'name', li.name,
        'description',
        case
          when trim(coalesce(li.description, '')) <> ''
            and trim(li.description) <> trim(li.name)
            then li.description
          else null
        end,
        'quantity', li.quantity,
        'unit_price', li.unit_price,
        'taxable', li.taxable,
        'line_total', li.line_total
      )
      order by li.sort_order
    ),
    '[]'::jsonb
  )
  into v_line_items
  from public.invoice_line_items li
  where li.invoice_id = v_invoice.id
    and li.company_id = v_token.company_id;

  return jsonb_build_object(
    'state', v_state,
    'invoice_status', v_invoice.status,
    'company', jsonb_build_object(
      'name', v_company.name,
      'phone', v_company.phone,
      'email', v_company.email,
      'address_line1', v_company.address_line1,
      'address_line2', v_company.address_line2,
      'city', v_company.city,
      'state', v_company.state,
      'postal_code', v_company.postal_code
    ),
    'invoice', jsonb_build_object(
      'id', v_invoice.id,
      'invoice_number', v_invoice.invoice_number,
      'customer_name', (
        select c.name
        from public.customers c
        where c.id = v_invoice.customer_id
          and c.company_id = v_token.company_id
      ),
      'status', v_invoice.status,
      'subtotal', v_invoice.subtotal,
      'tax_rate', coalesce(v_invoice.tax_rate, 0),
      'tax_amount', coalesce(v_invoice.tax_amount, 0),
      'total', v_invoice.total,
      'amount_paid', coalesce(v_invoice.amount_paid, 0),
      'balance_due', coalesce(v_invoice.balance_due, 0),
      'issue_date', v_invoice.issue_date,
      'due_date', v_invoice.due_date,
      'notes', v_invoice.notes,
      'line_items', v_line_items
    )
  );
end;
$$;

revoke all on function public.hash_invoice_payment_token(text) from public;
grant execute on function public.get_public_invoice_payment_view(text) to anon, authenticated, service_role;
