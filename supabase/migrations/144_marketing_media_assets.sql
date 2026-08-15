-- Media transport bridge: rendered MP4s reachable by publishing APIs.
--
-- ===================== WHY THIS EXISTS =====================
-- AltairDemoTool writes a finished master to an absolute path on the machine
-- that rendered it. The snapshot contract forbids transporting that path —
-- correctly, since it is useless remotely and leaky if stored. The result,
-- recorded in the integration audit: YouTube and TikTok could be fully
-- authorized and still publish nothing, because neither can reach the bytes.
--
-- This migration creates the only two things needed to close that gap: a
-- PRIVATE bucket, and a table of stable references to objects inside it.
--
-- ==================== WHAT IS AND IS NOT STORED ====================
-- STORED:     bucket name, object key, content type, size, checksum,
--             and the render's own dimensions.
-- NOT STORED: filesystem paths, signed URLs, public URLs, tokens.
--
-- A signed URL is a temporary capability, not an identity. Persisting one
-- converts a 15-minute grant into a permanent one that outlives every access
-- decision made around it. They are minted at read time and discarded.

-- ------------------------------------------------------------------ bucket
-- PRIVATE (public = false), unlike 126's founder-screenshots bucket which is
-- deliberately public because those images are marketing collateral Meta must
-- fetch anonymously. Rendered video is not collateral: it is company content
-- that must only ever be reachable through a grant this deployment issues.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'marketing-media',
  'marketing-media',
  false,
  2147483648,             -- 2 GB, matching MEDIA_MAX_BYTES
  array['video/mp4']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- NO storage.objects policies are created for `authenticated` or `anon`.
--
-- That absence is the access control, and it is deliberate rather than an
-- omission. Storage RLS denies by default, so with no policy the only way to
-- read or write an object in this bucket is the service role — which means
-- every access passes through server-side code that has already authorized
-- the caller and bound the company. Adding an `authenticated` read policy
-- later would widen this to any signed-in user in any company.
--
-- Previously-created policies are dropped so a re-run converges on the
-- private posture rather than leaving an older, wider grant in place.
drop policy if exists "anyone can read marketing media" on storage.objects;
drop policy if exists "authenticated can read marketing media" on storage.objects;

-- ------------------------------------------------------------------- table
create table if not exists public.marketing_media_assets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,

  -- The render job that produced this media. Together with company_id it is
  -- the IDEMPOTENCY KEY: re-uploading the same job replaces the same object
  -- instead of creating a second one.
  source_job_id text not null,

  bucket text not null default 'marketing-media',
  -- Derived server-side as `{company_id}/video/{source_job_id}.mp4`. Tenant
  -- isolation is structural: the company id is the first path segment, so one
  -- company's media cannot be addressed from another's prefix.
  object_key text not null,

  content_type text not null default 'video/mp4',
  byte_size bigint,
  checksum_sha256 text,

  -- Render metadata, carried so the control plane can describe a video
  -- without fetching it. Nullable on purpose: an older editor reports no
  -- media block, and null must stay distinguishable from zero.
  duration_ms integer,
  width_px integer,
  height_px integer,

  -- pending: key reserved, bytes not confirmed.
  -- stored:  bytes present and metadata recorded.
  -- failed:  the attempt did not complete.
  upload_state text not null default 'pending',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  stored_at timestamptz,

  constraint marketing_media_assets_state_check
    check (upload_state in ('pending', 'stored', 'failed')),
  constraint marketing_media_assets_type_check
    check (content_type in ('video/mp4')),
  constraint marketing_media_assets_size_check
    check (byte_size is null or (byte_size > 0 and byte_size <= 2147483648)),
  -- Defence in depth behind the application's own `assertNotLocalPath`: a
  -- key containing a scheme, a drive letter, a traversal or a leading slash
  -- is rejected by the database itself.
  constraint marketing_media_assets_key_shape_check
    check (
      object_key !~ '^[A-Za-z][A-Za-z0-9+.-]*://'
      and object_key !~ '^[A-Za-z]:[\\/]'
      and object_key not like '/%'
      and object_key not like '\%'
      and object_key not like '%..%'
      and object_key like '%/video/%'
    ),
  constraint marketing_media_assets_unique
    unique (company_id, source_job_id)
);

create index if not exists marketing_media_assets_company_state_idx
  on public.marketing_media_assets (company_id, upload_state);

-- Abandoned reservations, for cleanup.
create index if not exists marketing_media_assets_pending_idx
  on public.marketing_media_assets (company_id, created_at)
  where upload_state = 'pending';

drop trigger if exists marketing_media_assets_set_updated_at
  on public.marketing_media_assets;
create trigger marketing_media_assets_set_updated_at
before update on public.marketing_media_assets
for each row execute function public.set_updated_at();

alter table public.marketing_media_assets enable row level security;

-- Dispatchers may SEE that media exists and what it is. They cannot reach the
-- bytes: nothing in this table is a capability, and the bucket has no
-- policy for them. "Is the video ready?" is an operational question; "give me
-- the video" is an access decision made server-side.
create policy "dispatchers can read marketing media assets"
  on public.marketing_media_assets
  for select
  to authenticated
  using (
    public.is_active_company_member(company_id)
    and public.can_dispatch_jobs(company_id)
  );

-- RLS narrows an existing privilege; it does not create one. Without this
-- grant the policy above would be silently inert — the defect caught by
-- audit in migration 143.
grant select on table public.marketing_media_assets to authenticated;
revoke insert, update, delete on table public.marketing_media_assets from authenticated;
revoke all on table public.marketing_media_assets from anon;
grant all on table public.marketing_media_assets to service_role;

comment on table public.marketing_media_assets is
  'Stable references to rendered video in the private marketing-media bucket. Stores bucket + object key only; never a filesystem path, signed URL, or public URL. Unique (company_id, source_job_id) makes upload idempotent.';

comment on column public.marketing_media_assets.object_key is
  'Server-derived as {company_id}/video/{source_job_id}.mp4. Never accepted from a request payload — a payload must not be able to choose which company prefix it writes to.';
