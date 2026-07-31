-- Require Stripe Checkout / trial before app access for newly created companies.
-- Existing beta_comped rows are intentionally preserved (no backfill rewrite).

create or replace function public.bootstrap_company_for_new_user(
  p_company_name text,
  p_trade text default null
)
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
  v_trade text := null;
  v_created_new_company boolean := false;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_company_name is null or length(trim(p_company_name)) = 0 then
    raise exception 'Company name is required';
  end if;

  if p_trade is not null and length(trim(p_trade)) > 0 then
    v_trade := lower(trim(p_trade));

    if v_trade not in (
      'hvac',
      'plumbing',
      'electrical',
      'roofing',
      'landscaping',
      'general_contracting',
      'appliance_repair',
      'garage_door',
      'cleaning',
      'other'
    ) then
      raise exception 'Invalid trade selection';
    end if;
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

    insert into public.companies (name, slug, trade)
    values (trim(p_company_name), v_slug, v_trade)
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

    v_created_new_company := true;
  end if;

  update public.profiles
  set default_company_id = v_company_id
  where id = v_user_id;

  if v_created_new_company then
    insert into public.company_subscriptions (
      company_id,
      plan_key,
      status,
      access_grant
    )
    values (
      v_company_id,
      'beta',
      'incomplete',
      'none'
    )
    on conflict (company_id) do nothing;
  end if;

  return v_company_id;
end;
$$;

comment on function public.bootstrap_company_for_new_user(text, text) is
  'Creates a company + owner membership for a new user. New companies start with access_grant=none and status=incomplete until Stripe Checkout activates a trialing/active subscription. Existing beta_comped rows are not modified.';

revoke all on function public.bootstrap_company_for_new_user(text, text) from public;
grant execute on function public.bootstrap_company_for_new_user(text, text) to authenticated;
