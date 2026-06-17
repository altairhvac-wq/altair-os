# Altair Experience Map

Altair OS is not a collection of pages.

Altair OS is a collection of experiences.

Users should feel like Altair is helping them run their company.

We are not redesigning modules.

We are redesigning experiences.

---

# Experience 1: Command Center

Purpose:

Give owners immediate clarity.

Question answered:

"What should I do today?"

Modules:

* Dashboard
* Notifications
* Office Priority Engine
* Operational Resolution Queue
* Daily Operations Summary
* Momentum
* Growth Opportunities

Desired Feeling:

"My company is being monitored."

---

# Experience 2: Workspace

Purpose:

Help office staff manage and organize work.

Question answered:

"What am I working on?"

Modules:

* Customers
* Jobs
* Leads
* Estimates
* Invoices
* Expenses
* Price Book

Desired Feeling:

"My office is organized."

---

# Experience 3: Operations

Purpose:

Help field teams execute work.

Question answered:

"What work is happening right now?"

Modules:

* Dispatch
* Technician Mobile
* Time Tracking
* Labor

Desired Feeling:

"My field team is synchronized."

---

# Experience 4: Intelligence

Purpose:

Turn data into decisions.

Question answered:

"What is my business telling me?"

Modules:

* Reports
* Customer 360
* AI Business Review
* Technician Profitability
* Operational Health

Desired Feeling:

"My business is teaching me something."

---

# Altair Golden Rule

Every page must answer ONE question.

Command Center

"What should I do today?"

Workspace

"What am I working on?"

Operations

"What work is happening now?"

Intelligence

"What is my business telling me?"

---

# Design Red Flags

If we see these, redesign it:

* Giant tables
* Too many cards
* Isolated pages
* Generic dashboards
* Data without actions
* Repeated statistics
* More than 3 levels of hierarchy
* More than 2 competing primary actions

---

# North Star

Users should think:

"Altair is helping me run my company."

Not:

"I have work to do inside this software."

---

# Approved Shell Visual Direction (2026-06-16)

**Mission Control Original Refined** — founder-approved North Star. Concept iteration stops here.

**Formula:** graphite shell + brass command accents + slate operating backing + ivory work cards.

| Experience | North Star expression |
|------------|----------------------|
| **Command Center** | Dark command hero; “Do this first”; Action / Work / Money operating picture |
| **Workspace** | Ivory work cards on slate backing; readable dark text; brass command accents in headers |
| **Operations** | Restrained field-ops signal; Dispatch board behavior unchanged |
| **Intelligence** | Semantic status colors separate from brand/command accents |

**Production:** beta-ready Master Shell V2 baseline — unchanged until phased migration.

**Concept routes:** `/altair-shell-color-lab-v1` (primary reference), plus `/altair-shell-north-star-v1`–`v3`, `/command-center-v1`, `/workspace-v1`, `/altair-design-lab` — research/reference only.

See `ALTAIR_ART_DIRECTION.md` and Phase 9 in `ALTair_V2_ROADMAP.md`.

---

# Shell Migration Status (Living)

Tracks V2 Master Shell adoption by experience. Updated 2026-06-16.

This section tracks **layout architecture only** — not feature completeness. See `ALTair_MASTER_STATUS.md` and `ALTair_CURRENT_SPRINT.md` for sprint detail.

**Principle:** Shell migrations are experience-layer architecture only. No product logic, routes, server actions, Supabase behavior, or RLS assumptions change during migration.

**Summary:** Master Shell V2 coverage is **complete** for major admin surfaces. Visual Polish Passes A–F, Micro-Interaction Batches A–B, Interaction Bug-Fix Pass A, and pre-beta interaction fixes are **complete**.

**Current status:** Beta-ready foundation complete; **North Star shell direction selected** — production migration planning next. Authenticated production/user-data smoke recommended — not “feature complete forever,” not “needs more polish before beta.”

**North Star selected (2026-06-16):** **Mission Control Original Refined** — graphite shell, brass command accents, slate operating backing, ivory work cards. Concept iteration stopped. Production app unchanged. Next step: phased production migration plan (shell audit → grouped left nav → tokens → dashboard/list/detail pilots). Do not create more palette concepts or redesign the shell blindly.

