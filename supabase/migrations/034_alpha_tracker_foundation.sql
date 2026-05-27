-- Alpha tracker foundation: lightweight internal bug/feature tracking for alpha testing.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'alpha_tracker_type') then
    create type public.alpha_tracker_type as enum (
      'bug',
      'feature',
      'polish',
      'unfinished'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'alpha_tracker_severity') then
    create type public.alpha_tracker_severity as enum (
      'critical',
      'high',
      'medium',
      'low'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'alpha_tracker_status') then
    create type public.alpha_tracker_status as enum (
      'open',
      'in_progress',
      'fixed',
      'deferred'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'alpha_tracker_device') then
    create type public.alpha_tracker_device as enum (
      'desktop',
      'mobile',
      'both'
    );
  end if;
end $$;

create table if not exists public.alpha_tracker_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  title text not null,
  description text,
  type public.alpha_tracker_type not null default 'bug',
  severity public.alpha_tracker_severity not null default 'medium',
  status public.alpha_tracker_status not null default 'open',
  page_or_area text,
  device public.alpha_tracker_device not null default 'both',
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists alpha_tracker_items_company_id_created_at_idx
  on public.alpha_tracker_items (company_id, created_at desc);

create index if not exists alpha_tracker_items_company_id_status_idx
  on public.alpha_tracker_items (company_id, status);

drop trigger if exists alpha_tracker_items_set_updated_at on public.alpha_tracker_items;
create trigger alpha_tracker_items_set_updated_at
before update on public.alpha_tracker_items
for each row execute function public.set_updated_at();

alter table public.alpha_tracker_items enable row level security;

drop policy if exists "company members can read alpha tracker items" on public.alpha_tracker_items;
create policy "company members can read alpha tracker items"
on public.alpha_tracker_items
for select
to authenticated
using (public.is_active_company_member(company_id));

drop policy if exists "company members can insert alpha tracker items" on public.alpha_tracker_items;
create policy "company members can insert alpha tracker items"
on public.alpha_tracker_items
for insert
to authenticated
with check (
  public.is_active_company_member(company_id)
  and created_by = auth.uid()
);

drop policy if exists "creators and admins can update alpha tracker items" on public.alpha_tracker_items;
create policy "creators and admins can update alpha tracker items"
on public.alpha_tracker_items
for update
to authenticated
using (
  public.is_active_company_member(company_id)
  and (
    created_by = auth.uid()
    or public.has_company_role(company_id, array['owner', 'admin']::public.company_role[])
  )
)
with check (
  public.is_active_company_member(company_id)
  and (
    created_by = auth.uid()
    or public.has_company_role(company_id, array['owner', 'admin']::public.company_role[])
  )
);

grant select, insert, update on table public.alpha_tracker_items to authenticated;
grant all on table public.alpha_tracker_items to service_role;
