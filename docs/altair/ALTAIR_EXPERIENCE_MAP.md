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

# Shell Migration Status (Living)

Tracks V2 Master Shell adoption by experience. Updated 2026-06-15.

This section tracks **layout architecture only** — not feature completeness. See `ALTair_MASTER_STATUS.md` and `ALTair_CURRENT_SPRINT.md` for sprint detail.

**Principle:** Shell migrations are experience-layer architecture only. No product logic, routes, server actions, Supabase behavior, or RLS assumptions change during migration.

## Experience 1: Command Center

| Module | Shell status |
|--------|--------------|
| Dashboard (`/`) | **Complete** — loaded view + loading state on Master Shell |
| Notifications | Not migrated |

**Next:** Command Center prototype patterns (future Phase 6).

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
| Customer import wizard | Not migrated |
| Invoice edit | Not migrated |

Workspace list and detail families are the reference implementations for the rest of the product.

## Experience 3: Operations

| Module | Shell status |
|--------|--------------|
| Dispatch | **Pending** — board/workbench shell (last) |
| Technician Mobile | Not in Master Shell scope |
| Time / Time Clock | Not migrated |

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

## Legacy (Deprecated, Zero Imports)

| File | Status |
|------|--------|
| `ListCommandCenterLayout` | Deprecated — delete in cleanup pass |
| `ListCommandCenterLoadingState` | Deprecated — delete in cleanup pass |

## Next Sequence

1. Invoice edit
2. Customer import wizard
3. Time / Time Clock
4. ListCommandCenter legacy file cleanup
5. Dispatch (board/workbench shell, last)
