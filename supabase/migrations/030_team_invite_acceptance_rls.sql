-- Allow authenticated users to discover and accept pending team invites
-- matching their profile email (case-insensitive).

create or replace function public.current_user_profile_email()
returns text
language sql
stable
security invoker
set search_path = public
as $$
  select lower(trim(email))
  from public.profiles
  where id = auth.uid();
$$;

grant execute on function public.current_user_profile_email() to authenticated;

create policy "users can view pending invites for their email"
on public.company_memberships
for select
to authenticated
using (
  status = 'invited'
  and user_id is null
  and invite_email is not null
  and lower(trim(invite_email)) = public.current_user_profile_email()
);

create policy "users can accept pending invites for their email"
on public.company_memberships
for update
to authenticated
using (
  status = 'invited'
  and user_id is null
  and invite_email is not null
  and lower(trim(invite_email)) = public.current_user_profile_email()
)
with check (
  user_id = auth.uid()
  and status = 'active'
  and invite_email is not null
  and lower(trim(invite_email)) = public.current_user_profile_email()
);

create policy "users can view companies with pending invite"
on public.companies
for select
to authenticated
using (
  exists (
    select 1
    from public.company_memberships cm
    where cm.company_id = companies.id
      and cm.status = 'invited'
      and cm.user_id is null
      and cm.invite_email is not null
      and lower(trim(cm.invite_email)) = public.current_user_profile_email()
  )
);
