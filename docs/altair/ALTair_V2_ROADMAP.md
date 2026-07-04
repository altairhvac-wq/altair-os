# Altair OS V2 Roadmap

Last Updated: 2026-07-03

Experience-layer redesign roadmap. Does not track feature development — see `ALTair_BRAIN.md` for production inventory.

**Rule:** Shell migrations do not alter product logic, routes, server actions, Supabase behavior, or RLS assumptions.

> **Current status:** See `ALTair_MASTER_STATUS.md`. North Star Phases M1–M14 and dispatch are **complete behind** `NEXT_PUBLIC_NORTH_STAR_SHELL=true`. Master Shell V2 foundation, Visual Polish A–F, and Micro-Interaction A–B are complete.

---

## Phase 0 — Experience Mapping

**Status:** Complete

Defined four experiences (Command Center, Workspace, Operations, Intelligence) and golden-rule page hierarchy. See `ALTAIR_EXPERIENCE_MAP.md`.

---

## Phase 1 — Design System Foundation

**Status:** Complete (components built; production adoption via North Star flag)

Reusable V2 components in `shared/design-system/components/` and signature layer in `shared/design-system/signature/`. Isolated prototypes at `/altair-design-lab`, `/command-center-v1`, `/workspace-v1`, and North Star concept routes.

Founder design lab for live token editing: `/platform/design-lab`.

---

## Phase 2 — Master Shell Architecture

**Status:** Complete — all major admin page families

Shell primitives in `shared/design-system/shell/`. Legacy `ListCommandCenterLayout` and `ListCommandCenterLoadingState` **removed**.

See `shared/design-system/shell/README.md` for adoption patterns.

---

## Phase 3 — Report & Dashboard Shell

**Status:** Complete

Reports, Tax Summary, and Dashboard loaded/loading states aligned to Master Shell.

---

## Phase 4 — Remaining Admin Surfaces

**Status:** Complete

Invoice edit, customer import wizard, Time / Time Clock on Master Shell. Platform/alpha utility surfaces deferred.

---

## Phase 5 — Dispatch (Board / Workbench Shell)

**Status:** Complete (Phases 1–4); Phase 5 deferred

Dispatch Phases 1–4 complete with smoke tests passed. **Phase 5 mobile viewport lock deferred** — board must stay visible under mobile sheets.

North Star dispatch command shell and mobile polish shipped separately (behind flag).

---

## Phase 8 — Visual Polish & Micro-Interactions

**Status:** Complete (Passes A–F, Batches A–B, Bug-Fix Pass A, pre-beta fixes)

**Deferred (not blocking beta):** Batch C, broad dark mode, route/page transitions, overlay/detail consistency, `EstimatesLoadingState` summary strip skeleton.

---

## Phase 9 — North Star Production Migration

**Status:** Complete (M1–M14 + dispatch) — behind `NEXT_PUBLIC_NORTH_STAR_SHELL=true`

**Approved direction (2026-06-16):** Mission Control Original Refined — graphite shell + brass command accents + slate operating backing + ivory work cards. Concept iteration **stopped**.

| Phase | Focus | Status |
|-------|-------|--------|
| **M1** | Grouped left sidebar shell | **Complete** |
| **M2** | Dashboard — command hero, Action/Work/Money board | **Complete** |
| **M3** | Customers list + detail pilot | **Complete** |
| **M4** | Jobs list + detail pilot | **Complete** |
| **M5** | Estimates + invoices pilots | **Complete** |
| **M6** | Expenses list + detail pilot | **Complete** |
| **M7** | Price book catalog pilot | **Complete** |
| **M8** | Reports + tax summary pilot | **Complete** |
| **M9** | Admin time / labor pilot | **Complete** |
| **M10** | Settings workspace pilot | **Complete** |
| **M11** | Network workspace pilot | **Complete** |
| **M12** | Team member profile pilot | **Complete** |
| **M13** | Platform admin pilot | **Complete** |
| **M14** | Leads work queue pilot | **Complete** |
| **Dispatch** | Command shell + mobile polish | **Complete** |

**Flag:** `NEXT_PUBLIC_NORTH_STAR_SHELL=true` — see `lib/beta/north-star-shell.ts`.

**Primary reference:** `/altair-shell-color-lab-v1` — palette `mission-control-refined`.

**Next (operational, not design):** Monitor flag-on stability; consider default-on after beta smoke passes. No additional palette concepts.

---

## Phase 6 — Experience Prototype Adoption

**Status:** Deferred — post-beta

Adopt Command Center and Workspace prototype patterns wholesale into production modules beyond North Star pilots. Not required before beta.

---

## Phase 7 — Technician Experience V2

**Status:** Deferred (post-beta)

- Eliminate `/tech` mock infrastructure
- Field-optimized layouts under appropriate shell families

---

## Next Operational Step

See `ALTair_CURRENT_SPRINT.md` — authenticated production smoke, then first external beta companies.
