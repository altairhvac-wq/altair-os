-- Multi-format media: images alongside video, in the same table and bucket.
--
-- ========================= WHY THIS EXISTS =========================
-- Migration 144 built the media bridge for exactly one thing, a rendered MP4,
-- and said so in three places at once: `allowed_mime_types` on the bucket is
-- array['video/mp4'], the content_type CHECK admits 'video/mp4' and nothing
-- else, and the object_key CHECK requires a literal `/video/` segment. Any one
-- of those three refuses an image; all three together mean that half the
-- capability matrix cannot be reached at all.
--
-- What that costs, concretely: a YouTube upload has no thumbnail to attach, a
-- LinkedIn or Reddit post has no image, and Google Business — whose entry in
-- `shared/types/integration-capability.ts` reads acceptsMediaKinds: ["image"]
-- and accepts no video whatsoever — can never be given anything at all. The
-- OAuth, the token storage, the delivery ledger and the publish gate for those
-- providers can all be finished and correct, and nothing will ever publish,
-- for the same reason 144 itself was written: nobody can reach the bytes.
--
-- ==================== A WIDENING, NOT A SECOND TABLE ====================
-- Every part of 144 that is hard is already right here: the company-prefixed
-- object key that makes tenant isolation structural, `unique (company_id,
-- source_job_id)` as the idempotency key, the read gate that re-derives the
-- key and refuses a mismatch, the private bucket with no policy for
-- `authenticated`, and the dispatcher-read-only RLS posture. A parallel
-- `marketing_image_assets` would fork all six and would have to be kept in
-- agreement with this one by hand, forever. 143's header states the principle
-- and this follows it: extend the model that works.
--
-- ================== THE LIVE AGENT BRIDGE MUST NOT NOTICE ==================
-- `/api/agent/media` is in production and sends no media kind — there was
-- nothing to send. Both writers, `lib/database/queries/marketing-media-assets.ts`
-- (reserve) and `lib/storage/marketing-media.ts` (direct upload), insert
-- without one. So `media_kind` is NOT NULL DEFAULT 'video' and content_type
-- keeps its 'video/mp4' default: every row that exists today and every INSERT
-- that exists today keeps meaning precisely what it meant, with no backfill
-- and no coordinated deploy.
--
-- The agreement CHECK below then does something better than merely tolerate
-- those callers. It FORCES a future image writer to declare itself: a caller
-- that writes an `/image/` object key while leaving the kind at its default is
-- refused by the database, rather than storing a row whose key the read gate
-- can never re-derive and whose bytes therefore become permanently
-- unreachable. A half-migrated writer fails loudly at the insert instead of
-- quietly producing dead assets.
--
-- ============= WHY THE IMAGE CEILING IS IN SQL AND NOT IN CODE =============
-- There are TWO application media modules and they do not agree on a ceiling:
--
--   shared/types/marketing-media.ts   MEDIA_MAX_BYTES            2 GB
--   lib/storage/marketing-media.ts    MARKETING_MEDIA_MAX_BYTES  500 MB
--
-- They guard different routes — the grant-and-PUT bridge and the
-- whole-file-in-one-request ingest — and each is defensible on its own terms.
-- But a limit that depends on which module the write happened to pass through
-- is not a limit, and NEITHER of them would refuse a 400 MB "thumbnail".
-- Service-role scripts and manual fixes pass through neither.
--
-- The bucket cannot help either: `file_size_limit` is one number for the whole
-- bucket and has to stay at the video ceiling for video to work at all. Only a
-- CHECK keyed on media_kind can be strict for images while staying permissive
-- for video, and a CHECK holds for every writer that exists or ever will.
--
-- ==================== WHAT THIS MIGRATION DOES NOT TOUCH ====================
-- The bucket stays private. The 2 GB video ceiling stays. The idempotency key
-- stays. The traversal and absolute-path guards on object_key are carried
-- forward character for character — dropping one while widening the segment
-- rule would be a security regression wearing a feature's clothes, and
-- `scripts/verify-media-multiformat.mjs` compares them clause by clause
-- against 144 rather than trusting this comment.

