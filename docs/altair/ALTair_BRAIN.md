# ALTAIR BRAIN

> Single source of truth for Altair OS — confirmed production inventory only.  
> Last updated: 2026-07-05 (Sprint 2D founder action loop sync).  
> Rule: nothing is documented here unless confirmed in code, migrations, or explicit project docs.  
> For current product state see `ALTair_MASTER_STATUS.md`. For active sprint see `ALTair_CURRENT_SPRINT.md`.

---

## 1. PLATFORM OVERVIEW

**Project Name:** Altair OS

**Mission:** A Living Operating System for trades businesses — unified dispatch, customers, billing, field work, and operational intelligence in one company-scoped platform.

**Current Development Stage:** Beta-ready. Production deploy on Vercel with Supabase backend (110 migrations). Alpha hardening infrastructure exists; Coming Soon nav gates are currently **empty** (all admin modules reachable in production). North Star experience layer ships behind `NEXT_PUBLIC_NORTH_STAR_SHELL=true`.

**Target Industries:** Home and commercial trades — HVAC, plumbing, electrical, roofing, general contracting, landscaping, painting (confirmed via network trade types and job/estimate workflows).

**Tech Stack:**
- Next.js 16 (App Router)
- React 19
- TypeScript
- Supabase (Postgres, Auth, Storage, RLS)
- Tailwind CSS 4
- Server Actions
- OpenAI (`openai` package) — env-gated AI assistants
- Stripe (`stripe` package) — Stripe Connect + checkout when configured
- Twilio (`twilio` package) — SMS payment links when configured
- Lucide React icons

**Architecture Principles:**
- Everything is **company-scoped** (`company_id` on operational records)
- **Server Actions + query layer** — UI reads/writes through `lib/database/queries/*` and `app/actions/*`
- **Role-based permissions** — `company_role` on memberships drives nav and access (`lib/database/types/roles.ts`, `lib/database/access-control.ts`)
- **Database-driven operations intelligence** — dashboard and reports aggregate live data; AI is supplementary
- **AI is scheduled, cached, or user-triggered** — requires `AI_FEATURES_ENABLED=true` + `OPENAI_API_KEY`
- **Leads and customers are separate entities** — prospects live in Lead Pipeline until conversion

---

## 2. CORE ARCHITECTURE

### Multi-Tenant System

**Status:** Production

- Tenant root: `companies` table
- User identity: `profiles` (1:1 with `auth.users`)
- Membership: `company_memberships` links users to companies with role + status
- Active workspace: `getActiveCompanyContext()` powers all admin queries
- Company switcher for users in multiple companies (`app/actions/company-switcher.ts`)
- Signup bootstrap RPC creates company + owner membership (`supabase/migrations/003_auth_bootstrap.sql`)
- Trade-aware bootstrap — company `trade` stored at signup/setup (`107_company_trade.sql`); invited users defer bootstrap until invite acceptance
- Setup flow at `/setup` for first-time company configuration

### Authentication

**Status:** Production

- Email/password auth via Supabase Auth
- Routes: `/login`, `/signup`, `/forgot-password`, `/reset-password`
- Role-aware post-login redirect (`lib/auth/redirects.ts`)
- Technicians land on `/technician`; admin roles land on dashboard
- Public token routes (no auth): `/estimate-approval/[token]`, `/invoice-payment/[token]`

### Authorization / Roles

**Status:** Production (Production Hardened — migration `046_final_beta_rls_hardening.sql`)

**Company roles:** `owner`, `admin`, `dispatcher`, `technician`, `office_staff`, `subcontractor`, `customer`

**Permission keys:**
| Permission | Roles |
|------------|-------|
| `manageCompany` | owner, admin |
| `manageUsers` | owner, admin |
| `dispatchJobs` | owner, admin, dispatcher |
| `manageCustomers` | owner, admin, dispatcher, office_staff |
| `viewAssignedJobs` | owner, admin, dispatcher, technician, subcontractor |
| `manageBilling` | owner, admin, office_staff |
| `createFieldEstimates` | technician, subcontractor |

- Admin nav filtered per role (`shared/components/admin/nav-items.ts`, `getAccessibleAdminNavHrefs`)
- Route-level access checks on each admin page
- Platform admin surface gated separately (`canAccessPlatformAdmin`) — not tenant role-based

### Database Architecture

**Status:** Production

- 110 Supabase migrations (`supabase/migrations/001` through `109+`)
- Core entities: customers, jobs, estimates, invoices, invoice_payments, expenses, time_entries, dispatch_assignments, leads, notifications, service_items, customer_equipment, job_activities, job_materials, job_attachments, network_*, alpha_tracker, beta_feedback
- Entity lifecycle: archive, trash, cancel patterns (`067_entity_lifecycle.sql`, customer/job/estimate/invoice lifecycle)
- Activity/audit trails per entity type
- RLS policies with role-aware hardening on billing, jobs, notifications
- Storage bucket `company-files` for receipts and attachments
- SECURITY DEFINER RPCs for bootstrap, network partner ops, notification fan-out

