-- Fix two production failures on the Community page (both pre-existing,
-- surfaced during the Aug 6 architecture pass — they made "My partners" and
-- "Incoming invites" silently render empty):
--
-- 1) [listMyNetworkPartners] 42501 permission denied for table network_partners.
--    The table has RLS policies (073/075/078/079) but was never granted
--    table-level privileges to `authenticated` — RLS only filters rows AFTER
--    the grant allows table access at all. Same fix shape as 007/008/009/015.
--
-- 2) [listIncomingNetworkInvitesForUser] 0A000 "UPDATE is not allowed in a
--    non-volatile function". 084 declared the function STABLE, but its body
--    lazily expires overdue invites with an UPDATE. Recreate without STABLE
--    (i.e. VOLATILE, the default) — body and behavior otherwise identical.

grant select, insert, update, delete on public.network_partners to authenticated;
grant select, insert, update, delete on public.network_partners to service_role;

create or replace function public.list_incoming_network_invites_for_user(
  p_active_company_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_email text;
  v_invites jsonb;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_active_company_id is null then
    return '[]'::jsonb;
  end if;

  if not public.is_active_company_member(p_active_company_id) then
    raise exception 'Not authorized to view invites for this company';
  end if;

  select lower(trim(u.email))
  into v_user_email
  from auth.users u
  where u.id = auth.uid();

  if coalesce(v_user_email, '') = '' then
    return '[]'::jsonb;
  end if;

  update public.network_invites ni
  set status = 'expired'
  where ni.status = 'pending'
    and ni.expires_at <= now()
    and lower(trim(ni.invited_email)) = v_user_email
    and ni.source_company_id <> p_active_company_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', ni.id,
        'source_company_id', ni.source_company_id,
        'source_company_name', coalesce(sc.name, 'An Altair company'),
        'invited_company_name', ni.invited_company_name,
        'invited_contact_name', ni.invited_contact_name,
        'invited_email', ni.invited_email,
        'trade_category', ni.trade_category,
        'personal_message', ni.personal_message,
        'created_at', ni.created_at,
        'expires_at', ni.expires_at
      )
      order by ni.created_at desc
    ),
    '[]'::jsonb
  )
  into v_invites
  from public.network_invites ni
  join public.companies sc on sc.id = ni.source_company_id
  where ni.status = 'pending'
    and ni.expires_at > now()
    and lower(trim(ni.invited_email)) = v_user_email
    and ni.source_company_id <> p_active_company_id;

  return v_invites;
end;
$$;

revoke all on function public.list_incoming_network_invites_for_user(uuid) from public;
grant execute on function public.list_incoming_network_invites_for_user(uuid) to authenticated;
