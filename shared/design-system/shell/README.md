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
