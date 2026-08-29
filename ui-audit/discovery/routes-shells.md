# ace0eabbabd24c5a3

## Summary
The route tree is in strong mid-migration hygiene: every duplicate concept the audit asked about (/jobs vs /work, /team vs /technicians, /time vs /payroll, /leads, /estimates|/invoices|/payments vs /sales, settings/team vs settings/users, all north-star/command-center/workspace/concept experiments) resolves to a deliberate redirect or 404 tombstone with an archival comment — nothing unfinished is reachable by real users, and role routing (admin vs technician home) is centralized and crisp. The real findings are chrome- and copy-level: a completely dead Search button ships in the admin header on every ≥640px screen; a settings IA rename ("Team" → "Users") left 6 user-facing copy/link references pointing at a tab that no longer exists; the Schedule surface hangs off a single unlabeled 20px header icon; and the technician app straddles two route trees (/technician + /tech/*) whose duplicated layouts have already drifted (hideDemoPrefixes). Navigation itself is permission-filtered through one shared source (nav-items.ts + access-control.ts) with consistent active-state handling, which is exactly the right architecture — but mobile presents two different orderings of the same 13 destinations at once, and roughly a third of all page routes are now redirect stubs that internal links still target as if canonical.

## Findings

### [P1/LOCAL] Dead Search button in admin header chrome on every page
- category: trust/dead-control | effort: LOW
- evidence: shared/components/admin/Header.tsx:175-185 — a <button type="button" aria-label="Search"> with hover styles and no onClick, no form, no dialog. Visible on all admin pages at >=640px (class `hidden ... sm:inline-flex`). grep for CommandPalette|GlobalSearch|SearchOverlay|command-palette across app/, shared/, lib/: 0 hits; shared/components/search/ contains only SearchMatchReason.tsx (per-list match labels), no global search exists.
- why: A primary-chrome control that does nothing on click is a direct trust hit on every single admin screen; keyboard/screen-reader users (it has an aria-label, so it is announced) will activate it and get silence. Users learn the chrome lies.
- suggestion: Remove the button until global search exists, or wire it to a minimal client-side navigator over the 13 nav destinations. Removal is a 10-line diff in one file.

### [P2/SYSTEMIC] Stale 'Settings → Team' references after the Users rename
- category: ia-copy-drift | effort: LOW
- evidence: Canonical route is /settings/users; /settings/team is a redirect (app/(admin)/settings/team/page.tsx:1-10, comment says 'Users tab is canonical'). Six survivors: shared/components/technicians/TechniciansPageView.tsx:107-108 (empty-state copy 'Invite teammates ... from Settings → Team' + CTA href /settings/team), shared/components/team/TeamHubPageView.tsx:124 (href /settings/team), shared/components/team/TeamMemberProfileView.tsx:80 (backHref default '/settings/team'), shared/components/team/north-star-m12/TeamMemberProfileNorthStarView.tsx:103 (same), shared/lib/onboarding-checklist.ts:54 (href /settings/team), shared/lib/operational-errors.ts:198 (error copy 'resend the invite from Settings → Team').
- why: Links survive via redirect but visible instructions name a tab that no longer exists — a new office admin following the error/empty-state copy will scan Settings for 'Team' and not find it. The settings sub-nav (shared/components/settings/SettingsNavigation.tsx:31-52) shows Overview/Company/Billing/Users only. Shared cause: route+label rename without a copy sweep; the naming law ('one id drives route + label') is enforced in code but not in prose.
- suggestion: One sweep replacing the copy with 'Settings → Users' and the hrefs with /settings/users; add a lint-able convention that user-facing copy never hardcodes redirect-only paths.

### [P2/LOCAL] Schedule surface reachable only through an unlabeled 20px header icon
- category: discoverability | effort: MEDIUM
- evidence: nav-items.ts:326-329 filters '/schedule' out of all nav ('Schedule lives in the header calendar icon — not primary nav'). Sole desktop entry: shared/components/admin/HeaderScheduleCalendar.tsx:13-26 — icon-only Link beside the date, aria-label only, no visible label, no title tooltip. Mobile entry: AdminMobileHomeTopBar.tsx calendar button (home screen only). Schedule→Dispatch links exist (shared/components/schedule/ScheduleDayCell.tsx, SchedulePageView.tsx) but grep shows no Dispatch→Schedule link — the pairing is one-directional. The nav item description ('Week overview linking into the dispatch day board') is never shown anywhere a user can read it.
- why: A full week/month calendar — the destination field-service owners most expect — is invisible unless the user happens to hover a small icon next to the date. Dispatch users planning beyond today have no signposted path to the week view.
- suggestion: Either restore Schedule to the Work nav group, or make the header calendar a labeled affordance ('Schedule' text on lg+, title tooltip) and add a Week-view link from the Dispatch board header.

### [P2/SYSTEMIC] Technician app spans two route trees with duplicated, already-drifting layouts
- category: route-architecture | effort: MEDIUM
- evidence: The CURRENT technician bottom nav (shared/components/technician/nav-items.ts:21-64) mixes trees: Home → /technician, Time → /tech/time, Receipts → /tech/receipts, Alerts → /tech/notifications; /technician/schedule is linked only from TechnicianHomeScreen. app/technician/layout.tsx and app/tech/layout.tsx duplicate the same auth/company/billing/notification wiring and render the same TechnicianMobileShell — and have drifted: technician/layout.tsx:38-45 resolves and passes hideDemoPrefixes; tech/layout.tsx does not, so founder demo-name masking silently turns off when navigating Home → Time. lib/auth/redirects.ts:42-44 and access-control.ts canAccessAppRedirectPath must whitelist both prefixes. /tech root itself now redirects to /technician (app/tech/page.tsx) and /tech/demo is dev-only notFound.
- why: AGENTS.md frames /tech/* as 'older', but three of the five live technician destinations are in it — the split is load-bearing, not legacy. Duplicated layouts guarantee drift (one concrete divergence already shipped), and every auth/redirect/nav helper must special-case two prefixes forever.
- suggestion: Fold /tech/time, /tech/receipts, /tech/notifications under app/technician/* with redirect stubs left behind (the codebase's established tombstone pattern), collapsing to one layout. The hideDemoPrefixes drift is a one-line interim fix in app/tech/layout.tsx.

### [P3/SYSTEMIC] Mobile presents two different orderings of the same 13 destinations simultaneously
- category: nav-consistency | effort: LOW
- evidence: On any mobile admin page (except '/'), the horizontal rail (shared/components/admin/MobileNav.tsx) uses flat MOBILE_ADMIN_BOTTOM_RAIL_ORDER (nav-items.ts:279-293: Dashboard, Work, Dispatch, Team, Customers, Sales, Expenses, Reports, ...), while the hamburger drawer on the same screen (AdminQuickNavDrawer.tsx:27-42) uses the grouped desktop order (ADMIN_NAV_GROUP_DEFINITIONS, nav-items.ts:205-236: Command[Dashboard, Reports], Work[Work, Dispatch, Team, Price Book], ...). Reports is item #2 in the drawer but #8 on the rail; Price Book #7 in the drawer but #10 on the rail.
- why: Two orderings of one item set on one screen doubles the spatial memory a user must build; muscle memory earned in the drawer doesn't transfer to the rail. Also 13 items on a scrollable rail puts Settings ~3 screens right.
- suggestion: Derive the rail order from the grouped definitions (flatten groups in order) so both surfaces share one sequence, or drop one of the two mobile nav systems.

### [P3/SYSTEMIC] ~26 of ~79 page routes are redirect/tombstone stubs, and internal links still target several as canonical
- category: route-hygiene | effort: MEDIUM
- evidence: Redirect-only pages in (admin): /jobs, /jobs/[jobId], /leads, /technicians, /time, /time-clock, /estimates(list), /invoices(list), /payments(list), /network, /settings/{team,preferences,notifications,documents,integrations,subscription,payments}, plus 4 retired experiments (dashboard-north-star-v1/v2, command-center-v1, workspace-v1 → redirect('/'), each with docs/design-archive/*.bak note) and altair-design-lab (notFound, comment documents a pre-existing Field crash). (concept)/* — 4 more redirect('/') stubs behind an auth-gated shell-less layout. app/tech/page.tsx redirects. Internal links still routed through stubs: app/(admin)/settings/page.tsx:429 links /settings/documents (bounces to /settings/company#documents); team surfaces link /settings/team (see separate finding); shared/lib/onboarding-checklist.ts:54.
- why: The tombstones themselves are excellent practice (params preserved, rationale comments). The residual cost is every in-app link that pays a redirect round-trip and pollutes history, plus a route tree where a third of the files are dead weight the comments themselves say to 'delete in the next on-machine cleanup pass'.
- suggestion: Point remaining internal links at canonical hrefs (grep for the 10 stub prefixes in href= positions), then do the promised deletion pass for the 9 experiment directories.

### [P3/LOCAL] Dead DesktopNav component and deprecated nav helpers still in the shell folder
- category: dead-code | effort: LOW
- evidence: shared/components/admin/DesktopNav.tsx is imported by nothing (grep 'DesktopNav' outside its own file: 0 hits); AdminShell renders SidebarNav. Its only dependency getOrderedAdminNavItemsForDesktop (nav-items.ts:386-410) and DESKTOP_ADMIN_NAV_WORKFLOW_ORDER (nav-items.ts:306-320) are otherwise unused. nav-items.ts also carries three @deprecated exports (splitAdminNavItemsForMobile:346, PRIMARY_MOBILE_ADMIN_NAV_ROWS:296, getAdminMobileNavItems:413).
- why: The shell directory presents two parallel desktop nav implementations to any contributor; the unused ordering constant invites edits that silently change nothing.
- suggestion: Delete DesktopNav.tsx, DESKTOP_ADMIN_NAV_WORKFLOW_ORDER, getOrderedAdminNavItemsForDesktop, and the three deprecated exports.

### [P3/SYSTEMIC] Back-link convention varies across detail pages; no shared primitive
- category: pattern-consistency | effort: LOW
- evidence: No Breadcrumb component exists (grep 'Breadcrumb' app+shared: 0). Detail pages each hand-roll an ArrowLeft link with different labels and sizes: CustomerDetailPageView.tsx:99-105 'Customers' (no 'Back to', 3.5px icon), JobDetailPageView.tsx:516-522 'Back to Work' (icon size varies by northStar flag), EstimateDetailPageView.tsx:124-130 'Back to estimates' (lowercase noun), TeamMemberProfileView.tsx:223-229 variable backLabel with slate-600 styling while customer/job use altair-ink tokens.
- why: For a 2-level IA back links are the right pattern, but four label grammars and two color systems for the identical affordance reads as four different apps at the exact moment users move between domains.
- suggestion: Extract one BackLink primitive (label = destination nav label, sizes/tokens fixed) in shared/design-system/shell and adopt it in the ~6 detail views; this is where a fix has leverage since every future panel copies an existing detail page.

### [P3/LOCAL] Admin mobile chrome keeps legacy light/cyan styling while desktop chrome is North Star
- category: shell-consistency | effort: MEDIUM
- evidence: shared/components/admin/Header.tsx:109-111 hard-splits: 'Desktop chrome is always North Star; mobile keeps light tone'. Mobile branch uses raw slate classes and a cyan avatar gradient (Header.tsx:238 'bg-gradient-to-br from-cyan-500 to-cyan-700 ... shadow-cyan-600/30'). The technician shell separately runs a cyan accent language (40 cyan-* matches across 20 files in shared/components/technician, e.g. TechnicianBottomNav.tsx:58-61 'bg-cyan-50 text-cyan-700', focus outline-cyan-600) versus brass in admin chrome (MobileNav.tsx:33-42 uses text-altair-brass for active icons).
- why: The same owner sees brass-accented North Star chrome on desktop and cyan/slate legacy chrome on their phone — and the owner view-switcher drops them into a fully cyan technician shell. Cyan functions as an unsanctioned third accent at the shell level (color-language details belong to the color dimension; the shell split is the navigational-trust issue).
- suggestion: Decide whether technician-cyan is a sanctioned sub-brand; either way migrate the admin mobile header branch to North Star tokens so one product has one chrome per role, not per breakpoint.

### [P4/LOCAL] Sales hub asymmetry: lists at /sales?tab=, details at legacy /estimates/[id] and /invoices/[id]
- category: route-architecture | effort: HIGH
- evidence: nav-items.ts:151-159 (isSalesHubPath), :175-187 and :450-460 special-case /estimates/ and /invoices/ prefixes so the Sales nav item stays active; detail routes keep their own layouts with @modal interception slots (app/(admin)/estimates/layout.tsx, @modal/(.)[estimateId], default.tsx present). Team and Customers hubs have the same tab scheme but keep details under their own prefix (/team/[membershipId], /customers/[customerId]).
- why: Handled correctly today, but every helper that maps path→nav item must remember the exception, and URLs users share (/estimates/abc123) name a route whose list no longer exists. It is the one place the 'one id drives route + label' law is bent.
- suggestion: Accept as documented debt; if the Sales panel is ever revisited, move details to /sales/estimates/[id] with tombstones, matching the customers/team pattern. Not worth doing standalone.

## Inventory
## Route inventory (from app/**, 2026-08-28)

### Shells
| Shell | File | Used by | Structure |
|---|---|---|---|
| AdminShell | shared/components/admin/AdminShell.tsx (mounted by app/(admin)/layout.tsx) | all (admin) routes | Desktop: SidebarNav (grouped, North Star tokens) + Header (greeting/date, calendar icon, dead Search btn, bell, company switcher, owner view-switcher, billing badge, avatar, sign out) + scrollable main. Mobile: Header w/ QuickNavToggle → AdminQuickNavDrawer (grouped) + horizontal MobileNav rail (flat order; hidden on "/" where AdminMobileHome launcher takes over) + PullToRefresh + PwaInstallBanner + floating BetaBugReportButton (hidden on mobile dashboard & mobile settings). Supports Design Lab live theme CSS vars (SSR inline). |
| TechnicianMobileShell | shared/components/technician/TechnicianMobileShell.tsx (mounted by BOTH app/technician/layout.tsx AND app/tech/layout.tsx — duplicated wiring, hideDemoPrefixes only in technician/) | /technician/*, /tech/* | Sticky header (QuickNavToggle, logo, company switcher, owner view-switcher, notification link, sign out) + TechnicianBottomNav (cyan accent) + TechnicianQuickNavDrawer + connectivity banner + PullToRefresh. |
| SettingsShell + SettingsNavigation | shared/components/settings/ (mounted by app/(admin)/settings/layout.tsx inside AdminShell) | /settings/* | Sub-nav tabs: Overview(/settings), Company, Billing, Users (+ System Check reachable from Overview). Layout gates canAccessCompanySettings. |
| PlatformAdminSubNav | app/(admin)/platform/layout.tsx (requirePlatformAdmin) | /platform/* | Tabs: Overview(/platform), Design Lab(/platform/design-lab), Bug reports(/platform/bugs). |
| Marketing layout | app/(marketing)/layout.tsx | pricing/privacy/terms/welcome | Font wrapper only; pages use HomepageNav / MarketingFooter (Privacy+Terms links) / LegalPageShell. |
| Auth layout | app/(auth)/layout.tsx | login/signup/forgot/reset | passthrough (children only). |
| Concept layout | app/(concept)/layout.tsx | 4 retired routes | admin auth gates, no shell; all children now redirect('/'). |
| Root layout | app/layout.tsx | token pages, /setup, /install, /activate-subscription | bare document; branded app/not-found.tsx, app/error.tsx, app/global-error.tsx. |

### (admin) routes — 55 pages
| Route | Status | Notes |
|---|---|---|
| / ((home)) | LIVE | Admin dashboard (OperationalDashboardView; mobile = AdminMobileHome launcher). Redirects technician-role users → /technician. |
| /dispatch | LIVE | Day board; sanctioned dark exception. In nav (Work group). |
| /schedule | LIVE | Week/month calendar; NOT in nav — header calendar icon only. Filtered at nav-items.ts:326. |
| /work, /work/[jobId] | LIVE | Canonical jobs hub + detail. Nav "Work". |
| /jobs, /jobs/[jobId] | REDIRECT → /work, /work/[id] (params preserved) | |
| /customers, /customers/[customerId], /customers/import | LIVE | Hub tabs: Customers/Lead Pipeline/Archived (?tab=). |
| /leads | REDIRECT → /customers?tab=pipeline | |
| /team, /team/[membershipId] | LIVE | Hub tabs: Technicians/Time Clock (?tab=). |
| /technicians | REDIRECT → /team (Technicians tab) | |
| /time-clock | REDIRECT → /team?tab=time-clock | |
| /time | REDIRECT → /payroll | |
| /payroll | LIVE | Nav "Payroll" (Money group). |
| /sales | LIVE | Hub tabs: Estimates/Invoices/Payments (?tab=). |
| /estimates, /invoices, /payments (lists) | REDIRECT → /sales tabs | Detail routes remain live below. |
| /estimates/[estimateId] (+ @modal intercept) | LIVE | Full page + overlay presentation; @modal/default.tsx present. |
| /invoices/[invoiceId], /invoices/[invoiceId]/edit (+ @modal intercept) | LIVE | |
| /price-book | LIVE | Nav (Work group). |
| /expenses | LIVE | Nav (Money group). |
| /reports, /reports/tax-summary | LIVE | Report Surface system. Tax summary linked from Reports. |
| /marketing | LIVE, INTERNAL | Founder-only: gated isPlatformAdmin && dispatchJobs at access-control layer (access-control.ts:478-495). |
| /marketing/hq | LIVE, INTERNAL | requirePlatformAdmin. Linked from marketing surfaces. |
| /community | LIVE | Nav "Community" (Relationships). |
| /network | REDIRECT → /community | |
| /settings + /settings/{company,billing,users,system-check} | LIVE | Sub-nav: Overview/Company/Billing/Users. system-check gated separately. |
| /settings/{team,preferences,notifications,documents,integrations,subscription,payments} | REDIRECT | → users, company#preferences, /settings, company#documents, company#connections, billing, billing#customer-payments. Stripe return params preserved on billing ones. |
| /alpha-tracker | LIVE, INTERNAL, ORPHANED from nav | Gated isPlatformAdmin && manageCompany; nav entry deliberately removed (nav-items.ts:111-114). |
| /platform, /platform/design-lab, /platform/bugs | LIVE, INTERNAL | Platform-admin only; "Platform" nav item server-gated (Company group). |
| /altair-design-lab | 404 (notFound) | Disabled: documented pre-existing Field crash; real tool is /platform/design-lab. |
| /dashboard-north-star-v1, -v2, /command-center-v1, /workspace-v1 | REDIRECT → / | Retired experiments; originals archived in docs/design-archive/*.bak. |

### (concept) — 4 routes, all REDIRECT → /
altair-shell-color-lab-v1, altair-shell-north-star-v1/-v2/-v3 (auth-gated shell-less layout; archived .bak files).

### (auth) — 4 LIVE
/login, /signup, /forgot-password, /reset-password (loading.tsx on login/signup).

### (marketing) — 4 LIVE
/welcome (logged-out homepage; middleware rewrites "/" → /welcome for anonymous, page redirects authed users → "/"), /pricing, /privacy, /terms (linked via MarketingFooter).

### Root-level — 5 LIVE
/setup (company creation + pending invites; post-auth funnel), /activate-subscription (SaaS billing checkout), /install (PWA install instructions, linked from PwaInstallBanner), /estimate-approval/[token], /invoice-payment/[token] (public token documents, own branded document shell, no app chrome).

### technician + tech — current experience spans BOTH trees
| Route | Status | Notes |
|---|---|---|
| /technician | LIVE | Technician home (DB-backed). Bottom-nav "Home". |
| /technician/schedule | LIVE | Linked only from TechnicianHomeScreen (not in bottom nav). |
| /tech | REDIRECT → /technician | Old mock root neutralized. |
| /tech/time, /tech/receipts, /tech/notifications | LIVE, DB-backed | In current bottom nav as Time/Receipts/Alerts — NOT legacy despite directory. |
| /tech/demo | DEV-ONLY (notFound in prod) | Mock dashboard for tooling. |
| /tech/jobs, /tech/profile | DECLARED, DISABLED, NO ROUTE | nav-items.ts entries enabled:false; directories don't exist. |

### API routes — 17
Cron: billing-maintenance, marketing-ai, marketing-insights, workflow-reminders (secret-gated). Webhooks: billing, payments. Agent bridge: decisions, draft-posts, media, snapshot. Dev-only: founder-screenshot-capture, monitoring-check, video-demo-data. Other: demo/fingerprint, marketing/media/ingest, marketing/connected-accounts/facebook/callback, auth/callback.

### Admin navigation structure (source: shared/components/admin/nav-items.ts + lib/database/access-control.ts)
- 14 declared items; 13 rendered (Schedule filtered out); + "Platform" appended for platform admins. Permission keys equal routes; filtering via getAccessibleAdminNavHrefs → canAccessAdminNavItem. ALPHA_HIDDEN lists currently empty (lib/beta/alpha-hardening.ts:14-19) — nothing alpha-hidden.
- Desktop sidebar groups (ADMIN_NAV_GROUP_DEFINITIONS:205-236): Command[Dashboard, Reports] · Work[Work, Dispatch, Team, Price Book] · Sales[Sales] · Money[Expenses, Payroll] · Relationships[Customers, Marketing, Community] · Company[Settings, Platform].
- Mobile rail flat order (:279-293): Dashboard, Work, Dispatch, Team, Customers, Sales, Expenses, Reports, Marketing, Price Book, Payroll, Community, Settings. Drawer uses the grouped order instead (two orderings coexist).
- Permission gates: Dispatch/Schedule/Work → canAccessOperationalJobsArea; Team → manageTeamMembers||viewCompanyTimeEntries; Customers → canManageCustomers; Marketing → isPlatformAdmin&&dispatchJobs; Sales/Price Book → canViewBilling; Expenses → everyone; Payroll → viewCompanyTimeEntries; Community → dispatch||manageCompany||manageBilling||manageCustomers; Reports → canViewOperationalReports; Settings → manageCompany; Alpha-tracker → isPlatformAdmin&&manageCompany; fallback shows "Limited workspace access" note when ≤2 items.
- Active-state law: /payroll claims /time*, /team claims /team/*, /sales claims /estimates|/invoices|/payments incl. detail prefixes (nav-items.ts:151-190).

### Role routing
shouldUseTechnicianHome (lib/auth/redirects.ts:101-120): owner/admin/dispatcher/office_staff → admin "/"; technician role → /technician; permission-shaped fallback (viewAssignedJobs && no admin perms) → /technician. Enforced at app/(admin)/layout.tsx:35, (home)/page.tsx:18, (concept)/layout.tsx, and post-login via resolvePostLoginRedirect with sanitizeNextPath open-redirect protection. Owner view-switcher (useOwnerViewMode) lets owners flip into the technician shell; admin nav hides during technician view (should-hide-admin-navigation.ts).

### Boundary coverage
43 loading.tsx (all hubs, details, modals, auth, tech). error.tsx at root, global-error, (admin) root, (home), settings, customer/job details, tech, technician. not-found.tsx: branded root + customer/job/estimate/invoice details. No visible page-title in desktop header (greeting instead); pages self-title; mobile keeps sr-only title for orientation.

### Dead/unused shell code
shared/components/admin/DesktopNav.tsx (unreferenced) + DESKTOP_ADMIN_NAV_WORKFLOW_ORDER + getOrderedAdminNavItemsForDesktop + 3 @deprecated exports in nav-items.ts.
