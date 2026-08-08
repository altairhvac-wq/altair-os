-- Marketing AI HQ V1 foundation (founder-only marketing engine).
-- Architecture: docs/product/MARKETING_AI_HQ.md
--
-- Four service-role-only tables. Founder gating is enforced in the
-- application layer (requirePlatformAdmin / canAccessPlatformAdmin) and all
-- database access flows through server-only code using the service-role
-- client — authenticated sessions get no direct grants (same posture as
-- platform_automation_runs). Productizing later widens grants/RLS additively.

create type public.marketing_directive_kind as enum (
  'hq_config',
  'brand_kit',
  'creative_direction',
  'strategy_note'
);

create type public.marketing_item_kind as enum (
  'social_post',
  'email_draft',
  'seo_page',
  'blog_article',
  'video_brief',
  'intel_digest',
  'reply_draft',
  'ad_proposal',
  'strategy_report'
);

create type public.marketing_item_status as enum (
  'draft',
  'approved',
  'rejected',
  'converted'
);

create type public.marketing_run_status as enum (
  'started',
  'succeeded',
  'failed'
);

-- Long-lived engine state: goals, brand voice, standing direction.
-- Versioned by superseding — never destructive edits.
create table public.marketing_directives (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  kind public.marketing_directive_kind not null,
  content jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  superseded_at timestamptz
);

create unique index marketing_directives_active_singleton_idx
  on public.marketing_directives (company_id, kind)
  where superseded_at is null
    and kind in ('hq_config', 'brand_kit', 'creative_direction');

create index marketing_directives_company_kind_created_idx
  on public.marketing_directives (company_id, kind, created_at desc);

-- Engine run ledger (mirrors platform_automation_runs shape).
create table public.marketing_runs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  run_key text not null,
  status public.marketing_run_status not null default 'started',
  trigger text not null default 'manual',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_ms integer,
  totals jsonb not null default '{}'::jsonb,
  report jsonb,
  error_summary text,
  created_at timestamptz not null default now(),
  constraint marketing_runs_trigger_check
    check (trigger in ('manual', 'cron')),
  constraint marketing_runs_error_summary_length_check
    check (error_summary is null or char_length(error_summary) <= 500)
);

create index marketing_runs_company_key_started_desc_idx
  on public.marketing_runs (company_id, run_key, started_at desc);

create index marketing_runs_company_key_status_started_desc_idx
  on public.marketing_runs (company_id, run_key, status, started_at desc);

-- Every unit of generated work. Approval queue is the ONLY door out:
-- draft -> approved | rejected; approved social posts may convert into a
-- marketing_posts draft (existing hub pipeline) -> status 'converted'.
create table public.marketing_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  kind public.marketing_item_kind not null,
  status public.marketing_item_status not null default 'draft',
  role text not null,
  title text not null,
  body_text text not null default '',
  content jsonb not null default '{}'::jsonb,
  channel_hint text,
  run_id uuid references public.marketing_runs (id) on delete set null,
  review_note text,
  reviewed_at timestamptz,
  converted_post_id uuid references public.marketing_posts (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketing_items_review_note_length_check
    check (review_note is null or char_length(review_note) <= 1000)
);

create index marketing_items_company_status_created_desc_idx
  on public.marketing_items (company_id, status, created_at desc);

create index marketing_items_company_kind_created_desc_idx
  on public.marketing_items (company_id, kind, created_at desc);

create index marketing_items_run_id_idx
  on public.marketing_items (run_id)
  where run_id is not null;

drop trigger if exists marketing_items_set_updated_at on public.marketing_items;
create trigger marketing_items_set_updated_at
before update on public.marketing_items
for each row execute function public.set_updated_at();

-- Collected numbers (pure-code collectors). Idempotent upserts via the
-- unique index; the AI layer only ever reads computed rollups.
create table public.marketing_metrics (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  source text not null,
  metric text not null,
  dimensions jsonb not null default '{}'::jsonb,
  value numeric not null,
  observed_on date not null,
  collected_at timestamptz not null default now()
);

create unique index marketing_metrics_identity_idx
  on public.marketing_metrics (company_id, source, metric, dimensions, observed_on);

create index marketing_metrics_company_observed_desc_idx
  on public.marketing_metrics (company_id, observed_on desc);

-- Service-role only posture for all four tables.
alter table public.marketing_directives enable row level security;
alter table public.marketing_runs enable row level security;
alter table public.marketing_items enable row level security;
alter table public.marketing_metrics enable row level security;

revoke all on table public.marketing_directives from authenticated;
revoke all on table public.marketing_directives from anon;
revoke all on table public.marketing_runs from authenticated;
revoke all on table public.marketing_runs from anon;
revoke all on table public.marketing_items from authenticated;
revoke all on table public.marketing_items from anon;
revoke all on table public.marketing_metrics from authenticated;
revoke all on table public.marketing_metrics from anon;

grant all on table public.marketing_directives to service_role;
grant all on table public.marketing_runs to service_role;
grant all on table public.marketing_items to service_role;
grant all on table public.marketing_metrics to service_role;

comment on table public.marketing_directives is
  'Marketing AI HQ long-lived state (goals, brand kit, direction). Service-role only; founder-gated in app code. Versioned by superseding.';

comment on table public.marketing_runs is
  'Marketing AI HQ engine run ledger. Aggregate totals and sanitized error summaries only.';

comment on table public.marketing_items is
  'Marketing AI HQ generated work items. Approval queue is the only path to the existing marketing_posts pipeline; the engine never publishes.';

comment on table public.marketing_metrics is
  'Marketing AI HQ collected metrics (pure-code collectors). AI reads rollups, never raw feeds.';
