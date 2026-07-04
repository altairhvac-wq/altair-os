# ALTAIR MASTER STATUS

Last Updated: 2026-07-03

> **Source of truth for current product state.** For production module inventory see `ALTair_BRAIN.md`. For active sprint scope see `ALTair_CURRENT_SPRINT.md`. For future experience sequencing see `ALTair_V2_ROADMAP.md`.

---

## Documentation Hierarchy

| Document | Responsibility |
|----------|----------------|
| `ALTair_MASTER_STATUS.md` | Current product state only |
| `ALTair_CURRENT_SPRINT.md` | Active sprint only |
| `ALTair_BRAIN.md` | Architecture and confirmed production inventory |
| `ALTair_V2_ROADMAP.md` | Future experience-layer sequencing |
| `ALTAIR_SESSION_LOG.md` | Historical session record |
| `ALTAIR_ART_DIRECTION.md` | Permanent design philosophy |
| `ALTAIR_EXPERIENCE_MAP.md` | Experience architecture (Command Center, Workspace, Operations, Intelligence) |
| `ALTAIR_COMPONENT_SYSTEM.md` | Reusable V2 component definitions |
| `FOUNDER_MODE.md` | Founder operating rules |
| `CHAT_START_PROMPT.md` / `SESSION_CLOSE_PROMPT.md` | Session workflow checklists |
| `docs/internal-alpha-smoke-test.md` | Deploy verification checklist |
| `docs/backend-data-map.md` | **Outdated planning doc** — do not treat as production truth |

---

## Current Stage

**Status: Beta-ready — North Star experience layer shipped behind flag; Stripe payments, workflow reminders, and trade-aware onboarding live; authenticated production smoke recommended before first external company**

Altair OS is a production-grade multi-tenant field service operating system on Vercel + Supabase, preparing for small-company beta testing.

**North Star flag:** `NEXT_PUBLIC_NORTH_STAR_SHELL=true` enables Mission Control Original Refined across admin surfaces. Legacy UI remains when the flag is off. See `lib/beta/north-star-shell.ts`.

**Beta status:** Beta-ready. Run authenticated production/user-data smoke (`docs/internal-alpha-smoke-test.md`) before first external company onboarding.

---

## What Shipped Since Last Doc Sync (2026-06-17 → 2026-07-03)

~187 commits. Confirmed in code:

### North Star Production Migration (Phase 9 — behind flag)

| Phase | Focus | Status |
|-------|-------|--------|
| **M1** | Grouped desktop left sidebar shell | **Complete** |
| **M2** | Dashboard pilot — Mission Control hero, Action/Work/Money operating board | **Complete** |
| **M3** | Customers list + Customer 360 detail pilot | **Complete** |
| **M4** | Jobs list + job detail pilot | **Complete** |
| **M5** | Estimates + invoices list/detail/document pilots | **Complete** |
| **M6** | Expenses list + detail pilot | **Complete** |
| **M7** | Price book / service items catalog pilot | **Complete** |
| **M8** | Reports + tax summary pilot | **Complete** |
| **M9** | Admin time / labor review pilot | **Complete** |
| **M10** | Settings configuration workspace pilot | **Complete** |
| **M11** | Network referral workspace pilot | **Complete** |
| **M12** | Team member profile pilot | **Complete** |
| **M13** | Platform admin pilot | **Complete** |
| **M14** | Leads work queue pilot | **Complete** |
| **Dispatch** | North Star command shell + mobile polish | **Complete** |

Code lives in `shared/components/*/north-star-m*` folders. Primary reference remains `/altair-shell-color-lab-v1` (palette `mission-control-refined`).

### Payments (Stripe Connect)

- Company payment accounts foundation
- Stripe Connect Express onboarding from Settings
- Public invoice Pay Now (`/invoice-payment/[token]`) with gated checkout sessions
- Stripe webhook verification and atomic checkout payment recording
- Manual payment recording via atomic RPC
- Payment link email sending
- Technician-facing payment link generation
- Twilio SMS payment links (when configured)

### Workflow Reminder Engine

- Durable `workflow_reminders` table with snooze/dismiss/complete
- Evaluator service for unpaid invoices (7d), stale estimates (7d), lead follow-ups, ready-to-invoice jobs
- Hourly production cron (`/api/cron/workflow-reminders`)
- Dashboard surfacing via `WorkflowRemindersSection`

