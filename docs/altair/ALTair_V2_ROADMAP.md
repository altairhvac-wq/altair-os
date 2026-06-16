# Altair OS V2 Roadmap

Last Updated: 2026-06-15

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

**Status:** In progress — list, detail, hub, and admin form families complete

Shell primitives in `shared/design-system/shell/`:

| Sub-phase | Status | Coverage |
|-----------|--------|----------|
| Master List Shell | **Complete** | Customers, Leads, Jobs, Estimates, Invoices, Expenses, Service Items |
| Master List Loading | **Complete** | All 7 list pages |
| Master Detail Shell | **Complete** | Customer 360, Job, Estimate, Invoice, Team Member Profile |
| Hub page shell | **Complete** | Network |
| Settings / admin form hub | **Complete** | Settings, System Check |
| Report / dashboard shell | **Next** | Reports overview (partial primitives); Tax Summary; Dashboard loading |
| Board / workbench shell | **Pending** | Dispatch (deferred last) |

Legacy `ListCommandCenterLayout` and `ListCommandCenterLoadingState` deprecated with zero active imports.

---

## Phase 3 — Report & Dashboard Shell

**Status:** Not started (next)

1. Reports — full report/dashboard shell pattern
2. Tax Summary — adopt report shell family
3. Dashboard — align `OperationalDashboardLoadingState` with Master Shell (loaded view already on primitives)

---

## Phase 4 — Remaining Admin Surfaces

**Status:** Not started

- Invoice edit and other form-heavy utility pages
- Time / time-clock surfaces
- Import wizards (`/customers/import`)
- Platform / alpha internal surfaces

---

## Phase 5 — Dispatch (Board / Workbench Shell)

**Status:** Not started — **last by design**

Dispatch requires a board/workbench shell pattern (columns, cards, mobile sheets). Highest layout risk; deferred until other page families are stable.

---

## Phase 6 — Experience Prototype Adoption

**Status:** Future

Adopt Command Center and Workspace prototype patterns into production dashboard and workspace modules. Depends on Master Shell and report/dashboard shell completion.

---

## Phase 7 — Technician Experience V2

**Status:** Not started

- Eliminate `/tech` mock infrastructure
- Field-optimized layouts under appropriate shell families

---

## Phase 8 — Micro Interactions & Polish

**Status:** Not started

Motion, delight, and consistency pass after shell families are stable across admin surfaces.
