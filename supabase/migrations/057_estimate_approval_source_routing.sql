-- Estimate approval source routing: job activity types for dispatch / on-site audit.

alter type public.job_activity_type add value if not exists 'estimate_routed_to_dispatch';
alter type public.job_activity_type add value if not exists 'estimate_authorized_on_site';

-- Return routing context from public approval RPC (used by server post-processing).
create or replace function public.submit_public_estimate_approval(
  p_raw_token text,
  p_signer_name text,
  p_signature_data text,
  p_authorized boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_token public.estimate_approval_tokens%rowtype;
  v_estimate public.estimates%rowtype;
  v_job_status public.job_status;
  v_customer_name text;
  v_estimate_number text;
  v_normalized_name text;
  v_token_hash text;
  v_now timestamptz := now();
begin
  if coalesce(p_authorized, false) is distinct from true then
    raise exception 'Authorization is required to approve this estimate.';
  end if;

  v_normalized_name := trim(p_signer_name);

  if v_normalized_name = '' then
    raise exception 'Signer name is required.';
  end if;

  if coalesce(trim(p_signature_data), '') = '' then
    raise exception 'Signature is required.';
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
    'signed_at', v_now,
    'company_id', v_token.company_id,
    'customer_id', v_estimate.customer_id,
    'job_id', v_estimate.job_id
  );
end;
$$;