### Trade-Aware Onboarding

- Company `trade` column on bootstrap (`supabase/migrations/107_company_trade.sql`)
- Trade selection on signup and `/setup`
- Invited users defer company bootstrap until invite acceptance

### Design Lab

- Founder design lab at `/platform/design-lab` — click-to-edit color targets, presets, contrast guardrails, theme export, dashboard replica canvas

### Dashboard Brain (Operational Prioritization)

- Dashboard action queue prioritization and secondary band collapse
- Lead actions, accepted estimates, and unpaid invoice follow-ups surfaced on dashboard
- Scoped dashboard surface editing (design lab integration)

### Production Hardening

- Operational RLS tightening (`103_tighten_operational_rls.sql`)
- Public token RPC hardening (`104_harden_public_token_rpcs.sql`)
- Signup email verification callback fix
- Smoke workflow hardening (draft estimates, billing view refresh after payment)
- North Star contrast polish across major admin surfaces

### Other Confirmed Additions

- Marketing hub (`/marketing`) — post drafts, AI rewrite, connected accounts foundation
- Mobile install experience (`/install`) — PWA guidance with device-specific walkthrough
- Electrical demo seed pack
- Network workspace tab restructure and parity fixes

---

## Foundation Already Complete (Pre-2026-06-17)

Master Shell V2, Visual Polish Passes A–F, Micro-Interaction Batches A–B, Interaction Bug-Fix Pass A, and pre-beta interaction fixes remain **complete** on major admin surfaces. Focused smoke test passed (2026-06-16).

Legacy `ListCommandCenterLayout` and `ListCommandCenterLoadingState` **removed**.

Dispatch Phase 5 mobile viewport lock remains **intentionally deferred** (board must stay visible under mobile sheets).

---

## Current Priorities

### Priority 1: Authenticated Production Smoke (Active)

Exercise core workflows on real tenant data before first external company onboarding. Checklist: `docs/internal-alpha-smoke-test.md`.

Focus areas: signup/trade onboarding, customers → jobs → dispatch → technician completion → estimate → invoice → Stripe/manual payment, workflow reminders, time/expenses.

### Priority 2: First External Beta Companies (Next)

Onboard a small number of real companies after smoke passes. Reduce friction, validate operational trust, collect feedback via Alpha Tracker and beta bug reports.

### Priority 3: Deferred Experience Tracks

- Technician Experience V2 — eliminate `/tech` mock infrastructure
- Command Center / Workspace prototype wholesale adoption (Phase 6)
- Micro-Interaction Batch C
- Broad dark mode, route/page transitions
- Overlay/detail consistency for estimate/invoice overlays
- Platform/alpha utility shell migration (`/alpha-tracker`, `/platform`, `/platform/bugs`) — only if needed for beta

---

## Active Work

- Authenticated production/user-data smoke validation
- Beta onboarding preparation
- North Star flag-on stability monitoring across admin surfaces

---

## Known Issues (Non-Blocking for Beta)

- `/tech` root still contains mock infrastructure (Technician Experience V2 deferred)
- Dispatch Phase 5 mobile viewport lock intentionally deferred
- `EstimatesLoadingState` uses default skeleton props (no summary strip skeleton)
- Invoice/estimate overlay modes use raw layout instead of `MasterDetailPageLayout` (overlay consistency deferred)
- North Star experience requires `NEXT_PUBLIC_NORTH_STAR_SHELL=true` — not yet default-on
- Stripe Connect and Twilio SMS require environment configuration per company/deploy
- `docs/backend-data-map.md` describes pre-Supabase mock state — outdated

---

## Immediate Goal (Next 30 Days)

Get Altair into the hands of a small number of real companies after authenticated production smoke validates core workflows.

Success metrics:

- Authenticated smoke passes on production/user data
- Companies can onboard with trade selection
- Companies can create customers, estimates, jobs, dispatch technicians, and collect payments (manual + Stripe when configured)
- Workflow reminders surface actionable follow-ups on dashboard
- Admin surfaces feel consistent and premium under North Star when flag is enabled

---

## Long-Term Vision

Altair OS becomes a Living Operating System that trades companies genuinely enjoy opening every morning — intelligent, helpful, calm, organized, and delightful rather than feeling like another management system.
