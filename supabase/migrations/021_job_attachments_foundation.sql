-- Job documentation attachments + shared company-files storage bucket.

create table if not exists public.job_attachments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete set null,
  job_id uuid not null references public.jobs (id) on delete cascade,
  uploaded_by uuid references public.profiles (id) on delete set null,
  file_name text not null,
  file_path text not null,
  file_type text,
  mime_type text,
  file_size bigint,
  attachment_type text not null default 'general',
  caption text,
  created_at timestamptz not null default now(),
  constraint job_attachments_attachment_type_check check (
    attachment_type in ('general', 'before', 'after', 'diagnostic', 'equipment')
  )
);

create index if not exists job_attachments_company_job_idx
  on public.job_attachments (company_id, job_id);

create index if not exists job_attachments_job_created_at_idx
  on public.job_attachments (job_id, created_at desc);

create index if not exists job_attachments_customer_created_at_idx
  on public.job_attachments (customer_id, created_at desc)
  where customer_id is not null;

alter table public.job_attachments enable row level security;

drop policy if exists "company members can read job attachments" on public.job_attachments;
create policy "company members can read job attachments"
on public.job_attachments
for select
to authenticated
using (public.is_active_company_member(company_id));

drop policy if exists "company members can insert job attachments" on public.job_attachments;
create policy "company members can insert job attachments"
on public.job_attachments
for insert
to authenticated
with check (public.is_active_company_member(company_id));

grant select, insert on table public.job_attachments to authenticated;
grant all on table public.job_attachments to service_role;

alter type public.job_activity_type add value if not exists 'job_attachment_uploaded';

-- Shared private storage bucket for company-scoped files (jobs now; expenses in 022).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'company-files',
  'company-files',
  false,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'application/pdf'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "company members can read company files" on storage.objects;
create policy "company members can read company files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'company-files'
  and (storage.foldername(name))[1] = 'company'
  and public.is_active_company_member(((storage.foldername(name))[2])::uuid)
);

drop policy if exists "company members can upload company files" on storage.objects;
create policy "company members can upload company files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'company-files'
  and (storage.foldername(name))[1] = 'company'
  and public.is_active_company_member(((storage.foldername(name))[2])::uuid)
);

drop policy if exists "company members can delete company files" on storage.objects;
create policy "company members can delete company files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'company-files'
  and (storage.foldername(name))[1] = 'company'
  and public.is_active_company_member(((storage.foldername(name))[2])::uuid)
);
