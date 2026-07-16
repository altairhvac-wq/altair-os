# Master Shell

Reusable page structure inside `AdminShell` main. Does not replace global navigation or auth chrome.

Master Shell V2 architecture migration is **complete** across major admin surfaces. Visual Polish Passes A–F, Micro-Interaction Batches A–B, Interaction Bug-Fix Pass A, and pre-beta interaction fixes are **complete**.

**Current status:** Beta-ready. Master Shell V2 complete. **North Star M1–M14 + dispatch complete** behind `NEXT_PUBLIC_NORTH_STAR_SHELL=true`. See `docs/altair/ALTair_MASTER_STATUS.md`.

## Approved North Star (2026-06-16)

**Mission Control Original Refined** — founder-approved shell direction. Concept iteration stopped. **M1–M14 complete (2026-07-03).**

**Visual formula:** graphite shell + brass command accents + slate operating backing + ivory work cards.

| Layer | North Star treatment |
|-------|---------------------|
| Global chrome | Dark graphite grouped left sidebar — **M1 complete** when flag on |
| Mobile chrome | Unchanged from pre-M1 baseline |
| Command hero | Dark hero band with brass accents — **M2 complete** |
| Operating canvas | Slate/blue backing — **M2+ complete** |
| Work cards | Ivory surfaces with readable dark text — **M3+ complete** |
| Status | Semantic colors separate from brand/command accents |

**Primary reference:** `/altair-shell-color-lab-v1` — palette `mission-control-refined`.

**Concept routes (reference only):** `/altair-shell-north-star-v1`, `/altair-shell-north-star-v2`, `/altair-shell-north-star-v3`, `/command-center-v1`, `/workspace-v1`, `/altair-design-lab`. Retain; do not productionize wholesale.

**Flag:** `NEXT_PUBLIC_NORTH_STAR_SHELL=true` enables the North Star experience layer. See `lib/beta/north-star-shell.ts`.

**Founder design lab:** `/platform/design-lab` — live token editing and dashboard replica preview.

See `docs/altair/ALTAIR_ART_DIRECTION.md` and Phase 9 in `docs/altair/ALTair_V2_ROADMAP.md`.

## Surface system (Visual Polish Pass A — complete)

Three shared tiers — defined in `app/globals.css`, consumed via CSS classes and shell tokens:

| Tier | CSS class | Token | Use |
|------|-----------|-------|-----|
| **Canvas** | `.admin-canvas` | `--surface-canvas` | Page background inside `AdminShell` main; matches `html`/`body` shell color (`#f4f7fa`) |
| **Panel** | `.admin-panel` | `--surface-panel`, `--radius-panel` | Large structural containers — list cards, Dispatch board, workbench panels |
| **Card** | `.admin-card` | same radius as panel | Primary content cards with card shadow |
| **Section** | `.admin-section-surface` | `masterSectionSurfaceClass` | Grouped blocks inside detail/settings/forms — slightly smaller radius (`--radius-section`) |
| **Workspace** *(pilot)* | `.altair-surface-workspace` | `--altair-paper`, `--altair-border`, `--shadow-card` | Canonical Altair Design Foundation Surface — warm Paper on warm Border, semantic tokens only. `MasterPageSurface` `variant="workspace"`. |

Panel headers use `.admin-panel-header` (`masterPanelHeaderClass`) with default padding; pages may override with Tailwind utilities.

Page command rows use `.admin-page-header`. Secondary header actions: `masterSecondaryActionClass`.

`adminCardSectionClass` in `shared/lib/admin-density.ts` aliases `masterSectionSurfaceClass` — detail sections and `MasterPageSurface` `variant="section"` share one treatment.

### Canonical Surface pilot (Customers)

`MasterPageSurface` `variant="workspace"` is the first production consumer of the
Altair Design Foundation semantic tokens (`docs/altair/ALTAIR_DESIGN_FOUNDATION.md`,
`shared/design-system/foundation/`). It replaces `.admin-card`'s legacy cool
`--surface-card` / slate `--border-subtle` material with warm `--altair-paper`
and `--altair-border`, reusing the existing global `--shadow-card` token (no new
shadow token, no gradient). `.altair-surface-workspace table ...` rules in
`app/globals.css` recolor the nested table's header/zebra/hover chrome to
match, so `CustomersTable` / `CustomersMobileCardList` need no changes of their
own.

