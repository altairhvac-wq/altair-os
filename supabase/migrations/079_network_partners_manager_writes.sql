-- Align network partner writes with owner/admin app permissions and repair
-- invite-accepted partner links when the invite row exists without partner rows.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.is_visible_network_company(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.network_profiles np
    where np.company_id = target_company_id
      and np.is_visible = true
  );
$$;

revoke all on function public.is_visible_network_company(uuid) from public;
grant execute on function public.is_visible_network_company(uuid) to authenticated;

create or replace function public.ensure_network_invite_partner_links(
  p_invite public.network_invites,
  p_accepted_company_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source_company_name text;
  v_accepted_company_name text;
  v_source_trade text;
begin
  select c.name
  into v_source_company_name
  from public.companies c
  where c.id = p_invite.source_company_id;

  select c.name
  into v_accepted_company_name
  from public.companies c
  where c.id = p_accepted_company_id;

  select coalesce(np.trade_type, p_invite.trade_category)
  into v_source_trade
  from public.network_profiles np
  where np.company_id = p_invite.source_company_id;

  if v_source_trade is null then
    v_source_trade := 'General Contracting';
  end if;

  update public.network_partners
  set
    partner_company_name = coalesce(v_accepted_company_name, p_invite.invited_company_name),
    contact_name = p_invite.invited_contact_name,
    email = p_invite.invited_email,
    phone = p_invite.invited_phone,
    trade_type = p_invite.trade_category,
    relationship_status = 'active',
    updated_at = now()
  where company_id = p_invite.source_company_id
    and linked_company_id = p_accepted_company_id;

  if not found then
    insert into public.network_partners (
      company_id,
      linked_company_id,
      partner_company_name,
      contact_name,
      email,
      phone,
      trade_type,
      relationship_status
    )
    values (
      p_invite.source_company_id,
      p_accepted_company_id,
      coalesce(v_accepted_company_name, p_invite.invited_company_name),
      p_invite.invited_contact_name,
      p_invite.invited_email,
      p_invite.invited_phone,
      p_invite.trade_category,
      'active'
    );
  end if;

  update public.network_partners
  set
    partner_company_name = coalesce(v_source_company_name, 'Partner company'),
    trade_type = v_source_trade,
    relationship_status = 'active',
    updated_at = now()
  where company_id = p_accepted_company_id
    and linked_company_id = p_invite.source_company_id;

  if not found then
    insert into public.network_partners (
      company_id,
      linked_company_id,
      partner_company_name,
      contact_name,
      email,
      phone,
      trade_type,
      relationship_status
    )
    values (
      p_accepted_company_id,
      p_invite.source_company_id,
      coalesce(v_source_company_name, 'Partner company'),
      '',
      '',
      '',
      v_source_trade,
      'active'
    );
  end if;
end;
$$;

revoke all on function public.ensure_network_invite_partner_links(public.network_invites, uuid) from public;
grant execute on function public.ensure_network_invite_partner_links(public.network_invites, uuid) to authenticated;

create or replace function public.upsert_linked_network_partner(
  p_company_id uuid,
  p_linked_company_id uuid,
  p_partner_company_name text,
  p_trade_type text,
  p_service_area text default '',
  p_city text default '',
  p_state text default ''
)
returns public.network_partners
language plpgsql
security definer
set search_path = public
as $$
declare
  v_partner public.network_partners%rowtype;
begin
  if not public.has_company_role(
    p_company_id,
    array['owner', 'admin']::public.company_role[]
  ) then
    raise exception 'Not authorized to manage network partners for this company';
  end if;

  if p_linked_company_id is null or p_linked_company_id = p_company_id then
    raise exception 'Invalid network partner link';
  end if;

  select np.*
  into v_partner
  from public.network_partners np
  where np.company_id = p_company_id
    and np.linked_company_id = p_linked_company_id;

  if found then
    if v_partner.relationship_status = 'active' then
      return v_partner;
    end if;

    update public.network_partners
    set
      partner_company_name = p_partner_company_name,
      trade_type = p_trade_type,
      service_area = coalesce(p_service_area, ''),
      city = coalesce(p_city, ''),
      state = coalesce(p_state, ''),
      relationship_status = 'active',
      updated_at = now()
    where id = v_partner.id
    returning * into v_partner;

    return v_partner;
  end if;

  if not public.is_visible_network_company(p_linked_company_id) then
    raise exception 'Target company is not available in the network directory';
  end if;

  insert into public.network_partners (
    company_id,
    linked_company_id,
    partner_company_name,
    contact_name,
    email,
    phone,
    trade_type,
    service_area,
    city,
    state,
    relationship_status
  )
  values (
    p_company_id,
    p_linked_company_id,
    p_partner_company_name,
    '',
    '',
    '',
    p_trade_type,
    coalesce(p_service_area, ''),
    coalesce(p_city, ''),
    coalesce(p_state, ''),
    'active'
  )
  returning * into v_partner;

  return v_partner;
end;
$$;

revoke all on function public.upsert_linked_network_partner(uuid, uuid, text, text, text, text, text) from public;
grant execute on function public.upsert_linked_network_partner(uuid, uuid, text, text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS: use security-definer visibility helper (matches referral hardening)
-- ---------------------------------------------------------------------------

drop policy if exists "company admins can insert network partners" on public.network_partners;

create policy "company admins can insert network partners"
  on public.network_partners
  for insert
  to authenticated
  with check (
    public.can_send_network_referrals(company_id)
    and (
      linked_company_id is null
      or (
        linked_company_id <> company_id
        and public.is_visible_network_company(linked_company_id)
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Invite acceptance: repair partner links on idempotent re-accept
-- ---------------------------------------------------------------------------

create or replace function public.accept_network_invite(
  p_raw_token text,
  p_accepted_company_id uuid,
  p_accepted_user_id uuid,
  p_signup_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.network_invites%rowtype;
  v_source_company_name text;
  v_accepted_company_name text;
  v_source_trade text;
begin
  if p_accepted_user_id is distinct from auth.uid() then
    raise exception 'Not authorized to accept this invite';
  end if;

  if not public.has_company_role(
    p_accepted_company_id,
    array['owner', 'admin']::public.company_role[]
  ) then
    raise exception 'Not authorized to accept this invite for this company';
  end if;

  if coalesce(trim(p_raw_token), '') = '' then
    return jsonb_build_object('ok', false, 'error', 'invalid_token');
  end if;

  select ni.*
  into v_invite
  from public.network_invites ni
  where ni.invite_token_hash = public.hash_network_invite_token(p_raw_token)
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'invalid_token');
  end if;

  if v_invite.status = 'accepted'
    and v_invite.accepted_company_id = p_accepted_company_id then
    perform public.ensure_network_invite_partner_links(
      v_invite,
      p_accepted_company_id
    );

    select c.name
    into v_source_company_name
    from public.companies c
    where c.id = v_invite.source_company_id;

    return jsonb_build_object(
      'ok', true,
      'already_accepted', true,
      'source_company_name', coalesce(v_source_company_name, 'An Altair company')
    );
  end if;

  if v_invite.status <> 'pending' then
    return jsonb_build_object('ok', false, 'error', 'invite_not_pending');
  end if;

  if v_invite.expires_at <= now() then
    update public.network_invites
    set status = 'expired'
    where id = v_invite.id;
    return jsonb_build_object('ok', false, 'error', 'invite_expired');
  end if;

  if lower(trim(p_signup_email)) <> lower(trim(v_invite.invited_email)) then
    return jsonb_build_object('ok', false, 'error', 'email_mismatch');
  end if;

  if v_invite.source_company_id = p_accepted_company_id then
    return jsonb_build_object('ok', false, 'error', 'self_invite');
  end if;

  select c.name
  into v_source_company_name
  from public.companies c
  where c.id = v_invite.source_company_id;

  select c.name
  into v_accepted_company_name
  from public.companies c
  where c.id = p_accepted_company_id;

  select coalesce(np.trade_type, v_invite.trade_category)
  into v_source_trade
  from public.network_profiles np
  where np.company_id = v_invite.source_company_id;

  if v_source_trade is null then
    v_source_trade := 'General Contracting';
  end if;

  update public.network_invites
  set
    status = 'accepted',
    accepted_company_id = p_accepted_company_id,
    accepted_user_id = p_accepted_user_id,
    accepted_at = now()
  where id = v_invite.id;

  perform public.ensure_network_invite_partner_links(
    v_invite,
    p_accepted_company_id
  );

  return jsonb_build_object(
    'ok', true,
    'source_company_name', coalesce(v_source_company_name, 'An Altair company')
  );
end;
$$;

revoke all on function public.accept_network_invite(text, uuid, uuid, text) from public;
grant execute on function public.accept_network_invite(text, uuid, uuid, text) to authenticated;