### Global Navigation

**Status:** Production

**Admin modules (role-filtered):**
Dashboard, Dispatch, Customers, Leads, Marketing, Jobs, Estimates, Price Book, Invoices, Expenses, Labor & payroll, Network, Reports, Alpha Tracker, Settings

**Platform admin (app owner only):** Platform, Bug reports

**Technician app (`/technician`, `/tech/*`):**
- Primary home: `/technician` (assigned jobs)
- Enabled nav: Today, Time, Receipts, Alerts
- Time / breaks: `/tech/time`
- Legacy mock route: `/tech` root (orphan mock dashboard)

**Mobile:** Two-row primary nav + overflow; pull-to-refresh on selected routes

### Shared Design System

**Status:** Production (Master Shell V2 complete; V2 components built; North Star adoption behind flag)

- Master Shell primitives in `shared/design-system/shell/` — adopted across major admin surfaces
- V2 component library in `shared/design-system/components/` (HeroHeader, PriorityCard, MetricCard, etc.)
- Signature layer in `shared/design-system/signature/` (AtmosphereBackground, BusinessTerrain, etc.)
- North Star visual layer in `shared/components/*/north-star-m*` — active when `NEXT_PUBLIC_NORTH_STAR_SHELL=true`
- Founder design lab at `/platform/design-lab` for token editing and dashboard replica preview
- Concept routes retained for reference: `/altair-design-lab`, `/command-center-v1`, `/workspace-v1`, `/altair-shell-color-lab-v1`

---

## 3. PRODUCTION MODULES

### Dashboard

**Status:** Production (Production Hardened — operational prioritization and North Star M2 view)

**Description:** Company command center aggregating dispatch, money, leads, operations queues, workflow reminders, and notifications.

**Features:**
- Today's dispatch jobs, unassigned jobs, technician time states
- Money snapshot: unpaid/overdue invoices, unsent invoices/estimates, stale sent estimates, recent payments
- Expense signals: submitted count, pending receipts
- Lead follow-ups and 30-day pipeline summary
- Office review queue and operational health score
- Stalled jobs, completed work awaiting invoicing, completed work review
- Daily operations summary highlights
- Recent operational activities
- Notifications widget (unread + recent)
- Workflow reminders (unpaid invoice, stale estimate, lead follow-up, ready-to-invoice)
- Onboarding checklist
- Demo data status (owners)
- Technicians redirected to `/technician`
- North Star view (`DashboardNorthStarView`) when `NEXT_PUBLIC_NORTH_STAR_SHELL=true` — Mission Control hero, Action/Work/Money operating board

**Dependencies:** dispatch, jobs, leads, estimates, invoices, expenses, time-entries, technicians, notifications, operational-activities, workflow-reminders, reports services

---

### Customers

**Status:** Production (Production Hardened — lifecycle, trust, navigation passes)

**Description:** Company customer directory with CRUD, lifecycle, import, and operational stats.

**Features:**
- List with search and status filters
- Create, edit, archive, delete (trash lifecycle)
- Bulk lifecycle actions
- Operational stats (revenue when billing access)
- CSV import with smart mapping (`/customers/import`)
- Legacy `customer.status = 'lead'` normalized — prospects directed to Leads module

**Dependencies:** customers, customer-activities, jobs, estimates, invoices

---

### Customer 360

**Status:** Production (Production Hardened)

**Description:** Aggregated customer intelligence view — source of truth for customer account context.

**Features:**
- Identity and contact summary
- Financial summary (balance, aging)
- Related estimates, jobs, invoices (500-record limit with truncation warning)
- Equipment section
- Photos and receipts from jobs/expenses
- Payment history
- Opportunity signals (balance due, open estimates, aging equipment, no recent service)
- Lifecycle state display
- Accessible from customer detail page

**Dependencies:** customers, jobs, estimates, invoices, customer-equipment, job-attachments, expenses, invoice-payments, `shared/lib/customers/customer-360.ts`

---

### Lead Pipeline

**Status:** Production (Production Hardened)

**Description:** Pre-customer opportunity tracking separate from the customer directory.

**Features:**
- Statuses: `new`, `contacted`, `scheduled`, `estimate_sent`, `won`, `lost`
- Sources including `network_referral`
- Activity logging: call, email, note, follow-up, status changes
- Convert to customer
- Prepare estimate from lead
- Mark won/lost
- Filters: status, follow-up due
- Network referral outcome sync when lead status changes
- Lead reporting section in Reports (when `manageCustomers`)

**Dependencies:** leads, lead-activities, customers, estimates, network-referrals

---

### Estimates

**Status:** Production

**Description:** Quoting workflow with line items, lifecycle, public approval, and field creation.

**Features:**
- CRUD with line items from price book
- Statuses: draft, sent, approved, declined, expired, converted, cancelled
- Send, batch send, resend email
- On-site approval (`approveEstimateOnSiteAction`)
- Public customer approval via token (`/estimate-approval/[token]`)
- Field estimates from jobs (technician-capable)
- Lead-linked creation (`initialLeadId`)
- Estimate description AI assistant (env-gated)
- Modal and full-page detail routes

