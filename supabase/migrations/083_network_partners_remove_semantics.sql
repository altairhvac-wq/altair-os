-- My Network remove semantics: soft-remove via relationship_status instead of hard delete.
-- Invite repair must create missing rows but never reactivate intentionally removed links.

alter type public.relationship_status add value if not exists 'removed';

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
    relationship_status = case
      when network_partners.relationship_status = 'removed'::public.relationship_status
      then network_partners.relationship_status
      else 'active'::public.relationship_status
    end,
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
    relationship_status = case
      when network_partners.relationship_status = 'removed'::public.relationship_status
      then network_partners.relationship_status
      else 'active'::public.relationship_status
    end,
    updated_at = now();
end;
$$;

create or replace function public.remove_linked_network_partner(
  p_company_id uuid,
  p_linked_company_id uuid
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

  update public.network_partners
  set
    relationship_status = 'removed',
    updated_at = now()
  where company_id = p_company_id
    and linked_company_id = p_linked_company_id
    and linked_company_id is not null
    and relationship_status = 'active'
  returning * into v_partner;

  if not found then
    raise exception 'Network connection not found';
  end if;

  return v_partner;
end;
$$;

revoke all on function public.remove_linked_network_partner(uuid, uuid) from public;
grant execute on function public.remove_linked_network_partner(uuid, uuid) to authenticated;
