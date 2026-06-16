# Altair Current Sprint

Sprint: **Authenticated Beta Smoke + Signature Visual Layer Planning**

Last Updated: 2026-06-16

---

## Goal

Master Shell V2, Visual Polish Passes A–F, Micro-Interaction Batches A–B, Interaction Bug-Fix Pass A, and pre-beta interaction fixes are **complete** on major admin surfaces.

**Current status:** Beta-ready foundation complete; Signature Visual Layer next. Authenticated production/user-data smoke recommended. This is not “feature complete forever” and not “needs more polish before beta.”

Shell, polish, and signature work remain **experience-layer architecture** — reducing mental load and making Altair feel calm, organized, intelligent, and premium. No product logic, routes, server actions, permissions, or business logic changes.

---

## Completed — Master Shell V2 Migration

### Master List Shell + Loading (7/7)

- Customers
- Leads
- Jobs
- Estimates
- Invoices
- Expenses
- Service Items / Price Book

All use `MasterListPageLayout` + `MasterListPageLoadingState` with `density="compact"` and exported list-page shell tokens.

### Master Detail Shell + Loading (5/5)

- Customer 360
- Job Detail
- Estimate Detail
- Invoice Detail
- Team Member Profile

All use `MasterDetailPageLayout` + `MasterDetailPageLoadingState`.

### Hub & Admin Form Shells

- **Network** — hub page on Master Shell primitives (tabbed relationship hub)
- **Settings** — admin/form hub, compact density
- **System Check** — admin/form hub, compact density
- **Invoice Edit** — form-edit route on Master Shell primitives
- **Customer Import Wizard** — multi-step wizard at `/customers/import`

### Time / Time Clock

- **Time Clock** — admin time-clock surfaces on Master Shell primitives
- **Admin Time Tracking** — admin time surfaces on Master Shell primitives

### Report / Dashboard Shells

- **Reports** — report shell on Master Shell primitives
- **Tax Summary** — report shell on Master Shell primitives
- **Dashboard loaded view** — `OperationalDashboardView` on `MasterShellPage`
- **Dashboard loading state** — `OperationalDashboardLoadingState` aligned to Master Shell skeleton

### Board / Workbench Shell — Dispatch (Phases 1–4)

- Phase 1: shell wrapper/header
- Phase 2: loading state alignment
- Phase 3: board panel surface
- Phase 4: workbench row token alignment (`masterWorkbenchRowClass`)
- Desktop and mobile smoke tests **passed**
- **Phase 5 mobile viewport lock — intentionally deferred** (board must remain visible under mobile sheets)

### Legacy Cleanup (Done)

- `ListCommandCenterLayout` — **removed**
- `ListCommandCenterLoadingState` — **removed**

---

## Completed — Visual Polish Passes A–F

| Pass | Focus |
|------|-------|
| **A** | Surface/canvas foundation |
| **B** | Action/header rhythm |
| **C** | Loading fidelity |
| **D** | Detail section surface alignment |
| **E** | Billing overlay loaded/loading parity |
| **F** | Narrow density standardization |

---

## Completed — Micro-Interaction Batch A

- List row feedback
- Nav focus / `aria-current`
- Dispatch workload active filter state
- Secondary button press feedback
- Segmented-control tokens

---

## Completed — Micro-Interaction Batch B

- Form focus polish
- Empty-state action polish
- Pending feedback
- Panel/header micro-states
- Reduced-motion coverage

---

## Completed — Interaction Bug-Fix Pass A

- `/time` nav mismatch
- Customer Import drag/drop
- Invoice Edit validation feedback
- Invoices selection reset behavior
- Dispatch feedback scoping

---

## Completed — Pre-Beta Interaction Fixes

Focused smoke test passed (2026-06-16):

- Dispatch assign/unassign pending guard
- Dispatch desktop Escape no longer unexpectedly closes inline detail panel
- Invoices bulk selection during search/filter changes
- Labor nav href mismatch (`/time`, `/time-clock`)
- No obvious regressions found

---

## Page-Family Patterns

| Pattern | Status |
|---------|--------|
| List page shell | Complete (7 pages + tokens) |
| Detail page shell | Complete |
| Hub page shell | Complete (Network) |
| Settings / admin form hub shell | Complete |
| Report / dashboard shell | Complete |
| Board / workbench shell | Complete (Dispatch Phases 1–4; Phase 5 deferred) |

---

## Current Focus

1. **Authenticated production/user-data smoke** — validate core workflows on real tenant data before first external company onboarding.
2. **Altair Signature Visual Layer planning** — audit and phase visible identity upgrades; do not start another small polish pass.

---

## Next Major Design Track — Altair Signature Visual Layer

**Not “more polish.”** Master Shell V2, Visual Polish A–F, and Micro-Interaction A–B created the baseline. Founder feedback: the app is consistent and stable, but still too plain — too close to standard admin SaaS (white/gray canvas, cards, tables, filters, headers).

**Goal:**

- Visible screenshot-level visual upgrade
- Stronger first impression
- Richer app canvas
- Stronger page hero/header treatment
- More branded operational accents
- Richer metric/status cards
- More premium empty states
- Less generic “white card/table SaaS”
- More “business operating system”

**Must preserve:** routes, product logic, Supabase/RLS/server actions, Dispatch behavior, billing/payment/status behavior, overlay routing, mobile sheets.

**Is not:** random gradients, flashy animation, Dribbble redesign, fake AI features, gamification, broad route transitions, page-by-page one-off decoration.

**Reference:** `shared/design-system/components/`, `shared/design-system/signature/`, `/command-center-v1`, `/workspace-v1`, `/altair-design-lab`, `ALTAIR_ART_DIRECTION.md`.

**First adoption targets:** Dashboard, Dispatch, list pages, detail pages.

---

## Deferred (After Signature Visual Layer Unless Smoke Finds Gaps)

- Dispatch Phase 5 mobile viewport lock
- Micro-Interaction Batch C
- Technician Experience V2 (`/tech` mock cleanup)
- Command Center / Workspace production adoption (Phase 6)
- Broad dark mode
- Route/page transitions
- Overlay/detail consistency (`MasterDetailPageLayout` for estimate/invoice overlays)
- Internal/platform surfaces (`/alpha-tracker`, `/platform`) — only if needed for beta

---

## Out of Scope

- Global `AdminShell` chrome replacement
- Feature work or new modules
- Database schemas, server actions, routes, permissions, business logic, Supabase/RLS

Only change presentational structure, layout primitives, loading skeletons, and visual refinement when explicitly scoped.

---

## Reference Implementations

| Family | Code | Docs |
|--------|------|------|
| List shell | `shared/design-system/shell/MasterListPageLayout.tsx` | `shared/design-system/shell/README.md` |
| Detail shell | `shared/design-system/shell/MasterDetailPageLayout.tsx` | same |
| Hub / form shell | Network, Settings, System Check, Invoice Edit, Customer Import | same |
| Time shell | Time Clock, Admin Time Tracking views | same |
| Report / dashboard shell | Reports, Tax Summary, Operational Dashboard views | same |
| Board / workbench shell | Dispatch page view + loading state | same |
| Design components (isolated) | `shared/design-system/components/` | `docs/altair/ALTAIR_COMPONENT_SYSTEM.md` |
