-- Network hardening: lock referral updates and invite partner repair RPC to trusted paths.

-- ---------------------------------------------------------------------------
-- Referral status updates via RPC (block direct client column tampering)
-- ---------------------------------------------------------------------------

create or replace function public.update_received_network_referral_status(
  p_referral_id uuid,
  p_target_company_id uuid,
  p_status public.network_referral_status,
  p_decline_reason text default null
)
returns public.network_referrals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referral public.network_referrals%rowtype;
begin
  if not public.can_manage_customers(p_target_company_id) then
    raise exception 'Not authorized to update this referral';
  end if;

  select nr.*
  into v_referral
  from public.network_referrals nr
  where nr.id = p_referral_id
  for update;

  if not found or v_referral.target_company_id <> p_target_company_id then
    raise exception 'Referral not found';
  end if;

  if p_status = 'accepted' and v_referral.status <> 'sent' then
    raise exception 'This referral has already been handled';
  end if;

  if p_status = 'declined' and v_referral.status not in ('sent', 'accepted') then
    raise exception 'This referral can no longer be declined';
  end if;

  update public.network_referrals
  set
    status = p_status,
    decline_reason = case
      when p_status = 'declined' then
        coalesce(nullif(btrim(p_decline_reason), ''), 'Declined by receiving company.')
      else
        v_referral.decline_reason
    end
  where id = p_referral_id
  returning * into v_referral;

  return v_referral;
end;
$$;

revoke all on function public.update_received_network_referral_status(uuid, uuid, public.network_referral_status, text) from public;
grant execute on function public.update_received_network_referral_status(uuid, uuid, public.network_referral_status, text) to authenticated;

drop policy if exists "target lead managers can update received referral status" on public.network_referrals;

revoke update on public.network_referrals from authenticated;

-- ---------------------------------------------------------------------------
-- Invite partner repair: internal to accept_network_invite only
-- ---------------------------------------------------------------------------

revoke all on function public.ensure_network_invite_partner_links(public.network_invites, uuid) from authenticated;
