# a913c24a4c938d8f6

## Summary
Altair OS has a genuinely designed responsive system — a two-regime architecture where md (768px) is the master phone/desktop switch (sidebar vs launcher+rail+drawer, tables vs card lists, Mission Control vs AdminMobileHome), sm handles compaction, and lg reveals detail drawers and extra columns; dialogs (AltairDialog + MobileSheet, 26 consumers) correctly morph bottom-sheet→modal, dvh handling is best-practice, and the technician shell is an exemplary mobile app frame. The central defect is that the double-render pattern that twice shipped print bugs is now the codebase's standard mechanism: two shared detail-panel primitives render children twice, all 10+ ledgers render table+card list simultaneously, the entire dashboard renders both variants, and two settings forms duplicate required inputs and submit buttons inside a single form — ~215 conditional-display occurrences with manual `-mobile`/`-desktop` id suffixes patching the symptoms. The second systemic issue is the 768–1100px dead zone: desktop tables with 720–1040px min-widths arrive at md while a fixed non-collapsing 232px sidebar leaves ~505px, so every list page horizontally scrolls through the entire tablet band, and mobile card lists vanish exactly where space is tightest. Mobile admin is usable on phones for covered ledgers, but bulk operations are structurally desktop-only, the admin header/nav rail scrolls away (unlike the technician shell), and Service Items/analytics/reports still pan fixed-width tables.

## Findings

### [P1/SYSTEMIC] The double-render pattern is institutionalized in shared primitives, not eliminated
- category: double-render | effort: HIGH
- evidence: The bug class that twice broke printing is now the standard architecture. (a) Detail-panel primitives render `children` twice: shared/components/layout/DesktopConditionalDetailPanel.tsx:74 (`hidden lg:flex` desktop drawer) + :152 (`lg:hidden` mobile overlay) — 5 consumers (LeadDetailPanel.tsx:281 whose 350-line children include a live <select> at :476 and <textarea> at :554, ExpenseDetailsPanel.tsx:78+:232, JobDetailsPanel.tsx:64, ServiceItemDetailPanel.tsx:58, CustomerDetailPanel.tsx:29); shared/components/expenses/north-star-m6b/ExpenseDetailNorthStarPanel.tsx:58/:111 renders children AND footer twice. (b) Every ledger renders table + card list simultaneously: CustomersTable.tsx:83+:85, EstimatesTable.tsx:93+:111, ExpensesTable.tsx:151+:166, InvoicesTable.tsx:84+:101, JobsTable.tsx:84+:97, PaymentsTable.tsx:88, TeamSettingsView.tsx:188/:205 (TeamMemberMobileCards.tsx:297 md:hidden + TeamMembersTable.tsx:668 hidden md:block), LeadList.tsx:47/:123 (lg split), PayrollEntriesList.tsx:101, TimeNorthStarEntriesList.tsx:146, CustomerImportPageView.tsx:522+:639 (import preview rows doubled — unbounded row count). (c) The ENTIRE dashboard doubles: OperationalDashboardView.tsx:35 (AdminMobileHome md:hidden) + :47 (full MissionControlV2View under `hidden md:contents`) and its skeleton app/(admin)/(home)/loading.tsx:31/:34. Repo-wide conditional-display totals: md:hidden 30, hidden md: 21, lg:hidden 38, hidden lg: 44, sm:hidden 41, hidden sm: 37, hidden xl: 4 = 215 occurrences.
- why: Print regressions of exactly this shape shipped twice already (Estimate/Invoice details); every new consumer of these primitives re-creates the exposure. Phones hydrate and pay DOM cost for the full desktop Mission Control plus desktop tables they can never see (dashboard is the most-visited page); large imports double the preview DOM. Hidden duplicated interactive controls (selects, textareas, buttons) survive in the DOM at all widths, so any getElementById/test-selector/print/autofocus logic has two targets.
- suggestion: Fix at the primitive: give DesktopConditionalDetailPanel/ExpenseDetailNorthStarPanel a render-once strategy (useIsBelowLg already exists in shared/components/mobile/use-mobile-viewport.ts) or a single CSS tree; define one sanctioned pattern for ledgers (TechniciansPageView.tsx:112-122 already demonstrates a single-tree grid that reflows without duplication). Add a lint/grep guard for new `md:hidden`+`hidden md:` sibling pairs feeding the same data.

