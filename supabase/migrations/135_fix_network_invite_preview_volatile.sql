-- Fix: get_public_network_invite_preview was declared STABLE in
-- 076_network_invites_v1.sql while performing an UPDATE (lazy expiry of
-- overdue pending invites). Postgres rejects writes inside non-volatile
-- functions with 0A000 "UPDATE is not allowed in a non-volatile function",
-- so previewing an invite that had passed its expiry raised instead of
-- returning state = 'expired'.
--
-- This is the exact defect 131_fix_network_community_access.sql fixed for
-- the sibling function list_incoming_network_invites_for_user. Body below is
-- byte-identical to 076 except the volatility (default VOLATILE).

create or replace function public.get_public_network_invite_preview(p_raw_token text)
returns jsonb
language plpgsql
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
