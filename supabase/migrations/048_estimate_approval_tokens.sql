-- Public customer estimate review/sign/approve links (V1).

create table if not exists public.estimate_approval_tokens (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  estimate_id uuid not null references public.estimates (id) on delete cascade,
  token_hash text not null unique,
  customer_email text not null check (char_length(trim(customer_email)) between 3 and 320),
  expires_at timestamptz not null,
  used_at timestamptz null,
  revoked_at timestamptz null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists estimate_approval_tokens_estimate_id_idx
  on public.estimate_approval_tokens (estimate_id, created_at desc);

create index if not exists estimate_approval_tokens_company_estimate_idx
  on public.estimate_approval_tokens (company_id, estimate_id);

alter table public.estimate_approval_tokens enable row level security;

create policy "billing managers can read estimate approval tokens"
on public.estimate_approval_tokens
for select
to authenticated
using (
  public.is_active_company_member(company_id)
  and public.can_manage_billing(company_id)
);

create policy "billing managers can insert estimate approval tokens"
on public.estimate_approval_tokens
for insert
to authenticated
with check (
  public.is_active_company_member(company_id)
  and public.can_manage_billing(company_id)
);

create policy "billing managers can update estimate approval tokens"
on public.estimate_approval_tokens
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

grant select, insert, update on table public.estimate_approval_tokens to authenticated;
grant all on table public.estimate_approval_tokens to service_role;

create or replace function public.hash_estimate_approval_token(p_raw_token text)
returns text
language sql
immutable
as $$
  select encode(digest(trim(p_raw_token), 'sha256'), 'hex');
$$;

create or replace function public.get_public_estimate_approval_view(p_raw_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token_hash text;
  v_token public.estimate_approval_tokens%rowtype;
  v_estimate public.estimates%rowtype;
  v_company public.companies%rowtype;
  v_job_status public.job_status;
  v_line_items jsonb;
  v_signature jsonb;
  v_state text;
begin
  if coalesce(trim(p_raw_token), '') = '' then
    return jsonb_build_object('state', 'invalid');
  end if;

  v_token_hash := public.hash_estimate_approval_token(p_raw_token);

  select *
  into v_token
  from public.estimate_approval_tokens t
  where t.token_hash = v_token_hash;

  if not found then
    return jsonb_build_object('state', 'invalid');
  end if;

  if v_token.revoked_at is not null then
    return jsonb_build_object('state', 'revoked');
  end if;

  if v_token.used_at is not null then
    v_state := 'used';
  elsif v_token.expires_at <= now() then
    v_state := 'expired';
  else
    v_state := 'valid';
  end if;

  select *
  into v_estimate
  from public.estimates e
  where e.id = v_token.estimate_id
    and e.company_id = v_token.company_id;

  if not found then
    return jsonb_build_object('state', 'invalid');
  end if;

  select *
  into v_company
  from public.companies c
  where c.id = v_token.company_id;

  if v_estimate.job_id is not null then
    select j.status
    into v_job_status
    from public.jobs j
    where j.id = v_estimate.job_id
      and j.company_id = v_token.company_id;

    if v_job_status = 'cancelled'::public.job_status then
      return jsonb_build_object(
        'state',
        'unavailable',
        'message',
        'This estimate is no longer available for approval.'
      );
    end if;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', li.id,
        'name', li.name,
        'description',
        case
          when trim(li.description) <> '' and trim(li.description) <> trim(li.name)
            then li.description
          else null
        end,
        'quantity', li.quantity,
        'unit_price', li.unit_price,
        'taxable', li.taxable
      )
      order by li.sort_order
    ),
    '[]'::jsonb
  )
  into v_line_items
  from public.estimate_line_items li
  where li.estimate_id = v_estimate.id
    and li.company_id = v_token.company_id;

  select jsonb_build_object(
    'signer_name', bs.signer_name,
    'signed_at', bs.signed_at
  )
  into v_signature
  from public.billing_signatures bs
  where bs.company_id = v_token.company_id
    and bs.entity_type = 'estimate'::public.billing_signature_entity_type
    and bs.entity_id = v_estimate.id;

  return jsonb_build_object(
    'state', v_state,
    'estimate_status', v_estimate.status,
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
    'estimate', jsonb_build_object(
      'id', v_estimate.id,
      'estimate_number', v_estimate.estimate_number,
      'customer_name', (
        select c.name
        from public.customers c
        where c.id = v_estimate.customer_id
          and c.company_id = v_token.company_id
      ),
      'status', v_estimate.status,
      'subtotal', v_estimate.subtotal,
      'tax_rate', coalesce(v_estimate.tax_rate, 0),
      'tax', coalesce(v_estimate.tax, 0),
      'total', v_estimate.total,
      'valid_until', v_estimate.valid_until,
      'notes', v_estimate.notes,
      'created_at', v_estimate.created_at,
      'line_items', v_line_items
    ),
    'signature', v_signature
  );
end;
$$;

