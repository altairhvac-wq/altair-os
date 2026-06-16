# ALTAIR MASTER STATUS

Last Updated: 2026-06-16

## Current Stage

Status: **Beta-ready with authenticated production/user-data smoke recommended**

Altair OS is a production-grade multi-tenant field service operating system preparing for small company beta testing.

Master Shell V2 architecture migration, Visual Polish Passes A–F, Micro-Interaction Batches A–B, Interaction Bug-Fix Pass A, and pre-beta interaction fixes are **complete** on major admin surfaces. Remaining work is operational validation and deferred experience tracks — not broad polish before beta.

Parallel tracks:

1. **Beta readiness** — authenticated smoke on production/user data, onboarding, operational trust
2. **Deferred experience tracks** — Command Center / Workspace adoption, Technician Experience V2, broad dark mode, route transitions (post-beta unless smoke finds gaps)

The redesign is **experience-layer architecture**, not feature work. Shell and polish passes do not change product logic, routes, server actions, Supabase behavior, or RLS assumptions.

**North star:** Reduce mental load. Altair should feel calm, organized, intelligent, and premium — not like another management system.

---

## V2 Master Shell — Current State

### Complete (major admin surfaces)

Master Shell V2 architecture migration is **complete** across major admin app surfaces. All page-family patterns are established and adopted on production routes.

**Master List Shell (7 pages)**

Customers, Leads, Jobs, Estimates, Invoices, Expenses, Service Items / Price Book — all on `MasterListPageLayout` with compact density and exported list-page shell tokens (`masterListPagePrimaryActionClass`, `masterListPageMobilePanelLockClass`, `masterListPageSurfaceClass`, `masterListPageScrollRegionClass`).

**Master List Loading State (7 pages)**

All seven list pages use `MasterListPageLoadingState` matching their loaded layout.

**Master Detail Shell (5 pages)**

Customer 360, Job Detail, Estimate Detail, Invoice Detail, Team Member Profile — all on `MasterDetailPageLayout`.

**Hub pages**

- **Network** — tabbed relationship hub on Master Shell primitives (`MasterShellPage`, `MasterPageCanvas`, `MasterPageHeader`, `MasterPageSection`, etc.)

**Form / admin hub pages**

- **Settings** — admin/form hub with compact density
- **System Check** — admin/form hub with compact density
- **Invoice Edit** — form-edit route on Master Shell primitives
- **Customer Import Wizard** — multi-step wizard at `/customers/import` on Master Shell primitives

**Time / Time Clock**

- **Time Clock** — admin time-clock surfaces on Master Shell primitives
- **Admin Time Tracking** — admin time surfaces on Master Shell primitives

**Report / dashboard pages**

- **Reports** — report shell on Master Shell primitives
- **Tax Summary** — report shell on Master Shell primitives
- **Dashboard loaded view** — `OperationalDashboardView` on `MasterShellPage`
- **Dashboard loading state** — `OperationalDashboardLoadingState` aligned to Master Shell skeleton

**Board / workbench shell (Dispatch)**

- **Dispatch** — Phases 1–4 complete; desktop and mobile smoke tests passed
  - Phase 1: shell wrapper/header
  - Phase 2: loading state alignment
  - Phase 3: board panel surface
  - Phase 4: workbench row token alignment (`masterWorkbenchRowClass`)
- **Phase 5 mobile viewport lock** — intentionally **deferred**. Dispatch mobile behavior differs from list pages; the board should remain visible under sheets.

**Legacy cleanup (done)**

- `ListCommandCenterLayout` — **removed** (zero active imports; deleted)
- `ListCommandCenterLoadingState` — **removed** (zero active imports; deleted)

### Page-family shell patterns

| Pattern | Status | Notes |
|---------|--------|-------|
| List page shell | **Done** | 7 pages + exported shell tokens |
| Detail page shell | **Done** | 5 reference implementations |
| Hub page shell | **Done** | Network reference |
| Settings / admin form hub shell | **Done** | Settings, System Check, Invoice Edit, Customer Import |
| Report / dashboard shell | **Done** | Reports, Tax Summary, Dashboard (loaded + loading) |
| Board / workbench shell | **Done (Phase 4)** | Dispatch; Phase 5 mobile viewport lock deferred |

### Out of scope (not major admin surfaces)

| Surface | Status | Notes |
|---------|--------|-------|
| Platform / alpha internal utility | Not migrated | `/alpha-tracker`, `/platform`, `/platform/bugs` |
| Design prototypes | Not migrated | `/workspace-v1`, `/command-center-v1`, `/altair-design-lab` |
| Global `AdminShell` chrome | Unchanged | Stays in `shared/components/admin/` |

