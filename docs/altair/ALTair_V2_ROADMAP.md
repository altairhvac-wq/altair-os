# Altair OS V2 Roadmap

Last Updated: 2026-06-16

Experience-layer redesign roadmap. Does not track feature development — see `ALTair_BRAIN.md` for production inventory.

**Rule:** Shell migrations do not alter product logic, routes, server actions, Supabase behavior, or RLS assumptions.

---

## Phase 0 — Experience Mapping

**Status:** Complete

Defined four experiences (Command Center, Workspace, Operations, Intelligence) and golden-rule page hierarchy. See `ALTAIR_EXPERIENCE_MAP.md`.

---

## Phase 1 — Design System Foundation

**Status:** In progress (components built; production adoption selective)

Reusable V2 components in `shared/design-system/components/`:

- Built: HeroHeader, PriorityCard, MetricCard, StatusPill, InsightCard, PulseCard, ActionCard, CelebrationBanner, EmptyState, WorkspaceSection
- Signature layer: AtmosphereBackground, BusinessTerrain, LightBeam, HorizonDivider, MomentumStrip
- Isolated prototypes: `/altair-design-lab`, `/command-center-v1`, `/workspace-v1`

Components remain available for future experience adoption; Master Shell migration does not require them on every page.

---

## Phase 2 — Master Shell Architecture

**Status:** Complete — all major admin page families

Shell primitives in `shared/design-system/shell/`:

| Sub-phase | Status | Coverage |
|-----------|--------|----------|
| Master List Shell | **Complete** | Customers, Leads, Jobs, Estimates, Invoices, Expenses, Service Items + exported list tokens |
| Master List Loading | **Complete** | All 7 list pages |
| Master Detail Shell | **Complete** | Customer 360, Job, Estimate, Invoice, Team Member Profile |
| Hub page shell | **Complete** | Network |
| Settings / admin form hub | **Complete** | Settings, System Check, Invoice Edit, Customer Import Wizard |
| Time / Time Clock | **Complete** | Time Clock, Admin Time Tracking |
| Report / dashboard shell | **Complete** | Reports, Tax Summary, Dashboard (loaded + loading) |
| Board / workbench shell | **Complete (Phase 4)** | Dispatch Phases 1–4; Phase 5 mobile viewport lock deferred |

Legacy `ListCommandCenterLayout` and `ListCommandCenterLoadingState` **removed** (cleanup complete).

---

## Phase 3 — Report & Dashboard Shell

**Status:** Complete

1. Reports — report shell on Master Shell primitives
2. Tax Summary — report shell on Master Shell primitives
3. Dashboard — loaded view and `OperationalDashboardLoadingState` aligned to Master Shell

---

## Phase 4 — Remaining Admin Surfaces

**Status:** Complete

1. Invoice edit — form-edit route on Master Shell primitives
2. Customer import wizard — `/customers/import` on Master Shell primitives
3. Time / Time Clock — admin time surfaces on Master Shell primitives
4. Deprecated ListCommandCenter cleanup — legacy layout/loading files **removed**
5. Platform / alpha internal utility surfaces — **deferred** (not required for major admin coverage)

---

## Phase 5 — Dispatch (Board / Workbench Shell)

**Status:** Complete (Phases 1–4); Phase 5 deferred

| Phase | Status | Notes |
|-------|--------|-------|
| 1 — Shell wrapper/header | **Complete** | `MasterShellPage` + header alignment |
| 2 — Loading state | **Complete** | `DispatchLoadingState` aligned |
| 3 — Board panel surface | **Complete** | `MasterPageSurface` panel variant |
| 4 — Workbench row token | **Complete** | `masterWorkbenchRowClass`; smoke tests passed (desktop + mobile) |
| 5 — Mobile viewport lock | **Deferred/skipped** | Dispatch mobile behavior differs from list pages; board must stay visible under sheets |

---

## Phase 6 — Experience Prototype Adoption

**Status:** Next recommended phase (after visual polish)

Adopt Command Center and Workspace prototype patterns into production dashboard and workspace modules. Master Shell architecture is complete; this phase is experience refinement, not layout migration.

---

## Phase 7 — Technician Experience V2

**Status:** Not started

- Eliminate `/tech` mock infrastructure
- Field-optimized layouts under appropriate shell families

---

## Phase 8 — Micro Interactions & Polish

**Status:** Active — primary V2 focus after Master Shell completion

Motion, delight, consistency, and premium feel on migrated admin surfaces. Includes overlay/detail consistency, skeleton alignment, and selective V2 component/signature-layer adoption.
