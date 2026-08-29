# aeba08048f722a2b9

## Summary
The project's own rule ("never hardcode a hex value" — stated in shared/design-system/foundation/altair-tokens.ts:20) is broken at every layer, including inside the design system itself. The sweep found 2,756 six-digit hex literals in app/+shared TS/TSX, of which ~950 sit on ACTIVE production surfaces (826 in production components + ~130 in north-star-m* style modules that live pages import), plus 6,468 non-token Tailwind palette utilities (slate alone: 3,827) on active surfaces versus only 1,963 sanctioned altair-* token utilities — the token system is the minority dialect on its own product. The systemic root is not page-level sloppiness: it is (a) shared/design-system/north-star/tokens.ts, a second "frozen" token layer that is 100% hex (315 occurrences, zero var() references) and is imported by 107 production files, and (b) a repeated `northStar ? hexClasses : slateClasses` dual-branch pattern where live PageViews pass northStar=true, so production renders the hex branch while a dead slate branch doubles the surface. The two sanctioned primitives (mc-surface.ts, report-surface.ts) and the mission-control-v2 folder are essentially clean, proving the intended system works where it is actually used. No ESLint rule enforces the hex ban, and the dark-theme scope defined in app/globals.css:201-227 is unreachable (data-theme is set nowhere), so every hardcoded value is a latent blocker for the theming the CSS already promises.

## Findings

### [P1/SYSTEMIC] Second token layer (north-star/tokens.ts) is 100% hardcoded hex and feeds 107 production files
- category: hardcoded-colors | effort: MEDIUM
- evidence: shared/design-system/north-star/tokens.ts: 315 six-digit hex occurrences, 0 `var(--` references; header (lines 1-5) declares it 'North Star production tokens — frozen from Mission Control Original Refined'. Imported by 107 files (rg 'design-system/north-star/tokens' -l), including live Dispatch (DispatchJobCard, DispatchDetailsPanel, TechnicianWorkloadCards), Customers (Customer360Card.tsx:38, CustomerJobsSection, CustomerEquipmentSection), Payments (PaymentsTable, PaymentsPageView), Estimates, Leads, Jobs, Billing, Dashboard components. Sample value: line 107 `eyebrowAccent: "text-[10px] font-semibold uppercase tracking-[0.18em] text-[#C6A757]"`.
- why: The design system's own secondary token file violates the no-hex rule wholesale, so every consumer inherits the violation. Because values are class-strings with baked hex instead of CSS vars, nothing routed through this file can respond to theming, Design Lab overrides, or the dark scope globals.css already defines. It also constitutes a de facto competing token backend against altair-tokens.ts.
- suggestion: Re-back the ~40 hex values inside this one file with `var(--altair-*)` / new `--north-star-*` custom properties defined in app/globals.css. One-file fix propagates to all 107 consumers with zero call-site edits; visual regression is testable because current values become the var defaults.

### [P1/SYSTEMIC] Non-token Tailwind palette colors outnumber altair tokens ~3:1 on active surfaces (6,468 vs 1,963)
- category: token-bypass | effort: HIGH
- evidence: 6,468 palette-utility hits (bg/text/border/ring/from/via/to-{slate|emerald|cyan|amber|rose|...}-N) in ACTIVE files vs 1,963 `*-altair-*` token utilities repo-wide and only 2 files using altairToken(). Family split (active): slate 3,827, emerald 607, cyan 586, amber 497, rose 357, red 156, violet 150, sky 85, blue 70, orange 68, indigo 43, teal 16, pink 6. Hotspots: shared/components/reports/OfficeReviewQueueSection.tsx (267), shared/components/operational/OperationalActivityTimeline.tsx (159), shared/components/customers/CustomerImportPageView.tsx (88), shared/components/jobs/JobActivityTimeline.tsx (80), shared/components/customers/Customer360Card.tsx (75), shared/components/dashboard/DashboardCommandStrip.tsx (67), shared/components/settings/TeamMembersTable.tsx (65), shared/components/reports/ReportsFoundationView.tsx (65). report-icon-tints.ts legitimizes exactly 6 chip fills (bg-sky/emerald/rose/violet/amber/teal-500/25, Reports icon chips only) — a rounding error against 6,468.
- why: This is the largest bypass of the semantic token system: components hand-pick slate greys instead of ink/paper roles and emerald/amber/rose instead of success/warning/danger roles, which silently breaks the 90/8/2 color-hierarchy budget (semantic hues become decoration) and makes any future theme flip or palette change a 6,000-edit job. It also explains visual drift between screens: slate-500 vs #64748B vs ink-muted are three spellings of one intent.
- suggestion: Codemod by equivalence table (slate-400/500/600 → altair-ink-muted/-secondary; emerald/red/amber text+bg pairs → success/danger/warning foreground+surface roles), starting with the top 10 hotspot files (~1,000 hits). Then add an ESLint no-restricted-syntax/tailwind rule banning raw palette families outside report-icon-tints.ts — today the hex/palette ban has zero enforcement (eslint.config.mjs contains none).

