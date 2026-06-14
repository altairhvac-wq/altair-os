-- Harden network_partners RLS: manager-only writes for My Network / partner CRM.
-- Read stays scoped to active company membership; inserts of linked directory
-- partners require a visible target profile (defense in depth vs direct API).

drop policy if exists "company members can insert network partners" on public.network_partners;

create policy "company admins can insert network partners"
  on public.network_partners
  for insert
  to authenticated
  with check (
    public.can_send_network_referrals(company_id)
    and (
      linked_company_id is null
      or (
        linked_company_id <> company_id
        and exists (
          select 1
          from public.network_profiles np
          where np.company_id = linked_company_id
            and np.is_visible = true
        )
      )
    )
  );

drop policy if exists "company members can update network partners" on public.network_partners;

create policy "company admins can update network partners"
  on public.network_partners
  for update
  to authenticated
  using (public.can_send_network_referrals(company_id))
  with check (
    public.can_send_network_referrals(company_id)
    and (
      linked_company_id is null
      or linked_company_id <> company_id
    )
  );

drop policy if exists "company members can delete network partners" on public.network_partners;

create policy "company admins can delete network partners"
  on public.network_partners
  for delete
  to authenticated
  using (public.can_send_network_referrals(company_id));
