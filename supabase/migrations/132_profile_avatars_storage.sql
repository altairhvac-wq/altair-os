-- Profile avatars: public storage bucket + self-service policies.
--
-- profiles.avatar_url has existed since 001_core_auth.sql but was never
-- wired to an upload path. This adds the storage home for the images.
-- Avatars are intentionally public-read (they render in shared UI chrome
-- and carry no sensitive data); writes are restricted to each user's own
-- folder ({user_id}/...). Admin-sets-member-photo goes through a server
-- action using the service role after an app-level owner/admin check, so
-- no cross-user client policy is needed.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatars are publicly readable" on storage.objects;
create policy "avatars are publicly readable"
on storage.objects
for select
to public
using (bucket_id = 'avatars');

drop policy if exists "users can upload own avatar" on storage.objects;
create policy "users can upload own avatar"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "users can update own avatar" on storage.objects;
create policy "users can update own avatar"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "users can delete own avatar" on storage.objects;
create policy "users can delete own avatar"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);
