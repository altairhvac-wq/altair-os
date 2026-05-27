-- Remote databases that received invite migrations (029–030, 037) without a full
-- 002_app_core push are missing core company_memberships RLS policies. Without
-- "owners and admins can manage memberships", authenticated INSERT is denied by
-- RLS even when table-level INSERT is granted.

grant insert, select, update on table public.company_memberships to authenticated;

drop policy if exists "company members can view memberships" on public.company_memberships;
create policy "company members can view memberships"
on public.company_memberships
for select
to authenticated
using (public.is_active_company_member(company_id));

drop policy if exists "owners and admins can manage memberships" on public.company_memberships;
create policy "owners and admins can manage memberships"
on public.company_memberships
for all
to authenticated
using (
  public.has_company_role(
    company_id,
    array['owner', 'admin']::public.company_role[]
  )
)
with check (
  public.has_company_role(
    company_id,
    array['owner', 'admin']::public.company_role[]
  )
);
