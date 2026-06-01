-- Company org tree V1: optional reporting relationship between members.

alter table public.company_memberships
  add column if not exists reports_to_member_id uuid null;

alter table public.company_memberships
  drop constraint if exists company_memberships_reports_to_member_id_fkey;

alter table public.company_memberships
  add constraint company_memberships_reports_to_member_id_fkey
  foreign key (reports_to_member_id)
  references public.company_memberships (id)
  on delete set null;

alter table public.company_memberships
  drop constraint if exists company_memberships_no_self_report;

alter table public.company_memberships
  add constraint company_memberships_no_self_report
  check (
    reports_to_member_id is null
    or reports_to_member_id <> id
  );

create or replace function public.validate_company_membership_reports_to()
returns trigger
language plpgsql
as $$
begin
  if new.reports_to_member_id is null then
    return new;
  end if;

  if new.reports_to_member_id = new.id then
    raise exception 'A member cannot report to themselves.';
  end if;

  if not exists (
    select 1
    from public.company_memberships manager
    where manager.id = new.reports_to_member_id
      and manager.company_id = new.company_id
  ) then
    raise exception 'Reports-to must be a member of the same company.';
  end if;

  return new;
end;
$$;

drop trigger if exists company_memberships_validate_reports_to on public.company_memberships;

create trigger company_memberships_validate_reports_to
  before insert or update of reports_to_member_id, company_id
  on public.company_memberships
  for each row
  execute function public.validate_company_membership_reports_to();

create index if not exists company_memberships_reports_to_member_id_idx
  on public.company_memberships (reports_to_member_id)
  where reports_to_member_id is not null;
