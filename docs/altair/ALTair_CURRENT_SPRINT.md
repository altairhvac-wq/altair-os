# Altair Current Sprint

Sprint: **North Star M1 Polish + M2 Dashboard Planning**

Last Updated: 2026-06-17

---

## Goal

Master Shell V2, Visual Polish Passes A–F, Micro-Interaction Batches A–B, Interaction Bug-Fix Pass A, and pre-beta interaction fixes are **complete** on major admin surfaces.

**Current status:** Beta-ready foundation complete; **North Star Phase M1 complete** behind `NEXT_PUBLIC_NORTH_STAR_SHELL=true`. Next: M1 polish and screenshot review, then M2 dashboard planning. Do not start M2 until M1 is stable. Authenticated production/user-data smoke still recommended.

**Founder decision (2026-06-16):** Stop concept iteration. Preferred direction is **Mission Control Original Refined**. Do not create more palette concepts or redesign the shell blindly.

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

## Completed — North Star Phase M1 (2026-06-17)

**Status:** Complete — live behind `NEXT_PUBLIC_NORTH_STAR_SHELL=true`.

**Scope:** Shell/chrome migration only — not a dashboard redesign.

- Grouped desktop left sidebar on admin routes when flag enabled
- Legacy horizontal nav when flag off or unset
- Mobile navigation intentionally unchanged
- Page interiors intentionally unchanged
- Routes, permissions, RBAC, Dispatch, overlays, billing, print, technician app preserved
- Production smoke looked good on desktop; mobile unchanged

**Flag:** `NEXT_PUBLIC_NORTH_STAR_SHELL=true` — see `lib/beta/north-star-shell.ts`.

**Also completed separately:** Signup hotfix — `/signup` renders correctly; `/sign-up` redirects to `/signup`.

---

## Current Focus

1. **North Star M1 polish** — screenshot review and stability check before M2 planning.
2. **Authenticated production/user-data smoke** — validate core workflows on real tenant data before first external company onboarding.
3. **M2 dashboard planning** — Mission Control hero, “Do this first”, Action/Work/Money operating board; real production data and existing queues preserved. **Do not start M2 implementation until M1 is stable.**

## Approved North Star — Mission Control Original Refined (2026-06-16)

**Status:** Founder-approved. Concept iteration stopped. **M1 complete (2026-06-17).**

**Visual formula:** graphite shell + brass command accents + slate operating backing + ivory work cards.

| Layer | Treatment |
|-------|-----------|
| Shell | Dark graphite grouped left sidebar |
| Command | Brass/gold accents; dark command hero |
| Operating canvas | Slate/blue backing behind lower sections |
| Work surfaces | Ivory cards on slate backing |
| Typography | Readable dark text on light cards |
| Status | Semantic status colors separate from brand accents |

**What worked:** grouped left sidebar, dark graphite shell, command hero, “Do this first” primary action, Action/Work/Money model, slate backing + ivory cards, brass command accent, restrained field-ops signal.

**What did not work:** full light SaaS, paper/report dashboard, full dark cyber/cyan, strict black/gold purity, beige-only workspace, changing layout and palette simultaneously.

**Production:** North Star M1 grouped desktop sidebar behind `NEXT_PUBLIC_NORTH_STAR_SHELL=true`. Legacy horizontal nav when flag off. Mobile nav and page interiors unchanged.

**Concept routes (reference only, retain):** `/altair-shell-color-lab-v1` (primary — `mission-control-refined`), `/altair-shell-north-star-v1`, `/altair-shell-north-star-v2`, `/altair-shell-north-star-v3`, `/command-center-v1`, `/workspace-v1`, `/altair-design-lab`.

---

## Next Major Design Track — North Star M2 Dashboard Pilot

**M1 complete.** Grouped desktop sidebar shipped behind flag. Next work is **M1 polish**, then **M2 dashboard planning** — not more concepting and not M2 implementation until M1 is stable.

**M2 scope (dashboard pilot only — planning, not started):**

- Mission Control hero
- “Do this first” primary action
- Action / Work / Money operating board
- Real production dashboard data preserved
- Existing queues and actions preserved
- **Not in M2:** Dispatch redesign, billing redesign, mobile redesign

**Later phases (M3+):** one list page pilot, one detail page pilot, slate/ivory backing refinements.

**Must preserve:** routes, product logic, Supabase/RLS/server actions, Dispatch behavior, billing/print/overlay behavior, mobile sheets.

**Is not:** more palette concepts, blind shell redesign, productionizing concept wholesale, random gradients, flashy animation, Dribbble redesign, fake AI features, gamification, broad route transitions, page-by-page one-off decoration.

**Reference:** `ALTAIR_ART_DIRECTION.md`, `/altair-shell-color-lab-v1`, `shared/design-system/shell/README.md`.

---

## Deferred (After North Star Migration Unless Smoke Finds Gaps)

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

- M2 dashboard implementation (planning only until M1 stable)
- Global mobile nav redesign
- Page interior redesign in M1/M2
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
