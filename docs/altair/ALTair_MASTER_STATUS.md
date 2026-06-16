# ALTAIR MASTER STATUS

Last Updated: 2026-06-16

## Current Stage

Status: Internal Beta Preparation + V2 Experience Layer Polish

Altair OS is a production-grade multi-tenant field service operating system preparing for small company beta testing.

Parallel tracks:

1. **Beta readiness** — stability, onboarding, operational trust
2. **V2 experience refinement** — visual polish and premium feel on top of completed Master Shell architecture (no product logic changes)

The redesign is **experience-layer architecture**, not feature work. Shell migrations do not change product logic, routes, server actions, Supabase behavior, or RLS assumptions.

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
- **Phase 5 mobile viewport lock** — intentionally **deferred/skipped**. Dispatch mobile behavior differs from list pages; the board should remain visible under sheets.

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

### Remaining work (not broad architecture migration)

Remaining V2 work is **visual polish and experience refinement**, not page-family shell migration:

- Dispatch Phase 5 mobile viewport lock (deferred — evaluate only if needed)
- Overlay/detail consistency pass (estimate/invoice overlays vs `MasterDetailPageLayout`)
- Known skeleton inconsistencies (e.g. `EstimatesLoadingState` summary strip)
- Command Center / Workspace prototype adoption (future experience layer)
- Micro-interactions, motion, and premium feel pass

---

## Current Priorities

### Priority 1: Beta Readiness

Prepare Altair for real companies to onboard and operate daily.

Focus: friction reduction, trust, polish, duplicate workflow elimination.

### Priority 2: V2 Visual Polish & Premium Experience

Refine look, feel, and consistency on top of completed Master Shell architecture. Reuse primitives from `shared/design-system/shell/` and V2 components from `shared/design-system/components/`. Do not alter business logic.

### Priority 3: Technician Experience

Eliminate legacy `/tech` mock infrastructure. Improve field usability and reduce clicks.

---

## Active Work

### In Progress

- Beta readiness improvements
- V2 visual polish and premium experience refinement
- Technician `/tech` cleanup

### Upcoming

- Beta onboarding experience and first external company testing
- Command Center / Workspace prototype patterns (Phase 6)
- Technician Experience V2 shell alignment

---

## Current Known Issues

- `/tech` root still contains mock infrastructure
- Dispatch Phase 5 mobile viewport lock intentionally skipped — board remains visible under mobile sheets
- `EstimatesLoadingState` uses default skeleton props (no summary strip skeleton); loaded page shows summary cards when data exists
- Invoice/estimate overlay modes use raw `max-w-5xl` + `adminPageStackClass` instead of `MasterDetailPageLayout`
- Some alpha deployment docs are outdated
- Coming Soon infrastructure exists but is not populated

---

## Immediate Goal (Next 30 Days)

Get Altair into the hands of a small number of real companies while refining the premium experience on top of completed Master Shell coverage.

Success metrics:

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
