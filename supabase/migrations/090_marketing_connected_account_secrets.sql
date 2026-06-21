-- Marketing Hub: encrypted OAuth token storage (service_role only, no OAuth yet).

create table public.marketing_connected_account_secrets (
  connected_account_id uuid primary key
    references public.marketing_connected_accounts (id) on delete cascade,
  access_token_encrypted text not null,
  refresh_token_encrypted text,
  encryption_key_version smallint not null default 1,
  token_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index marketing_connected_account_secrets_token_hash_idx
  on public.marketing_connected_account_secrets (token_hash)
  where token_hash is not null;

drop trigger if exists marketing_connected_account_secrets_set_updated_at
  on public.marketing_connected_account_secrets;
create trigger marketing_connected_account_secrets_set_updated_at
before update on public.marketing_connected_account_secrets
for each row execute function public.set_updated_at();

alter table public.marketing_connected_account_secrets enable row level security;

revoke all on table public.marketing_connected_account_secrets from authenticated;
revoke all on table public.marketing_connected_account_secrets from anon;

grant all on table public.marketing_connected_account_secrets to service_role;
