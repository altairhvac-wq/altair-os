-- In-platform network invite acceptance: list pending invites for the authenticated
-- user's email and accept without a raw invite token.

create index if not exists network_invites_pending_invited_email_idx
  on public.network_invites (lower(invited_email), created_at desc)
  where status = 'pending';

create or replace function public.list_incoming_network_invites_for_user(
  p_active_company_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_email text;
  v_invites jsonb;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_active_company_id is null then
    return '[]'::jsonb;
  end if;

  if not public.is_active_company_member(p_active_company_id) then
    raise exception 'Not authorized to view invites for this company';
  end if;

  select lower(trim(u.email))
  into v_user_email
  from auth.users u
  where u.id = auth.uid();

  if coalesce(v_user_email, '') = '' then
    return '[]'::jsonb;
  end if;

  update public.network_invites ni
  set status = 'expired'
  where ni.status = 'pending'
    and ni.expires_at <= now()
    and lower(trim(ni.invited_email)) = v_user_email
    and ni.source_company_id <> p_active_company_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', ni.id,
        'source_company_id', ni.source_company_id,
        'source_company_name', coalesce(sc.name, 'An Altair company'),
        'invited_company_name', ni.invited_company_name,
        'invited_contact_name', ni.invited_contact_name,
        'invited_email', ni.invited_email,
        'trade_category', ni.trade_category,
        'personal_message', ni.personal_message,
        'created_at', ni.created_at,
        'expires_at', ni.expires_at
      )
      order by ni.created_at desc
    ),
    '[]'::jsonb
  )
  into v_invites
  from public.network_invites ni
  join public.companies sc on sc.id = ni.source_company_id
  where ni.status = 'pending'
    and ni.expires_at > now()
    and lower(trim(ni.invited_email)) = v_user_email
    and ni.source_company_id <> p_active_company_id;

  return v_invites;
end;
$$;

revoke all on function public.list_incoming_network_invites_for_user(uuid) from public;
grant execute on function public.list_incoming_network_invites_for_user(uuid) to authenticated;

create or replace function public.accept_incoming_network_invite(
  p_invite_id uuid,
  p_accepted_company_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.network_invites%rowtype;
  v_user_email text;
  v_source_company_name text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_invite_id is null or p_accepted_company_id is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_request');
  end if;

  if not public.has_company_role(
    p_accepted_company_id,
    array['owner', 'admin']::public.company_role[]
  ) then
    raise exception 'Not authorized to accept this invite for this company';
  end if;

  select lower(trim(u.email))
  into v_user_email
  from auth.users u
  where u.id = auth.uid();

  if coalesce(v_user_email, '') = '' then
    return jsonb_build_object('ok', false, 'error', 'email_mismatch');
  end if;

  select ni.*
  into v_invite
  from public.network_invites ni
  where ni.id = p_invite_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'invite_not_found');
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

  if lower(trim(v_invite.invited_email)) <> v_user_email then
    return jsonb_build_object('ok', false, 'error', 'email_mismatch');
  end if;

  if v_invite.source_company_id = p_accepted_company_id then
    return jsonb_build_object('ok', false, 'error', 'self_invite');
  end if;

  select c.name
  into v_source_company_name
  from public.companies c
  where c.id = v_invite.source_company_id;

  update public.network_invites
  set
    status = 'accepted',
    accepted_company_id = p_accepted_company_id,
    accepted_user_id = auth.uid(),
    accepted_at = now()
  where id = v_invite.id;

  v_invite.status := 'accepted';
  v_invite.accepted_company_id := p_accepted_company_id;
  v_invite.accepted_user_id := auth.uid();
  v_invite.accepted_at := now();

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

revoke all on function public.accept_incoming_network_invite(uuid, uuid) from public;
grant execute on function public.accept_incoming_network_invite(uuid, uuid) to authenticated;
