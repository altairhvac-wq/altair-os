-- Migration 211: a public directory listing can be linked to an Altair
-- workspace ("claim your listing").
--
-- A contractor lists a business for free (migration 210). If that same
-- person also has an Altair workspace, they can link the two from inside the
-- app. A linked listing whose workspace is in good standing is shown publicly
-- as an "Altair member" and is listed ahead of non-members.
--
-- ============================ WHO MAY LINK ============================
-- The application links a listing only when BOTH are true (app/actions/
-- directory-claim.ts): the signed-in person is an owner or admin of the
-- workspace, and the email they sign in with is the email the listing was
-- confirmed with. Both addresses were proven by an emailed link, so no
-- further proof is asked for. Nothing in this migration grants anyone new
-- access: the tables stay service-role only.
--
-- ============================ "IN GOOD STANDING" ============================
-- `member_active` is a stored yes/no, not a rule written here. Whether a
-- workspace has access (trial running, subscription paid, grace period,
-- comped beta) is decided by one place in the application
-- (lib/saas-billing). Repeating that rule in SQL would give two answers that
-- drift apart. The application writes the flag when a listing is linked and
-- re-checks every linked listing once a day in the billing-maintenance run,
-- so a workspace that stops paying loses the badge and the ranking within a
-- day.
--
-- Additive only. Applying this migration changes no existing row's public
-- details, and it can be run twice. The two public read functions are
-- replaced with versions that add one key, `is_member`; application code
-- that has not been updated simply ignores it.

alter table public.directory_listings
  add column if not exists claimed_company_id uuid references public.companies (id) on delete set null;

alter table public.directory_listings
  add column if not exists claimed_at timestamptz;

alter table public.directory_listings
  add column if not exists member_active boolean not null default false;

comment on column public.directory_listings.claimed_company_id is
  'The Altair workspace this listing is linked to, if any. Never returned by the public functions.';

comment on column public.directory_listings.member_active is
  'True while the linked workspace has application access. Written by the application (claim + daily re-check), not derived here.';

create index if not exists directory_listings_claimed_company_idx
  on public.directory_listings (claimed_company_id)
  where claimed_company_id is not null;

-- ---------------------------------------------------------------- public reads
-- Same rules as migration 210: public columns of PUBLISHED rows only. The one
-- addition is `is_member`, a yes/no. The workspace id itself is never
-- returned, and neither is the lister's email.

create or replace function public.directory_search_listings(
  p_trade text default null,
  p_state text default null,
  p_place text default null,
  p_sub_only boolean default false,
  p_limit integer default 20,
  p_offset integer default 0
)
returns jsonb
language sql
stable
set search_path = public, pg_temp
as $$
  with params as (
    select
      nullif(btrim(coalesce(p_trade, '')), '') as trade,
      nullif(upper(btrim(coalesce(p_state, ''))), '') as state,
      nullif(btrim(coalesce(p_place, '')), '') as place,
      least(greatest(coalesce(p_limit, 20), 1), 50) as lim,
      greatest(coalesce(p_offset, 0), 0) as off
  ),
  matched as (
    select
      l.*,
      (l.claimed_company_id is not null and l.member_active) as is_member
    from public.directory_listings l, params p
    where l.status = 'published'
      and (p.trade is null or l.trade_type = p.trade)
      and (p.state is null or l.state = p.state)
      and (not coalesce(p_sub_only, false) or l.accepts_sub_work)
      and (
        p.place is null
        -- Five digits is a ZIP code; anything else is the start of a city
        -- name or a word in the service area. The wildcard characters are
        -- escaped so a visitor cannot write their own pattern.
        or (p.place ~ '^[0-9]{5}$' and l.postal_code = p.place)
        or (
          p.place !~ '^[0-9]{5}$'
          and (
            lower(l.city) like lower(replace(replace(replace(p.place, '\', '\\'), '%', '\%'), '_', '\_')) || '%' escape '\'
            or lower(l.service_area) like '%' || lower(replace(replace(replace(p.place, '\', '\\'), '%', '\%'), '_', '\_')) || '%' escape '\'
          )
        )
      )
  )
  select jsonb_build_object(
    'total', (select count(*) from matched),
    'rows', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'slug', page.slug,
            'business_name', page.business_name,
            'trade_type', page.trade_type,
            'city', page.city,
            'state', page.state,
            'service_area', page.service_area,
            'phone', page.phone,
            'website', page.website,
            'description', page.description,
            'accepts_sub_work', page.accepts_sub_work,
            'published_at', page.published_at,
            'is_member', page.is_member
          )
          -- Members first, then by name.
          order by page.is_member desc, lower(page.business_name), page.slug
        )
        from (
          select m.*
          from matched m
          order by m.is_member desc, lower(m.business_name), m.slug
          limit (select lim from params)
          offset (select off from params)
        ) page
      ),
      '[]'::jsonb
    )
  );
$$;

comment on function public.directory_search_listings(text, text, text, boolean, integer, integer) is
  'Public directory search: public columns of published listings only, members first, with a total. Never returns contact_email, the linked workspace id or unpublished rows. Service role only.';

create or replace function public.directory_public_listing(p_slug text)
returns jsonb
language sql
stable
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'id', l.id,
    'slug', l.slug,
    'business_name', l.business_name,
    'trade_type', l.trade_type,
    'city', l.city,
    'state', l.state,
    'postal_code', l.postal_code,
    'service_area', l.service_area,
    'phone', l.phone,
    'website', l.website,
    'description', l.description,
    'accepts_sub_work', l.accepts_sub_work,
    'published_at', l.published_at,
    'updated_at', l.updated_at,
    'is_member', (l.claimed_company_id is not null and l.member_active)
  )
  from public.directory_listings l
  where l.slug = p_slug
    and l.status = 'published';
$$;

comment on function public.directory_public_listing(text) is
  'One published directory listing by slug, public columns only, with is_member; null when there is none. Service role only.';

-- create or replace keeps existing privileges; stated again so this file can
-- be read on its own.
revoke all on function public.directory_search_listings(text, text, text, boolean, integer, integer) from public;
revoke all on function public.directory_search_listings(text, text, text, boolean, integer, integer) from anon;
revoke all on function public.directory_search_listings(text, text, text, boolean, integer, integer) from authenticated;
grant execute on function public.directory_search_listings(text, text, text, boolean, integer, integer) to service_role;

revoke all on function public.directory_public_listing(text) from public;
revoke all on function public.directory_public_listing(text) from anon;
revoke all on function public.directory_public_listing(text) from authenticated;
grant execute on function public.directory_public_listing(text) to service_role;