### [P2/LOCAL] Forms render duplicate inputs and duplicate submit buttons inside one <form>
- category: double-render-forms | effort: MEDIUM
- evidence: shared/components/settings/TeamInviteForm.tsx northStar branch: the `emailField` JSX variable (one <input type=email required>, :213) is rendered twice inside the same form — :264 (hidden md:flex) and :303 (md:hidden) — and `inviteActions` (a type=submit button + copy button) is rendered twice at :283 and :320; role selector ids are manually suffixed `invite-role` / `invite-role-mobile` (:268/:306/:330) to dodge duplicate ids. shared/components/settings/BillingDocumentDefaultsCard.tsx CollapsibleNotesField: two <textarea> with the SAME name={id} (:126 mobile, :144 desktop with id suffixed `-desktop`) in one form (:316).
- why: Two `required` inputs where one is display:none means browser constraint validation can try to focus an unfocusable control (silent submit failure, console-only error); two submit buttons change implicit Enter-key submission semantics; duplicate `name` means FormData.getAll returns the value twice and formData.get returns whichever instance is first in DOM — currently masked because submit handlers read React state and the submit button disables on empty email, but any refactor to Server-Action FormData reads breaks silently. The `-mobile`/`-desktop` id suffixes prove the team is manually patching symptoms of the double-render instead of removing it.
- suggestion: These two settings forms are the highest-risk instances of the double-render pattern; collapse each to a single input instance with responsive layout classes (both forms differ only in arrangement, not content).

### [P2/SYSTEMIC] 768–1100px dead zone: desktop tables arrive at md while the fixed 232px sidebar leaves ~505px of content width
- category: tablet-breakage | effort: MEDIUM
- evidence: SidebarNav is `hidden md:flex` (shared/components/admin/SidebarNav.tsx:63) at a fixed `--north-star-sidebar-width: 14.5rem` (app/globals.css:90, no collapse/icon mode). Ledger tables swap from cards to desktop at the same md boundary with hard min-widths: JobsTable.tsx:97 min-w-[920px], ExpensesTable.tsx:166 + TimeEntriesTable.tsx:23 min-w-[880px], CustomersTable.tsx:86 min-w-[820px], EstimatesTable.tsx:111 / PaymentsTable.tsx:88 / ServiceItemsTable.tsx:106 min-w-[720px]. At 768px viewport the main column is ~505px, so every ledger horizontally scrolls for the entire 768→~1100-1180px range — the card list disappears exactly when space is tightest. Worst: LeadList.tsx:47-49 swaps at lg with min-w-[1040px]; at iPad-landscape 1024px only ~765px is available → ~275px of hidden columns immediately after the swap.
- why: iPad portrait (768), iPad landscape (1024), and split-screen laptop windows — realistic for an office manager — get the worst of both worlds: no mobile cards, and a desktop table that always pans. Column data (status, amounts, next action) is off-screen on every list page in this band.
- suggestion: Either move the card→table swap to lg for the wide ledgers (Jobs, Expenses, Customers already have card lists that could serve 768-1023), reduce table min-widths by demoting columns to lg:/xl: reveals (the pattern LeadList/InvoicesTable already use), or add a collapsed icon-rail sidebar state for md.

