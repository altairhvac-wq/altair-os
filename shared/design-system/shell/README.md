# Master Shell

Reusable page structure inside `AdminShell` main. Does not replace global navigation or auth chrome.

Master Shell V2 architecture migration is **complete** across major admin surfaces. Remaining work is visual polish and experience refinement, not broad page-family migration.

## Surface system (Pass A)

Three shared tiers — defined in `app/globals.css`, consumed via CSS classes and shell tokens:

| Tier | CSS class | Token | Use |
|------|-----------|-------|-----|
| **Canvas** | `.admin-canvas` | `--surface-canvas` | Page background inside `AdminShell` main; matches `html`/`body` shell color (`#f4f7fa`) |
| **Panel** | `.admin-panel` | `--surface-panel`, `--radius-panel` | Large structural containers — list cards, Dispatch board, workbench panels |
| **Card** | `.admin-card` | same radius as panel | Primary content cards with card shadow |
| **Section** | `.admin-section-surface` | `masterSectionSurfaceClass` | Grouped blocks inside detail/settings/forms — slightly smaller radius (`--radius-section`) |

Panel headers use `.admin-panel-header` (`masterPanelHeaderClass`) with default padding; pages may override with Tailwind utilities.

Page command rows use `.admin-page-header`. Secondary header actions: `masterSecondaryActionClass`.

`adminCardSectionClass` in `shared/lib/admin-density.ts` aliases `masterSectionSurfaceClass` — detail sections and `MasterPageSurface` `variant="section"` share one treatment.

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
| `masterSectionSurfaceClass` | Section/card grouping surface (detail sections, `MasterPageSurface` section variant) |
| `masterPanelHeaderClass` | Panel chrome header with default padding |
| `masterSecondaryActionClass` | Compact secondary button in page headers |

**Adopted on all 7 migrated list page views** (Customers, Leads, Jobs, Estimates, Invoices, Expenses, Service Items).

## Workbench / board shell (Dispatch)

Board-style pages keep the main surface and desktop detail panel as **siblings** inside a shared flex row — not nested.

1. **Root**: `MasterShellPage` `fillViewport` `density="compact"` + `MasterPageCanvas` `width="wide"`.
2. **Body stack**: `MasterContentStack` `density="compact"` `scrollable`.
3. **Workbench row**: `masterWorkbenchRowClass` — column on mobile, row on `lg+`; `min-h-0` / `min-w-0` / `lg:flex-1` so the board fills height.
4. **Board surface**: `MasterPageSurface` `variant="panel"` with inner vertical scroll region (page-owned markup).
5. **Desktop detail panel**: sibling of the board surface, `hidden lg:flex`, fixed width (~380px); mobile uses `MobileSheet` outside the row.

| Token | Use |
|-------|-----|
| `masterWorkbenchRowClass` | Flex row wrapping board surface + desktop detail panel |

**Migrated (Dispatch Phase 4):** `DispatchPageView`, `DispatchLoadingState`.

## Migration status (Master List Shell)

**Migrated (7):** Customers, Leads, Jobs, Estimates, Invoices, Expenses, Service Items / Price Book — all use `MasterListPageLayout` with `density="compact"` and list-page shell tokens.

**Migrated hub page (1):** Network — uses basic Master Shell primitives (`MasterShellPage`, `MasterPageCanvas`, `MasterPageHeader`, `MasterContentStack`, `MasterPageSection`, `MasterPageSurface`) with `density="compact"` on page root, header, and content stacks. Not a list page; tabbed relationship hub with master-detail panels.

**Removed (cleanup pass):** `ListCommandCenterLayout` and `ListCommandCenterLoadingState` — zero active imports; deleted.

**Not in scope:** global `AdminShell` chrome. Dispatch workbench row tokenized in Phase 4; board internals and mobile sheets unchanged.

## Detail-page shell

Reference implementations: Customer 360, Job detail, Estimate detail, Invoice detail.