**Signature gap (addressed by migration, not more concepting):** Most admin pages share the same shell/polish baseline but lack the approved North Star identity. Phased migration targets:

- **Dashboard** — command hero + Action/Work/Money rhythm (see `/altair-shell-color-lab-v1`)
- **One list page pilot** — ivory cards on slate backing, brass command accents
- **One detail page pilot** — section rhythm without one-off decoration
- **Dispatch** — richer operational canvas only where board behavior is preserved

Do not loop on small polish passes or new palette concepts. See `ALTAIR_ART_DIRECTION.md`, `ALTair_MASTER_STATUS.md`, and Phase 9 in `ALTair_V2_ROADMAP.md`.

## Experience 1: Command Center

| Module | Shell status |
|--------|--------------|
| Dashboard (`/`) | **Complete** — loaded view + loading state on Master Shell |
| Notifications | Not migrated |

**Next:** Command Center prototype patterns (Phase 6) — deferred post-beta.

## Experience 2: Workspace

| Module | Shell status |
|--------|--------------|
| Customers (list + 360) | **Complete** — list + detail shells |
| Leads | **Complete** — list shell |
| Jobs (list + detail) | **Complete** |
| Estimates (list + detail) | **Complete** |
| Invoices (list + detail) | **Complete** |
| Expenses | **Complete** — list shell |
| Price Book / Service Items | **Complete** — list shell |
| Customer import wizard | **Complete** — Master Shell wizard |
| Invoice edit | **Complete** — Master Shell form-edit |

Workspace list and detail families are the reference implementations for the rest of the product.

## Experience 3: Operations

| Module | Shell status |
|--------|--------------|
| Dispatch | **Complete (Phases 1–4)** — board/workbench shell; Phase 5 mobile viewport lock **deferred** |
| Technician Mobile | Not in Master Shell scope |
| Time / Time Clock | **Complete** — admin time surfaces on Master Shell |

## Experience 4: Intelligence

| Module | Shell status |
|--------|--------------|
| Reports | **Complete** — report shell |
| Tax Summary | **Complete** — report shell |
| Customer 360 | **Complete** — detail shell (lives in Workspace + Intelligence) |
| AI Business Review | Embedded in Reports — follows Reports shell |

## Cross-Cutting Hubs

| Module | Shell status |
|--------|--------------|
| Network | **Complete** — hub shell |
| Settings | **Complete** — admin/form hub |
| System Check | **Complete** — admin/form hub |
| Team Member Profile | **Complete** — detail shell |

## Legacy (Removed)

| File | Status |
|------|--------|
| `ListCommandCenterLayout` | **Removed** — cleanup complete |
| `ListCommandCenterLoadingState` | **Removed** — cleanup complete |

## Out of Scope (Not Major Admin Surfaces)

| Surface | Notes |
|---------|-------|
| `/alpha-tracker`, `/platform`, `/platform/bugs` | Internal/platform utility |
| `/workspace-v1`, `/command-center-v1`, `/altair-design-lab`, `/altair-shell-color-lab-v1`, `/altair-shell-north-star-v1`, `/altair-shell-north-star-v2`, `/altair-shell-north-star-v3` | Design prototypes — research/reference only; North Star primary ref: color lab `mission-control-refined` |

## V2 Polish & Interaction Status (Complete)

| Track | Status |
|-------|--------|
| Visual Polish Passes A–F | **Complete** |
| Micro-Interaction Batch A | **Complete** |
| Micro-Interaction Batch B | **Complete** |
| Interaction Bug-Fix Pass A | **Complete** |
| Pre-beta interaction fixes | **Complete** — focused smoke passed 2026-06-16 |

## Deferred (After North Star Migration Unless Smoke Finds Gaps)

1. **Micro-Interaction Batch C**
2. **Command Center / Workspace prototype adoption** (Phase 6) — follows North Star Production Migration (Phase 9)
3. **Technician Experience V2**
4. **Dispatch Phase 5 mobile viewport lock**
5. **Broad dark mode**
6. **Route/page transitions**
