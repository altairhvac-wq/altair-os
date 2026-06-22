-- Phase 2BI-C: SMS opt-out persistence for transactional payment-link texts.

create table public.sms_opt_outs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  phone_e164 text not null check (char_length(trim(phone_e164)) between 8 and 20),
  opted_out_at timestamptz not null default now(),
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  constraint sms_opt_outs_company_phone_unique unique (company_id, phone_e164)
);

create index sms_opt_outs_company_id_idx
  on public.sms_opt_outs (company_id);

create index sms_opt_outs_phone_e164_idx
  on public.sms_opt_outs (phone_e164);

alter table public.sms_opt_outs enable row level security;

revoke all on table public.sms_opt_outs from anon;

create policy "billing and company managers can read sms opt outs"
  on public.sms_opt_outs
  for select
  to authenticated
  using (
    public.is_active_company_member(company_id)
    and (
      public.can_manage_billing(company_id)
      or public.has_company_role(
        company_id,
        array['owner', 'admin']::public.company_role[]
      )
    )
  );

grant select on table public.sms_opt_outs to authenticated;
grant all on table public.sms_opt_outs to service_role;

comment on table public.sms_opt_outs is
  'Per-company SMS suppression list. Outbound payment-link texts must check this table before send. Inbound STOP webhook not implemented in this phase.';

comment on column public.sms_opt_outs.phone_e164 is
  'Normalized E.164 recipient phone (e.g. +15551234567).';

comment on column public.sms_opt_outs.source is
  'How the opt-out was recorded (manual, inbound_stop, etc.).';
