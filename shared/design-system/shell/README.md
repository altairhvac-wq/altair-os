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
| `MasterListPageLoadingState` | Loading skeleton scaffold matching `MasterListPageLayout` |
| `MasterDetailPageLayout` | Detail-page scaffold (back link + detail canvas + body stack) |
| `MasterDetailPageLoadingState` | Loading skeleton scaffold matching `MasterDetailPageLayout` |

## Adoption

1. Wrap page view root in `MasterShellPage` + `MasterPageCanvas`.
2. Replace ad-hoc section wrappers with `MasterPageSection`.
3. Use `MasterListPageLayout` for list pages (Customers, Leads, Jobs, Estimates, Invoices, Expenses, Service Items).

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
10. **Loading states**: use `MasterListPageLoadingState` with the same density and summary/tab props as the loaded page.

## List-page shell tokens

Exported from `tokens.ts` for repeated class strings across migrated list pages:

| Token | Use |
|-------|-----|
| `masterListPagePrimaryActionClass` | Compact primary header button |
| `masterListPageMobilePanelLockClass` | `MasterListPageLayout` `className` when a panel is open on mobile |
| `masterListPageSurfaceClass` | `MasterPageSurface` card flex shell |
| `masterListPageScrollRegionClass` | Inner scroll container inside the list card |

**Adopted on all 7 migrated list page views** (Customers, Leads, Jobs, Estimates, Invoices, Expenses, Service Items).

## Migration status (Master List Shell)

**Migrated (7):** Customers, Leads, Jobs, Estimates, Invoices, Expenses, Service Items / Price Book — all use `MasterListPageLayout` with `density="compact"` and list-page shell tokens.

**Migrated hub page (1):** Network — uses basic Master Shell primitives (`MasterShellPage`, `MasterPageCanvas`, `MasterPageHeader`, `MasterContentStack`, `MasterPageSection`, `MasterPageSurface`). Not a list page; tabbed relationship hub with master-detail panels.

**Removed (cleanup pass):** `ListCommandCenterLayout` and `ListCommandCenterLoadingState` — zero active imports; deleted.

**Not in scope:** Dispatch, global `AdminShell` chrome.

## Detail-page shell

Reference implementations: Customer 360, Job detail, Estimate detail, Invoice detail.

1. **Root**: `MasterDetailPageLayout` with `density="default"`.
2. **Width**: `MasterPageCanvas` `width="detail"` (`max-w-5xl`) inside the layout.
3. **Back link**: `backLink` prop (sibling above body content in the vertical stack).
4. **Section cards**: existing `adminCardSectionClass` sections or `MasterPageSurface` `variant="section"` — no forced migration of inner section markup yet.
5. **Section anchors / nav**: page-specific components (e.g. `CustomerDetailSectionNav`) stay as children of the layout body.
6. **Loading states**: `MasterDetailPageLoadingState` with profile + section skeleton props.
7. **Intercepted modal routes**: estimate/invoice overlay shells may keep a local `max-w-5xl` wrapper instead of `MasterDetailPageLayout`; full-page routes use the layout.

**Migrated detail pages (5):** Customer 360, Job detail, Estimate detail, Invoice detail, Team member profile.

## Hub / admin form shell

**Migrated hub (1):** Network — tabbed relationship hub on Master Shell primitives.

**Migrated admin form hubs (2):** Settings, System Check — compact density.

## Report / dashboard shell

**Migrated (3):** Reports, Tax Summary, Operational Dashboard — loaded views and loading states on `MasterShellPage` + `MasterPageCanvas`.

## Coverage audit (2026-06-15)

**Not migrated (remaining admin surfaces):**

| Type | Routes / views |
|------|----------------|
| Board / workbench | `/dispatch` |
| Internal / platform | `/alpha-tracker`; `/platform`; `/platform/bugs` |
| Design prototypes | `/workspace-v1`; `/command-center-v1`; `/altair-design-lab` |

**Next recommended sequence:**

1. Dispatch (board/workbench shell, last)
2. Internal/platform surfaces as needed
3. Overlay/detail consistency pass (`MasterDetailPageLayout` for estimate/invoice overlays)

**Active layout helpers:**

| File | Status |
|------|--------|
| `list-detail-layout.ts` | Active (Network, Time Clock, detail panels) |
| `FocusedDocumentOverlay` | Active (invoice/estimate overlays, technician) |
| `DesktopConditionalDetailPanel` | Active (list-page side panels) |
| `PageSummaryStrip` | Active (summary strips on migrated list pages) |
| `JobContextFilterBanner` | Active (invoices, expenses, time) |

**Known inconsistencies (non-blocking):**

- `EstimatesLoadingState` uses default skeleton props (no summary strip skeleton); loaded page shows summary cards when data exists.
- Invoice/estimate overlay modes use raw `max-w-5xl` + `adminPageStackClass` instead of `MasterDetailPageLayout`.

**Dispatch:** defer until remaining admin utility/form surfaces are migrated; board layout and mobile sheet behavior are high-risk.
