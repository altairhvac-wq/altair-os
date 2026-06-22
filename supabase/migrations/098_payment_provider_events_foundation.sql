-- Phase 0.6: payment provider events foundation (service_role only, no webhook handlers yet).

create table public.payment_provider_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies (id) on delete cascade,
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  processing_status text not null default 'received',
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_provider_events_provider_check
    check (provider in ('manual')),
  constraint payment_provider_events_processing_status_check
    check (
      processing_status in (
        'received',
        'processing',
        'processed',
        'failed',
        'ignored'
      )
    ),
  constraint payment_provider_events_provider_event_id_unique
    unique (provider, provider_event_id)
);

create index payment_provider_events_company_id_idx
  on public.payment_provider_events (company_id);

create index payment_provider_events_processing_status_idx
  on public.payment_provider_events (processing_status);

create index payment_provider_events_created_at_desc_idx
  on public.payment_provider_events (created_at desc);

create index payment_provider_events_event_type_idx
  on public.payment_provider_events (event_type);

drop trigger if exists payment_provider_events_set_updated_at
  on public.payment_provider_events;
create trigger payment_provider_events_set_updated_at
before update on public.payment_provider_events
for each row execute function public.set_updated_at();

alter table public.payment_provider_events enable row level security;

revoke all on table public.payment_provider_events from authenticated;
revoke all on table public.payment_provider_events from anon;

grant all on table public.payment_provider_events to service_role;

comment on table public.payment_provider_events is
  'Service-owned webhook audit/idempotency ledger. Future provider webhook handlers insert and update rows via service_role after signature verification. Not exposed to authenticated or anon clients.';

comment on column public.payment_provider_events.provider is
  'Payment provider identifier. Phase 0.6: manual only; expanded in future provider migrations.';

comment on column public.payment_provider_events.provider_event_id is
  'Provider-assigned event id for idempotent processing (unique per provider).';

comment on column public.payment_provider_events.processing_status is
  'Webhook processing lifecycle: received → processing → processed|failed|ignored.';
