# Findings log (raw, running)

Accumulating findings during the audit. IDs assigned here carry into the final report. Severity: P0–P4. Scope: SYSTEMIC/LOCAL.

## Confirmed early (inline reading, pre-screenshot)

- **F-001 (P2, SYSTEMIC)** `app/globals.css` is 5,135 lines and contains a second, page-scoped styling system: ~1,700+ lines of "North Star M-number" blocks (`M3B` Customer 360, `M4A` Jobs, `M5A/B/C/D` Invoices/Estimates docs, `M6A/B` Expenses, `M8` Reports, `M9` Time, `M10` Settings, `M15/D/E` Dispatch) + ~330 lines of auth/login themed CSS + homepage-hero CSS + 20+ bespoke keyframes. This is a third styling register beyond the two sanctioned systems (MC v2, report-surface). Risk: dead CSS after hub-IA migration, specificity fights, unpredictable page ownership. Needs verification of what's still live.
- **F-002 (P3, SYSTEMIC)** Route graph now hub-based (Work/Sales/Customers/Team hubs with tabs; legacy /jobs /estimates /invoices /payments /leads /technicians /time /time-clock redirect). 16-panel roadmap describes the pre-hub world — docs/skill out of date; risk of components orphaned by the hub migration (EstimateQueueTabs-style leftovers).
- **F-003 (note)** Detail-route discovery via `a[href]` found no job detail links on /work (customers list DID have links). Verify: are job rows real links?
- **F-004 (note)** Every public page logs 1 console error in capture — identify (see capture-report.json).
- **F-005 (P3, LOCAL)** Beta feedback button has per-route visibility exceptions (hidden on mobile settings + mobile dashboard) — inconsistent presence of a floating control across the app.
- **OK-1 (preserve)** Button primitive (`Button.tsx` + `button-styles.ts`) is excellent: link-vs-button branch, inert disabled links, aria-busy, per-variant focus rings w/ contrast rationale, motion-reduce. Question is adoption breadth.
- **OK-2 (preserve)** Semantic token foundation + 5-level surface hierarchy + brass discipline are real and documented in code.
- **OK-3 (preserve)** Sidebar nav: semantic ul/li, aria-current, permission-filtered, grouped. No logo/wordmark inside sidebar (check Header).

## Public/auth surfaces (screenshots, desktop)

- **F-006 (P1, LOCAL)** `/install` renders a raw debug JSON block (`displayModeStandalone`, `serviceWorkerRegistered`…) at the bottom of the page for every visitor. Beta testers are sent here. Developer diagnostics leaking into production UI. Effort LOW.
- **F-007 (P2, SYSTEMIC)** Two auth-page generations: `/login` = fully dark "command-center entrance" with brass CTA; `/signup` + `/forgot-password` = older dark-left/cream-right split with **navy** CTA. Same flow, two visual languages, two CTA colors. globals.css has both systems (~379-712). Marketing pricing page also mixes navy and brass CTAs.
- **F-008 (P3, LOCAL)** `/welcome` embeds an outdated product screenshot (old sidebar with "Feedback"/"Jobs", old light topbar, "Good Evening, jeremiah") — marketing shows a UI that no longer exists.
- **F-009 (P4, LOCAL)** Signup/forgot marketing rail shows fabricated stats ("Active jobs 24", "On-time rate 94%", "SYSTEMS NOMINAL") — against the project's own data-honesty rule, even if marketing-side.
- **F-010 (P3, LOCAL)** `/login` is a full-length marketing page under the sign-in form — returning users get a giant scroll; also marketing mockups use blue/cyan accents ("In progress", "Complete work") that the product's brass/semantic system doesn't use.
- **OK-4 (preserve)** Marketing topbar + pricing cards + serif display headline on /welcome: strong, distinctive brand (dark + brass + gear wordmark + "operating system" motif). The login left-panel is genuinely premium.

## Pass 1 discovery (full details in ui-audit/discovery/*.md) — headline items

