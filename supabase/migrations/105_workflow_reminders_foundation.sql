-- Automation Phase 1.0: internal workflow reminders foundation.
-- Durable persistence for snooze, dismiss, complete, history, and idempotency.
-- No cron, UI, sends, or reminder creation in this phase.

create table public.workflow_reminders (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null references public.companies (id) on delete cascade,

  reminder_kind text not null,
  source_entity_type text not null,
  source_entity_id uuid not null,

  status text not null default 'active',

  snoozed_until timestamptz,

  assigned_user_id uuid references auth.users (id) on delete set null,

  title text not null,
  message text,

  metadata jsonb not null default '{}'::jsonb,

  triggered_at timestamptz not null default now(),

  completed_at timestamptz,
  completed_by uuid references auth.users (id) on delete set null,

  dismissed_at timestamptz,
  dismissed_by uuid references auth.users (id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint workflow_reminders_status_check
    check (status in ('active', 'snoozed', 'completed', 'dismissed')),

  constraint workflow_reminders_source_entity_type_check
    check (source_entity_type in ('invoice', 'estimate', 'lead', 'job')),

  constraint workflow_reminders_reminder_kind_check
    check (
      reminder_kind in (
        'unpaid_invoice_7d',
        'stale_estimate_7d',
        'lead_follow_up_due',
        'ready_to_invoice'
      )
    ),

  constraint workflow_reminders_idempotency_unique
    unique (company_id, reminder_kind, source_entity_type, source_entity_id),

  constraint workflow_reminders_snoozed_until_check
    check (status != 'snoozed' or snoozed_until is not null),

  constraint workflow_reminders_completed_fields_check
    check (status != 'completed' or completed_at is not null),

  constraint workflow_reminders_dismissed_fields_check
    check (status != 'dismissed' or dismissed_at is not null)
);

create index workflow_reminders_company_id_status_idx
  on public.workflow_reminders (company_id, status);

create index workflow_reminders_company_id_kind_status_idx
  on public.workflow_reminders (company_id, reminder_kind, status);

create index workflow_reminders_company_id_source_entity_idx
  on public.workflow_reminders (company_id, source_entity_type, source_entity_id);

create index workflow_reminders_company_id_snoozed_until_idx
  on public.workflow_reminders (company_id, snoozed_until)
  where snoozed_until is not null;

create index workflow_reminders_assigned_user_id_status_idx
  on public.workflow_reminders (assigned_user_id, status)
  where assigned_user_id is not null;

create index workflow_reminders_created_at_idx
  on public.workflow_reminders (created_at desc);

create index workflow_reminders_triggered_at_idx
  on public.workflow_reminders (triggered_at desc);

drop trigger if exists workflow_reminders_set_updated_at on public.workflow_reminders;
create trigger workflow_reminders_set_updated_at
before update on public.workflow_reminders
for each row execute function public.set_updated_at();

alter table public.workflow_reminders enable row level security;

revoke all on table public.workflow_reminders from anon;

create policy "billing managers can read workflow reminders"
  on public.workflow_reminders
  for select
  to authenticated
  using (
    public.is_active_company_member(company_id)
    and public.can_manage_billing(company_id)
  );

create policy "billing managers can insert workflow reminders"
  on public.workflow_reminders
  for insert
  to authenticated
  with check (
    public.is_active_company_member(company_id)
    and public.can_manage_billing(company_id)
  );

create policy "billing managers can update workflow reminders"
  on public.workflow_reminders
  for update
  to authenticated
  using (
    public.is_active_company_member(company_id)
    and public.can_manage_billing(company_id)
  )
  with check (
    public.is_active_company_member(company_id)
    and public.can_manage_billing(company_id)
  );

grant select, insert, update on table public.workflow_reminders to authenticated;
grant all on table public.workflow_reminders to service_role;

comment on table public.workflow_reminders is
  'Internal workflow reminders for office automation. Phase 1.0: schema + RLS only; evaluation/cron/UI deferred.';

comment on column public.workflow_reminders.reminder_kind is
  'Stable reminder type key used for idempotency and future automation settings.';

comment on column public.workflow_reminders.source_entity_type is
  'Entity table the reminder references (invoice, estimate, lead, job).';

comment on column public.workflow_reminders.source_entity_id is
  'Primary key of the source entity within the company tenant.';
