-- Platform automation run ledger (service_role only).
-- Records cron/automation health for founder visibility — no secrets or per-company payloads.

create table public.platform_automation_runs (
  id uuid primary key default gen_random_uuid(),
  automation_key text not null,
  status text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_ms integer,
  company_count integer,
  totals jsonb not null default '{}'::jsonb,
  error_summary text,
  created_at timestamptz not null default now(),
  constraint platform_automation_runs_status_check
    check (status in ('started', 'succeeded', 'failed')),
  constraint platform_automation_runs_error_summary_length_check
    check (error_summary is null or char_length(error_summary) <= 500)
);

create index platform_automation_runs_key_started_desc_idx
  on public.platform_automation_runs (automation_key, started_at desc);

create index platform_automation_runs_key_status_started_desc_idx
  on public.platform_automation_runs (automation_key, status, started_at desc);

alter table public.platform_automation_runs enable row level security;

revoke all on table public.platform_automation_runs from authenticated;
revoke all on table public.platform_automation_runs from anon;

grant all on table public.platform_automation_runs to service_role;

comment on table public.platform_automation_runs is
  'Service-owned automation run ledger for platform cron health. Written via service_role only; read by platform admin surfaces.';

comment on column public.platform_automation_runs.automation_key is
  'Stable automation identifier (e.g. workflow_reminders).';

comment on column public.platform_automation_runs.totals is
  'Aggregate counters only — created/updated/completed/skipped/errorCount. No tenant payloads.';

comment on column public.platform_automation_runs.error_summary is
  'Sanitized short error summary when status=failed. No stack traces or secrets.';