### [P2/SYSTEMIC] AltairTable has no mobile contract; domains without a hand-built card list fall back to panning 720-880px tables on phones
- category: tables-on-mobile | effort: HIGH
- evidence: shared/design-system/table/AltairTable.tsx owns structure/material only — no responsive strategy. Card-list coverage is per-domain manual: 7 ledgers have one (customers, estimates, expenses, invoices, jobs, payments, team) + LeadList inline + 2 time-clock lists. NOT covered — phone users pan a fixed-width table inside overflow-x-auto: ServiceItemsTable.tsx:105-106 (min-w-[720px]), TimeEntriesTable.tsx:22-23 (min-w-[880px], and its `hidden md:table-cell` column-hiding at :28-31 is defeated by the min-width), analytics TechnicianPerformanceTable.tsx:34 (520px) and PartnerRevenueLeaderboard.tsx:29 (720px), reports OfficeReviewQueueSection.tsx:687/:753/:1305 and ReportsFoundationView.tsx:352 (bare overflow-x-auto).
- why: Service Items is a live production catalog page; a business owner on a phone gets a two-axis panning experience there while every neighboring ledger got a card list — inconsistent quality signal, and each new module must remember to hand-build (and double-render) its own card list.
- suggestion: Add a sanctioned mobile presentation to the table design system (a documented card-projection or column-priority contract) so coverage stops being per-domain heroics; ServiceItems is the highest-value uncovered live page (time-clock/reports are known-legacy panels 15/8).

### [P2/LOCAL] Bulk selection and batch operations are structurally desktop-only
- category: mobile-feature-parity | effort: MEDIUM
- evidence: BulkSelectCheckbox renders only inside the desktop tables (CustomersTable.tsx:89-100 header + row checkboxes, similarly InvoicesTable/EstimatesTable via InvoiceBatchSelectAllControl / BulkSelectAllControl). The paired mobile card lists (CustomersMobileCardList.tsx:39-60, InvoicesMobileCardList.tsx, etc.) render rows as single navigation buttons with no selection affordance.
- why: The business-owner-in-the-field persona cannot batch-archive customers, batch-send invoices, or run any multi-select flow from a phone — the capability silently vanishes below 768px with no explanation, and the md-swap means it also vanishes on iPad portrait where the table would actually fit interaction-wise.
- suggestion: Add long-press or edit-mode selection to the card lists, or at minimum surface the batch actions entry point on mobile with a hint that selection needs a larger screen. Lead should verify in-browser which batch flows exist per ledger.

### [P2/LOCAL] Admin header and mobile nav rail scroll away on phones; technician shell keeps its chrome
- category: mobile-navigation | effort: LOW
- evidence: `.admin-top-shell` is `position: relative` (app/globals.css:1126-1129) and AdminShell only viewport-locks at md+ (`md:h-dvh md:overflow-hidden`, AdminShell.tsx:91), so below md the document scrolls and the header plus the MobileNav destination rail (AdminShell.tsx:123-130) leave the screen. Contrast: TechnicianMobileShell.tsx:68 header is `sticky top-0 z-30` with a persistent TechnicianBottomNav (:115) and safe-area padding (:103).
- why: On any long admin list a phone user loses every navigation affordance (rail, quick-nav toggle, notifications, company switcher) and must scroll to the top to move between panels — while the technician app, built later, demonstrates the intended pattern. Inconsistent chrome behavior between the two shells erodes the app-like feel the launcher home establishes.
- suggestion: Make admin-top-shell sticky below md (it already has no-print handling), or add a bottom nav on phones mirroring TechnicianBottomNav.

### [P3/SYSTEMIC] Duplicate/one-sided data-testids across paired mobile/desktop variants make selectors ambiguous
- category: double-render | effort: LOW
- evidence: data-testid="invoice-row" exists in BOTH InvoicesTable.tsx:172 and InvoicesMobileCardList.tsx:101 (every invoice matches twice in the DOM at any width); data-testid="customer-row" exists ONLY on the mobile variant (CustomersMobileCardList.tsx:48) so on desktop it matches only display:none nodes; data-testid="job-row" exists only on the desktop table (JobsTable.tsx:142).
- why: Playwright/smoke selectors either double-count, or target hidden elements and fail visibility assertions depending on viewport — brittle tests that will misreport regressions in exactly the flows (invoices/estimates) where the print double-render bugs occurred. Symptom of finding 1 worth fixing while it is cheap.
- suggestion: One testid per logical row regardless of variant, applied consistently to both (or gate on the visible variant).