- **F-011 (P1, SYSTEMIC)** North Star env fork: 712 `northStar ?` ternaries / 160 files; two complete visual systems alive; live pages render hex branch, slate branch is dead weight. Root cause multiplier for all duplication. [component-duplication, hardcoded-values]
- **F-012 (P1, SYSTEMIC)** globals.css = 5,136-line override engine: 382 !important, ~111 selectors targeting Tailwind utility class names (incl. escaped arbitrary classes); L5 density register rewrites spacing utilities inside forms. [tokens-theme]
- **F-013 (P1, SYSTEMIC)** Token adoption ~⅓: 1,364 hex in shared/components (280 distinct); north-star/tokens.ts = 315 hex, 0 var(), 107 importers; slate utilities 3,827 vs altair tokens 1,963; top hexes ARE token values retyped. [tokens-theme, hardcoded-values]
- **F-014 (P1, SYSTEMIC)** Failed Platinum Circuit retune: retired blue-black #1A2029/#273140 family survives in ~40 sites (overlays, dispatch CTAs, detail heroes) against the new neutral graphite chrome; globals.css comment falsely claims "no blue hue left". [tokens-theme]
- **F-015 (P1, SYSTEMIC)** Contrast: ink-muted #64748B = 2.74:1 on graphite (Reports/Dispatch dark cards, 9-10px type) and fails AA on all non-white light surfaces (345 uses); brass small text 3.7-4.0:1 despite "AA-safe" comment. Candidate fixes measured (#aeb6c2 dark-muted, #556070 light-muted, #7a651f brass-text). [accessibility]
- **F-016 (P1, SYSTEMIC)** formatCurrency rounds to whole dollars (maximumFractionDigits: 0), used in 380 sites incl. public Pay Now, invoice line items/totals, billing emails → displayed "$1,235" vs charged $1,234.56. [copy]
- **F-017 (P1, LOCAL)** Dead Search button in admin Header on every ≥640px page (aria-labeled, no handler; no global search exists). [routes, accessibility]
- **F-018 (P1, SYSTEMIC)** Double-render institutionalized: 215 hidden/shown sibling occurrences; DesktopConditionalDetailPanel renders children 2×; 11 ledgers render table+cards simultaneously; whole dashboard doubled (AdminMobileHome + MissionControlV2); TeamInviteForm has 2 required email inputs + 2 submits in one form; BillingDocumentDefaultsCard has 2 textareas with same name. [responsive]
- **F-019 (P2, SYSTEMIC)** 768–1100px dead zone: fixed 232px sidebar + md card→table swap + min-w 720-1040px tables → every ledger pans horizontally through the whole tablet band. [responsive]
- **F-020 (P2, SYSTEMIC)** Three primary-button looks on billing surfaces (DS graphite / slate-900 / emerald-600); Button primitive in ~24 files vs 699 raw buttons. [duplication]
- **F-021 (P2, SYSTEMIC)** window.confirm on 17-18 destructive sites (incl. bulk permanent customer delete) vs AltairConfirmDialog on 3. [states, duplication, copy]
- **F-022 (P2, SYSTEMIC)** No toast/feedback primitive; 36 hand-rolled success patterns; archive/restore succeed silently; SettingsAlertBanner (25 uses) lacks aria-live. [states]
- **F-023 (P2, SYSTEMIC)** No popover primitive: NotificationBell/CompanySwitcher/OwnerViewSwitcher lack Escape/arrows/focus management. [accessibility]
- **F-024 (P2, SYSTEMIC)** Status color language forked 3 ways (StatusPill / operational-status-styles verbatim copy / lead sky-violet-indigo palette); invoice "sent"=info vs estimate "sent"=warning. [duplication]
- **F-025 (P2, SYSTEMIC)** Four empty-state families; 11 StatStrips, 10 SearchFilterBars, 6 MobileCardLists (~2,800 duplicated lines); 35 local Skeleton re-declarations. [duplication]
- **F-026 (P2, SYSTEMIC)** Copy generation split: 138 Title Case vs 633 sentence case; "Failed to X." ×194 vs "We couldn't" ×311; Trash/Recently Deleted/In trash in one flow; Quote vs Estimate (technician vs office); Approved vs Accepted; Work vs Jobs; cancelled vs canceled. [copy]
- **F-027 (P2, SYSTEMIC)** All browser tabs titled "Altair OS" — zero per-route metadata in admin/technician/public token pages. [copy]
- **F-028 (P2, SYSTEMIC)** No type scale: text-[10px] ×659, text-[11px] ×507, ≤9px ×60; eyebrow style hand-rolled 362× with 12 tracking values. Dispatch runs 9px on dark. [tokens, hardcoded, a11y]
- **F-029 (P2, SYSTEMIC)** Third dark mobile register (AdminMobileHome/QuickNavigationDrawer/TechnicianHomeScreen private hex ramp + cyan gradients); admin mobile header keeps legacy light/cyan chrome; technician shell runs cyan accent — cyan is a live unsanctioned accent at shell level. [hardcoded, routes]
- **F-030 (P2, SYSTEMIC)** No Suspense streaming in admin; serial 7-8 round-trip layout chain; PageView monoliths (2,207-line worst) hydrate whole pages; 500ms artificial refresh delay on job actions; dual revalidatePath+router.refresh in 54 files. [perf]
- **F-031 (P2, LOCAL)** Public token routes (estimate-approval, invoice-payment) lack loading/error boundaries; fallback error CTA sends homeowner to internal login. [states]
- **F-032 (P2, SYSTEMIC)** Unlabeled money-entry grids (Invoice/Estimate line-item editors: labels without htmlFor, inputs without id); ServiceItemsTable + TimeEntriesTable rows keyboard-unreachable. [accessibility]
- **F-033 (P2, SYSTEMIC)** Stale "Settings → Team" copy/links ×6 after Users rename; Schedule reachable only via unlabeled header icon; technician app split across 2 route trees with drifted layouts; mobile rail vs drawer different orderings. [routes]
- **F-034 (P2, SYSTEMIC)** Brass = 20 unmanaged golds + rgba(138,99,36,α) repeated 300+×; radius 13 arbitrary values vs 2 tokens; shadows 261 arbitrary vs 3 tokens. [tokens, hardcoded]
- **F-035 (P2, SYSTEMIC)** prefers-color-scheme:dark leftover flips --foreground to near-white while body stays light → invisible inherited-color text for dark-OS users; [data-theme=dark] fully defined but unreachable. [tokens]
- **F-036 (P2, LOCAL)** Bulk operations structurally desktop-only (no selection affordance in mobile card lists). [responsive]
- **F-037 (P2, LOCAL)** Admin header + mobile nav rail scroll away on phones (not sticky) while technician shell keeps chrome sticky. [responsive]
- **F-038 (P2, SYSTEMIC)** AltairTable has no mobile contract; ServiceItems/TimeEntries/analytics/reports tables pan on phones. [responsive]
- Strengths confirmed: 43 layout-matching skeletons, error trio, useTransition discipline (108 files), archive/trash/restore lifecycle, zero alert(), overlay a11y family (dialog focus trap/scroll lock), reduced-motion coverage, lean deps, pagination everywhere, Geist+Instrument Serif via next/font, print stylesheet, em-dash empty convention, offline copy in technician app.
