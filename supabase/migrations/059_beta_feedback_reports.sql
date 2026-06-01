-- Beta bug reporter: lightweight insert-only feedback from authenticated app users.

create table if not exists public.beta_feedback_reports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  user_email text,
  user_role text,
  page_url text not null,
  severity text not null default 'medium',
  message text not null,
  expected_behavior text,
  user_agent text,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint beta_feedback_reports_severity_check
    check (severity in ('low', 'medium', 'high', 'blocking')),
  constraint beta_feedback_reports_status_check
    check (status in ('open', 'reviewing', 'fixed', 'ignored'))
);

create index if not exists beta_feedback_reports_created_at_idx
  on public.beta_feedback_reports (created_at desc);

create index if not exists beta_feedback_reports_company_id_created_at_idx
  on public.beta_feedback_reports (company_id, created_at desc);

drop trigger if exists beta_feedback_reports_set_updated_at on public.beta_feedback_reports;
create trigger beta_feedback_reports_set_updated_at
before update on public.beta_feedback_reports
for each row execute function public.set_updated_at();

alter table public.beta_feedback_reports enable row level security;

drop policy if exists "authenticated users can insert own bug reports" on public.beta_feedback_reports;
create policy "authenticated users can insert own bug reports"
on public.beta_feedback_reports
for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    company_id is null
    or public.is_active_company_member(company_id)
  )
  and severity in ('low', 'medium', 'high', 'blocking')
  and status = 'open'
);

grant insert on table public.beta_feedback_reports to authenticated;
grant all on table public.beta_feedback_reports to service_role;
