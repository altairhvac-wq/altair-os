-- Migration 214: richer directory listings, their images, and listing owners'
-- numbers.
--
-- Builds on 210 (the public directory) and 211 (claim your listing). Three
-- things, all for listings a business added itself:
--
--   1. OPTIONAL DETAILS. Services, hours, a license number and its state, an
--      "insured" yes/no (the business's own statement, labelled as such on
--      the page), emergency service, year founded, a service radius and
--      languages. Every one is optional and owner-entered. Edits to a live
--      listing still wait in `pending_changes` for a person to approve them.
--      The description becomes optional too, so the first step of the form
--      can be short: it is empty, or 20 to 400 characters as before.
--
--   2. IMAGES. A logo and up to six photos. They live in two storage
--      buckets:
--        directory-pending  PRIVATE. Where an upload lands. Nobody but the
--                           service role can read it; the review screen shows
--                           pending images through short-lived signed links.
--        directory-public   PUBLIC READ. A file is copied here only when a
--                           person approves it. The listing's `logo_path` and
--                           `photo_paths` only ever name files in this bucket.
--      A proposed set of images waits in `pending_media` until it is approved,
--      exactly like `pending_changes`.
--
--   3. NUMBERS FOR THE OWNER. How many times each listing page was viewed and
--      its call, website and map buttons were pressed, one row per listing per
--      day. Counts only: no address, no device, no visitor id, nothing about
--      who looked. A monthly email tells the business its numbers; one table
--      remembers which months were sent so a re-run never sends twice, and a
--      yes/no on the listing lets the business stop those emails.
--
-- ============================ WHO MAY DO WHAT ============================
-- Unchanged from 210: the tables are service role only. The public read
-- functions return the new PUBLIC columns of PUBLISHED rows and nothing else:
-- never `contact_email`, `pending_changes`, `pending_media`, the email
-- opt-out, or the numbers.
--
-- Additive only. No existing row's public details change, and this can be
-- run twice. Application code from before 214 ignores the new keys.

-- ---------------------------------------------------------------- details

alter table public.directory_listings add column if not exists services text[] not null default '{}';
alter table public.directory_listings add column if not exists hours jsonb;
alter table public.directory_listings add column if not exists license_number text;
alter table public.directory_listings add column if not exists license_state text;
alter table public.directory_listings add column if not exists insured boolean;
alter table public.directory_listings add column if not exists emergency_service boolean;
alter table public.directory_listings add column if not exists year_founded smallint;
alter table public.directory_listings add column if not exists service_radius_miles smallint;
alter table public.directory_listings add column if not exists languages text[] not null default '{}';
alter table public.directory_listings add column if not exists logo_path text;
alter table public.directory_listings add column if not exists photo_paths text[] not null default '{}';
alter table public.directory_listings add column if not exists pending_media jsonb;
alter table public.directory_listings add column if not exists stats_email_opt_out boolean not null default false;
alter table public.directory_listings add column if not exists stats_email_opt_out_at timestamptz;

comment on column public.directory_listings.insured is
  'The business''s own statement that it carries insurance. Not checked by Altair; the page says so.';
comment on column public.directory_listings.logo_path is
  'A file in the PUBLIC bucket directory-public, written only when a person approved it. Never a pending upload.';
comment on column public.directory_listings.pending_media is
  'A proposed logo and photo set: {"logo": key|null, "photos": [key, ...]}, each key "public/<path>" (already approved) or "pending/<path>" (waiting). Private.';

alter table public.directory_listings drop constraint if exists directory_listings_services_shape;
alter table public.directory_listings add constraint directory_listings_services_shape
  check (
    coalesce(array_length(services, 1), 0) <= 24
    and array_to_string(services, ',') ~ '^([a-z0-9]+(-[a-z0-9]+)*(,[a-z0-9]+(-[a-z0-9]+)*)*)?$'
  );

alter table public.directory_listings drop constraint if exists directory_listings_languages_shape;
alter table public.directory_listings add constraint directory_listings_languages_shape
  check (
    coalesce(array_length(languages, 1), 0) <= 8
    and array_to_string(languages, ',') ~ '^([a-z]{2,3}(,[a-z]{2,3})*)?$'
  );

