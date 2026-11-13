-- Migration 210: the public contractor directory.
--
-- A contractor can list their business on altair-op.com/directory without an
-- account, and anyone can search the published listings. This is a NEW,
-- standalone table. It is deliberately not `network_profiles`: those belong
-- to a workspace, are visible to signed-in members only, and their owners
-- agreed to exactly that. Nothing in this migration makes them public.
--
-- ============================ WHO MAY DO WHAT ============================
-- Nobody but the service role touches these tables. A visitor has no account,
-- so there is no session for RLS to check, and one column (contact_email) is
-- private. The application therefore:
--   * READS public data only through the two functions below, which return
--     the public columns of PUBLISHED rows and nothing else. A bug in a page
--     cannot leak an email address or an unapproved listing, because the
--     functions never return either.
--   * WRITES through the service role, in server code, after it has checked
--     the form, the rate limit and (for edits) the signed link from the
--     lister's email; or after it has authorised a platform admin.
--
-- ============================ LIFECYCLE ============================
--   pending_email   submitted; waiting for the lister to press the email link
--   pending_review  email confirmed; waiting for the owner to approve
--   published       approved; public
--   rejected        the owner declined it
--   removed         the lister (or the owner) took it down
-- An edit to a PUBLISHED listing is stored in `pending_changes` and the live
-- listing stays as it was until the owner approves the change, so a typo fix
-- never takes a business offline and a published page never changes unseen.
--
-- Additive only. Applying this migration changes no existing row, and it can
-- be run twice.

create table if not exists public.directory_listings (
  id uuid primary key default gen_random_uuid(),

  -- The public address, /directory/<slug>. A URL segment and nothing else.
  slug text not null,

  business_name text not null,
  -- Same taxonomy as the in-app directory (shared/types/network.ts).
  trade_type text not null,
  city text not null,
  state text not null,
  postal_code text,
  service_area text not null default '',
  -- Ten digits, no formatting; the page formats it.
  phone text not null,
  website text,
  description text not null,
  accepts_sub_work boolean not null default false,

  -- PRIVATE. Used for the confirmation and manage links only; never returned
  -- by the public functions.
  contact_email text not null,

  status text not null default 'pending_email',
  -- A proposed edit to a published listing: the same public fields, as an
  -- object. Null when there is none.
  pending_changes jsonb,
  -- The sentence the lister agreed to, as it was shown.
  consent_text text not null,

  email_confirmed_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles (id) on delete set null,
  review_note text,
  published_at timestamptz,
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint directory_listings_slug_shape
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 96),
  constraint directory_listings_name_len
    check (char_length(business_name) between 2 and 80),
  constraint directory_listings_trade_check
    check (
      trade_type in (
        'HVAC',
        'Plumbing',
        'Electrical',
        'General Contracting',
        'Cleaning Services',
        'Janitorial Services',
        'Carpet Cleaning',
        'Window Cleaning',
        'Pressure Washing',
        'Landscaping',
        'Lawn Care',
        'Roofing',
        'Painting',
        'Flooring',
        'Handyman Services',
        'Pest Control',
        'Restoration',
        'Water Damage Restoration',
        'Fire and Smoke Restoration',
        'Property Management',
        'Real Estate',
        'Appliance Repair',
        'Garage Door Services',
        'Locksmith',
        'Pool and Spa Services',
        'Moving Services',
        'Junk Removal',
        'Home Inspection',
        'Concrete and Masonry',
        'Excavation',
        'Fencing',
        'Drywall',
        'Insulation',
        'Solar',
        'Security Systems',
        'Other'
      )
    ),
  constraint directory_listings_city_len
    check (char_length(city) between 2 and 60),
  constraint directory_listings_state_shape
    check (state ~ '^[A-Z]{2}$'),
  constraint directory_listings_postal_shape
    check (postal_code is null or postal_code ~ '^[0-9]{5}$'),
  constraint directory_listings_service_area_len
    check (char_length(service_area) <= 120),
  constraint directory_listings_phone_shape
    check (phone ~ '^[0-9]{10}$'),
  -- https only: no javascript: or data: URL can satisfy this.
  constraint directory_listings_website_shape
    check (
      website is null
      or (website ~ '^https://[a-z0-9.-]+\.[a-z]{2,}(/[^[:space:]]*)?$' and char_length(website) <= 200)
    ),
  constraint directory_listings_description_len
    check (char_length(description) between 20 and 400),
  constraint directory_listings_email_shape
    check (
      contact_email = lower(contact_email)
      and char_length(contact_email) between 6 and 254
      and contact_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    ),
  constraint directory_listings_status_check
    check (status in ('pending_email', 'pending_review', 'published', 'rejected', 'removed')),
  constraint directory_listings_pending_changes_object
    check (
      pending_changes is null
      or (jsonb_typeof(pending_changes) = 'object' and pg_column_size(pending_changes) <= 4096)
    ),
  constraint directory_listings_consent_len
    check (char_length(consent_text) between 10 and 400),
  constraint directory_listings_review_note_len
    check (review_note is null or char_length(review_note) <= 500),
  -- A public listing was confirmed by its lister and approved by someone.
  constraint directory_listings_published_is_complete
    check (
      status <> 'published'
      or (email_confirmed_at is not null and published_at is not null)
    )
);

