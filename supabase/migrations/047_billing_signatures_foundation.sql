-- Billing signature capture for estimates and invoices (field-service beta).

create type public.billing_signature_entity_type as enum ('estimate', 'invoice');

create table if not exists public.billing_signatures (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  entity_type public.billing_signature_entity_type not null,
  entity_id uuid not null,
  signer_name text not null check (char_length(trim(signer_name)) between 1 and 120),
  signer_role text not null default 'customer' check (char_length(trim(signer_role)) between 1 and 60),
  signature_data text not null check (char_length(signature_data) between 32 and 524288),
  signed_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, entity_type, entity_id)
);

create index if not exists billing_signatures_company_entity_idx
  on public.billing_signatures (company_id, entity_type, entity_id);

drop trigger if exists billing_signatures_set_updated_at on public.billing_signatures;
create trigger billing_signatures_set_updated_at
before update on public.billing_signatures
for each row execute function public.set_updated_at();

alter table public.billing_signatures enable row level security;

create policy "billing managers can read billing signatures"
on public.billing_signatures
for select
to authenticated
using (
  public.is_active_company_member(company_id)
  and public.can_manage_billing(company_id)
);

create policy "billing managers can insert billing signatures"
on public.billing_signatures
for insert
to authenticated
with check (
  public.is_active_company_member(company_id)
  and public.can_manage_billing(company_id)
);

create policy "billing managers can update billing signatures"
on public.billing_signatures
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

create policy "billing managers can delete billing signatures"
on public.billing_signatures
for delete
to authenticated
using (
  public.is_active_company_member(company_id)
  and public.can_manage_billing(company_id)
);

grant select, insert, update, delete on table public.billing_signatures to authenticated;
grant all on table public.billing_signatures to service_role;