### [P3/LOCAL] useMobileViewport SSR snapshot hardcodes mobile=true, so desktop first paint runs mobile branches
- category: hydration | effort: LOW
- evidence: shared/components/mobile/use-mobile-viewport.ts:28 and :37 — getServerSnapshot returns `true` for both useMobileViewport and useIsBelowLg. Consumers: AdminShell.tsx:57 (pull-to-refresh gating, bug-button placement), admin/Header.tsx:108, DispatchPageView.tsx, JobDetailsPanel.tsx, PwaInstallBanner.tsx.
- why: Every desktop session's first client render evaluates as mobile then flips after hydration — currently mostly behavioral (pull-to-refresh wiring, banner logic) rather than layout, but any future consumer that gates layout on these hooks will flash the mobile UI on desktop; TechnicianMobileShell.tsx:43-54 already carries a hand-written hydration guard comment documenting a mismatch bug from this family.
- suggestion: Return a deferred/undefined initial state (render nothing viewport-gated until mounted) or keep JS gating strictly to non-visual behavior by convention.

### [P3/LOCAL] Dead mobile/desktop-split components keep the double-render pattern alive and would ship a visible duplication if revived
- category: dead-code | effort: LOW
- evidence: Zero importers found for: shared/components/jobs/JobsNorthStarMobileOwnerView.tsx, estimates/EstimatesNorthStarMobileOwnerView.tsx, invoices/InvoicesNorthStarMobileOwnerView.tsx, dashboard/north-star-m2/DashboardNorthStarView.tsx (+ its MobileView pair), expenses/ExpenseSummaryCards.tsx, service-items/ServiceItemsSummaryCards.tsx. Latent bug: PageSummaryStrip.tsx northStar branch (:51-52) renders its compact strip with NO sm:hidden while the card grid is `hidden sm:grid` (:87) — both defaults true (:36-37) — so any revived caller shows the same metrics twice at sm+; the legacy branch is correct via adminCompactSummaryStripClass's sm:hidden (shared/lib/admin-density.ts:81).
- why: These files are what an engineer copies when building the next panel's mobile variant; the northStar PageSummaryStrip branch is a pre-armed visible-duplication bug. They also inflate every audit of the hide/show pattern (a chunk of the 215 occurrences are unreachable).
- suggestion: Delete the unreferenced mobile-owner views and summary-card wrappers, or add sm:hidden to the northStar compact strip before anything adopts it.

### [P4/LOCAL] Off-scale arbitrary breakpoints and unreachable column classes
- category: breakpoint-hygiene | effort: LOW
- evidence: Arbitrary breakpoints exist only in the network module: min-[360px] (network/north-star-m11/NetworkNorthStarView.tsx:780), min-[420px] ×3 (CommunityMyBusinessProfileControl.tsx:187-188, network-north-star-styles.ts:28). Unreachable responsive classes: LeadList.tsx:54/:95 use `hidden md:table-cell` on cells inside a table that is itself `hidden lg:block` (:47) — the md state can never display; TimeEntriesTable.tsx:28-31 hides columns below md inside a min-w-[880px] table where hiding buys nothing.
- why: Four one-off breakpoints in one module against an otherwise clean sm/md/lg/xl scale (zero 2xl, zero container queries) is minor drift; the unreachable classes mislead the next editor about where the table actually swaps.
- suggestion: Fold the network micro-breakpoints into sm-first layouts; delete the dead md: column modifiers in LeadList.

