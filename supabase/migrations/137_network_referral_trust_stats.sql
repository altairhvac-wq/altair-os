-- Community trust metrics: computed from real referral behavior, never
-- self-reported. Two pieces:
--
-- 1. `network_referrals.responded_at` — when the receiving company first
--    accepted or declined. The schema never captured this (updated_at is
--    overwritten by later outcome transitions), so:
--      - Going forward: update_received_network_referral_status stamps it on
--        the sent→accepted and →declined transitions.
--      - Backfill (honest subset only): rows currently in 'declined' or
--        'accepted' — for those, updated_at IS the response moment (decline
--        is terminal; accepted rows' last update was the accept). Rows in
--        converted/won/lost had updated_at overwritten by outcome sync, so
--        their true response time is unknowable → left null, never guessed.
--
-- 2. `get_network_referral_trust_stats(p_profile_ids)` — SECURITY DEFINER
--    aggregate over referrals RECEIVED by visible directory profiles. RLS
--    correctly blocks companies from reading each other's raw referral rows;
--    this function exposes ONLY per-company rollups, and only for profiles
--    currently visible in the directory. Definitions:
--      - referrals_handled: received referrals the company has responded to
--        (everything except still-'sent' and 'cancelled').
--      - accepted_count: handled minus declined (accepted/converted/won/lost
--        all imply the referral was accepted first).
--      - won_count: referred jobs whose lead outcome reached 'won'.
--      - median_response_seconds: median(responded_at - created_at), only
--        over rows where responded_at exists; response_samples says how many.
--    UI rule (app-side): rates render only at >= 3 handled referrals.

-- ---------------------------------------------------------------------------
-- 1. responded_at column + honest backfill + RPC stamp
-- ---------------------------------------------------------------------------

alter table public.network_referrals
  add column if not exists responded_at timestamptz;

comment on column public.network_referrals.responded_at is
  'When the receiving company first accepted or declined. Null on rows whose response moment is unknowable (pre-migration rows already past accepted/declined).';

update public.network_referrals
set responded_at = updated_at
where responded_at is null
  and status in ('accepted', 'declined');

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
    responded_at = coalesce(v_referral.responded_at, now()),
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

-- ---------------------------------------------------------------------------
-- 2. Trust-stats aggregate for visible directory profiles
-- ---------------------------------------------------------------------------

create or replace function public.get_network_referral_trust_stats(
  p_profile_ids uuid[]
)
returns table (
  profile_id uuid,
  referrals_handled integer,
  accepted_count integer,
  declined_count integer,
  won_count integer,
  median_response_seconds double precision,
  response_samples integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    np.id as profile_id,
    count(*) filter (
      where nr.status in ('accepted', 'declined', 'converted', 'won', 'lost')
    )::integer as referrals_handled,
    count(*) filter (
      where nr.status in ('accepted', 'converted', 'won', 'lost')
    )::integer as accepted_count,
    count(*) filter (where nr.status = 'declined')::integer as declined_count,
    count(*) filter (where nr.status = 'won')::integer as won_count,
    percentile_cont(0.5) within group (
      order by extract(epoch from (nr.responded_at - nr.created_at))
    ) filter (where nr.responded_at is not null) as median_response_seconds,
    count(*) filter (where nr.responded_at is not null)::integer as response_samples
  from public.network_profiles np
  join public.network_referrals nr
    on nr.target_company_id = np.company_id
  where np.id = any (p_profile_ids)
    and np.is_visible = true
  group by np.id;
$$;

revoke all on function public.get_network_referral_trust_stats(uuid[]) from public;
grant execute on function public.get_network_referral_trust_stats(uuid[]) to authenticated;
