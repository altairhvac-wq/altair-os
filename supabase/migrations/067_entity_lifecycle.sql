-- Entity lifecycle: archive, trash, and safe permanent delete across operational records.

alter table public.jobs
  add column if not exists archived_at timestamptz,
  add column if not exists deleted_at timestamptz,
  add column if not exists delete_after timestamptz;

create index if not exists jobs_company_id_archived_at_idx
  on public.jobs (company_id, archived_at)
  where archived_at is not null;

create index if not exists jobs_company_id_deleted_at_idx
  on public.jobs (company_id, deleted_at);

create index if not exists jobs_company_id_delete_after_idx
  on public.jobs (company_id, delete_after)
  where deleted_at is not null;

alter table public.estimates
  add column if not exists archived_at timestamptz,
  add column if not exists deleted_at timestamptz,
  add column if not exists delete_after timestamptz;

create index if not exists estimates_company_id_archived_at_idx
  on public.estimates (company_id, archived_at)
  where archived_at is not null;

create index if not exists estimates_company_id_deleted_at_idx
  on public.estimates (company_id, deleted_at);

create index if not exists estimates_company_id_delete_after_idx
  on public.estimates (company_id, delete_after)
  where deleted_at is not null;

alter table public.invoices
  add column if not exists archived_at timestamptz,
  add column if not exists deleted_at timestamptz,
  add column if not exists delete_after timestamptz;

create index if not exists invoices_company_id_archived_at_idx
  on public.invoices (company_id, archived_at)
  where archived_at is not null;

create index if not exists invoices_company_id_deleted_at_idx
  on public.invoices (company_id, deleted_at);

create index if not exists invoices_company_id_delete_after_idx
  on public.invoices (company_id, delete_after)
  where deleted_at is not null;

alter table public.expenses
  add column if not exists archived_at timestamptz,
  add column if not exists deleted_at timestamptz,
  add column if not exists delete_after timestamptz;

create index if not exists expenses_company_id_archived_at_idx
  on public.expenses (company_id, archived_at)
  where archived_at is not null;

create index if not exists expenses_company_id_deleted_at_idx
  on public.expenses (company_id, deleted_at);

create index if not exists expenses_company_id_delete_after_idx
  on public.expenses (company_id, delete_after)
  where deleted_at is not null;

alter table public.service_items
  add column if not exists archived_at timestamptz,
  add column if not exists deleted_at timestamptz,
  add column if not exists delete_after timestamptz;

create index if not exists service_items_company_id_archived_at_idx
  on public.service_items (company_id, archived_at)
  where archived_at is not null;

create index if not exists service_items_company_id_deleted_at_idx
  on public.service_items (company_id, deleted_at);

create index if not exists service_items_company_id_delete_after_idx
  on public.service_items (company_id, delete_after)
  where deleted_at is not null;