Only the Customers list page (`CustomersPageView`, legacy/non-North-Star
branch) opts into this variant today. `.admin-card` and every other
`MasterPageSurface` consumer are unaffected — this is a single-surface pilot,
not a repository-wide Surface migration. A canonical `Card` primitive was not
created in this phase: the pilot target is a page-level Surface (structural
placement for the whole list workspace), not a bounded Paper unit containing
one related group of content, so no repository evidence yet justifies a
separate `Card` component distinct from `MasterPageSurface`.

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

Global chrome (`AdminShell`, `Header`, `DesktopNav`, `SidebarNav`, `MobileNav`) lives in `shared/components/admin/`. **North Star M1:** grouped left sidebar (`SidebarNav`) when `NEXT_PUBLIC_NORTH_STAR_SHELL=true`; legacy horizontal nav when flag off. Mobile nav unchanged in M1.

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
7. **Mobile panel open**: use `FocusedDocumentOverlay` (via `DesktopConditionalDetailPanel` or directly). Do **not** apply viewport-lock height classes or hide the list behind an inline `flex-1` aside — that hybrid caused blank dead space below forms.
8. **Primary action**: compact h-9 button — `inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl admin-btn-primary px-3 py-1.5 text-sm`.
9. **Subtitles**: static or contextual (counts, filter state).
10. **Loading states**: use `MasterListPageLoadingState` with the same density and summary/tab props as the loaded page.

## List-page shell tokens

Exported from `tokens.ts` for repeated class strings across migrated list pages:

| Token | Use |
|-------|-----|
| `masterListPagePrimaryActionClass` | Compact primary header button |
| `masterListPageMobilePanelLockClass` | **Deprecated** — do not use; causes mobile form dead space |
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

**Not in scope:** page interiors in M1. Dispatch workbench row tokenized in Phase 4; board internals and mobile sheets unchanged.

**North Star (global chrome + page pilots):** M1–M14 + dispatch complete behind `NEXT_PUBLIC_NORTH_STAR_SHELL=true`. Legacy UI when flag off. Code in `shared/components/*/north-star-m*`.

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
| Design prototypes | `/workspace-v1`; `/command-center-v1`; `/altair-design-lab`; `/altair-shell-color-lab-v1`; `/altair-shell-north-star-v1`; `/altair-shell-north-star-v2`; `/altair-shell-north-star-v3` |

**Deferred (intentional):**

- Dispatch Phase 5 mobile viewport lock — board must remain visible under mobile sheets; do not apply list-page viewport lock pattern

## V2 polish & interaction status (complete)

| Track | Status |
|-------|--------|
| Visual Polish Passes A–F | **Complete** |
| Micro-Interaction Batch A | **Complete** |
| Micro-Interaction Batch B | **Complete** |
| Interaction Bug-Fix Pass A | **Complete** |
| Pre-beta interaction fixes | **Complete** |

**Deferred post-beta (unless smoke finds gaps):** Dispatch Phase 5 mobile viewport lock, Micro-Interaction Batch C, overlay/detail consistency pass, broad dark mode, route/page transitions.

**Next operational step:** Authenticated production/user-data smoke before first external company onboarding. See `docs/altair/ALTair_CURRENT_SPRINT.md`.

**Active layout helpers:**

| File | Status |
|------|--------|
| `list-detail-layout.ts` | Active (Network, Time Clock, detail panels) |
| `FocusedDocumentOverlay` | Active (invoice/estimate overlays, technician) |
| `DesktopConditionalDetailPanel` | Active (list-page side panels) |
| `PageSummaryStrip` | Active (summary strips on migrated list pages) |
| `JobContextFilterBanner` | Active (invoices, expenses, time) |

**Known inconsistencies (non-blocking for beta):**

- Invoice/estimate overlay modes use `FocusedDocumentOverlay` + detail canvas instead of full `MasterDetailPageLayout` (overlay consistency deferred)
- `EstimatesLoadingState` summary strip skeleton alignment (non-blocking)

**Dispatch:** Phases 1–4 complete (Master Shell scaffold, loading state, board surface, workbench row token). Desktop and mobile smoke tests passed; pre-beta interaction fixes complete. Phase 5 mobile viewport lock **deferred** — Dispatch mobile behavior differs from list pages.