1. **Root**: `MasterDetailPageLayout` with `density="default"`.
2. **Width**: `MasterPageCanvas` `width="detail"` (`max-w-5xl`) inside the layout.
3. **Back link**: `backLink` prop (sibling above body content in the vertical stack).
4. **Section cards**: existing `adminCardSectionClass` sections or `MasterPageSurface` `variant="section"` — no forced migration of inner section markup yet.
5. **Section anchors / nav**: page-specific components (e.g. `CustomerDetailSectionNav`) stay as children of the layout body.
6. **Loading states**: `MasterDetailPageLoadingState` with profile + section skeleton props for full-page detail routes.
7. **Intercepted modal routes**: estimate/invoice loaded overlays use `FocusedDocumentOverlay` + `MasterPageCanvas` `width="detail"` + `MasterContentStack` + `masterDetailOverlayBodyInsetClass` — not `MasterDetailPageLayout`. Full-page routes use the layout.
8. **Overlay loading states**: intercepted estimate/invoice modal `loading.tsx` routes use the same overlay shell + `MasterBillingDetailOverlayLoadingState` (or domain wrappers `EstimateDetailOverlayLoadingState` / `InvoiceDetailOverlayLoadingState`) — billing-detail-shaped skeleton only; no `MasterShellPage`, no back-link skeleton, no nested page shell.

**Migrated detail pages (5):** Customer 360, Job detail, Estimate detail, Invoice detail, Team member profile.

## Hub / admin form shell

**Migrated hub (1):** Network — tabbed relationship hub on Master Shell primitives.

**Migrated admin form hubs (2):** Settings, System Check — compact density.

## Report / dashboard shell

Reference: Operational Dashboard, Reports, Tax Summary.

1. **Root**: `MasterShellPage` `density="compact"` + `MasterPageCanvas` (`standard` for Reports, `detail` + optional `max-w-4xl` for Tax Summary print doc).
2. **Body stack**: `MasterContentStack` `density="compact"`.
3. **Page header**: `MasterPageHeader` `density="compact"` when a command row is shown (Reports actions, Tax Summary print/back).
4. **Tax Summary sections**: inner `MasterPageSection` `density="compact"` — print card padding and document width stay page-owned; shell density only tightens vertical rhythm between sections.

**Migrated (3):** Reports, Tax Summary, Operational Dashboard — loaded views and loading states on compact Master Shell density.

## Coverage audit (2026-06-16)

**Major admin surfaces — migrated:**

| Family | Routes / views |
|--------|----------------|
| List pages (7) | Customers, Leads, Jobs, Estimates, Invoices, Expenses, Service Items — tokens exported |
| Detail pages (5) | Customer 360, Job, Estimate, Invoice, Team Member Profile |
| Hub | Network |
| Admin form hubs | Settings, System Check, Invoice Edit, Customer Import Wizard |
| Time / Time Clock | Time Clock, Admin Time Tracking |
| Report / dashboard | Reports, Tax Summary, Operational Dashboard (loaded + loading) |
| Board / workbench | Dispatch — Phases 1–4 complete; desktop/mobile smoke tests passed |

**Out of scope (not major admin surfaces):**

| Type | Routes / views |
|------|----------------|
| Internal / platform | `/alpha-tracker`; `/platform`; `/platform/bugs` |
| Design prototypes | `/workspace-v1`; `/command-center-v1`; `/altair-design-lab` |

**Deferred (intentional):**

- Dispatch Phase 5 mobile viewport lock — board must remain visible under mobile sheets; do not apply list-page viewport lock pattern

**Next recommended phase (not architecture migration):**

1. Visual polish and premium experience refinement
2. Overlay/detail consistency pass (`MasterDetailPageLayout` for estimate/invoice overlays)
3. Command Center / Workspace prototype adoption (Phase 6)
4. Internal/platform surfaces only if needed for beta

**Active layout helpers:**

| File | Status |
|------|--------|
| `list-detail-layout.ts` | Active (Network, Time Clock, detail panels) |
| `FocusedDocumentOverlay` | Active (invoice/estimate overlays, technician) |
| `DesktopConditionalDetailPanel` | Active (list-page side panels) |
| `PageSummaryStrip` | Active (summary strips on migrated list pages) |
| `JobContextFilterBanner` | Active (invoices, expenses, time) |

**Known inconsistencies (non-blocking):**

- Estimate/invoice overlay **loading** states still use ad-hoc skeleton wrappers (E2 pass).

**Dispatch:** Phases 1–4 complete (Master Shell scaffold, loading state, board surface, workbench row token). Desktop and mobile smoke tests passed. Phase 5 mobile viewport lock **deferred/skipped** — Dispatch mobile behavior differs from list pages.
