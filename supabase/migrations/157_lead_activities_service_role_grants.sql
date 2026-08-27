-- Migration 157: grant service_role DML on public.lead_activities.
--
-- ============================== THE DEFECT ==============================
-- Migration 070 created public.lead_activities and granted:
--
--     grant select, insert on public.lead_activities to authenticated;
--
-- and nothing to service_role. Every other table in the schema has service_role
-- DML — a sweep of all public tables finds lead_activities as the only one
-- holding just REFERENCES, TRIGGER and TRUNCATE. This is an omission in 070,
-- not a deliberate restriction: its seven sibling *_activities tables all carry
-- the full set.
--
-- service_role bypasses RLS, but it does NOT bypass table grants. So any
-- service-role code path touching this table fails outright.
--
-- ============================== OBSERVED IMPACT ==============================
-- lib/database/services/network-referral-lead.ts creates the referred lead with
-- the service-role client and then writes its opening audit row:
--
--     const supabase = createServiceRoleClient();
--     ...
--     const activityError = await supabase.from("lead_activities").insert({...});
--
-- That insert returns "permission denied for table lead_activities" every time.
-- The lead itself is created, and the failure is logged rather than returned:
--
--     if (activityError.error) {
--       console.error("[createReferralTargetLead] lead activity insert failed:", ...);
--     }
--
-- So the feature appears to work. The consequence is quieter and permanent:
-- every lead arriving through a network referral is missing its lead_created
-- activity, so its audit trail begins with a gap that nothing later fills in.
--
-- Found while running the Phase 4 load-test seeder against a restored scratch
-- project — its cleanup pass could not delete from the table.
--
-- ============================== SCOPE ==============================
-- Grants only, matched to the sibling activity tables. No policy is added,
-- removed or widened here, and `authenticated` is untouched: it keeps exactly
-- the select and insert that 070 gave it. RLS remains the tenant boundary for
-- every non-service caller.

begin;

grant select, insert, update, delete on public.lead_activities to service_role;

commit;
