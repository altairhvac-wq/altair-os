-- Community: Help Requests / Opportunities — structured, lifecycle-based
-- posts for overflow work / crew requests (original Community vision:
-- "NEED HELP" posts, not a social feed). A post broadcasts trade + urgency +
-- rough location only; customer PII is never broadcast. When the posting
-- company accepts one offer, that creates a real `network_referrals` row
-- (same pipeline as a direct referral: Lead -> Job -> Invoice), and the
-- customer PII two-phase reveal from migration 137/138's era still applies.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.network_help_request_status as enum (
  'open',
  'filled',
  'expired',
  'cancelled'
);

create type public.network_help_offer_status as enum (
  'pending',
  'accepted',
  'declined',
  'withdrawn'
);

-- ---------------------------------------------------------------------------
-- network_help_requests
-- ---------------------------------------------------------------------------

create table public.network_help_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete restrict,
  trade_type text not null,
  title text not null,
  details text not null default '',
  city text not null default '',
  state text not null default '',
  postal_code text not null default '',
  urgency public.network_referral_urgency not null default 'normal',
  status public.network_help_request_status not null default 'open',
  expires_at timestamptz not null default (now() + interval '14 days'),
  filled_referral_id uuid references public.network_referrals (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index network_help_requests_company_id_idx
  on public.network_help_requests (company_id, created_at desc);

create index network_help_requests_open_idx
  on public.network_help_requests (status, expires_at)
  where status = 'open';

-- ---------------------------------------------------------------------------
-- network_help_offers
-- ---------------------------------------------------------------------------

create table public.network_help_offers (
  id uuid primary key default gen_random_uuid(),
  help_request_id uuid not null references public.network_help_requests (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  offered_by uuid not null references public.profiles (id) on delete restrict,
  message text,
  status public.network_help_offer_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (help_request_id, company_id)
);

create index network_help_offers_help_request_id_idx
  on public.network_help_offers (help_request_id);

create index network_help_offers_company_id_idx
  on public.network_help_offers (company_id, created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

drop trigger if exists network_help_requests_set_updated_at on public.network_help_requests;
create trigger network_help_requests_set_updated_at
before update on public.network_help_requests
for each row execute function public.set_updated_at();

drop trigger if exists network_help_offers_set_updated_at on public.network_help_offers;
create trigger network_help_offers_set_updated_at
before update on public.network_help_offers
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: network_help_requests
-- ---------------------------------------------------------------------------

alter table public.network_help_requests enable row level security;

-- Any authenticated user whose company can send referrals can browse open
-- posts from other companies (this is the point of the feature — visible
-- network-wide, same trust boundary as the directory), plus always read
-- their own company's posts regardless of status.
create policy "company members can read own help requests"
  on public.network_help_requests
  for select
  using (public.has_company_role(company_id, array['owner', 'admin']::public.company_role[]));

create policy "authenticated users can read open help requests"
  on public.network_help_requests
  for select
  using (status = 'open');

create policy "company admins can insert own help requests"
  on public.network_help_requests
  for insert
  with check (
    public.has_company_role(company_id, array['owner', 'admin']::public.company_role[])
    and created_by = auth.uid()
  );

create policy "company admins can update own help requests"
  on public.network_help_requests
  for update
  using (public.has_company_role(company_id, array['owner', 'admin']::public.company_role[]))
  with check (public.has_company_role(company_id, array['owner', 'admin']::public.company_role[]));

-- ---------------------------------------------------------------------------
-- RLS: network_help_offers
-- ---------------------------------------------------------------------------

alter table public.network_help_offers enable row level security;

create policy "offering company admins can read own offers"
  on public.network_help_offers
  for select
  using (public.has_company_role(company_id, array['owner', 'admin']::public.company_role[]));

create policy "posting company admins can read offers on own requests"
  on public.network_help_offers
  for select
  using (
    exists (
      select 1
      from public.network_help_requests hr
      where hr.id = help_request_id
        and public.has_company_role(hr.company_id, array['owner', 'admin']::public.company_role[])
    )
  );

create policy "company admins can insert own offers"
  on public.network_help_offers
  for insert
  with check (
    public.has_company_role(company_id, array['owner', 'admin']::public.company_role[])
    and offered_by = auth.uid()
    and exists (
      select 1
      from public.network_help_requests hr
      where hr.id = help_request_id
        and hr.status = 'open'
        and hr.company_id <> company_id
    )
  );

create policy "offering company admins can update own offers"
  on public.network_help_offers
  for update
  using (public.has_company_role(company_id, array['owner', 'admin']::public.company_role[]))
  with check (public.has_company_role(company_id, array['owner', 'admin']::public.company_role[]));

-- ---------------------------------------------------------------------------
-- accept_network_help_offer: atomic transition — accept one offer, decline
-- the rest, mark the request filled. Called after the caller has already
-- created the network_referrals row (see acceptHelpOfferAction), so the
-- referral id is passed in and stamped on the request.
-- ---------------------------------------------------------------------------

create or replace function public.accept_network_help_offer(
  p_help_request_id uuid,
  p_offer_id uuid,
  p_acting_company_id uuid,
  p_referral_id uuid
)
returns public.network_help_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.network_help_requests;
  v_offer public.network_help_offers;
begin
  select * into v_request
  from public.network_help_requests
  where id = p_help_request_id
    and company_id = p_acting_company_id
  for update;

  if not found then
    raise exception 'Help request not found.';
  end if;

  if v_request.status <> 'open' then
    raise exception 'This help request is no longer open.';
  end if;

  select * into v_offer
  from public.network_help_offers
  where id = p_offer_id
    and help_request_id = p_help_request_id
  for update;

  if not found or v_offer.status <> 'pending' then
    raise exception 'This offer is no longer available.';
  end if;

  update public.network_help_offers
  set status = 'declined'
  where help_request_id = p_help_request_id
    and status = 'pending'
    and id <> p_offer_id;

  update public.network_help_offers
  set status = 'accepted'
  where id = p_offer_id;

  update public.network_help_requests
  set status = 'filled', filled_referral_id = p_referral_id
  where id = p_help_request_id
  returning * into v_request;

  return v_request;
end;
$$;

revoke all on function public.accept_network_help_offer(uuid, uuid, uuid, uuid) from public;
grant execute on function public.accept_network_help_offer(uuid, uuid, uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- expire_stale_network_help_requests: lazy expiry, called best-effort from
-- the browse/list query rather than a cron — low volume, no worker needed.
-- ---------------------------------------------------------------------------

create or replace function public.expire_stale_network_help_requests()
returns void
language sql
security definer
set search_path = public
as $$
  update public.network_help_requests
  set status = 'expired'
  where status = 'open'
    and expires_at < now();
$$;

revoke all on function public.expire_stale_network_help_requests() from public;
grant execute on function public.expire_stale_network_help_requests() to authenticated;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant select, insert, update on public.network_help_requests to authenticated;
grant select, insert, update on public.network_help_offers to authenticated;
grant all on table public.network_help_requests to service_role;
grant all on table public.network_help_offers to service_role;