**Dependencies:** estimates, customers, jobs, service-items, estimate-approval-tokens, estimate-activities

**Future Work (explicitly labeled):** Alpha Coming Soon gate infrastructure exists but arrays are empty — internal-alpha docs still describe estimates as Coming Soon when hardening arrays are populated.

---

### Jobs

**Status:** Production (Production Hardened — workflow, bulk actions, technician interactions)

**Description:** Core operational entity for scheduled field work.

**Features:**
- Status workflow: scheduled → dispatched → arrived → in_progress → completed / cancelled
- Create, update, bulk lifecycle, status corrections, reopen completed
- Filters: status, view tab, unassigned, priority
- Role-scoped list (all jobs vs assigned only)
- Job detail: activities, equipment, attachments, expenses, materials, profitability snapshot, operational inconsistencies, billing summaries
- Job summary AI assistant (env-gated)
- Bulk selection and group actions

**Dependencies:** jobs, customers, technicians, job-activities, job-materials, job-attachments, customer-equipment, dispatch

---

### Dispatch

**Status:** Production

**Description:** Today's job board for assignment and technician workload.

**Features:**
- Today's jobs board with focus params
- Assign / unassign technician (atomic RPC)
- Technician workload cards
- Billing context on jobs
- Summary cards: scheduled today, in progress, unassigned, completed
- Role filter: all jobs vs own assignments

**Dependencies:** dispatch, jobs, technicians, dispatch_assignments, job-billing-summaries

---

### Technician Mobile

**Status:** Mixed — Production primary surface; legacy mock route remains

**Description:** Field technician experience for assigned jobs, time, expenses, and alerts.

**Production routes:**
| Route | Purpose |
|-------|---------|
| `/technician` | Assigned jobs list + job field detail |
| `/tech/time` | Shift clock + today's time entries |
| `/tech/receipts` | Submit expenses with receipt upload |
| `/tech/notifications` | Technician-filtered notification inbox |

**Job field capabilities:**
- Workflow controls (route, arrive, start work, complete)
- Device-aware map links
- Clock/shift + job labor time
- Field estimates + on-site approval
- Expenses with receipt upload
- Materials, photos/attachments
- Equipment summary
- Completion notes AI, job summary AI (env-gated)

**Legacy / incomplete:**
- `/tech` root — mock dashboard only (`mockTechnicianDashboard`)
- `/tech/jobs`, `/tech/profile` — nav stubs with `enabled: false`, no pages

**Dependencies:** technician-jobs, time-entries, time-clock, expenses, estimates, notifications, job-attachments

---

### Invoices

**Status:** Production (Production Hardened — lifecycle, bulk selection)

**Description:** Billing documents with lifecycle, payments, and customer-facing links.

**Features:**
- CRUD with line items
- Convert from estimate
- Statuses: draft, sent, viewed, partially_paid, paid, overdue, void, cancelled
- Send, batch send, resend email
- Billing sync service
- Invoice message AI assistant (env-gated)
- Modal and full-page detail routes

**Dependencies:** invoices, customers, jobs, service-items, invoice-activities, billing-signatures

---

### Payments

**Status:** Production (manual recording + Stripe Connect online checkout)

**Description:** Payment recording, customer payment links, and Stripe Connect online checkout.

**Features:**
- Record partial/full payments via atomic RPC (`invoice_payments`)
- Payment link generation (`/invoice-payment/[token]`) with token-scoped reads
- Public Pay Now checkout sessions (Stripe — gated by company payment account status)
- Stripe Connect Express onboarding from Settings
- Stripe webhook verification and atomic checkout payment recording
- Payment link email sending
- Technician-facing payment link generation
- Twilio SMS payment links (when `TWILIO_*` env configured)
- Payment activity logging and balance due updates on invoice

**Dependencies:** invoice-payments, invoice-payment-tokens, invoices, company-payment-accounts, stripe webhooks, `lib/payments/*`

---

### Expenses

**Status:** Production

**Description:** Technician and company expense tracking with receipt upload and approval workflow.

**Features:**
- Statuses: draft, submitted, approved, rejected, reimbursed
- Receipt upload to Supabase Storage
- Job/customer linking
- Role visibility: company-wide vs own expenses only
- Technician submit via `/tech/receipts`
- Bulk lifecycle actions

**Dependencies:** expenses, expense-activities, jobs, profiles

---

### Equipment

**Status:** Production (embedded — no standalone admin route)

**Description:** Customer equipment registry surfaced on Customer 360 and job detail.

**Features:**
- Name, type, brand, model, serial, install date, warranty expiration, location, notes
- Active/inactive toggle
- Warranty activity logging
- Aging equipment signals in Customer 360

**Dependencies:** customer-equipment, customer-activities

---

### Reports

**Status:** Production V1 (Production Hardened — owner value, executive layout, lead integration)