create or replace function public.submit_public_estimate_approval(
  p_raw_token text,
  p_signer_name text,
  p_signature_data text,
  p_authorized boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token_hash text;
  v_token public.estimate_approval_tokens%rowtype;
  v_estimate public.estimates%rowtype;
  v_job_status public.job_status;
  v_normalized_name text;
  v_now timestamptz := now();
  v_customer_name text;
  v_estimate_number text;
begin
  if coalesce(p_authorized, false) is distinct from true then
    raise exception 'Authorization confirmation is required.';
  end if;

  v_normalized_name := trim(regexp_replace(coalesce(p_signer_name, ''), '\s+', ' ', 'g'));

  if char_length(v_normalized_name) < 1 or char_length(v_normalized_name) > 120 then
    raise exception 'Printed name is required.';
  end if;

  if coalesce(trim(p_signature_data), '') = ''
    or char_length(trim(p_signature_data)) < 32
    or char_length(trim(p_signature_data)) > 524288
    or trim(p_signature_data) !~ '^data:image/png;base64,[A-Za-z0-9+/]+={0,2}$'
  then
    raise exception 'Signature image is invalid or too large.';
  end if;

  if coalesce(trim(p_raw_token), '') = '' then
    raise exception 'This approval link is invalid.';
  end if;

  v_token_hash := public.hash_estimate_approval_token(p_raw_token);

  select *
  into v_token
  from public.estimate_approval_tokens t
  where t.token_hash = v_token_hash
  for update;

  if not found then
    raise exception 'This approval link is invalid.';
  end if;

  if v_token.revoked_at is not null then
    raise exception 'This approval link is no longer valid.';
  end if;

  if v_token.used_at is not null then
    raise exception 'This estimate has already been approved.';
  end if;

  if v_token.expires_at <= v_now then
    raise exception 'This approval link has expired.';
  end if;

  select *
  into v_estimate
  from public.estimates e
  where e.id = v_token.estimate_id
    and e.company_id = v_token.company_id
  for update;

  if not found then
    raise exception 'Estimate not found.';
  end if;

  if v_estimate.status <> 'sent'::public.estimate_status then
    if v_estimate.status = 'approved'::public.estimate_status then
      raise exception 'This estimate has already been approved.';
    end if;

    raise exception 'This estimate is not available for approval.';
  end if;

  if v_estimate.job_id is not null then
    select j.status
    into v_job_status
    from public.jobs j
    where j.id = v_estimate.job_id
      and j.company_id = v_token.company_id;

    if v_job_status = 'cancelled'::public.job_status then
      raise exception 'This estimate is no longer available for approval.';
    end if;
  end if;

  select c.name
  into v_customer_name
  from public.customers c
  where c.id = v_estimate.customer_id
    and c.company_id = v_token.company_id;

  v_estimate_number := v_estimate.estimate_number;

  insert into public.billing_signatures (
    company_id,
    entity_type,
    entity_id,
    signer_name,
    signer_role,
    signature_data,
    signed_at,
    created_by
  )
  values (
    v_token.company_id,
    'estimate'::public.billing_signature_entity_type,
    v_estimate.id,
    v_normalized_name,
    'customer',
    trim(p_signature_data),
    v_now,
    null
  )
  on conflict (company_id, entity_type, entity_id)
  do update set
    signer_name = excluded.signer_name,
    signer_role = excluded.signer_role,
    signature_data = excluded.signature_data,
    signed_at = excluded.signed_at,
    created_by = excluded.created_by,
    updated_at = v_now;

  update public.estimates e
  set status = 'approved'::public.estimate_status,
      updated_at = v_now
  where e.id = v_estimate.id
    and e.company_id = v_token.company_id
    and e.status = 'sent'::public.estimate_status;

  if not found then
    raise exception 'This estimate is not available for approval.';
  end if;

  insert into public.estimate_activities (
    company_id,
    estimate_id,
    actor_id,
    event_type,
    metadata
  )
  values (
    v_token.company_id,
    v_estimate.id,
    null,
    'estimate_approved'::public.estimate_activity_type,
    jsonb_build_object(
      'from_status', 'sent',
      'to_status', 'approved',
      'estimate_number', v_estimate_number,
      'customer_id', v_estimate.customer_id,
      'job_id', v_estimate.job_id,
      'approval_source', 'public_link',
      'signer_name', v_normalized_name
    )
  );

  update public.estimate_approval_tokens t
  set used_at = v_now
  where t.id = v_token.id;

  return jsonb_build_object(
    'ok', true,
    'estimate_id', v_estimate.id,
    'estimate_number', v_estimate_number,
    'customer_name', v_customer_name,
    'signed_at', v_now
  );
end;
$$;

revoke all on function public.hash_estimate_approval_token(text) from public;
grant execute on function public.get_public_estimate_approval_view(text) to anon, authenticated, service_role;
grant execute on function public.submit_public_estimate_approval(text, text, text, boolean) to anon, authenticated, service_role;
