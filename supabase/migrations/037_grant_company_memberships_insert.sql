-- Pending team invites (029) insert via PostgREST from owner/admin clients.
-- RLS policy "owners and admins can manage memberships" (002) already restricts who
-- may insert; authenticated lacked table-level INSERT (unlike jobs, customers, etc.).

grant insert on table public.company_memberships to authenticated;
