# Altair Current Sprint

Sprint: **Master Shell V2 Complete — Visual Polish & Premium Experience Next**

Last Updated: 2026-06-16

---

## Goal

Master Shell V2 architecture migration across major admin surfaces is **complete**. Remaining V2 work is visual polish and experience refinement — not broad page-family migration.

Shell work remains **experience-layer architecture** — reducing mental load and making Altair feel calm, organized, intelligent, and premium. No product logic, routes, server actions, permissions, or business logic changes.

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
- **Phase 5 mobile viewport lock — intentionally deferred/skipped** (board must remain visible under mobile sheets)

### Legacy Cleanup (Done)

- `ListCommandCenterLayout` — **removed**
- `ListCommandCenterLoadingState` — **removed**

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

**Visual polish and premium experience refinement** on top of completed Master Shell architecture. No new page-family migrations unless a new admin surface is added.

Candidate polish items (non-blocking):

- Overlay/detail consistency (`MasterDetailPageLayout` for estimate/invoice overlays)
- Loading skeleton alignment (e.g. Estimates summary strip)
- Motion, micro-interactions, and signature-layer adoption where appropriate
- Dispatch Phase 5 mobile viewport lock — **deferred**; do not implement without explicit decision

---

## Next Phase (After Master Shell V2)

1. **Visual polish & premium experience** — consistency, motion, delight on migrated surfaces
2. **Command Center / Workspace prototype adoption** (Phase 6) — production dashboard and workspace modules
3. **Technician Experience V2** — eliminate `/tech` mock infrastructure; field-optimized layouts
4. **Internal/platform surfaces** — migrate only if needed for beta (`/alpha-tracker`, `/platform`)

---

## Out of Scope

- Global `AdminShell` chrome replacement
- V2 Command Center / Workspace prototype adoption into production nav (future Phase 6)
- Feature work or new modules
- Dispatch Phase 5 mobile viewport lock (deferred)
- Database schemas, server actions, routes, permissions, business logic, Supabase/RLS

Only change presentational structure, layout primitives, loading skeletons, and visual refinement.

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
