-- Founder Brain action loop (Sprint 2D).
-- Tracks founder outreach state on derived platform signals — no tenant secrets.

create table public.platform_founder_signal_actions (
  id uuid primary key default gen_random_uuid(),
  signal_key text not null,
  signal_kind text not null,
  signal_title_snapshot text not null,
  company_id uuid references public.companies (id) on delete set null,
  company_name_snapshot text,
  status text not null default 'open',
  note text,
  snoozed_until timestamptz,
  contacted_at timestamptz,
  resolved_at timestamptz,
  resolved_fingerprint text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  constraint platform_founder_signal_actions_status_check
    check (status in ('open', 'contacted', 'snoozed', 'resolved')),
  constraint platform_founder_signal_actions_note_length_check
    check (note is null or char_length(note) <= 2000),
  constraint platform_founder_signal_actions_title_length_check
    check (char_length(signal_title_snapshot) <= 500),
  constraint platform_founder_signal_actions_snoozed_until_check
    check (status != 'snoozed' or snoozed_until is not null),
  constraint platform_founder_signal_actions_contacted_at_check
    check (status != 'contacted' or contacted_at is not null),
  constraint platform_founder_signal_actions_resolved_at_check
    check (status != 'resolved' or resolved_at is not null)
);

create unique index platform_founder_signal_actions_signal_key_unique_idx
  on public.platform_founder_signal_actions (signal_key);

create index platform_founder_signal_actions_status_idx
  on public.platform_founder_signal_actions (status);

create index platform_founder_signal_actions_company_id_idx
  on public.platform_founder_signal_actions (company_id)
  where company_id is not null;

create index platform_founder_signal_actions_snoozed_until_idx
  on public.platform_founder_signal_actions (snoozed_until)
  where snoozed_until is not null;

drop trigger if exists platform_founder_signal_actions_set_updated_at
  on public.platform_founder_signal_actions;
create trigger platform_founder_signal_actions_set_updated_at
before update on public.platform_founder_signal_actions
for each row execute function public.set_updated_at();

alter table public.platform_founder_signal_actions enable row level security;

revoke all on table public.platform_founder_signal_actions from authenticated;
revoke all on table public.platform_founder_signal_actions from anon;

grant all on table public.platform_founder_signal_actions to service_role;

comment on table public.platform_founder_signal_actions is
  'Founder outreach state for derived platform admin signals. Written via service_role only; read by platform admin surfaces.';

comment on column public.platform_founder_signal_actions.signal_key is
  'Stable key for a derived signal (e.g. company_dormant:<company_id> or workflow_cron_failed).';

comment on column public.platform_founder_signal_actions.resolved_fingerprint is
  'Fingerprint of the underlying risk at resolution — signal reappears when fingerprint changes.';
