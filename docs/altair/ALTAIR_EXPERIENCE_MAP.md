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
* Workflow Reminders
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
* Marketing

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
| **Command Center** | Dark command hero; "Do this first"; Action / Work / Money operating picture |
| **Workspace** | Ivory work cards on slate backing; readable dark text; brass command accents in headers |
| **Operations** | Restrained field-ops signal; Dispatch board behavior unchanged |
| **Intelligence** | Semantic status colors separate from brand/command accents |

**Production:** North Star M1–M14 + dispatch shipped behind `NEXT_PUBLIC_NORTH_STAR_SHELL=true`. See `ALTair_MASTER_STATUS.md` for phase detail.

**Concept routes:** `/altair-shell-color-lab-v1` (primary reference), plus `/altair-shell-north-star-v1`–`v3`, `/command-center-v1`, `/workspace-v1`, `/altair-design-lab` — research/reference only.

See `ALTAIR_ART_DIRECTION.md` and Phase 9 in `ALTair_V2_ROADMAP.md`.

---

# Shell Migration Status (Living)

Tracks V2 Master Shell and North Star adoption by experience. Updated 2026-07-03.

> **Principle:** Shell migrations are experience-layer architecture only — no product logic, routes, server actions, Supabase behavior, or RLS assumptions change during migration.  
> **Current status detail:** See `ALTair_MASTER_STATUS.md`.

**Summary:** Master Shell V2 **complete**. North Star M1–M14 + dispatch **complete** behind `NEXT_PUBLIC_NORTH_STAR_SHELL=true`. Legacy UI when flag off.

## Global Admin Chrome

| Module | Shell status |
|--------|--------------|
| Desktop admin chrome | **M1 complete** — grouped left sidebar when flag on |
| Mobile admin nav | Unchanged from pre-M1 baseline |

## Experience Coverage (North Star behind flag)

| Experience | Modules | North Star status |
|------------|---------|-------------------|
| **Command Center** | Dashboard, notifications, workflow reminders | **M2 complete** |
| **Workspace** | Customers, leads, jobs, estimates, invoices, expenses, price book, marketing | **M3–M7, M14 complete** |
| **Operations** | Dispatch, time/labor | **Dispatch + M9 complete** |
| **Intelligence** | Reports, tax summary, Customer 360 | **M8 complete**; Customer 360 in **M3** |
| **Cross-cutting** | Network, settings, team profile, platform admin | **M10–M13 complete** |

## V2 Polish & Interaction Status (Complete)

| Track | Status |
|-------|--------|
| Visual Polish Passes A–F | **Complete** |
| Micro-Interaction Batch A | **Complete** |
| Micro-Interaction Batch B | **Complete** |
| Interaction Bug-Fix Pass A | **Complete** |
| Pre-beta interaction fixes | **Complete** — focused smoke passed 2026-06-16 |

## Deferred (Post-Beta Unless Smoke Finds Gaps)

- Micro-Interaction Batch C
- Command Center / Workspace prototype wholesale adoption (Phase 6)
- Technician Experience V2
- Dispatch Phase 5 mobile viewport lock
- Broad dark mode, route/page transitions

See `ALTair_V2_ROADMAP.md` for phase sequencing.