## Inventory
## Breakpoint regime map (grep -o occurrence counts, .tsx+.ts)

| Prefix | shared/components | app/ | Role observed |
|---|---|---|---|
| sm: (640) | 2655 (1702 lines / 430 files) | 14 | Intra-layout compaction: padding, text size, button rows→stacks, label swaps |
| md: (768) | 229 | 5 | THE structural phone/desktop switch: sidebar vs rail (SidebarNav.tsx:63, AdminShell.tsx:123), table vs cards (all ledgers), dashboard launcher vs Mission Control (OperationalDashboardView.tsx:35/47), shell viewport-lock (AdminShell.tsx:91 `md:h-dvh md:overflow-hidden`) |
| lg: (1024) | 1039 | 5 | Detail drawer vs full-screen overlay (DesktopConditionalDetailPanel), leads table swap, extra columns, dispatch sidebar |
| xl: (1280) | 78 | 2 | Vestigial: 4 `hidden xl:table-cell` columns (InvoicesTable.tsx:131/247, LeadList.tsx:58/103), dispatch widths |
| 2xl: | 0 | 0 | unused |
| max-sm:/max-md:/max-lg: | 3 / 17 / 76 | 0 | Inverted mobile-only utilities, mostly north-star style modules |
| Arbitrary | min-[360px] ×1, min-[420px] ×3 (network module only) | 0 | off-scale one-offs |
| Container queries | 0 | 0 | none |

app/(admin) route files carry almost no breakpoints (sm 4 / md 5 / lg 5) — layout fully delegated to shared components. JS breakpoint hooks: useMobileViewport (max-width:767px) / useIsBelowLg (max-width:1023px) in shared/components/mobile/use-mobile-viewport.ts; SSR snapshot = true (mobile).

## Double-render census (both variants in DOM; totals: md:hidden 30, hidden md: 21, lg:hidden 38, hidden lg: 44, sm:hidden 41, hidden sm: 37, hidden xl: 4 = 215)

**Primitives rendering children twice:** DesktopConditionalDetailPanel.tsx:74/:152 (consumers: LeadDetailPanel :281 [select :476, textarea :554], ExpenseDetailsPanel :78+:232, JobDetailsPanel :64, ServiceItemDetailPanel :58, CustomerDetailPanel :29); ExpenseDetailNorthStarPanel.tsx:58/:111 (children + footer ×2).
**Ledger table+cards pairs (11):** CustomersTable:83/85, EstimatesTable:93/111, ExpensesTable:151/166, InvoicesTable:84/101, JobsTable:84/97, PaymentsTable:88, TeamSettingsView:188/205, LeadList:47/123 (lg split), PayrollEntriesList:101, TimeNorthStarEntriesList:146, CustomerImportPageView:522/639 (unbounded preview rows).
**Whole page:** OperationalDashboardView:35/47 (AdminMobileHome + full MissionControlV2View) + app/(admin)/(home)/loading.tsx:31/34.
**Forms:** TeamInviteForm:264+303 (email input ×2, required, one form), :283+320 (submit button ×2), ids suffixed -mobile; BillingDocumentDefaultsCard:124-151 (two textareas same name, ids suffixed -desktop).
**Action stacks:** InvoiceDetailActionBar:241-244, EstimateStatusActions:430-435, EstimateDetailHeaderActions / InvoiceDetailHeaderActions / DispatchSectionActions (sm splits); SettingsComingSoonSection:27/82.
**Duplicate testids:** invoice-row in InvoicesTable:172 AND InvoicesMobileCardList:101; customer-row mobile-only (CustomersMobileCardList:48); job-row desktop-only (JobsTable:142).
**Benign label swaps (not findings):** ~40 `hidden sm:inline`/`sm:hidden` short/long text pairs (QueueTabs, back buttons, etc.).

## Tables-on-mobile matrix

