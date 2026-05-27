-- Pending invite cancellation requires DELETE on company_memberships.
-- RLS policy "owners and admins can manage memberships" (FOR ALL) already
-- restricts DELETE to owner/admin; this grant allows authenticated clients
-- to attempt the operation so RLS can enforce tenant isolation.

grant delete on table public.company_memberships to authenticated;
