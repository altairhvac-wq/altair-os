-- Harden network referral RLS: bind target company to visible profile on insert.

drop policy if exists "source company admins can insert referrals" on public.network_referrals;

create policy "source company admins can insert referrals"
  on public.network_referrals
  for insert
  with check (
    public.can_send_network_referrals(source_company_id)
    and source_user_id = auth.uid()
    and source_company_id <> target_company_id
    and target_network_profile_id is not null
    and public.is_visible_network_profile(target_network_profile_id)
    and target_company_id = (
      select np.company_id
      from public.network_profiles np
      where np.id = target_network_profile_id
    )
  );