-- ------------------------------------------------------------------ bucket
-- Widened in place, for the same reason the table is: a second bucket would
-- need its own privacy posture, its own absence-of-policy, and its own place
-- in every purge and reaper path. `public = false` and the 2 GB
-- `file_size_limit` are restated unchanged, so a re-run converges a bucket
-- someone widened or flipped public by hand.
--
-- image/svg+xml is deliberately absent. An SVG is a script container that
-- storage would serve under a signed URL on our own origin; no provider in the
-- capability matrix needs one.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'marketing-media',
  'marketing-media',
  false,
  2147483648,             -- 2 GB, still the VIDEO ceiling; images are bounded below
  array['video/mp4', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- --------------------------------------------------------------- media kind
-- WHAT the object is, mirroring `MediaKind` in
-- `shared/types/integration-capability.ts`, which is what the publish gate
-- reads when it asks whether a provider accepts this asset.
--
-- Not derived from content_type at read time, even though today it could be.
-- The kind is what the OBJECT KEY is built from — `{company}/video/...` versus
-- `{company}/image/...` — so it has to be a stored fact that the key
-- derivation and the read gate can both consult, not an inference that two
-- call sites might make differently.
alter table public.marketing_media_assets
  add column if not exists media_kind text not null default 'video';

alter table public.marketing_media_assets
  drop constraint if exists marketing_media_assets_media_kind_check;
alter table public.marketing_media_assets
  add constraint marketing_media_assets_media_kind_check
    check (media_kind in ('video', 'image'));

-- ------------------------------------------------------------ content types
-- Replaces 144's `check (content_type in ('video/mp4'))`. The same constraint
-- name is reused rather than adding a second one: one rule about what this
-- column may hold, in one place, so a later reader is never left comparing two
-- overlapping constraints to work out the real answer.
alter table public.marketing_media_assets
  drop constraint if exists marketing_media_assets_type_check;
alter table public.marketing_media_assets
  add constraint marketing_media_assets_type_check
    check (
      content_type in ('video/mp4', 'image/jpeg', 'image/png', 'image/webp')
    );

-- ---------------------------------------------------------------- agreement
-- The three facts about an asset — its kind, its content type, and the path
-- segment its key was built from — must describe the SAME object.
--
-- Widening content_type on its own would make a genuinely bad row
-- representable: media_kind 'video', content_type 'image/jpeg', object_key
-- `{company}/video/{job}.mp4`. Nothing about that row is null or malformed, so
-- every column-level constraint passes it. What it produces is a publish path
-- that reads media_kind, believes it has a video, hands a JPEG to a resumable
-- YouTube upload, and fails at the provider with an error about the bytes
-- rather than here with an error about the record.
--
-- Stated as one constraint rather than two, because the pairing is the fact:
-- an image is an image in all three columns or the row is not written.
--
-- Each branch also EXCLUDES the other kind's segment, and that clause is what
-- makes the segment test mean what this comment claims. `like '%/video/%'` on
-- its own is satisfied by a key that contains `/image/` as well, so a pair of
-- bare LIKEs lets a row match on whichever branch it declares and admits the
-- precise row named above: `{company}/video/thumbs/image/x.jpg` declares itself
-- an image, finds its `/image/`, and is stored as a JPEG living under a video
-- path — the thing the publish gate would later hand to a resumable YouTube
-- upload. `{company}/image/nested/video/x.mp4` is the same hole mirrored.
--
-- Nothing `buildMediaObjectKey` derives can contain both segments — sourceJobId
-- is alphanumerics, dashes and underscores — so no existing writer can trip
-- these clauses, and that is exactly why they belong here rather than in code.
-- This CHECK is the only guard standing over the writers that skip the
-- derivation: service-role scripts, manual fixes, and the image writer that
-- does not exist yet. Defence in depth that holds only for the callers who were
-- already correct is not defence in depth.
alter table public.marketing_media_assets
  drop constraint if exists marketing_media_assets_kind_agreement_check;
alter table public.marketing_media_assets
  add constraint marketing_media_assets_kind_agreement_check
    check (
      (
        media_kind = 'video'
        and content_type = 'video/mp4'
        and object_key like '%/video/%'
        and object_key not like '%/image/%'
      )
      or (
        media_kind = 'image'
        and content_type in ('image/jpeg', 'image/png', 'image/webp')
        and object_key like '%/image/%'
        and object_key not like '%/video/%'
      )
    );

-- ------------------------------------------------------------- key shape
-- 144's guards, carried forward CHARACTER FOR CHARACTER, with one clause
-- widened: `object_key like '%/video/%'` becomes a choice between the two kind
-- segments. Nothing else about the rule changes.
--
-- The five guards above the segment rule are the reason this constraint
-- exists at all — defence in depth behind the application's own
-- `assertNotLocalPath`, so a key carrying a scheme, a drive letter, a leading
-- separator or a traversal is refused by the database itself no matter which
-- path wrote it. They are re-stated here in full because replacing a
-- constraint replaces all of it; a widening that silently shipped four of the
-- five would read like a feature and behave like a hole.
--
-- One of them is narrower than it looks and is left exactly as 144 wrote it:
-- in LIKE, backslash is the default escape character, so `'\%'` is the pattern
-- for a literal percent sign and matches only the one-character string '%',
-- not "starts with a backslash". The leading-slash and drive-letter guards
-- are what actually stop a Windows path, and `assertNotLocalPath` rejects any
-- string containing a backslash before a key is ever derived. Tightening it is
-- a change to what the constraint ACCEPTS and belongs in its own migration
-- that can be reasoned about against live rows — not folded into this one.
alter table public.marketing_media_assets
  drop constraint if exists marketing_media_assets_key_shape_check;
alter table public.marketing_media_assets
  add constraint marketing_media_assets_key_shape_check
    check (
      object_key !~ '^[A-Za-z][A-Za-z0-9+.-]*://'
      and object_key !~ '^[A-Za-z]:[\\/]'
      and object_key not like '/%'
      and object_key not like '\%'
      and object_key not like '%..%'
      and (object_key like '%/video/%' or object_key like '%/image/%')
    );

-- ------------------------------------------------------------ image ceiling
-- 25 MB. 144's `marketing_media_assets_size_check` is untouched and still
-- bounds every row at 2 GB; this one applies on top of it, and only to images.
--
-- The number is a SANITY bound, not a provider limit. Per-provider maxima — a
-- YouTube thumbnail is 2 MB — belong in the capability matrix, which can
-- refuse before an upload starts and can name which provider refused. What the
-- database has to prevent is the different thing: an object that is not a
-- still image at all, filed as one, consuming the video budget. 25 MB sits
-- above every per-image limit those providers publish and roughly eighty times
-- below the video ceiling.
--
-- `byte_size is null` stays acceptable because a reservation exists before its
-- bytes do; null means not yet known, and 144 deliberately keeps that
-- distinguishable from zero.
alter table public.marketing_media_assets
  drop constraint if exists marketing_media_assets_image_size_check;
alter table public.marketing_media_assets
  add constraint marketing_media_assets_image_size_check
    check (
      media_kind <> 'image'
      or byte_size is null
      or (byte_size > 0 and byte_size <= 26214400)
    );

-- ------------------------------------------------------------------ indexes
-- 144's (company_id, upload_state) index cannot answer the question every new
-- consumer asks — "which stored IMAGES does this company have?" — without
-- reading the video rows too, and video rows will always outnumber them.
create index if not exists marketing_media_assets_company_kind_idx
  on public.marketing_media_assets (company_id, media_kind, upload_state);

-- -------------------------------------------------------- privilege posture
-- Restated, not changed. This migration widens WHAT the table may hold, and
-- the next question a reviewer of that widening has to answer is who may now
-- read it. These lines are that answer, they are idempotent, and having them
-- here means 183 can be reviewed without opening 144 to find out whether
-- images just became visible to someone new. They did not.
--
-- RLS narrows an existing privilege; it does not create one. A SELECT policy
-- without the matching GRANT is silently inert (143, lines 147-151).
--
-- 144's dispatcher SELECT policy and its updated_at trigger are deliberately
-- NOT restated. Those are definitions, and a definition written in two
-- migrations is a definition that can drift; a grant has one correct form and
-- cannot.
alter table public.marketing_media_assets enable row level security;

grant select on table public.marketing_media_assets to authenticated;
revoke insert, update, delete on table public.marketing_media_assets from authenticated;
revoke all on table public.marketing_media_assets from anon;
grant all on table public.marketing_media_assets to service_role;

-- ----------------------------------------------------------------- comments
comment on table public.marketing_media_assets is
  'Stable references to rendered video AND still images in the private marketing-media bucket. Stores bucket + object key only; never a filesystem path, signed URL, or public URL. Unique (company_id, source_job_id) makes upload idempotent. media_kind, content_type and the object key''s own segment are constrained to agree (migration 183).';

comment on column public.marketing_media_assets.media_kind is
  'What the object IS: video or image. Mirrors MediaKind in shared/types/integration-capability.ts, which the publish gate reads to decide whether a provider accepts this asset. Defaults to video so every row and every writer that predates this column keeps its meaning; an image writer must therefore say so, and a caller that writes an /image/ key without declaring the kind is refused rather than storing an asset the read gate could never re-derive.';

comment on column public.marketing_media_assets.object_key is
  'Server-derived from the company, the media kind and the source job — {company_id}/video/{source_job_id}.mp4 for video, {company_id}/image/{source_job_id} for an image. Never accepted from a request payload: a payload must not be able to choose which company prefix it writes to. The kind segment is constrained to agree with media_kind and content_type.';
