# Altair OS V2 Roadmap

Last Updated: 2026-06-17

Experience-layer redesign roadmap. Does not track feature development — see `ALTair_BRAIN.md` for production inventory.

**Rule:** Shell migrations do not alter product logic, routes, server actions, Supabase behavior, or RLS assumptions.

**Current status:** Beta-ready foundation complete; **North Star Phase M1 complete** behind `NEXT_PUBLIC_NORTH_STAR_SHELL=true`. M1 polish next; M2 dashboard planning queued (no M2 implementation until M1 stable). Master Shell V2, Visual Polish Passes A–F, Micro-Interaction Batches A–B, Interaction Bug-Fix Pass A, and pre-beta interaction fixes are complete on major admin surfaces.

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
- Isolated prototypes: `/altair-design-lab`, `/command-center-v1`, `/workspace-v1`, `/altair-shell-color-lab-v1`, `/altair-shell-north-star-v1`, `/altair-shell-north-star-v2`, `/altair-shell-north-star-v3`

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
| 5 — Mobile viewport lock | **Deferred** | Dispatch mobile behavior differs from list pages; board must stay visible under sheets |

---

## Phase 9 — North Star Production Migration

**Status:** M1 complete; M2 planning next (do not implement until M1 stable)

**North Star approved (2026-06-16):** **Mission Control Original Refined** — graphite shell + brass command accents + slate operating backing + ivory work cards. Concept iteration **stopped**.

Founder decision: this direction is good enough to stop concept iteration. Do not create more palette concepts or redesign the shell blindly. M1 landed the grouped desktop shell; M2 targets dashboard pilot only.

**Visual formula:**

- Dark graphite grouped left shell
- Brass command accents
- Dark command hero (M2)
- Slate/blue operating backing (M2+)
- Ivory work cards (M2+)
- Readable dark text on light cards
- Semantic status colors kept separate

**Primary reference:** `/altair-shell-color-lab-v1` — palette `mission-control-refined`.

**Concept routes:** research/reference only — retain, do not delete, do not productionize wholesale.

**Phased migration:**

| Phase | Focus | Status |
|-------|-------|--------|
| **M1** | Grouped left sidebar shell (desktop admin chrome) | **Complete** — `NEXT_PUBLIC_NORTH_STAR_SHELL=true` |
| **M2** | Dashboard pilot — command hero, “Do this first”, Action/Work/Money board | **Planning** — do not start until M1 stable |
| **M3** | One list page pilot | **Planned** |
| **M4** | One detail page pilot | **Planned** |

**M1 delivered (2026-06-17):**

- Grouped desktop left sidebar when flag enabled; legacy horizontal nav when off
- Mobile navigation and page interiors intentionally unchanged
- Shell/chrome migration only — not a dashboard redesign
- Routes, permissions, RBAC, Dispatch, overlays, billing, print, technician app preserved
- Production smoke looked good on desktop; mobile unchanged

**M2 scope (dashboard pilot only — planning, not started):**

- Mission Control hero
- “Do this first” primary action
- Action / Work / Money operating board
- Real production dashboard data preserved
- Existing queues and actions preserved
- **Not in M2:** Dispatch redesign, billing redesign, mobile redesign

**Must preserve:** routes, product logic, Supabase/RLS/server actions, Dispatch behavior, billing/print/overlay behavior, mobile sheets.

**Is not:** more palette concepts, blind shell redesign, concept wholesale backport, random gradients, flashy animation, Dribbble redesign, fake AI features, gamification, broad route transitions, page-by-page one-off decoration.

**Assets:** North Star concept (`/altair-shell-color-lab-v1`), V2 components (`shared/design-system/components/`), signature primitives (`shared/design-system/signature/`). Art direction: `ALTAIR_ART_DIRECTION.md`. Flag helper: `lib/beta/north-star-shell.ts`.

---

## Phase 6 — Experience Prototype Adoption

**Status:** Deferred — after North Star Production Migration (Phase 9)

Adopt Command Center and Workspace prototype patterns into production dashboard and workspace modules. Not required before beta.

---

## Phase 7 — Technician Experience V2

**Status:** Deferred (post-beta)

- Eliminate `/tech` mock infrastructure
- Field-optimized layouts under appropriate shell families

---

## Phase 8 — Visual Polish & Micro-Interactions

**Status:** Complete (Passes A–F, Batches A–B, Bug-Fix Pass A, pre-beta fixes)

| Sub-phase | Status | Coverage |
|-----------|--------|----------|
| Visual Polish Pass A | **Complete** | Surface/canvas foundation |
| Visual Polish Pass B | **Complete** | Action/header rhythm |
| Visual Polish Pass C | **Complete** | Loading fidelity |
| Visual Polish Pass D | **Complete** | Detail section surface alignment |
| Visual Polish Pass E | **Complete** | Billing overlay loaded/loading parity |
| Visual Polish Pass F | **Complete** | Narrow density standardization |
| Micro-Interaction Batch A | **Complete** | List row feedback, nav focus/`aria-current`, dispatch workload filter, secondary button press, segmented-control tokens |
| Micro-Interaction Batch B | **Complete** | Form focus, empty-state actions, pending feedback, panel/header micro-states, reduced-motion |
| Micro-Interaction Batch C | **Deferred** | Only if beta smoke finds gaps |
| Interaction Bug-Fix Pass A | **Complete** | `/time` nav, Customer Import drag/drop, Invoice Edit validation, Invoices selection reset, Dispatch feedback scoping |
| Pre-beta interaction fixes | **Complete** | Dispatch pending guard, desktop Escape, Invoices bulk selection, Labor nav href |

**Deferred polish/experience items (not blocking beta):**

- Broad dark mode
- Route/page transitions
- Overlay/detail consistency (`MasterDetailPageLayout` for estimate/invoice overlays)
- `EstimatesLoadingState` summary strip skeleton alignment

---

## Next Operational Step

1. North Star M1 polish and screenshot review — confirm stability before M2 planning.
2. Authenticated production/user-data smoke — validate core workflows on real tenant data before first external company onboarding.
3. M2 dashboard pilot planning — command hero, “Do this first”, Action/Work/Money board; real production data and existing queues preserved. **Do not start M2 implementation until M1 is stable.**