| Page | Strategy | Table min-w | Swap |
|---|---|---|---|
| Customers | cards + table | 820px | md |
| Estimates | cards + table | 720px | md |
| Expenses | cards + table | 880px | md |
| Invoices | cards + table | 760px | md |
| Jobs | cards + table | 920px | md |
| Payments | cards + table | 720px | md |
| Team | cards + table | — | md |
| Leads | cards + table | 1040px | **lg** |
| Time entries (legacy P15) | overflow-x only | 880px | — |
| Payroll (legacy) | mobile list + table | — | md |
| Service Items | **overflow-x only** | 720px | — |
| Analytics tables | overflow-x only | 520/720px | — |
| Reports queues (legacy P8) | overflow-x only | — | — |
| Technicians | **single-tree responsive grid** (TechniciansPageView:112-122 — the good pattern) | — | sm reflow |
| Dispatch | horizontal time grid, sticky lane labels (deliberate) | — | — |

Sidebar: fixed 14.5rem/232px from md (globals.css:90), no collapse mode. Available content at 768px ≈ 505px → every ledger pans 768→~1100-1300px.

## Modals/overlays
AltairDialog (4 consumers) + MobileSheet (22 consumers): bottom-sheet mobile (items-end, rounded-t-2xl, max-h-[90dvh], safe-area header) → centered sm+ modal (max-w-md/2xl/3xl), focus trap, scroll lock. Only 4 hand-rolled fixed-inset overlays remain: OfficeReviewQueueSection:1077 (replicates the shape manually), ExpenseDetailNorthStarPanel, DesignLabPageView, ProductScreenshotPlaceholder. Detail drawers (DesktopConditionalDetailPanel:86 `w-[min(480px,42vw)] min-w-[380px]`) have no focus trap despite role=dialog (a11y dimension).

## Viewport height / sticky / z-index
Production shell: mobile = document scroll, desktop = `md:h-dvh md:overflow-hidden` app frame with `md:overflow-y-auto` main (AdminShell:91/132). overlay-form-root: 100dvh + -webkit-fill-available + @supports fallback (globals.css:4553-4563) — best practice. h-screen only in 4 concept shells (exploration artifacts); min-h-screen only in error/not-found/billing/legal. Sticky: 9 uses (billing section headers z-[1], job workflow cards z-20, tech header z-30, import thead). Z-scale tiered 10/20/30/40/50/60/70; MobileSheet/MobileSideDrawer expose a z-60 tier above z-50 modals; QuickNavToggle z-[70]. No conflicts found statically. Admin header NOT sticky on mobile (`.admin-top-shell` position:relative, globals.css:1126) — vs technician sticky header.

## Shells
**AdminShell (phone):** AdminMobileHome launcher grid at "/" (dark iOS-style, md:hidden), MobileNav horizontal scroll rail under header elsewhere (scrollIntoView active item, 44px targets, truncating labels), QuickNavToggle → AdminQuickNavDrawer (grouped full drawer), PullToRefresh on allowed routes, PWA banner. Usable on phones for card-list ledgers; gaps = bulk ops, non-sticky chrome, Service Items/reports tables.
**TechnicianMobileShell:** sticky safe-area header (tech-header-safe), bottom nav with `pb-[max(6rem,calc(5.5rem+env(safe-area-inset-bottom)))]`, connectivity banner, quick-nav drawer, pull-to-refresh, min-h-dvh + overflow-x-clip, hand-written hydration guard (:43-54). Exemplary mobile-first.

## Dead responsive code (no importers)
JobsNorthStarMobileOwnerView, EstimatesNorthStarMobileOwnerView, InvoicesNorthStarMobileOwnerView, DashboardNorthStarView+DashboardNorthStarMobileView (north-star-m2), ExpenseSummaryCards, ServiceItemsSummaryCards; PageSummaryStrip northStar branch has a latent visible-duplication bug (compact strip lacks sm:hidden, :51-52, both show* defaults true :36-37).
