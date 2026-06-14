-- Trusted Network Invitations V1
--
-- Companies invite contractors to join Altair; accepted signups auto-link as
-- trusted partners in network_partners. Distinct from network_referrals (lead
-- handoff) and team membership invites.

-- ---------------------------------------------------------------------------
-- Enum
-- ---------------------------------------------------------------------------

create type public.network_invite_status as enum (
  'pending',
  'accepted',
  'expired',
  'cancelled'
);

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

create table public.network_invites (
  id uuid primary key default gen_random_uuid(),
  source_company_id uuid not null references public.companies (id) on delete cascade,
  source_user_id uuid not null references public.profiles (id) on delete restrict,
  invited_company_name text not null,
  invited_contact_name text not null,
  invited_email text not null,
  invited_phone text not null default '',
  trade_category text not null,
  personal_message text,
  invite_token_hash text not null unique,
  status public.network_invite_status not null default 'pending',
  accepted_company_id uuid references public.companies (id) on delete set null,
  accepted_user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  expires_at timestamptz not null default (now() + interval '30 days'),
  check (
    trade_category in (
      'HVAC',
      'Plumbing',
      'Electrical',
      'Roofing',
      'General Contracting',
      'Landscaping',
      'Painting'
    )
  ),
  check (btrim(invited_company_name) <> ''),
  check (btrim(invited_contact_name) <> ''),
  check (btrim(invited_email) <> '')
);

create index network_invites_source_company_id_created_at_idx
  on public.network_invites (source_company_id, created_at desc);

create index network_invites_accepted_company_id_idx
  on public.network_invites (accepted_company_id)
  where accepted_company_id is not null;

create unique index network_invites_source_pending_email_uidx
  on public.network_invites (source_company_id, lower(invited_email))
  where status = 'pending';

-- ---------------------------------------------------------------------------
-- Token helpers (store hash only; raw token never persisted)
-- ---------------------------------------------------------------------------

create or replace function public.hash_network_invite_token(p_raw_token text)
returns text
language sql
immutable
as $$
  select encode(digest(trim(p_raw_token), 'sha256'), 'hex');
$$;

revoke all on function public.hash_network_invite_token(text) from public;
grant execute on function public.hash_network_invite_token(text) to authenticated;
grant execute on function public.hash_network_invite_token(text) to anon;

-- ---------------------------------------------------------------------------
-- Public invite preview (signup page; token-only lookup, no internal IDs)
-- ---------------------------------------------------------------------------

create or replace function public.get_public_network_invite_preview(p_raw_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_invite public.network_invites%rowtype;
  v_source_company_name text;
  v_status public.network_invite_status;
begin
  if coalesce(trim(p_raw_token), '') = '' then
    return jsonb_build_object('state', 'invalid');
  end if;

  select ni.*
  into v_invite
  from public.network_invites ni
  where ni.invite_token_hash = public.hash_network_invite_token(p_raw_token);

  if not found then
    return jsonb_build_object('state', 'invalid');
  end if;

  if v_invite.status = 'pending' and v_invite.expires_at <= now() then
    update public.network_invites
    set status = 'expired'
    where id = v_invite.id
      and status = 'pending';
    v_status := 'expired';
  else
    v_status := v_invite.status;
  end if;

  select c.name
  into v_source_company_name
  from public.companies c
  where c.id = v_invite.source_company_id;

  return jsonb_build_object(
    'state', case v_status
      when 'pending' then 'valid'
      when 'accepted' then 'accepted'
      when 'expired' then 'expired'
      when 'cancelled' then 'cancelled'
      else 'invalid'
    end,
    'source_company_name', coalesce(v_source_company_name, 'An Altair company'),
    'invited_company_name', v_invite.invited_company_name,
    'invited_contact_name', v_invite.invited_contact_name,
    'invited_email', v_invite.invited_email,
    'trade_category', v_invite.trade_category,
    'personal_message', v_invite.personal_message
  );
end;
$$;

revoke all on function public.get_public_network_invite_preview(text) from public;
grant execute on function public.get_public_network_invite_preview(text) to anon;
grant execute on function public.get_public_network_invite_preview(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Accept invite after signup (atomic status update + bidirectional partners)
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

  -- Source company trusts the new Altair company.
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
    v_invite.source_company_id,
    p_accepted_company_id,
    coalesce(v_accepted_company_name, v_invite.invited_company_name),
    v_invite.invited_contact_name,
    v_invite.invited_email,
    v_invite.invited_phone,
    v_invite.trade_category,
    'active'
  )
  on conflict do nothing;

  -- Reciprocal trusted partner link for the invited company.
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
    v_invite.source_company_id,
    coalesce(v_source_company_name, 'Partner company'),
    '',
    '',
    '',
    v_source_trade,
    'active'
  )
  on conflict do nothing;

  return jsonb_build_object(
    'ok', true,
    'source_company_name', coalesce(v_source_company_name, 'An Altair company')
  );
end;
$$;

revoke all on function public.accept_network_invite(text, uuid, uuid, text) from public;
grant execute on function public.accept_network_invite(text, uuid, uuid, text) to authenticated;

-- Rotate invite token for pending invites (copy link / future resend).
create or replace function public.rotate_network_invite_token(
  p_invite_id uuid,
  p_source_company_id uuid,
  p_new_token_hash text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer;
begin
  if not public.can_send_network_referrals(p_source_company_id) then
    raise exception 'Not authorized to rotate invite token';
  end if;

  update public.network_invites
  set invite_token_hash = p_new_token_hash
  where id = p_invite_id
    and source_company_id = p_source_company_id
    and status = 'pending'
    and expires_at > now();

  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

revoke all on function public.rotate_network_invite_token(uuid, uuid, text) from public;
grant execute on function public.rotate_network_invite_token(uuid, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.network_invites enable row level security;

create policy "source company admins can read own network invites"
  on public.network_invites
  for select
  using (public.can_send_network_referrals(source_company_id));

create policy "accepted company members can read invite used to join"
  on public.network_invites
  for select
  using (
    accepted_company_id is not null
    and public.is_active_company_member(accepted_company_id)
  );

create policy "source company admins can insert network invites"
  on public.network_invites
  for insert
  with check (
    public.can_send_network_referrals(source_company_id)
    and source_user_id = auth.uid()
  );

create policy "source company admins can cancel pending network invites"
  on public.network_invites
  for update
  using (
    public.can_send_network_referrals(source_company_id)
    and status = 'pending'
  )
  with check (
    public.can_send_network_referrals(source_company_id)
    and status in ('pending', 'cancelled')
  );

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant select, insert, update on public.network_invites to authenticated;
grant all on table public.network_invites to service_role;