---

## V2 Visual Polish — Complete (Passes A–F)

Visual polish on migrated admin surfaces is **complete**. No further polish passes are required before beta unless authenticated smoke finds gaps.

| Pass | Focus | Status |
|------|-------|--------|
| **A** | Surface/canvas foundation | **Complete** |
| **B** | Action/header rhythm | **Complete** |
| **C** | Loading fidelity | **Complete** |
| **D** | Detail section surface alignment | **Complete** |
| **E** | Billing overlay loaded/loading parity | **Complete** |
| **F** | Narrow density standardization | **Complete** |

---

## V2 Micro-Interactions — Complete (Batches A–B)

| Batch | Focus | Status |
|-------|-------|--------|
| **A** | List row feedback; nav focus/`aria-current`; dispatch workload active filter state; secondary button press feedback; segmented-control tokens | **Complete** |
| **B** | Form focus polish; empty-state action polish; pending feedback; panel/header micro-states; reduced-motion coverage | **Complete** |
| **C** | Additional micro-interactions | **Deferred** — only if beta smoke finds gaps |

---

## Interaction Bug-Fix Pass A — Complete

| Fix | Status |
|-----|--------|
| `/time` nav mismatch | **Complete** |
| Customer Import drag/drop | **Complete** |
| Invoice Edit validation feedback | **Complete** |
| Invoices selection reset behavior | **Complete** |
| Dispatch feedback scoping | **Complete** |

---

## Pre-Beta Interaction Fixes — Complete

Focused smoke test passed (2026-06-16):

| Fix | Status |
|-----|--------|
| Dispatch pending assignment guard (assign/unassign) | **Complete** |
| Dispatch desktop Escape no longer unexpectedly closes inline detail panel | **Complete** |
| Invoices bulk selection during search/filter changes | **Complete** |
| Labor nav href mismatch (`/time`, `/time-clock`) | **Complete** |

No obvious regressions found in focused smoke.

---

## Current Priorities

### Priority 1: Beta Readiness (Active)

Prepare Altair for real companies to onboard and operate daily.

**Next operational step:** Authenticated production/user-data smoke — exercise core workflows (customers, estimates, jobs, dispatch, invoicing, time) on real tenant data before first external company onboarding.

Focus: friction reduction, trust, onboarding, duplicate workflow elimination.

### Priority 2: Deferred Experience Tracks (Post-Beta Unless Smoke Finds Gaps)

- Command Center / Workspace prototype adoption (Phase 6)
- Technician Experience V2 — eliminate `/tech` mock infrastructure
- Dispatch Phase 5 mobile viewport lock
- Micro-Interaction Batch C
- Broad dark mode
- Route/page transitions

### Priority 3: Internal / Platform Surfaces

Migrate only if needed for beta: `/alpha-tracker`, `/platform`, `/platform/bugs`.

---

## Active Work

### In Progress

- Beta onboarding preparation
- Authenticated production/user-data smoke (recommended before first external company)

### Upcoming

- First external company beta testing
- Command Center / Workspace prototype patterns (Phase 6) — deferred
- Technician Experience V2 shell alignment — deferred

---

## Current Known Issues (Non-Blocking for Beta)

- `/tech` root still contains mock infrastructure (Technician Experience V2 deferred)
- Dispatch Phase 5 mobile viewport lock intentionally deferred — board remains visible under mobile sheets
- `EstimatesLoadingState` uses default skeleton props (no summary strip skeleton); loaded page shows summary cards when data exists
- Invoice/estimate overlay modes use raw `max-w-5xl` + `adminPageStackClass` instead of `MasterDetailPageLayout` (overlay consistency deferred)
- Some alpha deployment docs are outdated
- Coming Soon infrastructure exists but is not populated

---

## Immediate Goal (Next 30 Days)

Get Altair into the hands of a small number of real companies after authenticated production smoke validates core workflows.

Success metrics:

- Authenticated smoke passes on production/user data
- Companies can onboard themselves
- Companies can create customers, estimates, jobs, and dispatch technicians
- Technicians can complete work; companies can invoice and collect payments
- Admin surfaces feel consistent, calm, and premium under Master Shell patterns

---

## Long-Term Vision

Altair OS becomes a Living Operating System that trades companies genuinely enjoy opening every morning.

It should feel:

- Intelligent
- Helpful
- Calm
- Organized
- Delightful

Rather than feeling like another management system.
