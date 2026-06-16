# Altair Current Sprint

Sprint: **Master Shell Migration — Report/Dashboard Complete; Admin Utility Surfaces Next**

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

### Report / Dashboard Shells

- **Reports** — report shell on Master Shell primitives
- **Tax Summary** — report shell on Master Shell primitives
- **Dashboard loaded view** — `OperationalDashboardView` on `MasterShellPage`
- **Dashboard loading state** — `OperationalDashboardLoadingState` aligned to Master Shell skeleton

### Legacy Deprecation

- `ListCommandCenterLayout` — deprecated, zero active imports
- `ListCommandCenterLoadingState` — deprecated, zero active imports
- Files kept for cleanup pass; safe to delete when convenient

---

## Page-Family Patterns

| Pattern | Status |
|---------|--------|
| List page shell | Complete |
| Detail page shell | Complete |
| Hub page shell | Complete (Network) |
| Settings / admin form hub shell | Complete |
| Report / dashboard shell | Complete |
| Board / workbench shell | Pending (Dispatch) |

---

## Current Focus

**Invoice edit** — migrate the invoice form-edit route to the admin form shell family. Preserve all edit workflows, validation, and server actions; change presentational structure only.

---

## Next Sequence (Do Not Reorder Without Reason)

1. Invoice edit — form-edit route
2. Customer import wizard — `/customers/import`
3. Time / Time Clock — admin time surfaces
4. Deprecated ListCommandCenter cleanup — delete legacy layout/loading files after confirming zero imports
5. Dispatch — board/workbench shell **last** (highest layout and mobile-sheet risk)

---

## Remaining Page Families (Not Started)

- Invoice edit / form-edit route
- Customer import wizard
- Time / Time Clock
- Platform / admin utility surfaces
- Dispatch board / workbench shell

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
| Report / dashboard shell | Reports, Tax Summary, Operational Dashboard views | same |
| Design components (isolated) | `shared/design-system/components/` | `docs/altair/ALTAIR_COMPONENT_SYSTEM.md` |

---

## Out of Scope This Sprint

- Dispatch board/workbench shell (deferred last)
- Global `AdminShell` chrome replacement
- V2 Command Center / Workspace prototype adoption into production nav
- Feature work or new modules