### [P2/SYSTEMIC] ~950 literal hex values on active surfaces are mostly transcriptions of existing token values
- category: hardcoded-colors | effort: MEDIUM
- evidence: 826 six-digit hex occurrences in 118 ACTIVE files, plus ~130 more in live-imported north-star-m* style modules (leads/north-star-m14/lead-north-star-styles.ts 50 — imported by 6 live Leads components; platform-admin/north-star-m13/platform-north-star-styles.ts 45; settings/north-star-m10 26; reports/north-star-chart-styles.ts 8 — imported by 6 live report chart cards). Value frequency proves transcription: #4F4638 ×149, #17130E ×110, #8A6324 ×82, #FFF9EA ×61, #64748B ×58, #6B6255 ×46, #EFE4CB ×42, #FBF7EF ×24 — the top three are literally --altair-ink-secondary (app/globals.css:141), --altair-ink (line 140), and #64748B is --altair-ink-muted (line 142). Top files: network/CommunityOverviewPanel.tsx (27), expenses/ExpenseReceiptPreview.tsx (27), onboarding/DashboardActivationHero.tsx (23), technician/TechnicianHomeScreen.tsx (19), jobs/JobWorkflowTimeline.tsx (18: lines 65-101 hardcode the entire brass ramp #C9A44D/#E6D092/#B88A2E/#17130E). altairToken() — built for exactly this — is used in only 2 files (altair-tokens.ts itself and DispatchMap.tsx).
- why: 81 distinct hex values where ~27 semantic roles exist means the palette is memorized and retyped, not referenced. Any token retune (e.g., the brass adjustment that already happened between #977d2a and #d4af37 across themes) leaves hundreds of stale copies; drift is already visible (three near-identical brass darks #8A6324/#8a6d3b/#977d2a in active code).
- suggestion: Mechanical find/replace of the top 12 values (~640 of 826 occurrences) to `text-altair-*`/`bg-altair-*` utilities or var() arbitrary values; the mapping is exact because the hex ARE the token values.

### [P2/SYSTEMIC] Dead dual styling: `northStar ? hex : slate` ternaries ship two hardcoded skins per component
- category: dead-styling-branch | effort: MEDIUM
- evidence: Pattern appears across dozens of production components: Customer360Card.tsx:223 `northStar ? "...text-[#8A6324]" : "...text-slate-400"`, DashboardActivationHero.tsx:54-108, JobWorkflowTimeline.tsx:65-101, ExpensesTable.tsx (31 northStar refs), ServiceItemsTable.tsx (30), DispatchDetailsPanel.tsx (37), BillingDocumentDefaultsCard.tsx (22). Live PageViews pass the shorthand truthy prop: InvoicesPageView.tsx:1257, EstimatesPageView.tsx:1150, ExpensesPageView.tsx:513, JobDetailPageView.tsx:515+549, PaymentsPageView.tsx:125 — so production renders the hex branch and the slate branch is dead code.
- why: Every component carries a second, unrendered, also-non-token skin. It doubles the hardcoded-value surface (many of the 6,468 slate hits live in dead branches, masking the real render), makes grep-based audits lie, and each new feature copies the ternary forward. It is also the mechanism by which the north-star hex dialect spread into production files.
- suggestion: Since northStar is now always true on live routes, delete the legacy branch and the prop in a mechanical pass (component by component), collapsing to a single class string — then tokenize that string per the findings above. This shrinks the violation count by roughly a third for free.

### [P2/SYSTEMIC] Brass alpha family rgba(138,99,36,α)/rgba(201,164,77,α) repeated 300+ times as arbitrary border/ring values
- category: hardcoded-colors | effort: LOW
- evidence: Distinct-value census: border-[rgba(138,99,36,0.12)] ×104, ring-[rgba(138,99,36,0.12)] ×41, border-[rgba(138,99,36,0.18)] ×33, border-[rgba(138,99,36,0.14)] ×27, ring-[rgba(201,164,77,0.28)] ×22, border-[rgba(201,164,77,0.28)] ×21, plus a long tail. Total rgba()/hsl() functions in ACTIVE code: 398 (CONCEPT 975, MKT 240). Representative: Customer360Card.tsx:65, JobWorkflowTimeline.tsx:65-77, DispatchStatusBadge.tsx:12-22.
- why: This is one intent ('brass hairline border at low alpha') hand-tuned per call site with at least four different alphas — exactly the kind of decision the token layer should own. It is also brass-budget leakage: brass tint borders everywhere push past the 2% brass target invisibly.
- suggestion: Add 2-3 custom properties (e.g. --altair-brass-border, --altair-brass-border-strong, --altair-brass-ring) to globals.css and replace mechanically; ~300 occurrences collapse into 3 tokens. Highest fix-per-edit ratio in the sweep.

### [P2/SYSTEMIC] Off-scale micro-typography: 1,267 px font-size literals; text-[10px]×659, text-[11px]×507, 60 instances at 9px or smaller
- category: arbitrary-values | effort: MEDIUM
- evidence: text-[Npx] totals 1,267 (677 in ACTIVE files): text-[10px] ×659, text-[11px] ×507, text-[9px] ×55, text-[13px] ×27, text-[8px] ×4, text-[7px] ×1. tracking-[*] ×347 with a clear de facto scale: 0.14em ×105, 0.12em ×81, 0.08em ×43, 0.16em ×39, 0.18em ×31. ACTIVE hotspots: reports/OfficeReviewQueueSection.tsx (26 px-sizes), customers/Customer360Card.tsx (19), reports/LeadPipelineSection.tsx (17), dispatch/dispatch-board-presentation.ts (16). Even the sanctioned mc-surface.ts:53 uses `text-[10px] ... tracking-[0.14em]` rather than a named utility.
- why: The product has a real micro-type system (10px/600/0.14em eyebrows, 11px meta) that exists only as 1,100+ retyped literals — one typo away from drift per instance, unadjustable globally, and the ≤9px tail (60 instances) is below comfortable readability on dense data screens, an accessibility risk for field users in sunlight.
- suggestion: Promote the observed scale to named utilities/tokens (e.g. text-eyebrow, text-meta, text-micro with letterspacing baked in) starting from mc-surface.ts so the sanctioned primitive defines them; audit and eliminate the ≤9px tail.

### [P2/SYSTEMIC] A third, off-token dark visual language on the mobile shell (AdminMobileHome / QuickNavigationDrawer / TechnicianHomeScreen)
- category: visual-language-fork | effort: MEDIUM
- evidence: Exactly 4 files share a private dark-grey ramp found nowhere in app/globals.css tokens: #e6e8eb, #9b9fa6, #6b7075, #d0d4da plus raw brass #d4af37 — shared/components/dashboard/AdminMobileHome.tsx (lines 201-294), dashboard/AdminMobileHomeTopBar.tsx, mobile/QuickNavigationDrawer.tsx, technician/TechnicianHomeScreen.tsx (lines 29-47 add decorative multi-stop gradients from-[#67e8f9] via-[#22d3ee] to-[#0e7490], cyan/emerald/amber chips). Technician surfaces overall (app/technician + shared/components/technician): 19 hex + 490 palette utilities.
- why: The audit brief sanctions two surface systems plus the Dispatch dark exception; this mobile dark shell is a third register, expressed entirely in hardcoded hex that matches neither the MC v2 paper tokens nor the Reports graphite register. The admin mobile home and the technician app are high-frequency daily surfaces, so the fork is prominent, and the gradient chips use semantic-family hues (cyan/emerald/amber) decoratively — against color-hierarchy.ts's 90/8/2 rule.
- suggestion: Either bless it — define the mobile-dark ramp as named tokens next to the Reports graphite register and swap the 4 files onto them — or restyle mobile home onto the existing report-surface graphite tokens. Decide before panel 14-16 redesigns copy the pattern.

### [P2/SYSTEMIC] Semantic status colors re-implemented as ad hoc hex+rgba badge recipes instead of the status tokens
- category: semantic-token-bypass | effort: LOW
- evidence: #166534 (green-800) ×9, #991B1B (red-800) ×9, #9A3412 (orange-800) ×8 in active files, always paired with matching rgba fills: PlatformReliabilityPulse.tsx:16-20, PlatformSignalActionControls.tsx:41, PlatformNeedsAttentionPanel.tsx:23-25, PlatformCustomerHealthPulse.tsx:31, LeadCard.tsx:57 (`text-[#9A3412] ring-1 ring-[rgba(234,88,12,0.22)]`), SettingsAlertBanner.tsx:36-44, time-clock/payroll-entry-styles.ts:18.
- why: altair-tokens.ts defines successForeground/successSurface, dangerForeground/dangerSurface, warningForeground/warningSurface for precisely this badge/banner use case; hand-rolled recipes fragment status color meaning (platform-admin green ≠ dashboard green) and are invisible to any future status-color tuning or theming.
- suggestion: One shared status-badge class helper consuming the *Surface/*Foreground tokens; replace the ~8 recipe sites (platform-admin panels are copy-paste identical, so this is largely one function extracted).

### [P3/SYSTEMIC] Dark theme defined in CSS but unreachable — every hardcoded value above is a latent theme blocker
- category: theming-readiness | effort: LOW
- evidence: app/globals.css:201-227 defines a full `[data-theme="dark"]` token scope (ink flips to #f3ebdd, brass to #d4af37, etc.), but rg for `data-theme` across all TS/TSX finds exactly one file — the token reference module itself (shared/design-system/foundation/altair-tokens.ts). No toggle, no root attribute setter exists.
- why: The CSS promises a theme the app can never enter, and meanwhile ~950 hex + 6,468 palette utilities on active surfaces are pinned to light-theme values. If dark mode is on the roadmap, the debt quantified in this sweep is the exact blocker inventory; if it isn't, the dead scope misleads contributors into thinking token usage is theme-safe today.
- suggestion: Decide the dark-mode roadmap explicitly; if pursued, the findings above are the prioritized burn-down list. Either way, document the state in the design foundation doc.

### [P3/LOCAL] Live Reports chart strokes hardcode Tailwind palette hex instead of vars (altairToken exists for this exact case)
- category: hardcoded-colors | effort: LOW
- evidence: shared/components/reports/north-star-chart-styles.ts:10 `const REVENUE_SKY = "#38BDF8"`, line 74 stroke #F43F5E, lines 108-112 series ramp #34D399/#A78BFA/#FBBF24/#2DD4BF/#FB7185 each doubled with a matching palette utility (bg-emerald-400/text-emerald-300). Imported by 6 live report cards: TopRevenueSourcesChartCard, SalesFunnelChartCard, RevenueTrendChartCard, ReceivablesAgingChartCard, LeadPipelineSection, CashHealthChartCard.
- why: altair-tokens.ts:18-20 names SVG/chart fills as the intended use for altairToken()/CSS vars; instead the Reports data-viz palette lives as literals in one style module, disconnected from report-icon-tints (which uses the same hue families as classes) — two spellings of the Reports categorical palette that can drift independently.
- suggestion: Define the Reports categorical series as CSS custom properties (or export from report-icon-tints) and consume via var() in chart props; single-file change.

### [P4/LOCAL] Sanctioned primitive mc-surface.ts itself contains one hardcoded rgb hover
- category: hardcoded-colors | effort: LOW
- evidence: shared/design-system/components/mc-surface.ts:49 `hover:bg-[rgb(241_245_249_/_0.55)]` (slate-100 @ 55%) in altairMcListRowClass — the only raw color in an otherwise fully var()-backed primitive; the mission-control-v2 component folder is 100% hex-free.
- why: The flagship primitive is the template contributors copy; its single raw value quietly licenses the pattern everywhere else and would not track a theme or Design Lab surface change while every neighboring value would.
- suggestion: Replace with a var()-based hover token (e.g. color-mix on --surface-card), keeping the primitive a clean exemplar.

### [P3/SYSTEMIC] No enforcement: the hex ban exists only as a comment — nothing stops the count growing
- category: process-gap | effort: LOW
- evidence: eslint.config.mjs contains no color/hex/no-restricted-syntax rules; the rule's only statement is the comment at shared/design-system/foundation/altair-tokens.ts:20. Current totals (2,756 hex; 8,442 palette utilities repo-wide in app/+shared) accumulated with zero tooling friction. Mitigating/justified exceptions to encode: app/global-error.tsx (9 hex — renders without app CSS, legitimately self-contained), shared/lib/billing-signature-block.ts + reports/TaxSummaryReportDocument.tsx (email/print HTML where CSS vars are unavailable), manifest.ts/layout.tsx theme-color, and marketing/auth/PWA surfaces (575 hex + 598 palette — a deliberate separate visual language, lower priority).
- why: Every fix above erodes without a ratchet; the concept areas prove velocity (1,355 hex accrued in north-star shells alone). A lint rule with an explicit allowlist converts the design rule from folklore to a gate.
- suggestion: Add no-restricted-syntax (or eslint-plugin-tailwindcss) rules banning hex literals and raw palette classes in app/ and shared/components, with a frozen allowlist for the justified files, set to warn first, error after the top-12-value codemod lands.

## Inventory
## Hardcoded-values sweep — counts (app/ + shared/, *.ts/*.tsx, rg occurrence counts)

### 1. Six-digit hex literals by area (2,756 total)
| Area | Occurrences | Files |
|---|---|---|
| ACTIVE production surfaces | 826 (+~130 in live-imported north-star-m* style modules ≈ 950) | 118 (+5 modules) |
| Marketing / auth / PWA / homepage | 575 | 37 |
| Concept / north-star shells / color-lab / design-lab / app/tech | 1,355 | 79 |
| app/(admin) route files themselves | 0 | — (violations live in shared components) |

Top ACTIVE files: network/CommunityOverviewPanel 27, expenses/ExpenseReceiptPreview 27, settings/BillingDocumentDefaultsCard 23, onboarding/DashboardActivationHero 23, settings/PaymentSettingsCard 21, onboarding/OnboardingChecklistSection 20, technician/TechnicianHomeScreen 19, settings/CompanySubscriptionBillingCard 19, jobs/JobWorkflowTimeline 18, network/IncomingNetworkInvitesCard 17, platform-admin/PlatformCustomerHealthPulse 15, network/NetworkProfileDetailPanel 15, service-items/ServiceItemsTable 13, platform-admin/PlatformSignalActionControls 13, network/NetworkReferralCard 13. Live-imported north-star modules: leads/north-star-m14/lead-north-star-styles.ts 50, platform-admin/north-star-m13/platform-north-star-styles.ts 45, settings/north-star-m10/settings-north-star-styles.ts 26, reports/north-star-chart-styles.ts 8.

### 2. Hex value frequency in ACTIVE (81 distinct; top 12 ≈ 77% of 826)
| Hex | Count | Identity |
|---|---|---|
| #4F4638 | 149 | = --altair-ink-secondary (globals.css:141) |
| #17130E | 110 | = --altair-ink (globals.css:140) |
| #8A6324 | 82 | north-star brass-dark (not a CSS token) |
| #FFF9EA | 61 | north-star brass surface |
| #64748B | 58 | = --altair-ink-muted (slate-500) |
| #6B6255 | 46 | north-star muted |
| #EFE4CB | 42 | north-star parchment |
| #FBF7EF | 24 | = --altair-paper |
| #C9A44D | 22 | north-star brass |
| #F3EBDD | 20 | = dark-theme --altair-ink |
| #D4AF37 | 17 | = --altair-brass-interactive |
| #166534/#991B1B/#9A3412 | 26 | ad hoc status greens/reds/oranges |

### 3. Arbitrary Tailwind values (repo-wide app+shared)
| Pattern | Count | Notes |
|---|---|---|
| text-[ | 2,951 | incl. 1,267 text-[Npx] (ACTIVE 677) |
| bg-[ | 984 | |
| border-[ | 669 | |
| w-[ / h-[ | 486 / 219 | |
| tracking-[ | 347 | 0.14em×105, 0.12em×81, 0.08em×43, 0.16em×39, 0.18em×31 |
| ring-[ | 314 | |
| shadow-[ | 262 | top: var(--shadow-card)×12 (sanctioned), then rgba one-offs |
| from-[/via-[/to-[ | 83/89/86 | gradient stops |
| rounded-[ | 132 | mostly var(--radius-section) (sanctioned) |
| min/max-w/h-[ | 278 | |
| p*/m*-[ | 39 | |
| leading-[ | 20 | |

Color-bearing arbitrary utilities ((bg|text|border|ring|from|via|to|shadow…)-[#|rgb|hsl]): ACTIVE 1,126 · CONCEPT 1,898 · MKT 619.
text-[Npx] distinct: 10px×659, 11px×507, 9px×55, 13px×27, 15px×11, 8px×4, 12px×3, 7px×1.

### 4. rgb()/rgba()/hsl() functions
ACTIVE 398 · CONCEPT 975 · MKT 240. Dominant repeated expressions: border-[rgba(138,99,36,0.12)]×104, ring-[rgba(138,99,36,0.12)]×41, border-[rgba(138,99,36,0.18)]×33, border-[rgba(138,99,36,0.14)]×27, ring/border-[rgba(201,164,77,0.28)]×43. Inline style={{...}} objects containing hex/rgba: 71 (54 files with style objects).

### 5. Gradients (bg-gradient-to-*)
ACTIVE 48 · CONCEPT 151 · MKT 24. ACTIVE hotspots: dashboard/CashFlowCommandSection.tsx (4; lines 34-54 `from-rose-950 via-slate-900`, line 100 `from-emerald-50/70 via-white`), dashboard/DispatchPressureSection.tsx (4), technician/TechnicianHomeScreen.tsx (4; lines 29-47 cyan/emerald/amber/brass 3-stop chips), design-system/signature/{HorizonDivider,BusinessTerrain} (3 each — signature pieces, arguably sanctioned).

### 6. Non-token Tailwind palette utilities (bg|text|border|ring|from|via|to|…-{family}-N)
| Area | Count |
|---|---|
| ACTIVE | 6,468 |
| CONCEPT | 1,376 |
| MKT | 598 |

ACTIVE family split: slate 3,827 · emerald 607 · cyan 586 · amber 497 · rose 357 · red 156 · violet 150 · sky 85 · blue 70 · orange 68 · indigo 43 · teal 16 · pink 6. Top ACTIVE files: reports/OfficeReviewQueueSection 267, marketing-hq/MarketingAiHqPageView 210 (internal founder area), operational/OperationalActivityTimeline 159, customers/CustomerImportPageView 88, platform-admin/PlatformBugReportsPageView 83, jobs/JobActivityTimeline 80, customers/Customer360Card 75, dashboard/DashboardCommandStrip 67, settings/TeamMembersTable 65, reports/ReportsFoundationView 65. Sanctioned exception: report-icon-tints.ts (6 chip fills bg-{sky,emerald,rose,violet,amber,teal}-500/25, Reports stat-card icon chips only).

### 7. Sanctioned-system adoption baseline
- `*-altair-*` token utilities: 1,963 occurrences repo-wide.
- altairToken(): 6 call-sites in 2 files (altair-tokens.ts, dispatch/DispatchMap.tsx).
- mission-control-v2/ folder: 0 hex. report-surface.ts: 0 (1 comment mention). mc-surface.ts: 1 raw rgb (line 49 hover).
- shared/design-system/north-star/tokens.ts: 315 hex, 0 var() refs, imported by 107 files ("frozen production tokens" per its own header).
- SVG stopColor/fill hex: 12, all in concept shells (altair-shell-north-star-v1/v2/v3, dashboard/north-star-v2).
- Technician surfaces (app/technician + shared/components/technician): 19 hex + 490 palette utilities.
- Mobile dark off-token ramp (#e6e8eb/#9b9fa6/#6b7075/#d0d4da): exactly 4 files — AdminMobileHome, AdminMobileHomeTopBar, QuickNavigationDrawer, TechnicianHomeScreen.
- `northStar` truthy at live call sites: InvoicesPageView.tsx:1257, EstimatesPageView.tsx:1150, ExpensesPageView.tsx:513, JobDetailPageView.tsx:515/549, PaymentsPageView.tsx:125, MarketingHubPageView.tsx (10 sites) — hex branches are the rendered ones.
- Dark theme: `[data-theme="dark"]` scope at app/globals.css:201-227; `data-theme` never set by any TS/TSX (single grep hit = the token reference file).
- Enforcement: eslint.config.mjs has no rule banning hex or palette classes.

### Justified/mitigated hex (do not codemod blindly)
app/global-error.tsx (9 — must render without app CSS), shared/lib/billing-signature-block.ts (5) and reports/TaxSummaryReportDocument.tsx (12) — email/print HTML without CSS-var support, app/manifest.ts + app/layout.tsx themeColor (4), marketing/auth/PWA surfaces (575 hex + 598 palette — separate public-site language, out of app-token scope).