**Description:** Financial and operational reporting — V1 is the confirmed financial/operations reporting surface.

**Features:**
- Date ranges: 7d, 30d, 90d, ytd, 12m
- KPIs, revenue/cash charts, sales funnel
- Technician profitability (when roster access)
- Lead pipeline section (when `manageCustomers`)
- Operations snapshot from daily operations summary
- Office review queue + operational health
- Stalled jobs report
- Estimate recovery (stale sent estimates)
- Tax summary export (`/reports/tax-summary`)
- AI Business Summary card (user-triggered, cached)

**Dependencies:** `lib/database/services/reports/*`, reports query aggregator

---

### Notifications

**Status:** Production

**Description:** In-app notification fan-out — no dedicated admin notifications page.

**Features:**
- DB-backed notifications with read/unread state
- Role-targeted fan-out via SECURITY DEFINER RPC
- Admin shell inbox + dashboard widget
- Technician inbox at `/tech/notifications`

**Confirmed types:** `job_assigned`, `job_completed`, `estimate_approved`, `invoice_paid`, `expense_submitted`, `expense_rejected`, `time_clocked_in`, `time_clocked_out`, `draft_invoice_ready`

**Technician filter:** only `job_assigned`, `expense_rejected`, `time_clocked_in`, `time_clocked_out`

**Dependencies:** notifications, notification-role-targeting

---

### Team Management

**Status:** Production (Production Hardened — team member profiles)

**Description:** Company roster, invites, roles, and member profiles.

**Features:**
- Team table in Settings
- Email invites with accept flow
- Role change, suspend/reactivate
- Member profile pages (`/team/[membershipId]`)
- Reports-to, specialties, labor cost rate
- Work summary, activity, profitability fields (permission-gated)
- Pending cross-company network invites on settings

**Dependencies:** memberships, team-member-profile, membership-activities, network-invites

---

### Price Book

**Status:** Production

**Description:** Reusable service catalog for estimates and invoices.

**Features:**
- Service item CRUD
- Archive/delete lifecycle
- Bulk lifecycle actions
- Used by estimates, invoices, and field estimates

**Dependencies:** service-items

**Future Work (explicitly labeled):** Alpha Coming Soon gate infrastructure exists but arrays are empty.

---

### Time Clock / Labor

**Status:** Production

**Description:** Two parallel time systems — company shift clock and job labor entries.

**Features:**
- **Shift clock** (`/time-clock`): company-wide clock in/out
- **Job labor** (`/time`, `/tech/time`, technician jobs): clock, break, job_labor entries
- **Admin review** (`/time`): all entries + active labor
- Approval workflow: active, pending, approved, rejected
- Concurrent time entries supported

**Dependencies:** time-clock, time-entries, time-activities

---

### Network

**Status:** Production (Production Hardened — referrals, invites, partner connections)

**Description:** Cross-company directory, trusted partners, invitations, and lead referrals.

**Features:**
- **Directory** (`network_profiles`): public discovery profiles with visibility toggle
- **My Network** (`network_partners`): trusted Altair company links (`linked_company_id`)
- **Invitations** (`network_invites`): invite contractors; accept creates bidirectional partner rows
- **Incoming invite acceptance** in-platform (`IncomingNetworkInvitesCard`, `acceptIncomingNetworkInviteAction`)
- **Sent/received referrals** (`network_referrals`): cross-company lead handoff; creates lead at send time
- Referral outcome sync from lead pipeline
- Invite partner link repair on page load
- Trade types: HVAC, Plumbing, Electrical, Roofing, General Contracting, Landscaping, Painting

**Dependencies:** network-profiles, network-partners, network-invites, network-referrals, leads

**Future Work (explicitly labeled):** External/manual subs partner CRM (rows without `linked_company_id`); `subcontract_jobs` table not migrated.

---

### Settings

**Status:** Production (Production Hardened)

**Description:** Company configuration, team, billing defaults, onboarding, and system diagnostics.

**Features:**
- Company profile summary
- Team management UI
- Billing defaults (tax rate, payment terms, default notes)
- Onboarding checklist
- Demo data seed/clear (permission-gated)
- System check page for owners (`/settings/system-check`)
- Email mismatch warning for invites

**Dependencies:** company-settings, demo-data, onboarding-snapshot

---

### Platform Admin

**Status:** Production

**Description:** Internal app-owner visibility — not tenant-scoped.

**Features:**
- Platform overview (`/platform`) — companies, users, **Founder Brain** (Mission Hero, priority engine, activation funnel, **Reliability Pulse**, **Customer Health Pulse**, **Founder Action Loop**)
- Beta bug reports (`/platform/bugs`)

**Founder Brain reliability (Sprint 2B):**
- Workflow reminder cron health via `platform_automation_runs` + daily cron recording
- Payment webhook failures and stuck events from `payment_provider_events` (read-only)
- Stripe Connect incomplete/restricted companies with invoices (cross-tenant service role query)
- Platform env checks (Supabase, CRON_SECRET, Stripe, Resend, Twilio) — presence only, no secrets
- Email/SMS delivery failures **deferred** — console/inline only, no durable ledger yet

