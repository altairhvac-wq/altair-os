-- Harden network_invites RLS: block forged inserts and direct client updates.
-- Status changes, token rotation, and acceptance run via security definer RPCs only.

drop policy if exists "source company admins can insert network invites" on public.network_invites;

create policy "source company admins can insert network invites"
  on public.network_invites
  for insert
  with check (
    public.can_send_network_referrals(source_company_id)
    and source_user_id = auth.uid()
    and status = 'pending'
    and accepted_company_id is null
    and accepted_user_id is null
    and accepted_at is null
  );

drop policy if exists "source company admins can cancel pending network invites" on public.network_invites;

revoke update on public.network_invites from authenticated;
