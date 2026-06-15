-- Repair missing bidirectional network_partners rows for accepted network invites.
-- Ensures both source -> accepted and accepted -> source links exist idempotently.

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
  if p_accepted_company_id is null
    or p_invite.source_company_id is null
    or p_invite.source_company_id = p_accepted_company_id
  then
    return;
  end if;

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
  )
  on conflict (company_id, linked_company_id)
  where linked_company_id is not null
  do update
  set
    partner_company_name = excluded.partner_company_name,
    contact_name = excluded.contact_name,
    email = excluded.email,
    phone = excluded.phone,
    trade_type = excluded.trade_type,
    relationship_status = 'active',
    updated_at = now();

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
  )
  on conflict (company_id, linked_company_id)
  where linked_company_id is not null
  do update
  set
    partner_company_name = excluded.partner_company_name,
    trade_type = excluded.trade_type,
    relationship_status = 'active',
    updated_at = now();
end;
$$;

create or replace function public.repair_accepted_invite_partner_links_for_company(
  p_company_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.network_invites%rowtype;
  v_repaired integer := 0;
begin
  if not public.has_company_role(
    p_company_id,
    array['owner', 'admin']::public.company_role[]
  ) then
    raise exception 'Not authorized to repair network invite partner links';
  end if;

  for v_invite in
    select ni.*
    from public.network_invites ni
    where ni.status = 'accepted'
      and ni.accepted_company_id is not null
      and ni.source_company_id is not null
      and ni.source_company_id <> ni.accepted_company_id
      and (
        ni.source_company_id = p_company_id
        or ni.accepted_company_id = p_company_id
      )
  loop
    perform public.ensure_network_invite_partner_links(
      v_invite,
      v_invite.accepted_company_id
    );
    v_repaired := v_repaired + 1;
  end loop;

  return v_repaired;
end;
$$;

-- Internal helper: only callable from other security definer RPCs (not clients).
revoke all on function public.ensure_network_invite_partner_links(public.network_invites, uuid) from public;
revoke all on function public.ensure_network_invite_partner_links(public.network_invites, uuid) from authenticated;

revoke all on function public.repair_accepted_invite_partner_links_for_company(uuid) from public;
grant execute on function public.repair_accepted_invite_partner_links_for_company(uuid) to authenticated;
