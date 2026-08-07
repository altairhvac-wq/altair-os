-- Design Lab Stage 2: company-scoped saved theme drafts (preview persistence only).
-- Promote-to-live is Stage 3 — is_active only marks the company's active draft.

create table public.design_lab_themes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  tokens jsonb not null,
  is_active boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint design_lab_themes_name_not_blank
    check (char_length(trim(name)) > 0),
  constraint design_lab_themes_tokens_is_object
    check (jsonb_typeof(tokens) = 'object')
);

create index design_lab_themes_company_id_updated_at_idx
  on public.design_lab_themes (company_id, updated_at desc);

-- At most one active draft theme per company.
create unique index design_lab_themes_one_active_per_company_uidx
  on public.design_lab_themes (company_id)
  where is_active = true;

drop trigger if exists design_lab_themes_set_updated_at
  on public.design_lab_themes;
create trigger design_lab_themes_set_updated_at
before update on public.design_lab_themes
for each row execute function public.set_updated_at();

alter table public.design_lab_themes enable row level security;

-- Same gate as company settings (owner/admin manageCompany). Design Lab UI remains
-- platform-admin-only; RLS stays aligned with company-settings write access.
create policy "company settings managers can select design lab themes"
  on public.design_lab_themes
  for select
  to authenticated
  using (
    public.is_active_company_member(company_id)
    and public.has_company_role(
      company_id,
      array['owner', 'admin']::public.company_role[]
    )
  );

create policy "company settings managers can insert design lab themes"
  on public.design_lab_themes
  for insert
  to authenticated
  with check (
    public.is_active_company_member(company_id)
    and public.has_company_role(
      company_id,
      array['owner', 'admin']::public.company_role[]
    )
  );

create policy "company settings managers can update design lab themes"
  on public.design_lab_themes
  for update
  to authenticated
  using (
    public.is_active_company_member(company_id)
    and public.has_company_role(
      company_id,
      array['owner', 'admin']::public.company_role[]
    )
  )
  with check (
    public.is_active_company_member(company_id)
    and public.has_company_role(
      company_id,
      array['owner', 'admin']::public.company_role[]
    )
  );

create policy "company settings managers can delete design lab themes"
  on public.design_lab_themes
  for delete
  to authenticated
  using (
    public.is_active_company_member(company_id)
    and public.has_company_role(
      company_id,
      array['owner', 'admin']::public.company_role[]
    )
  );

revoke all on table public.design_lab_themes from authenticated;
revoke all on table public.design_lab_themes from anon;

grant select, insert, update, delete on table public.design_lab_themes to authenticated;
grant all on table public.design_lab_themes to service_role;

comment on table public.design_lab_themes is
  'Design Lab saved theme drafts (Stage 2). Tokens are keyed by live CSS custom property names. is_active marks the company active draft only — promote-to-live is Stage 3.';

comment on column public.design_lab_themes.tokens is
  'JSON object keyed by CSS custom property names (e.g. --north-star-sidebar), values are color strings.';

comment on column public.design_lab_themes.is_active is
  'At most one true per company (partial unique index). Tracks the active draft; does not apply theme to live product chrome.';
