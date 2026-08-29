# a86277db1736e07a2

## Summary
Altair's accessibility architecture is unusually strong where a shared primitive owns the behavior: the overlay family (AltairDialog, MobileSheet, MobileSideDrawer) shares complete dialog mechanics (role/aria-modal, focus trap with restore via useDialogFocusTrap, Escape, refcounted scroll lock, auto title/description association); Field/Input generate correct label/id/aria-invalid/describedby wiring; icon-only buttons are universally aria-labeled (a targeted scan found zero true violations across shared/components and app/(admin)); nav landmarks carry aria-current everywhere; reduced-motion is gated per-animation in globals.css and even in JS scrollIntoView; status is never color-only (StatusPill and dispatch dots always pair text). The serious problems are concentrated where no primitive owns the ground: two systemic contrast failures at the token layer — the theme-flipping ink-muted (#64748b) rendered on fixed-dark Graphite report/dispatch surfaces at 2.74:1 in 9-12px type, and the same token failing 4.5:1 on every non-white light surface across 345 uses — plus brass small-text at 3.7-4.0:1 despite an 'AA-safe' claim in the token comments. The remaining gaps are the missing popover primitive (header dropdowns have no Escape/arrow-key/focus handling), the pre-Field label-without-htmlFor idiom in the estimate/invoice line-item money grids, and two keyboard-unreachable clickable tables. Because causes sit in single token/primitive files, the top four findings are all one-or-two-file fixes with product-wide reach.

## Findings

