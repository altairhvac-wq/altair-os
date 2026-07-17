-- Per-user preferences JSON for UI state that should persist across devices
-- (e.g. onboarding checklist dismiss). Users already may update their own profile.

alter table public.profiles
  add column if not exists preferences jsonb not null default '{}'::jsonb;

comment on column public.profiles.preferences is
  'User-scoped UI preferences (e.g. onboarding dismiss per company). Not company tenant data.';
