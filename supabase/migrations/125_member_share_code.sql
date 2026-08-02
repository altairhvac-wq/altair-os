-- Per-member referral / share codes for technicians (display + copy, not secret).
-- Attribution tracking (which lead used which code) is intentionally out of scope.

alter table public.company_memberships
  add column if not exists member_share_code text;

comment on column public.company_memberships.member_share_code is
  'Optional plaintext referral/share code for the member (e.g. MIKE-A3F2). Displayed and copied; not a secret token. Unique per company when set (case-insensitive).';

create unique index if not exists company_memberships_company_share_code_lower_uidx
  on public.company_memberships (company_id, lower(member_share_code))
  where member_share_code is not null;