### [P1/SYSTEMIC] Theme-flipping ink-muted token used on fixed-dark Graphite surfaces (Reports cards, Dispatch board) renders 2.74:1 text at 9-12px
- category: contrast | effort: LOW
- evidence: No theme toggle exists — the app always runs :root light values (app/globals.css:118-121 states '[data-theme=dark]... no toggle exists yet'), so --altair-ink-muted is always #64748b. shared/design-system/components/report-surface.ts puts text-altair-ink-muted on bg-altair-graphite (#303132): line 62 (idle range pill), line 70 (10px uppercase metric label), line 78 (text-xs metric meta). Measured 2.74:1 (needs 4.5:1). Consumed by 13 report card components (33 text-altair-ink-muted occurrences under shared/components/reports/: ReportKpiCard, ReportChartCard, TopPerformersChartCard, CashHealthChartCard, ReceivablesAgingChartCard, LeadPipelineSection, etc.). Same defect in shared/components/dispatch/dispatch-board-presentation.ts on the deliberate-dark board: line 56 laneHeaderRole at text-[9px], line 63 laneEmptyText at 10px, lines 23,24,33,44,59,67,76 (26 occurrences in dispatch/). Also brass on graphite: shared/components/reports/OperationalHealthSection.tsx:92 text-xs text-altair-brass on dark card = 3.28:1.
- why: Every KPI label, comparison line, and date-range control on the Reports panel, and every lane role/empty state on Dispatch, is far below AA at the smallest sizes in the product (9-10px). This is the primary reading text of two flagship panels being near-illegible for low-vision users and marginal for everyone in bright field conditions.
- suggestion: Add a graphite-anchored muted role (the dark-theme value #aeb6c2 measures 6.37:1 on #303132) mirroring the existing ink-on-paper precedent the foundation already documents (globals.css:144-156), and swap it into report-surface.ts and dispatch-board-presentation.ts. Two-file fix that repairs every report card and dispatch lane at once.

### [P1/SYSTEMIC] --altair-ink-muted (#64748b) fails AA on every sanctioned light surface except pure white, and is routinely used at 10-11px
- category: contrast | effort: LOW
- evidence: Token defined at app/globals.css:142 (and :159 for ink-on-paper-muted, same hex). Measured: 4.76:1 on paper-elevated #ffffff (pass), 4.45:1 on paper #fbf7ef (fail), 4.23:1 on paper-subtle #eef2f6 (fail), 3.68:1 on stone #dce3ec (fail). 345 uses across 126 files in shared/; 106 same-line pairings with text-[10px]/text-[11px] and 101 with text-xs, where the large-text 3:1 relief never applies. Sanctioned primitives bake it in: mc-surface.ts:53 (10px MC v2 section label), field-styles.ts placeholder color, north-star/tokens.ts:301 filterMeta text-[11px] #64748B on the #DCE3EC filter bar (3.68:1), shared/components/schedule/ScheduleMonthGrid.tsx:17 and ScheduleDayCell.tsx:23,74,122 on stone canvas.
- why: This is the designated 'quiet text' role of the entire design system, so metadata, timestamps, helper text, and eyebrow labels across effectively every screen sit below AA whenever the surface is anything but white — which is most of the surface hierarchy (canvas, section, tile are all non-white).
- suggestion: Darken the token once: #556070 measures 4.93:1 on stone and 6.38:1 on white, preserving the slate character. One-line change in globals.css:142/:159 fixes 345 call sites; verify in-browser on stone and paper-subtle.

### [P2/SYSTEMIC] Brass (#977d2a) used as small text fails AA on all light surfaces despite the token comment claiming it is 'AA-safe'
- category: contrast | effort: MEDIUM
- evidence: app/globals.css:165-168 says brass was 'darkened... for AA-safe contrast on light Paper', but measured values are 3.98:1 on white, 3.72:1 on paper, 3.07:1 on stone — AA-large only, not the 4.5:1 its small-text uses need. 52 text-altair-brass occurrences across 37 files, frequently at 10-11px: shared/components/jobs/JobsTodayCardList.tsx:38 (10px uppercase) and :43 (11px tabular), shared/components/reports/AiBusinessSummaryCard.tsx:55,88 (10px eyebrows), shared/components/settings/TeamSettingsView.tsx:133 (10px count badge), settings/SettingsOverviewView.tsx:211 (11px), marketing-hub/MarketingTodayView.tsx:121 (10px chip). brass-interactive #d4af37 is 2.10:1 on white and is used as link text in reports (LeadPipelineSection.tsx:140 — on a dark card so acceptable there, but the token invites light-surface use).
- why: Brass is the brand accent and is disproportionately applied to the smallest, highest-emphasis labels (eyebrows, counts, links); those are exactly the sizes where 3.7-4.0:1 is a hard AA failure, undermining the 'AA-safe' guarantee the foundation itself asserts.
- suggestion: Either darken the text-role brass (e.g. #7a651f = 5.66:1 on white, 5.30:1 on paper) as a brass-text companion token, or codify that text-altair-brass is only legal at >=18.5px/14px-bold and audit the 10-11px uses. Lead should spot-check JobsTodayCardList and AiBusinessSummaryCard in-browser.

### [P2/SYSTEMIC] No shared popover/menu primitive: header dropdowns (NotificationBell, CompanySwitcher, OwnerViewSwitcher) lack Escape, arrow keys, and focus management
- category: keyboard | effort: MEDIUM
- evidence: grep across the three: only aria-expanded/aria-haspopup/role=listbox present, zero Escape/onKeyDown/focus() handling. shared/components/notifications/NotificationBell.tsx:105 (aria-expanded, no aria-haspopup, panel at :119-137 has no role, no Escape); shared/components/company/CompanySwitcher.tsx:127-128,170-204 (proper listbox/option/aria-selected semantics but no Escape close, no arrow-key movement, no focus move into the list, listbox contains <button> children); shared/components/view-mode/OwnerViewSwitcher.tsx:54-55,92 same pattern. Contrast: the overlay family (AltairDialog, MobileSheet, MobileSideDrawer) shares useDialogFocusTrap + useSheetEscape and is fully wired — the popover family got no equivalent primitive (the repo deliberately has no Radix/Headless UI, per shared/design-system/dialog/AltairDialog.tsx:32-36).
- why: Keyboard users can Tab into these company-critical controls (switching tenant context, notifications) but cannot dismiss them with Escape or navigate options idiomatically; the open panel also traps nothing, so Tab walks behind it. It is the one interaction family where the otherwise-excellent overlay a11y architecture has no shared owner.
- suggestion: Build one AltairPopover primitive on the same hooks (useSheetEscape + a light roving-focus helper) and migrate the three header controls plus HeaderScheduleCalendar. The dialog family proves the pattern works dependency-free.

### [P2/SYSTEMIC] Legacy adminFormLabel pattern renders visible labels with no htmlFor/id association; ~40-50 native controls have no accessible name
- category: forms | effort: MEDIUM
- evidence: AST-ish scan (arrow-functions neutralized) of 342 native input/select/textarea in shared/components found 51 with no aria-label, no id, and no wrapping label (a few are false positives from generics in onChange casts; spot-verified real cases). Worst concentrations are the money-entry grids: shared/components/invoices/InvoiceLineItemsEditor.tsx:151-221 ('Price book', 'Desc', 'Qty', 'Unit $' labels rendered via adminFormLabelClass with NO htmlFor, inputs with NO id — verified at lines 151-158, 195-204, 207-218), shared/components/estimates/LineItemsEditor.tsx:204,238,253,265,279, shared/components/network/NetworkHelpRequestsPanel.tsx (13 controls: 277-365, 470, 590-640), team/TeamMemberProfileView.tsx:403, time-clock/TimeTrackingSearchFilterBar.tsx:40,87. Repo-wide: 160 of 285 <label> elements lack htmlFor (a subset validly wrap their control). By contrast the design-system Field.tsx generates ids and htmlFor correctly (Field.tsx:83-103), and search bars like JobSearchFilterBar.tsx:143,113 use aria-label properly.
- why: Screen-reader users hear 'edit text, blank' on quantity and unit-price fields of estimates/invoices — the highest-stakes numeric entry in the product — and label clicks fail to focus the control (a real motor-accessibility aid). The visible label sitting right there makes the failure invisible to sighted QA.
- suggestion: The shared cause is the pre-Field adminFormLabelClass/adminFormInputClass idiom. Either migrate the line-item editors to Field, or do a mechanical htmlFor/id pass over the 8 files still using adminFormLabelClass (46 occurrences) plus NetworkHelpRequestsPanel.

### [P2/LOCAL] Clickable <tr onClick> rows with no keyboard path in ServiceItemsTable and TimeEntriesTable
- category: keyboard | effort: LOW
- evidence: Multiline grep for onClick on div/span/li/tr across shared/components found only 6 files; the two real row cases: shared/components/service-items/ServiceItemsTable.tsx:166-168 (<tr onClick={() => onSelectItem(item)}>, zero <button>/<Link>/<a> anywhere in the file's rows) and shared/components/time-clock/TimeEntriesTable.tsx:43-48 (same; row click is the only way to open the entry details panel). Contrast the sanctioned pattern: CustomersTable.tsx:124 row onClick is progressive enhancement over a real CustomerNameLink <Link> (CustomerNameLink.tsx:43-50); JobsTable.tsx:155, InvoicesTable.tsx:188, EstimatesTable.tsx:188, TeamMembersTable.tsx:432 all carry inner Links; ExpensesTable deliberately uses a button (comment at ExpensesTable.tsx:25).
- why: Keyboard-only users cannot open a service item (price book is a production admin surface) or a time entry at all from these tables — the target row is unreachable and unfocusable, a complete task blocker rather than a degradation.
- suggestion: Make the item-name cell a real button/Link as the sibling tables do (the codebase's own dominant convention). Optional leverage: have AltairTableRow warn in dev when onClick is passed without an inner focusable.

### [P2/LOCAL] Dead 'Search' button in the admin header on every page: focusable, labeled, does nothing
- category: keyboard | effort: LOW
- evidence: shared/components/admin/Header.tsx:175-185 — <button type="button" aria-label="Search"> with a Search icon and no onClick, no handler, no wrapping form; rendered on every authenticated admin page (sm+ viewports).
- why: Every keyboard and screen-reader pass through the global header hits a control announced as 'Search, button' that silently does nothing — an accessibility trust failure and a broken affordance for all users.
- suggestion: Remove it until search exists, or wire it to the intended command palette. One-line removal.

### [P2/LOCAL] Technician home app-grid links suppress focus outline with no replacement
- category: keyboard | effort: LOW
- evidence: shared/components/technician/TechnicianHomeScreen.tsx:159 — every home tile Link uses className="group flex touch-manipulation flex-col items-center gap-1.5 outline-none" with no focus-visible ring/outline anywhere in the class list. This is one of only ~5 true violations repo-wide: of 172 outline-none occurrences, 113 pair focus-visible on the same line and most of the remaining are tabIndex=-1 panels; the other unremediated cases are shared/components/marketing-hq/MarketingAiHqPageView.tsx:934,945,1436 (focus:outline-none with only a border-color change) and platform-admin/design-lab/DesignLabColorControl.tsx:212 (internal tool).
- why: The technician home screen is the primary field-app entry point; external-keyboard and switch users get zero focus indication across all 16 navigation tiles.
- suggestion: Add the same focus-visible outline TechnicianBottomNav already uses (TechnicianBottomNav.tsx:58 focus-visible:outline-2 outline-cyan-600).

### [P3/LOCAL] Dashboard has no h1 — heading outline starts at h2 on the flagship page
- category: semantics | effort: LOW
- evidence: shared/components/dashboard/mission-control-v2/MissionControlV2View.tsx first heading is <h2> at line 281; the admin Header renders the greeting and sr-only page title as <p> (Header.tsx:140-170). Every list/detail page gets an h1 systematically via MasterListPageLayout -> MasterPageHeader (MasterPageHeader.tsx:70, used by 61 PageViews) — the dashboard is the one page composed outside that shell.
- why: Screen-reader users navigating by heading get no page-level anchor on the most-visited screen, and the document outline begins at level 2.
- suggestion: Promote the mission-control section title to h1 or add an sr-only h1 with the page name in the dashboard view.

### [P3/SYSTEMIC] AltairTableHead renders <th> without scope; zero scope attributes exist repo-wide
- category: semantics | effort: LOW
- evidence: shared/design-system/table/AltairTable.tsx:121-141 (AltairTableHead spreads props onto <th> with no scope default); rg for scope="col"|scope="row" across shared/ and app/ returns 0 matches. All data tables (Customers, Jobs, Invoices, Estimates, Payments, Team, plus ad hoc tables) inherit the omission.
- why: Simple single-header-row tables are usually inferred correctly, but explicit scope hardens SR column announcement across the many wide, column-hidden-responsive tables here (cells shift between breakpoints).
- suggestion: Default scope="col" in AltairTableHead — one line in the shared primitive covers every migrated table.

### [P3/LOCAL] Sub-40px touch targets in header chrome and dismiss/close buttons, against the codebase's own min-h-11 standard
- category: touch-targets | effort: LOW
- evidence: The system standard is strong (buttonSizeClass min-h-11 mobile, button-styles.ts:14-17; MobileSheetHeader close min-h-11 min-w-11; TechnicianBottomNav min-h-11). Exceptions: NotificationBell trigger p-2 + h-5 icon = 36px (NotificationBell.tsx:95-107, in the mobile header), Header search button p-2 = 36px (Header.tsx:177), AltairDialogClose h-8 w-8 = 32px (AltairDialog.tsx:312 — a design-system primitive used by every dialog incl. mobile bottom-sheet mode), PwaInstallBanner dismiss p-1 ≈ 24px (PwaInstallBanner.tsx:53, mobile-only banner), TimeEntryDetailsPanel close p-1.5 ≈ 28px (TimeEntryDetailsPanel.tsx:92).
- why: All pass WCAG 2.2's 24px minimum but miss the 44px platform guideline the rest of the product codified; the dialog close X is the highest-traffic offender since it ships from the shared primitive into every mobile sheet-mode dialog.
- suggestion: Bump AltairDialogClose to min-h-11 min-w-11 on mobile (h-8 w-8 sm:) — primitive-level fix; enlarge the PWA banner dismiss.

### [P3/SYSTEMIC] AdminPendingLabel pending-state changes are not announced (no live region)
- category: aria-live | effort: LOW
- evidence: shared/design-system/components/AdminPendingLabel.tsx:12-31 swaps button text to 'Saving…' with a spinner but no role="status"/aria-live, and text changes inside the focused element are not announced by SRs. The component is the standard async-button label across dozens of forms (InvoiceEditForm, TeamInviteForm, NetworkInviteForm, CustomerImportPageView, etc.). Elsewhere live-region hygiene is good: 61 role="alert" + 52 aria-live in shared/, and Field errors carry role="alert" (Field.tsx:121).
- why: Screen-reader users get no feedback that a submission started or is in flight, only (eventually) the error alert or a route change.
- suggestion: Wrap the pending label in role="status" inside the component — single-primitive fix inherited by every consumer.

### [P4/LOCAL] Dispatch board runs 9px type on its dark exception surface
- category: typography-legibility | effort: LOW
- evidence: shared/components/dispatch/dispatch-board-presentation.ts:56 laneHeaderRole text-[9px], :59 laneHeaderNextJob text-[9px], :67 empty-slot text-[9px] — the smallest type in the product, compounded by the ink-muted 2.74:1 issue reported above.
- why: Even after the token contrast fix, 9px is below any comfortable floor for the operational board dispatchers stare at all day; zoom/low-vision users lose lane metadata entirely.
- suggestion: Floor dispatch metadata at 10-11px when addressing the ink-muted swap in the same file.

## Inventory
## Token contrast matrix (computed WCAG ratios, light theme = always active; globals.css:118-121 confirms no theme toggle exists)

| Foreground | On surface | Ratio | AA 4.5 (small) | AA 3.0 (large) |
|---|---|---|---|---|
| ink-muted #64748b | paper-elevated #ffffff | 4.76 | PASS | PASS |
| ink-muted #64748b | paper #fbf7ef | 4.45 | FAIL | PASS |
| ink-muted #64748b | paper-subtle #eef2f6 | 4.23 | FAIL | PASS |
| ink-muted #64748b | stone #dce3ec | 3.68 | FAIL | PASS |
| ink-muted #64748b | graphite #303132 (reports/dispatch dark cards) | 2.74 | FAIL | FAIL |
| ink-secondary #4f4638 | paper / stone | 8.67 / 7.17 | PASS | PASS |
| brass #977d2a | white / paper / stone | 3.98 / 3.72 / 3.07 | FAIL | PASS/PASS/marginal |
| brass #977d2a | graphite #303132 | 3.28 | FAIL | PASS |
| brass-interactive #d4af37 | white | 2.10 | FAIL | FAIL |
| brass-interactive #d4af37 | graphite #303132 | 6.20 | PASS | PASS |
| success #059669 / warning #d97706 raw | white | 3.77 / 3.19 | FAIL | PASS |
| all status -foreground on -surface pairs | — | 4.75–5.36 | PASS | PASS |
| primary button paper-on-graphite | — | 12.20 | PASS | PASS |
| dark-theme ink-muted #aeb6c2 | graphite #303132 | 6.37 | PASS (candidate fix for dark surfaces) | — |
| candidate ink-muted #556070 | stone / white | 4.93 / 6.38 | PASS (candidate token fix) | — |
| candidate brass-text #7a651f | white / paper | 5.66 / 5.30 | PASS (candidate) | — |

## Usage counts (rg)
- text-altair-ink-muted / -on-paper-muted: 345 occurrences / 126 files in shared/; 106 same-line with text-[10px]/text-[11px]; 101 with text-xs. Reports dir: 33; Dispatch dir: 26 (both on dark graphite).
- text-altair-brass: 52 / 37 files; small-text examples JobsTodayCardList.tsx:38,43; AiBusinessSummaryCard.tsx:55,88; TeamSettingsView.tsx:133.
- Raw status tokens as text (text-altair-success|warning|danger|information): 46 / 25 files.
- onClick total: 750 / 285 files in shared/components; onClick on div/span/li/tr (multiline grep): 6 files only — ServiceItemsTable.tsx:166, TimeEntriesTable.tsx:43 (real, no keyboard path), ReceiptUploadBox.tsx:227 + JobAttachmentUploadBox.tsx:214 (have role="button"), 2 benign stopPropagation/preventDefault wrappers. app/(admin): 0.
- role="button": 8 repo-wide (mostly upload boxes/design-lab).
- Icon-only buttons without aria-label/title: 0 confirmed (script over 342 files; all 6 initial candidates were false positives containing AdminPendingLabel text).
- aria-label: 463 / 258 files. aria-hidden: 941. role="alert": 61. aria-live: 52. aria-current: 13 sites covering all nav families (SidebarNav:31, MobileNav:31, DesktopNav:41, TechnicianBottomNav:57, SettingsNavigation:88, PlatformAdminSubNav:54,83, QuickNavigationDrawer:90, JobWorkflowTimeline uses aria-current="step").
- outline-none: 172 / 106 files; 113 pair focus-visible same line; ~14 without, of which real violations: TechnicianHomeScreen.tsx:159, MarketingAiHqPageView.tsx:934,945,1436, DesignLabColorControl.tsx:212. globals.css has 17+ :focus-visible rules covering legacy admin-btn/admin-input/admin-table-row/admin-nav-link classes.
- Native form controls in shared/components: 342; unlabeled (no aria-label/id/wrapping label): ~40-50 after false-positive review (generics in onChange casts inflate the raw 51). <label> without htmlFor: 160 of 285 (subset are valid wrapping labels). adminFormLabelClass: 46 uses / 8 files, only 25 with htmlFor.
- prefers-reduced-motion: 20 @keyframes in globals.css with 9 reduce/no-preference gates covering auth, hero, mc-*, dialogs, drawer, skeletons, nav underline; JS matchMedia gate in TechnicianBottomNav.tsx:30. No framer-motion imports. Tailwind animate-(spin|pulse|...): 97 uses ungated (low risk — opacity/spinner).
- Landmarks: <main> in AdminShell.tsx, TechnicianMobileShell.tsx, auth/public shells; <nav> with labels in all nav components; MasterPageHeader renders <header><h1> — 61 PageViews inherit h1 via MasterListPageLayout; dashboard (MissionControlV2View) starts at h2:281.
- scope= on th: 0 repo-wide; AltairTable.tsx:121-141 primitive omits it.

## Primitive quality reference (strengths)
- AltairDialog.tsx: role=dialog, aria-modal, labelledby/describedby with dynamic description registration (:174-192, :237-258), backdrop-as-button with label (:124-130), Escape honoring closeDisabled (:96-100).
- useDialogFocusTrap.ts: initial-focus attribute opt-in, Tab wrap, focus restore on unmount (:40-94). Shared by MobileSheet (role=dialog aria-modal :59-61) and MobileSideDrawer (:74-76).
- useScrollLock.ts: refcounted body lock with scrollbar-gap compensation.
- button-styles.ts: focus-visible ring+offset per variant, min-h-11 mobile sizes, aria-disabled parity.
- field-styles.ts / Field.tsx / Input.tsx: aria-[invalid] styling from real ARIA state, role=alert errors, 16px mobile font-size rule against iOS zoom.
- Dispatch board: job cards are <button> (DispatchJobCard.tsx:59-61), no drag-and-drop anywhere (rg draggable/onDragStart = 0), assignment via DispatchDetailsPanel buttons — fully keyboard-operable; technician time-state dot always paired with text label (TechnicianColumn.tsx:70-76).
- Search/filter bars: aria-labels present on selects/inputs (JobSearchFilterBar.tsx:113,143,189,211,229; CustomerSearchFilterBar.tsx:62); apparent misses in scans were regex false positives from TS generics in onChange casts.

## Popover gap detail
NotificationBell.tsx:105 (aria-expanded only; panel :119 no role, no Escape), CompanySwitcher.tsx:127-128 + :170-204 (listbox/option/aria-selected present; no Escape/arrows/focus move), OwnerViewSwitcher.tsx:54-55,92 (same). No popover primitive exists; dialog README (AltairDialog.tsx:32-36) documents the no-dependency policy that a popover primitive should follow.