**Founder Brain customer health (Sprint 2C):**
- Per-company activation stages — signed up → first customer → job → estimate → invoice → payment → activated
- Healthy / watch / needs-help classification from existing cross-tenant counts, auth last sign-in, beta feedback, Stripe Connect risks
- Real-usage counts exclude `is_demo` rows; demo-only workspaces flagged separately
- Customer health signals feed Mission Hero and Needs Attention below critical reliability and blocking bugs
- Onboarding dismiss state **deferred** — stored client-side only (`localStorage`), not queryable cross-tenant

**Founder Brain action loop (Sprint 2D):**
- `platform_founder_signal_actions` table — contacted / snoozed / resolved / notes on stable signal keys (service_role only)
- Actionable signals: customer health risks, Stripe Connect risks, reliability failures (not blocking/high bugs — those use `/platform/bugs`)
- Fingerprint-based re-surfacing — resolved reliability failures return when underlying state changes
- UI: Mission Hero secondary actions, Needs Attention panel controls, contacted badge on Customer Health Pulse

**Dependencies:** `lib/database/services/platform-admin.ts`, `platform-reliability.ts`, `platform-automation-runs.ts`, `platform-founder-signal-actions.ts`, `shared/lib/platform-customer-health.ts`, `shared/lib/platform-founder-signal-actions.ts` (service role client)

---

### Alpha Tracker

**Status:** Production

**Description:** Internal bug and feature tracking for alpha testing.

**Features:**
- Per-company tracker items: types, severity, status, device
- CRUD via server actions
- Access: `manageCompany` (owner/admin)

**Dependencies:** alpha-tracker-items

---

### Marketing Hub

**Status:** Production (founder/owner marketing workflow)

**Description:** Company marketing post drafts, AI rewrite, and connected accounts foundation.

**Features:**
- Marketing post CRUD with draft/edit/archive/delete lifecycle
- AI rewrite assistant (env-gated)
- Completed job marketing draft picker
- Connected accounts foundation (Facebook OAuth helpers, encrypted token storage)
- Scheduled post queue and recurring post UI
- Route: `/marketing`

**Dependencies:** marketing-posts, marketing-connected-accounts, marketing-ai actions

---

### Workflow Reminders

**Status:** Production

**Description:** Durable internal workflow reminders evaluated from live operational data.

**Features:**
- Reminder kinds: `unpaid_invoice_7d`, `stale_estimate_7d`, `lead_follow_up_due`, `ready_to_invoice`
- Snooze, dismiss, complete with idempotency keys
- Evaluator service (`lib/database/services/evaluate-workflow-reminders.ts`)
- Daily production cron at 12:00 UTC (`/api/cron/workflow-reminders`), with a 36-hour stale threshold for schedule/build jitter
- Dashboard surfacing via `WorkflowRemindersSection`

**Dependencies:** workflow-reminders table (`105_workflow_reminders_foundation.sql`), leads, estimates, invoices, jobs

---

### Mobile Install

**Status:** Production

**Description:** Guided PWA install experience for technicians and field users.

**Features:**
- Route: `/install`
- Device-specific install walkthrough with annotated screenshots
- PWA installed-state detection

**Dependencies:** none (client-side)

---

### Design Lab

**Status:** Production (platform admin / founder tool)

**Description:** Live North Star token editing and dashboard replica preview.

**Features:**
- Click-to-edit color targets across admin chrome and dashboard replica
- Color presets, contrast guardrails, theme export
- Dashboard shell clone with scoped surface editing
- Route: `/platform/design-lab` (platform admin access)

**Dependencies:** platform admin access

---

### Additional Confirmed Modules

| Module | Status | Route | Notes |
|--------|--------|-------|-------|
| Demo Data | Production | Settings / Dashboard | Idempotent seed and clear |
| Beta Bug Report | Production | In-app button | Submits to platform bug reports |
| Customer CSV Import | Production | `/customers/import` | Smart column mapping |
| Public Estimate Approval | Production | `/estimate-approval/[token]` | Token-based, no auth |
| Public Invoice Payment | Production | `/invoice-payment/[token]` | Token-based Pay Now + Stripe checkout when configured |
| Marketing / Pricing | Production | `/pricing`, auth marketing panels | Founding beta pricing page |
| Onboarding Setup | Production | `/setup` | First-time company bootstrap with trade selection |
| Mobile Install | Production | `/install` | PWA install guidance |

---

## 4. AI SYSTEMS

All AI features require `AI_FEATURES_ENABLED=true` and `OPENAI_API_KEY`. Guardrails: 10s cooldown, 10 req/5min per company/user/feature (`lib/ai/guardrails.ts`).

### AI Lead Follow-Up Assistant

**Status:** Production (Production Hardened)

- Action: `app/actions/lead-ai.ts`
- UI: `LeadFollowUpAiAssistant` on lead detail
- Inputs: lead record, activities, related customer/estimate/job context

