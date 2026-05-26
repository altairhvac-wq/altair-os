-- Pending team invites without auth users.
-- Invited memberships store invite_email and leave user_id null until acceptance.

alter table public.company_memberships
  add column if not exists invite_email text;

alter table public.company_memberships
  alter column user_id drop not null;

alter table public.company_memberships
  drop constraint if exists company_memberships_invite_identity_check;

alter table public.company_memberships
  add constraint company_memberships_invite_identity_check
  check (
    user_id is not null
    or (
      status = 'invited'
      and invite_email is not null
      and btrim(invite_email) <> ''
    )
  );

create unique index if not exists company_memberships_company_invite_email_uidx
  on public.company_memberships (company_id, lower(invite_email))
  where invite_email is not null
    and status in ('active', 'invited');
