-- Phase 1: core auth + multi-tenant company foundation
-- Apply in Supabase SQL editor or via supabase db push

create extension if not exists "pgcrypto";

create type public.company_role as enum (
  'owner',
  'admin',
  'dispatcher',
  'technician',
  'office_staff',
  'subcontractor',
  'customer'
);

create type public.membership_status as enum (
  'active',
  'invited',
  'suspended'
);

create type public.company_status as enum (
  'active',
  'trial',
  'suspended'
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status public.company_status not null default 'trial',
  timezone text not null default 'America/New_York',
  phone text,
  email text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  postal_code text,
  country text not null default 'US',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  avatar_url text,
  default_company_id uuid references public.companies (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.company_memberships (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.company_role not null default 'technician',
  status public.membership_status not null default 'invited',
  invited_by uuid references public.profiles (id) on delete set null,
  invited_at timestamptz,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, user_id)
);

create index company_memberships_user_id_idx
  on public.company_memberships (user_id);

create index company_memberships_company_id_idx
  on public.company_memberships (company_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger companies_set_updated_at
before update on public.companies
for each row execute function public.set_updated_at();

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger company_memberships_set_updated_at
before update on public.company_memberships
for each row execute function public.set_updated_at();

-- RLS placeholders: enable and add policies in Phase 2
alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.company_memberships enable row level security;
