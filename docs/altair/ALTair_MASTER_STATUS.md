# ALTAIR MASTER STATUS

Last Updated: 2026-06-16

## Current Stage

Status: **Beta-ready foundation complete; Signature Visual Layer next**

Altair OS is a production-grade multi-tenant field service operating system preparing for small company beta testing.

Master Shell V2 architecture migration, Visual Polish Passes A–F, Micro-Interaction Batches A–B, Interaction Bug-Fix Pass A, and pre-beta interaction fixes are **complete** on major admin surfaces. Focused smoke test passed (2026-06-16).

**Beta status:** Beta-ready with authenticated production/user-data smoke recommended before first external company onboarding.

**Next major design track:** Altair Signature Visual Layer — not more consistency polish. The Master Shell created the stable foundation; the product still reads too close to generic admin SaaS (white/gray canvas, cards, tables, filters, headers). The next phase must deliver visible screenshot-level identity and a richer “business operating system” feel.

Parallel tracks:

1. **Beta readiness** — authenticated smoke on production/user data, onboarding, operational trust
2. **Altair Signature Visual Layer** — visible product identity on top of the shell baseline (planning → phased adoption)
3. **Deferred experience tracks** — Command Center / Workspace production adoption, Technician Experience V2, broad dark mode, route transitions (after Signature Visual Layer unless smoke finds gaps)

The redesign is **experience-layer architecture**, not feature work. Shell, polish, and signature layers do not change product logic, routes, server actions, Supabase behavior, or RLS assumptions.

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

## Altair Signature Visual Layer — Next Major Design Track

**Status:** Planning (not started)

The app is structurally consistent and safer after Master Shell V2, but founder feedback is clear: it still does not feel visually transformed enough. Consistency across pages is not the same as signature product identity. Do not keep making tiny polish changes — the next phase is a deliberate visual layer.

**Goal:** Visible screenshot-level upgrade, stronger first impression, richer app canvas, stronger page hero/header treatment, branded operational accents, richer metric/status cards, premium empty states — less generic “white card/table SaaS,” more “business operating system.”

**Must preserve (non-negotiable):**

- Routes
- Product logic
- Supabase / RLS / server actions
- Dispatch behavior
- Billing / payment / status behavior
- Overlay routing
- Mobile sheets

**Is not:**

- Random gradients
- Flashy animation
- Dribbble redesign
- Fake AI features
- Gamification
- Broad route transitions
- Page-by-page one-off decoration

**Reference assets (isolated, not yet on production):** V2 components in `shared/design-system/components/`, signature primitives in `shared/design-system/signature/`, prototypes at `/command-center-v1`, `/workspace-v1`, `/altair-design-lab`. See `ALTAIR_ART_DIRECTION.md` and `ALTair_V2_ROADMAP.md` Phase 9.

---

## Current Priorities

### Priority 1: Beta Readiness (Active)

Prepare Altair for real companies to onboard and operate daily.

**Next operational step:** Authenticated production/user-data smoke — exercise core workflows (customers, estimates, jobs, dispatch, invoicing, time) on real tenant data before first external company onboarding.

Focus: friction reduction, trust, onboarding, duplicate workflow elimination.

### Priority 2: Altair Signature Visual Layer (Next Design Track)

Plan and phase visible identity upgrades on top of the complete shell/polish/micro-interaction baseline. Target signature composition moments first: Dashboard, Dispatch, list pages, detail pages.

Do **not** label this work “more polish.” Do **not** repeat small consistency passes unless smoke finds functional gaps.

### Priority 3: Deferred Experience Tracks (After Signature Visual Layer)

- Command Center / Workspace production adoption (Phase 6)
- Technician Experience V2 — eliminate `/tech` mock infrastructure
- Dispatch Phase 5 mobile viewport lock
- Micro-Interaction Batch C
- Broad dark mode
- Route/page transitions

### Priority 4: Internal / Platform Surfaces

Migrate only if needed for beta: `/alpha-tracker`, `/platform`, `/platform/bugs`.

---

## Active Work

### In Progress

- Beta onboarding preparation
- Authenticated production/user-data smoke (recommended before first external company)
- Altair Signature Visual Layer planning

### Upcoming

- Signature Visual Layer phased adoption (Dashboard, Dispatch, list pages, detail pages)
- First external company beta testing
- Command Center / Workspace production adoption (Phase 6) — after Signature Visual Layer
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
- Signature Visual Layer plan approved with clear phased rollout (post-smoke)

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
