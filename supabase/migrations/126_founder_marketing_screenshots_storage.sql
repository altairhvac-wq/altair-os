-- Public storage bucket for founder marketing product screenshots.
-- Intentional public read: these images are shared on social media.
-- Write access is platform-admin only (same gate as founder_screenshot_reference).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'founder-marketing-screenshots',
  'founder-marketing-screenshots',
  true,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "anyone can read founder marketing screenshots" on storage.objects;
create policy "anyone can read founder marketing screenshots"
on storage.objects
for select
to public
using (bucket_id = 'founder-marketing-screenshots');

drop policy if exists "platform admins can upload founder marketing screenshots" on storage.objects;
create policy "platform admins can upload founder marketing screenshots"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'founder-marketing-screenshots'
  and public.can_access_platform_admin()
);

drop policy if exists "platform admins can delete founder marketing screenshots" on storage.objects;
create policy "platform admins can delete founder marketing screenshots"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'founder-marketing-screenshots'
  and public.can_access_platform_admin()
);
