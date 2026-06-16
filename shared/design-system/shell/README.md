# Master Shell V1

Reusable page structure inside `AdminShell` main. Does not replace global navigation or auth chrome.

## Components

| Component | Responsibility |
|-----------|----------------|
| `MasterShellPage` | Top-level page column, density rhythm, optional viewport fill |
| `MasterPageCanvas` | Content width (`wide` / `standard` / `detail`) |
| `MasterPageHeader` | In-page title, subtitle, primary/secondary actions |
| `MasterPageSection` | Grouped content with section heading |
| `MasterPageSurface` | Card, panel, or section surface wrapper |
| `MasterContentStack` | Vertical stack between major blocks |
| `MasterListPageLayout` | Full list-page scaffold (header + scrollable body) |

## Adoption

1. Wrap page view root in `MasterShellPage` + `MasterPageCanvas`.
2. Replace ad-hoc section wrappers with `MasterPageSection`.
3. Use `MasterListPageLayout` when migrating list pages from `ListCommandCenterLayout`.

Global chrome (`AdminShell`, `Header`, `DesktopNav`, `MobileNav`) stays in `shared/components/admin/` until a later phase.

## Page title hierarchy

- **Global `Header`**: nav module label (e.g. "Customers") — orientation in the app shell; no page actions.
- **`MasterPageHeader` / `MasterListPageLayout`**: in-page title, subtitle, and primary/secondary actions — the operational command row for list pages.
- Do not remove the in-page header on list pages; compact density keeps title + subtitle on one row so it reads as a toolbar, not a duplicate document title.

## Migrated list page checklist

Reference implementations: Customers, Leads, Jobs, Estimates, Invoices, Expenses, Service Items (Price Book).

1. **Root**: `MasterListPageLayout` with `density="compact"`.
2. **Page-level alerts**: `banners` prop above the header (bulk/lifecycle feedback, create errors).
3. **Metric strips**: `summary` prop between header and body (e.g. summary cards).
4. **Main list card**: `MasterPageSurface` `variant="card"`.
5. **Scroll region**: inside the surface, use `min-h-0 min-w-0 flex-1 overflow-x-hidden lg:overflow-y-auto`.
6. **Detail/create panel**: sibling of `MasterPageSurface`, not nested inside it.
7. **Mobile panel open**: viewport-lock class on the layout (`max-lg:h-[calc(100dvh-7rem)] max-lg:min-h-0 max-lg:overflow-hidden`); hide the list surface with `max-lg:hidden`.
8. **Primary action**: compact h-9 button — `inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl admin-btn-primary px-3 py-1.5 text-sm`.
9. **Subtitles**: static or contextual (counts, filter state).
10. **Loading states**: may remain on `ListCommandCenterLoadingState` until `MasterListPageLoadingState` exists.
