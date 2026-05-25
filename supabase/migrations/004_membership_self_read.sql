-- Allow authenticated users to read their own membership rows.
-- Without this, the only SELECT policy delegates to is_active_company_member(),
-- which can fail to evaluate for brand-new memberships during /setup bootstrap.

drop policy if exists "users can view own memberships" on public.company_memberships;

create policy "users can view own memberships"
on public.company_memberships
for select
to authenticated
using (auth.uid() = user_id);

grant execute on function public.bootstrap_company_for_new_user(text) to authenticated;