### AI Business Review

**Status:** Production

- Action: `app/actions/reports-ai.ts`
- UI: `AiBusinessSummaryCard` on Reports
- Inputs: full `getReportsPageData` snapshot
- Cached in-memory (`lib/ai/business-summary-cache.ts`)
- Includes lead pipeline context

### Estimate Description AI

**Status:** Production

- Action: `app/actions/estimate-ai.ts`
- UI: `EstimateDescriptionAiAssistant`
- Inputs: job-linked draft estimate context

### Job Summary AI

**Status:** Production

- Action: `app/actions/job-ai.ts`
- UI: `JobSummaryAiAssistant` on job detail
- Inputs: job activities, billing summaries

### Invoice Message AI

**Status:** Production

- Action: `app/actions/invoice-ai.ts`
- UI: `InvoiceMessageAiAssistant`
- Inputs: invoice, job, company contact info

### Completion Notes AI

**Status:** Production

- Action: `app/actions/completion-notes-ai.ts`
- UI: `CompletionNotesAiAssistant` on technician job closeout
- Inputs: job completion draft context

---

## 5. OPERATIONS ENGINE

**Status:** Production — database-driven, surfaced on Dashboard and Reports (no standalone route)

### Office Priority Engine / Office Review Queue

**Status:** Production (Production Hardened — signal consolidation)

- Service: `lib/database/services/reports/office-review-queue.ts`
- UI: `OfficeReviewQueueSection` on Dashboard and Reports
- Queue item types: unassigned_job, ready_to_invoice, overdue_invoice, unsent_invoice, unsent_estimate, stale_sent_estimate, needs_review, stalled_job, lead_follow_up
- Aging threshold: 7 days (`OFFICE_REVIEW_QUEUE_AGING_DAYS`)
- Operational health score derived from queue

### Operational Resolution Queue

**Status:** Production

- Lib: `shared/lib/operational-resolution-queue.ts`
- UI: `OperationalResolutionQueueSheet` (mobile)
- Aggregates actionable items from dashboard operational data

### Stalled Job Queue

**Status:** Production (Production Hardened)

- Service: stalled jobs report (`stalled-jobs-report.ts`)
- Threshold: **3-day** inactivity (in-code, not user-configurable)
- Surfaces on Dashboard and office review queue

### Estimate Recovery Queue

**Status:** Production (Production Hardened)

- Lib: `shared/lib/estimate-recovery.ts`
- Threshold: **7-day** sent-without-response (`ESTIMATE_RECOVERY_THRESHOLD_DAYS`)
- Surfaces stale sent estimates on Dashboard and office review queue

### Additional Operational Systems (confirmed)

| System | Description |
|--------|-------------|
| Daily Operations Summary | Analytics strip, operational insights, profitability warnings |
| Completed Work Review | Jobs needing office review after completion |
| Awaiting Invoicing | Completed jobs ready to invoice |
| Operational Inconsistencies | Data/workflow mismatches flagged for office |
| Dispatch Pressure | Dashboard section for today's dispatch load |
| Mobile Operations Hub | Priority signals for mobile dashboard |
| Workflow Reminder Engine | Evaluated reminders for unpaid invoices, stale estimates, lead follow-ups, ready-to-invoice jobs |

---

## 6. PLATFORM HARDENING

Documented completed hardening passes only (from migrations and git history):

| Pass | Scope |
|------|-------|
| Final beta RLS hardening | Role-aware policies on jobs, estimates, invoices, payments, notifications (`046_final_beta_rls_hardening.sql`) |
| Alpha hardening infrastructure | Production banner, Coming Soon gate hooks (`lib/beta/alpha-hardening.ts`) — gate arrays currently empty |
| Dashboard de-duplication | Reduced signal repetition; aligned lead summary with reports |
| Dashboard action routing | Improved drill-down routing from dashboard cards |
| Lead/customer separation | Removed `lead` from customer status enum; cleanup migration (`072_customer_lead_status_cleanup.sql`) |
| Customer system trust | Customer 360 aggregation hardening; navigation and billing UX |
| Customer lifecycle | Archive, delete, trash lifecycle |
| Entity lifecycle recovery UI | Billing and service page recovery flows |
| Financial consistency | Lifecycle records excluded from operational counts; invoice/estimate bulk selection fixes |
| Technician mobile | Hero, job detail, closeout, photo uploads, map handoff hardening passes |
| Lead pipeline | Intake, workflows, reports integration, AI follow-up |
| Team member profiles | Profile pages and permission gating |
| Operations signals | Operational signals foundation; stalled jobs + estimate recovery wired to resolution queue |
| Network | Referrals RLS, invite RLS, partner connections, partner remove semantics, invite partner link repair, referral outcome sync |
| Auth/marketing | Public marketing and auth experience hardening |
| Demo data | Idempotent seeding; orphan cleanup fixes |

---

## 7. IN PROGRESS WORK