comment on table public.directory_listings is
  'Public contractor directory: businesses listed without an account. contact_email is private. Read publicly only through directory_search_listings / directory_public_listing. Service role only.';

create unique index if not exists directory_listings_slug_idx
  on public.directory_listings (slug);

-- One live listing per business per inbox: a second submission of the same
-- business from the same address updates the first instead of duplicating it.
create unique index if not exists directory_listings_one_per_inbox_idx
  on public.directory_listings (contact_email, lower(business_name))
  where status in ('pending_email', 'pending_review', 'published');

create index if not exists directory_listings_search_idx
  on public.directory_listings (state, trade_type, lower(city))
  where status = 'published';

create index if not exists directory_listings_review_idx
  on public.directory_listings (status, created_at desc);

drop trigger if exists directory_listings_set_updated_at on public.directory_listings;
create trigger directory_listings_set_updated_at
  before update on public.directory_listings
  for each row execute function public.set_updated_at();

alter table public.directory_listings enable row level security;

revoke all on table public.directory_listings from public;
revoke all on table public.directory_listings from anon;
revoke all on table public.directory_listings from authenticated;
grant all on table public.directory_listings to service_role;

-- ---------------------------------------------------------------- reports
-- "Report this listing" on a business page. No reporter identity is kept.

create table if not exists public.directory_listing_reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.directory_listings (id) on delete cascade,
  reason text not null,
  note text not null default '',
  status text not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint directory_listing_reports_reason_check
    check (reason in ('wrong_details', 'closed', 'not_a_real_business', 'offensive', 'other')),
  constraint directory_listing_reports_note_len
    check (char_length(note) <= 500),
  constraint directory_listing_reports_status_check
    check (status in ('open', 'resolved'))
);

comment on table public.directory_listing_reports is
  'Visitor reports about a directory listing, for the owner to review. No reporter identity. Service role only.';

create index if not exists directory_listing_reports_open_idx
  on public.directory_listing_reports (listing_id, created_at desc)
  where status = 'open';

alter table public.directory_listing_reports enable row level security;

revoke all on table public.directory_listing_reports from public;
revoke all on table public.directory_listing_reports from anon;
revoke all on table public.directory_listing_reports from authenticated;
grant all on table public.directory_listing_reports to service_role;

-- ---------------------------------------------------------------- public reads
-- The ONLY way public data leaves these tables. Both functions return the
-- public columns of published rows; neither can return contact_email, a
-- pending change, a review note, or a listing that is not published.

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
    select l.*
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
            'published_at', page.published_at
          )
          order by lower(page.business_name), page.slug
        )
        from (
          select m.*
          from matched m
          order by lower(m.business_name), m.slug
          limit (select lim from params)
          offset (select off from params)
        ) page
      ),
      '[]'::jsonb
    )
  );
$$;

comment on function public.directory_search_listings(text, text, text, boolean, integer, integer) is
  'Public directory search: public columns of published listings only, with a total. Never returns contact_email or unpublished rows. Service role only.';

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
    'updated_at', l.updated_at
  )
  from public.directory_listings l
  where l.slug = p_slug
    and l.status = 'published';
$$;

comment on function public.directory_public_listing(text) is
  'One published directory listing by slug, public columns only; null when there is none. Service role only.';

-- For the sitemap: where each published listing lives and when it last changed.
create or replace function public.directory_published_paths()
returns jsonb
language sql
stable
set search_path = public, pg_temp
as $$
  select coalesce(
    jsonb_agg(jsonb_build_object('slug', t.slug, 'updated_at', t.updated_at) order by t.slug),
    '[]'::jsonb
  )
  from (
    select l.slug, l.updated_at
    from public.directory_listings l
    where l.status = 'published'
    order by l.slug
    limit 5000
  ) t;
$$;

comment on function public.directory_published_paths() is
  'Slugs of published directory listings, for the sitemap. Service role only.';

revoke all on function public.directory_search_listings(text, text, text, boolean, integer, integer) from public;
revoke all on function public.directory_search_listings(text, text, text, boolean, integer, integer) from anon;
revoke all on function public.directory_search_listings(text, text, text, boolean, integer, integer) from authenticated;
grant execute on function public.directory_search_listings(text, text, text, boolean, integer, integer) to service_role;

revoke all on function public.directory_public_listing(text) from public;
revoke all on function public.directory_public_listing(text) from anon;
revoke all on function public.directory_public_listing(text) from authenticated;
grant execute on function public.directory_public_listing(text) to service_role;

revoke all on function public.directory_published_paths() from public;
revoke all on function public.directory_published_paths() from anon;
revoke all on function public.directory_published_paths() from authenticated;
grant execute on function public.directory_published_paths() to service_role;
