-- Referral Outcome Sync V1: sync network_referrals.status from target lead lifecycle.

create or replace function public.sync_network_referral_outcome_for_lead(
  p_lead_id uuid,
  p_target_company_id uuid,
  p_new_status public.network_referral_status
)
returns public.network_referrals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead public.leads%rowtype;
  v_referral public.network_referrals%rowtype;
begin
  if not public.can_manage_customers(p_target_company_id) then
    raise exception 'Not authorized to sync referral outcome';
  end if;

  if p_new_status not in ('converted', 'won', 'lost') then
    raise exception 'Invalid outcome status for lead sync';
  end if;

  select l.*
  into v_lead
  from public.leads l
  where l.id = p_lead_id
    and l.company_id = p_target_company_id;

  if not found then
    return null;
  end if;

  if v_lead.source <> 'network_referral' then
    return null;
  end if;

  if p_new_status = 'lost' and v_lead.status <> 'lost' then
    return null;
  end if;

  if p_new_status = 'won' and v_lead.status <> 'won' then
    return null;
  end if;

  if p_new_status = 'converted' then
    if v_lead.converted_customer_id is null then
      return null;
    end if;

    if v_lead.status in ('won', 'lost') then
      return null;
    end if;
  end if;

  select nr.*
  into v_referral
  from public.network_referrals nr
  where nr.target_lead_id = p_lead_id
    and nr.target_company_id = p_target_company_id
  for update;

  if not found then
    return null;
  end if;

  if v_referral.status in ('declined', 'cancelled', 'won', 'lost') then
    return null;
  end if;

  if v_referral.status = p_new_status then
    return null;
  end if;

  update public.network_referrals
  set status = p_new_status
  where id = v_referral.id
    and target_lead_id = p_lead_id
    and target_company_id = p_target_company_id
  returning * into v_referral;

  return v_referral;
end;
$$;

revoke all on function public.sync_network_referral_outcome_for_lead(uuid, uuid, public.network_referral_status) from public;
grant execute on function public.sync_network_referral_outcome_for_lead(uuid, uuid, public.network_referral_status) to authenticated;