alter table public.directory_listings drop constraint if exists directory_listings_hours_shape;
alter table public.directory_listings add constraint directory_listings_hours_shape
  check (hours is null or (jsonb_typeof(hours) = 'object' and pg_column_size(hours) <= 1024));

alter table public.directory_listings drop constraint if exists directory_listings_license_shape;
alter table public.directory_listings add constraint directory_listings_license_shape
  check (
    (license_number is null and license_state is null)
    or (
      license_number ~ '^[A-Za-z0-9][A-Za-z0-9 ./#-]*$'
      and char_length(license_number) <= 40
      and license_state ~ '^[A-Z]{2}$'
    )
  );

alter table public.directory_listings drop constraint if exists directory_listings_year_founded_range;
alter table public.directory_listings add constraint directory_listings_year_founded_range
  check (year_founded is null or year_founded between 1850 and 2100);

alter table public.directory_listings drop constraint if exists directory_listings_radius_range;
alter table public.directory_listings add constraint directory_listings_radius_range
  check (service_radius_miles is null or service_radius_miles between 1 and 250);

-- A path inside the public bucket: <listing id>/<random name>.<png|jpg|webp>.
alter table public.directory_listings drop constraint if exists directory_listings_logo_shape;
alter table public.directory_listings add constraint directory_listings_logo_shape
  check (logo_path is null or logo_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(png|jpg|webp)$');

alter table public.directory_listings drop constraint if exists directory_listings_photos_shape;
alter table public.directory_listings add constraint directory_listings_photos_shape
  check (
    coalesce(array_length(photo_paths, 1), 0) <= 6
    and array_to_string(photo_paths, ',') ~ '^([0-9a-f-]{36}/[0-9a-f-]{36}\.(png|jpg|webp)(,[0-9a-f-]{36}/[0-9a-f-]{36}\.(png|jpg|webp))*)?$'
  );

alter table public.directory_listings drop constraint if exists directory_listings_pending_media_object;
alter table public.directory_listings add constraint directory_listings_pending_media_object
  check (pending_media is null or (jsonb_typeof(pending_media) = 'object' and pg_column_size(pending_media) <= 2048));

-- The description may now be left empty; when given, the old rule holds.
alter table public.directory_listings drop constraint if exists directory_listings_description_len;
alter table public.directory_listings add constraint directory_listings_description_len
  check (char_length(description) = 0 or char_length(description) between 20 and 400);

-- A waiting edit now carries the details too.
alter table public.directory_listings drop constraint if exists directory_listings_pending_changes_object;
alter table public.directory_listings add constraint directory_listings_pending_changes_object
  check (
    pending_changes is null
    or (jsonb_typeof(pending_changes) = 'object' and pg_column_size(pending_changes) <= 8192)
  );

-- ---------------------------------------------------------------- added with permission
-- The owner may phone a business, get its spoken permission, and enter its
-- PUBLIC details himself (app/actions/platform-directory.ts, platform admins
-- only). Such a listing records where it came from and who said yes, when.
-- The business is emailed straight away with its confirm / manage link, and
-- can confirm, edit or remove it like any lister. It is never added from
-- public records: every row is either listed by the business itself or
-- added with a named person's permission on a stated date.
--
-- Two choices for the owner (default: wait):
--   * wait for the business to confirm by email, then review and publish as
--     usual (status pending_email, the normal lifecycle);
--   * publish now as "added with permission, awaiting the owner's
--     confirmation": status published while email_confirmed_at is still
--     null. The public page then asks "Is this your business? Confirm or
--     edit your listing" and says nothing else about the source.

alter table public.directory_listings add column if not exists source text not null default 'self_listed';
alter table public.directory_listings add column if not exists permission_given_by text;
alter table public.directory_listings add column if not exists permission_given_at date;
alter table public.directory_listings add column if not exists permission_note text;
alter table public.directory_listings add column if not exists added_by uuid references public.profiles (id) on delete set null;

comment on column public.directory_listings.source is
  'self_listed: the business used the public form. added_with_permission: a platform admin entered it after the named person agreed. Private; the public functions return only whether the owner has confirmed.';

alter table public.directory_listings drop constraint if exists directory_listings_source_check;
alter table public.directory_listings add constraint directory_listings_source_check
  check (source in ('self_listed', 'added_with_permission'));

-- Who said yes, and when, is required for an added listing and absent otherwise.
alter table public.directory_listings drop constraint if exists directory_listings_permission_complete;
alter table public.directory_listings add constraint directory_listings_permission_complete
  check (
    (source = 'self_listed' and permission_given_by is null and permission_given_at is null)
    or (
      source = 'added_with_permission'
      and char_length(btrim(permission_given_by)) between 2 and 120
      and permission_given_at is not null
    )
  );

alter table public.directory_listings drop constraint if exists directory_listings_permission_note_len;
alter table public.directory_listings add constraint directory_listings_permission_note_len
  check (permission_note is null or char_length(permission_note) <= 500);

-- A published listing was confirmed by its lister, or was added with a
-- named person's permission (and is then shown as awaiting confirmation).
alter table public.directory_listings drop constraint if exists directory_listings_published_is_complete;
alter table public.directory_listings add constraint directory_listings_published_is_complete
  check (
    status <> 'published'
    or (
      published_at is not null
      and (email_confirmed_at is not null or source = 'added_with_permission')
    )
  );

-- ---------------------------------------------------------------- images

-- Approved images. Public read is the point: they show on the listing page.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('directory-public', 'directory-public', true, 3000000, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Uploads waiting for review. NOT public, and no policy opens it: only the
-- service role (the server, after checking the lister's signed link or the
-- reviewer's session) reads or writes it.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('directory-pending', 'directory-pending', false, 3000000, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------- numbers

create table if not exists public.directory_listing_daily_stats (
  listing_id uuid not null references public.directory_listings (id) on delete cascade,
  day date not null,
  views integer not null default 0,
  calls integer not null default 0,
  website_taps integer not null default 0,
  directions_taps integer not null default 0,
  primary key (listing_id, day),
  constraint directory_listing_daily_stats_nonnegative
    check (views >= 0 and calls >= 0 and website_taps >= 0 and directions_taps >= 0)
);

comment on table public.directory_listing_daily_stats is
  'Per listing, per UTC day: page views and button taps. Counts only; no visitor, device or address is stored. Service role only.';

alter table public.directory_listing_daily_stats enable row level security;
revoke all on table public.directory_listing_daily_stats from public;
revoke all on table public.directory_listing_daily_stats from anon;
revoke all on table public.directory_listing_daily_stats from authenticated;
grant all on table public.directory_listing_daily_stats to service_role;

-- One row per listing per month whose numbers were emailed (or deliberately
-- skipped). Claimed before sending, so a second run of the monthly job finds
-- the row and sends nothing.
create table if not exists public.directory_stats_emails (
  listing_id uuid not null references public.directory_listings (id) on delete cascade,
  month date not null,
  outcome text not null default 'claimed',
  created_at timestamptz not null default now(),
  primary key (listing_id, month),
  constraint directory_stats_emails_month_first check (extract(day from month) = 1),
  constraint directory_stats_emails_outcome_check check (outcome in ('claimed', 'sent', 'skipped', 'failed'))
);

comment on table public.directory_stats_emails is
  'Which months of numbers were emailed to which listing. Service role only.';

alter table public.directory_stats_emails enable row level security;
revoke all on table public.directory_stats_emails from public;
revoke all on table public.directory_stats_emails from anon;
revoke all on table public.directory_stats_emails from authenticated;
grant all on table public.directory_stats_emails to service_role;

-- Counts one view or tap on a PUBLISHED listing, by its public slug. Returns
-- false (and stores nothing) for an unknown event or a listing that is not
-- live. The day is the database's own UTC date; a caller cannot choose it.
create or replace function public.directory_record_listing_event(p_slug text, p_event text)
returns boolean
language plpgsql
volatile
set search_path = public, pg_temp
as $$
declare
  v_listing uuid;
  v_day date := (now() at time zone 'utc')::date;
begin
  if p_event is null or p_event not in ('view', 'call', 'website', 'directions') then
    return false;
  end if;

  select l.id into v_listing
  from public.directory_listings l
  where l.slug = p_slug
    and l.status = 'published';

  if v_listing is null then
    return false;
  end if;

  insert into public.directory_listing_daily_stats as s (listing_id, day, views, calls, website_taps, directions_taps)
  values (
    v_listing,
    v_day,
    (p_event = 'view')::int,
    (p_event = 'call')::int,
    (p_event = 'website')::int,
    (p_event = 'directions')::int
  )
  on conflict (listing_id, day) do update set
    views = s.views + excluded.views,
    calls = s.calls + excluded.calls,
    website_taps = s.website_taps + excluded.website_taps,
    directions_taps = s.directions_taps + excluded.directions_taps;

  return true;
end;
$$;

comment on function public.directory_record_listing_event(text, text) is
  'Adds one view or tap to a published listing''s count for today (UTC). Stores counts only. Service role only.';

-- ---------------------------------------------------------------- public reads

-- Which place-and-trade combinations have published listings, and how many.
-- For the search page's live chips, the place pages and the sitemap. Counts
-- of businesses BASED in a city; never a name, an email or an id.
create or replace function public.directory_facets()
returns jsonb
language sql
stable
set search_path = public, pg_temp
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object('state', f.state, 'city', f.city, 'trade', f.trade_type, 'count', f.listings)
      order by f.state, lower(f.city), f.trade_type
    ),
    '[]'::jsonb
  )
  from (
    select l.state, min(l.city) as city, l.trade_type, count(*) as listings
    from public.directory_listings l
    where l.status = 'published'
    group by l.state, lower(l.city), l.trade_type
    limit 5000
  ) f;
$$;

comment on function public.directory_facets() is
  'Published listing counts by state, city and trade. No names, emails or ids. Service role only.';

-- Same as 211, plus the few new public fields a result card shows.
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
            'is_member', page.is_member,
            'services', page.services,
            'emergency_service', page.emergency_service,
            'year_founded', page.year_founded,
            'logo_path', page.logo_path,
            'awaiting_owner', (page.source = 'added_with_permission' and page.email_confirmed_at is null)
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
  'Public directory search: public columns of published listings only, members first, with a total. Never returns contact_email, the linked workspace id, pending changes or media, or unpublished rows. Service role only.';

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
    'is_member', (l.claimed_company_id is not null and l.member_active),
    'services', l.services,
    'hours', l.hours,
    'license_number', l.license_number,
    'license_state', l.license_state,
    'insured', l.insured,
    'emergency_service', l.emergency_service,
    'year_founded', l.year_founded,
    'service_radius_miles', l.service_radius_miles,
    'languages', l.languages,
    'logo_path', l.logo_path,
    'photo_paths', l.photo_paths,
    -- Added with permission and not yet confirmed by the business. A yes/no
    -- only: never who gave permission, when, or the note.
    'awaiting_owner', (l.source = 'added_with_permission' and l.email_confirmed_at is null)
  )
  from public.directory_listings l
  where l.slug = p_slug
    and l.status = 'published';
$$;

comment on function public.directory_public_listing(text) is
  'One published directory listing by slug, public columns only (approved details and approved image paths), with is_member; null when there is none. Service role only.';

revoke all on function public.directory_search_listings(text, text, text, boolean, integer, integer) from public;
revoke all on function public.directory_search_listings(text, text, text, boolean, integer, integer) from anon;
revoke all on function public.directory_search_listings(text, text, text, boolean, integer, integer) from authenticated;
grant execute on function public.directory_search_listings(text, text, text, boolean, integer, integer) to service_role;

revoke all on function public.directory_public_listing(text) from public;
revoke all on function public.directory_public_listing(text) from anon;
revoke all on function public.directory_public_listing(text) from authenticated;
grant execute on function public.directory_public_listing(text) to service_role;

revoke all on function public.directory_facets() from public;
revoke all on function public.directory_facets() from anon;
revoke all on function public.directory_facets() from authenticated;
grant execute on function public.directory_facets() to service_role;

revoke all on function public.directory_record_listing_event(text, text) from public;
revoke all on function public.directory_record_listing_event(text, text) from anon;
revoke all on function public.directory_record_listing_event(text, text) from authenticated;
grant execute on function public.directory_record_listing_event(text, text) to service_role;