See `ALTair_CURRENT_SPRINT.md` for active sprint scope.

### Authenticated Production Smoke

**System:** Beta readiness  
**Current Status:** Recommended before first external company onboarding  
**Remaining Work:** Run `docs/internal-alpha-smoke-test.md` on production with real tenant data

### Technician `/tech` Root Mock Dashboard

**System:** Technician Mobile  
**Current Status:** `/technician` is production; `/tech` root still serves mock data  
**Remaining Work:** Remove mock route or redirect `/tech` → `/technician`; implement or remove `/tech/jobs` and `/tech/profile` nav stubs

### Alpha Coming Soon Gates

**System:** Alpha deployment hardening  
**Current Status:** Infrastructure live; gate arrays are **empty**  
**Remaining Work:** Populate arrays only if internal alpha needs module hiding — not active today

### Network External Partner CRM

**System:** Network  
**Current Status:** `network_partners` rows without `linked_company_id` exist in schema; no UI  
**Remaining Work:** External/manual subs partner CRM (explicitly labeled future in `shared/components/network/README.md`)

### North Star Default-On Decision

**System:** Experience layer  
**Current Status:** M1–M14 complete behind `NEXT_PUBLIC_NORTH_STAR_SHELL=true`  
**Remaining Work:** Monitor flag-on stability; consider default-on after beta smoke passes

---

## 8. FUTURE IDEAS (NOT BUILT)

> Kept entirely separate from production. Sourced from roadmap docs and explicit code TODOs only.

### Altair OS V2 Roadmap Phases

**Source:** `docs/altair/ALTair_V2_ROADMAP.md`

| Idea | Description | Status |
|------|-------------|--------|
| Design System Foundation | Reusable V2 components | **Complete** — components built |
| Master Shell Architecture | Page shell primitives | **Complete** |
| Command Center V2 / Dashboard | Dashboard North Star M2 | **Complete** (behind flag) |
| Customers V2 | Customer module North Star M3 | **Complete** (behind flag) |
| Dispatch V2 | Dispatch North Star command shell | **Complete** (behind flag) |
| Jobs V2 | Jobs module North Star M4 | **Complete** (behind flag) |
| Reports V2 | Reports North Star M8 | **Complete** (behind flag) |
| Leads V2 | Lead pipeline North Star M14 | **Complete** (behind flag) |
| Team V2 | Team member profile North Star M12 | **Complete** (behind flag) |
| Technician Experience V2 | Mobile experience redesign | **Deferred** — post-beta |
| Experience Prototype Adoption | Command Center / Workspace wholesale | **Deferred** — Phase 6 |
| Micro Interactions Batch C | Additional polish | **Deferred** — only if smoke finds gaps |

### Network Subcontract Jobs

**Idea:** Two-sided subcontract job marketplace between network partners  
**Description:** `subcontract_jobs` table not migrated; partner CRM for external subs  
**Difficulty:** High  
**Priority:** Documented in network README as future partner CRM work

### Technician Mock Placeholders

**Idea:** Maps, quick notes, quick photos on legacy `/tech` mock dashboard  
**Description:** Toast placeholders only — "coming soon" in `TechnicianDashboardView.tsx`  
**Difficulty:** Medium  
**Priority:** N/A — mock route only, not production surface

### Customer Portal Role

**Idea:** `customer` company role for future customer-facing portal  
**Description:** Role exists in enum; no customer portal routes confirmed  
**Difficulty:** High  
**Priority:** Schema placeholder only

### AI Guardrails at Scale

**Idea:** Replace in-memory rate limits with DB/Redis  
**Description:** Noted in `lib/ai/guardrails.ts`  
**Difficulty:** Medium  
**Priority:** Production-scale hardening (future)

---

## 9. ARCHITECTURE RULES

Confirmed platform rules — do not violate in new work:

| Rule | Evidence |
|------|----------|
| **Customers are never leads** | Prospects live in `leads` table; onboarding checklist: "Leads stay separate from customers until you convert or send an estimate." |
| **Leads convert into customers** | `convertLeadToCustomerAction`; lead won/lost workflows |
| **Everything is company scoped** | All operational queries filter by `company_id` |
| **AI consumes existing platform data** | All AI actions read from query layer; no standalone AI data stores |
| **Customer 360 is the customer source of truth** | Aggregated view on customer detail; opportunity and financial signals |
| **Reports V1 is the financial/operations reporting surface** | `getReportsPageData` + report services; no Reports V2 in production |
| **Network models must not be conflated** | `network_profiles` = directory; `network_partners` = private CRM; `network_invites` = growth; `network_referrals` = lead handoff — see network README |
| **Referrals create leads at send time** | Outcome sync maps lead status → referral status only; referrals never mutate partners |
| **Invites create/repair partner links only** | Invites do not create referrals or leads |
| **New systems should integrate before creating standalone modules** | Operations engine surfaces through Dashboard/Reports, not separate routes |
| **Technicians use `/technician` as home** | Admin dashboard redirects technicians |
| **Entity lifecycle states are excluded from operational counts** | Lifecycle records don't inflate dashboard/reports operational metrics |
| **AI requires explicit env enablement** | `AI_FEATURES_ENABLED=true` + `OPENAI_API_KEY`; disabled by default |
| **Alpha hardening on in production** | `NODE_ENV=production` enables alpha banner; Coming Soon gates require populated arrays |

