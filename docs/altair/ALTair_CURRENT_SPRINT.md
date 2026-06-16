# Altair Current Sprint

Sprint: **Master Shell Migration — Hub & Detail Complete; Report Shell Next**

Last Updated: 2026-06-15

---

## Goal

Migrate production admin pages to reusable Master Shell page-family patterns without changing product logic, routes, server actions, permissions, or business logic.

This is **experience-layer architecture** — reducing mental load and making Altair feel calm, organized, intelligent, and premium.

---

## Completed This Sprint Track

### Master List Shell + Loading (7/7)

- Customers
- Leads
- Jobs
- Estimates
- Invoices
- Expenses
- Service Items / Price Book

All use `MasterListPageLayout` + `MasterListPageLoadingState` with `density="compact"`.

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

### Legacy Deprecation

- `ListCommandCenterLayout` — deprecated, zero active imports
- `ListCommandCenterLoadingState` — deprecated, zero active imports
- Files kept for cleanup pass; safe to delete

---

## Page-Family Patterns

| Pattern | Status |
|---------|--------|
| List page shell | Complete |
| Detail page shell | Complete |
| Hub page shell | Complete (Network) |
| Settings / admin form hub shell | Complete |
| Report / dashboard shell | **Next** |
| Board / workbench shell | Pending (Dispatch) |

---

## Current Focus

**Reports** — establish the report/dashboard shell family. Reports overview already uses some Master Shell primitives; align loaded view, loading state, and section structure to a consistent report/dashboard pattern before Tax Summary.

---

## Next Sequence (Do Not Reorder Without Reason)

1. Reports — report/dashboard shell
2. Tax Summary — adopt report shell family
3. Dashboard loading alignment — `OperationalDashboardLoadingState` → Master Shell skeleton
4. Remaining admin utility / form pages — invoice edit, time, import wizards, platform surfaces
5. Dispatch — board/workbench shell **last** (highest layout and mobile-sheet risk)

---

## Do Not Alter

- Database schemas
- Server actions
- Routes
- Permissions
- Business logic
- Supabase behavior or RLS assumptions
- Existing workflows

Only change presentational page structure, layout primitives, and loading skeletons.

---

## Reference Implementations

| Family | Code | Docs |
|--------|------|------|
| List shell | `shared/design-system/shell/MasterListPageLayout.tsx` | `shared/design-system/shell/README.md` |
| Detail shell | `shared/design-system/shell/MasterDetailPageLayout.tsx` | same |
| Hub / form shell | Network, Settings, System Check page views | same |
| Design components (isolated) | `shared/design-system/components/` | `docs/altair/ALTAIR_COMPONENT_SYSTEM.md` |

---

## Out of Scope This Sprint

- Dispatch board/workbench shell
- Global `AdminShell` chrome replacement
- V2 Command Center / Workspace prototype adoption into production nav
- Feature work or new modules
