-- Design Lab Stage 3: promote-to-live.
-- is_active remains the Design Lab active-draft bookmark (Stage 2).
-- is_live marks the theme whose tokens are injected into live admin chrome.

alter table public.design_lab_themes
  add column if not exists is_live boolean not null default false;

-- At most one live-promoted theme per company.
create unique index if not exists design_lab_themes_one_live_per_company_uidx
  on public.design_lab_themes (company_id)
  where is_live = true;

comment on table public.design_lab_themes is
  'Design Lab saved themes. Tokens are keyed by live CSS custom property names. is_active marks the company active draft; is_live marks the theme applied to live admin chrome (Stage 3).';

comment on column public.design_lab_themes.is_active is
  'At most one true per company (partial unique index). Design Lab active-draft bookmark; does not apply theme to live product chrome by itself.';

comment on column public.design_lab_themes.is_live is
  'At most one true per company (partial unique index). When true, tokens are injected into .admin-north-star-shell for all members of that company.';

-- Live chrome injection runs for every active company member (not only
-- owner/admin). Allow members to read the single live row; draft CRUD stays
-- on the existing owner/admin policies.
drop policy if exists "company members can select live design lab themes"
  on public.design_lab_themes;

create policy "company members can select live design lab themes"
  on public.design_lab_themes
  for select
  to authenticated
  using (
    public.is_active_company_member(company_id)
    and is_live = true
  );