---

## 10. CHANGELOG

Major completed milestones (chronological, newest first — from git history):

| Period | Milestone |
|--------|-----------|
| Jul 2026 | Documentation recovery sync; ~187 commits since 2026-06-17 doc sync |
| Jul 2026 | Founder Brain action loop — founder signal actions, snooze/resolve/contacted, fingerprint suppression on `/platform` |
| Jul 2026 | Founder Brain customer health — per-company activation pulse, outreach signals, demo-only exclusion on `/platform` |
| Jul 2026 | Founder Brain reliability signals — cron tracking, payment webhook health, Stripe Connect risks, Reliability Pulse |
| Jul 2026 | Founder Brain foundation — Mission Hero, priority engine, activation funnel on `/platform` |
| Jul 2026 | Stripe Connect — onboarding, checkout, webhooks, Pay Now, SMS links |
| Jul 2026 | Trade-aware signup and company bootstrap |
| Jul 2026 | North Star M2–M14 + dispatch pilots (behind flag) |
| Jul 2026 | Marketing hub, design lab, mobile install, dashboard action prioritization |
| Jul 2026 | Production RLS and public token RPC hardening |
| Jun 2026 | North Star Phase M1 — grouped desktop sidebar behind flag |
| Jun 2026 | Network referral lead sharing; referral outcome sync from lead pipeline |
| Jun 2026 | Trusted network invitations and My Network partner management |
| Jun 2026 | Smart customer CSV import |
| Jun 2026 | Marketing screenshots and founding beta pricing page |
| Jun 2026 | Founder marketing display cleanup; demo data for screenshots |
| Jun 2026 | Customer 360 V1 with aggregation layer and hardening passes |
| Jun 2026 | Customer system navigation, billing UX, and trust hardening |
| Jun 2026 | Technician mobile polish and hardening (hero, job detail, closeout, photos, maps) |
| Jun 2026 | Dashboard de-duplication and action routing improvements |
| Jun 2026 | Estimate recovery queue (7-day threshold) |
| Jun 2026 | Stalled jobs wired into operational resolution queue (3-day threshold) |
| Jun 2026 | Office priority operational signals consolidation |
| Jun 2026 | AI lead follow-up assistant |
| Jun 2026 | AI business review with lead pipeline context |
| Jun 2026 | Lead pipeline foundation and hardening |
| Jun 2026 | Lead reporting in Reports V1 |
| Jun 2026 | Lead/customer status separation cleanup |
| Jun 2026 | Team member profiles |
| Jun 2026 | Reports V1 desktop overview and executive layout |
| Jun 2026 | Entity lifecycle (archive, trash, cancel) across customers, jobs, estimates, invoices |
| Jun 2026 | Demo data foundation (idempotent seed/clear) |
| Jun 2026 | Final beta RLS hardening |
| Earlier | Core modules wired to Supabase: auth, customers, jobs, dispatch, estimates, invoices, payments, expenses, time, notifications, price book, technician workflow |

---

## Document Maintenance

When new information is provided (status reports, screenshots, completion reports):

1. Extract facts only — do not invent
2. Remove duplicates against this document
3. Assign category: Production, Production Hardened, In Progress, Architecture Rule, or Future Idea
4. Update the relevant section
5. Append changelog entry for major milestones
6. Move items from In Progress → Production when confirmed shipped

**Related docs (not duplicates of this inventory):**
- `docs/altair/ALTair_MASTER_STATUS.md` — current product state
- `docs/altair/ALTair_CURRENT_SPRINT.md` — active sprint scope
- `docs/altair/ALTair_V2_ROADMAP.md` — future experience-layer phases
- `docs/internal-alpha-smoke-test.md` — deploy verification checklist
- `docs/backend-data-map.md` — **outdated planning doc** (pre-Supabase wiring); do not treat as production truth
- `shared/components/network/README.md` — network model canonical reference

# 11. SYSTEM DEPENDENCIES

Dashboard
├── Dispatch
├── Jobs
├── Leads
├── Reports
├── Expenses
├── Notifications
└── Operations Engine

Customer 360
├── Customers
├── Jobs
├── Estimates
├── Invoices
├── Payments
├── Equipment
└── Expenses

Lead Pipeline
├── Customers
├── Estimates
├── Network

Reports V1
├── Invoices
├── Payments
├── Leads
├── Jobs
├── Time Entries
└── Operations Engine

Dispatch
├── Jobs
├── Team Management
└── Dispatch Assignments

Technician Mobile
├── Jobs
├── Time Clock
├── Expenses
├── Notifications
└── Estimates

Network
├── Leads
├── Team Management
└── Customers
