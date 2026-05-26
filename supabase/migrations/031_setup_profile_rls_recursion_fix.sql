-- Fix setup/login regression after invite acceptance RLS (030).
--
-- current_user_profile_email() reads profiles while evaluating company_memberships
-- policies. The fellow-member profiles policy (010) reads company_memberships,
-- which re-enters profiles and triggers "infinite recursion detected in policy".
-- SECURITY DEFINER breaks the cycle safely (same pattern as is_active_company_member).
--
-- Also always sync profiles.default_company_id during bootstrap so stale defaults
-- cannot block post-setup context loading.

create or replace function public.current_user_profile_email()
returns text
language sql
stable
security definer
set search_path = public
as $$
  with identity as (
    select
      lower(trim(p.email)) as profile_email,
      lower(trim(coalesce(auth.jwt() ->> 'email', ''))) as auth_email
    from public.profiles p
    where p.id = auth.uid()
  )
  select case
    when not exists (select 1 from identity) then null
    when (select profile_email from identity) <> ''
         and (select auth_email from identity) <> ''
         and (select profile_email from identity) <> (select auth_email from identity)
      then null
    else coalesce(
      nullif((select profile_email from identity), ''),
      nullif((select auth_email from identity), '')
    )
  end;
$$;

grant execute on function public.current_user_profile_email() to authenticated;

create or replace function public.bootstrap_company_for_new_user(p_company_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_full_name text;
  v_company_id uuid;
  v_slug_base text;
  v_slug text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_company_name is null or length(trim(p_company_name)) = 0 then
    raise exception 'Company name is required';
  end if;

  select
    coalesce(u.email, ''),
    nullif(trim(u.raw_user_meta_data->>'full_name'), '')
  into v_email, v_full_name
  from auth.users u
  where u.id = v_user_id;

  insert into public.profiles (id, email, full_name)
  values (v_user_id, v_email, v_full_name)
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name);

  select cm.company_id
  into v_company_id
  from public.company_memberships cm
  where cm.user_id = v_user_id
    and cm.role = 'owner'
    and cm.status = 'active'
  order by cm.created_at asc
  limit 1;

  if v_company_id is null then
    v_slug_base := lower(regexp_replace(trim(p_company_name), '[^a-zA-Z0-9]+', '-', 'g'));
    v_slug_base := trim(both '-' from v_slug_base);

    if length(v_slug_base) = 0 then
      v_slug_base := 'company';
    end if;

    v_slug := v_slug_base || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);

    insert into public.companies (name, slug)
    values (trim(p_company_name), v_slug)
    returning id into v_company_id;

    insert into public.company_memberships (
      company_id,
      user_id,
      role,
      status,
      joined_at
    )
    values (
      v_company_id,
      v_user_id,
      'owner',
      'active',
      now()
    );
  end if;

  update public.profiles
  set default_company_id = v_company_id
  where id = v_user_id;

  return v_company_id;
end;
$$;

revoke all on function public.bootstrap_company_for_new_user(text) from public;
grant execute on function public.bootstrap_company_for_new_user(text) to authenticated;
