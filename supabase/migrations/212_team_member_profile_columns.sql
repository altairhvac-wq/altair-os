-- Migration 212: the four team-member profile fields the Team page reads.
--
-- ============================ WHAT WAS BROKEN ============================
-- Team > click a person opened a "page not found" screen, for every company.
-- The profile page selects member_notes, available_for_dispatch,
-- emergency_on_call and certifications from company_memberships. Those
-- columns were introduced by migration 071, but 071 was never applied to the
-- production database (checked read-only on 2026-11-12: all four are
-- missing, while later columns such as member_share_code exist). The query
-- failed with 42703, the page treated that as "no such member", and showed a
-- 404.
--
-- ============================ WHAT THIS DOES ============================
-- Adds the same four columns with the same types and defaults as 071.
-- Additive only, and safe to run twice. Existing rows get the defaults:
-- every member is available for dispatch, nobody is on call, no notes, no
-- certifications. That matches what the application assumed all along.
--
-- ============================ WHAT THIS LEAVES OUT ============================
-- 071 also created a row-level-security policy letting office staff read
-- company_memberships. That is a change to who can read what, not a missing
-- column, so it is not repeated here. Owners and admins can open a team
-- member's page without it. Whether office staff should is a separate
-- decision.

alter table public.company_memberships
  add column if not exists member_notes text;

alter table public.company_memberships
  add column if not exists available_for_dispatch boolean not null default true;

alter table public.company_memberships
  add column if not exists emergency_on_call boolean not null default false;

alter table public.company_memberships
  add column if not exists certifications text[] not null default '{}';

comment on column public.company_memberships.member_notes is
  'Optional internal notes visible on the team member profile. Owner/admin editable.';

comment on column public.company_memberships.available_for_dispatch is
  'Operational flag for dispatch recommendations. Not a scheduling system.';

comment on column public.company_memberships.emergency_on_call is
  'Operational flag for on-call dispatch recommendations.';

comment on column public.company_memberships.certifications is
  'Simple editable certification labels (e.g. EPA 608, NATE). No expiration tracking in V1.';
