# ab6588f49c486dbab

## Summary
This dimension is in unusually good shape for a codebase this size — the data layer shows deliberate, documented performance work (server-side pagination at 50/100 rows everywhere via lib/database/queries/pagination.ts, tab-conditional loading with in-code payload history like "11 MB → 3.4 MB", React cache() memoization across auth/context/queries, 43 route-level loading.tsx skeletons with aria-busy, 300ms-debounced server search, useDeferredValue, and 113 components using useTransition/useActionState for pending feedback). Dependencies are lean: the only heavy libraries are mapbox-gl and react-qr-code, both correctly behind next/dynamic; there is no chart lib, animation lib, date lib, or lodash, and the 400-file lucide-react barrel imports are covered by Next's default optimizePackageImports. The real gaps are architectural, not accidental: zero Suspense streaming inside admin pages (each hub renders all-or-nothing after multi-stage awaits), a serial ~7-8-round-trip auth/context/billing chain in app/(admin)/layout.tsx that taxes every cold load, and a systemic "one giant 'use client' PageView per hub" convention (2,207-line worst case) that makes whole pages hydrate and re-render as single units. Remaining findings are polish: a deliberately delayed LCP hero on the marketing homepage, a few infinite paint-property animations, a 500ms artificial delay before router.refresh after job mutations, and the dual revalidatePath + router.refresh idiom. Nothing rises to P0/P1; the two P2 systemic items (streaming and the layout waterfall) are where fixes buy perceived speed on every screen at once.

## Findings

### [P2/SYSTEMIC] No Suspense streaming inside admin pages — every page is all-or-nothing behind loading.tsx
- category: perceived-speed | effort: MEDIUM
- evidence: grep for Suspense across app/ and shared/: only 8 files, all auth (app/(auth)/login/page.tsx, app/(auth)/signup/page.tsx, shared/components/auth/*, shared/components/settings/PendingInvitesCard.tsx). Zero <Suspense> in app/(admin) pages or their views. Pages stack stages: app/(admin)/sales/page.tsx:123 awaits getDocumentQueueMetrics before the 12-way Promise.all at line 152, then awaits listInvoiceDocumentRefsForEstimates (line 221) and a second Promise.all (line 229) — 4 sequential stages. app/(admin)/work/page.tsx awaits listJobsPage, then a 5-way Promise.all, then listJobBillingSummariesForJobs (line ~96), then getCustomerById — 4 stages. lib/database/services/dashboard.ts also has sequential stages at lines 417, 553, 592, 759, 830.
- why: Time-to-content on every major page equals the sum of its sequential stages plus the max of each Promise.all — the slowest aggregate (billing summaries, queue metrics) gates content the user needs first (the list itself). The loading.tsx skeletons are good, but the user stares at them for the full duration; streaming the list shell first and suspending billing/queue extras would make every hub feel materially faster with no data-layer change.
- suggestion: Highest-leverage single change for perceived speed: on Work and Sales hubs, render the paged list from stage-1 data and wrap stage-2+ consumers (billing summaries, document refs, review queue) in <Suspense> with the existing skeleton components. The service layer is already decomposed enough to do this per-section.

### [P2/SYSTEMIC] Admin layout runs a serial 4-stage auth/context/billing chain (~7-8 sequential DB round trips) before any admin page can render
- category: ttfb-waterfall | effort: MEDIUM
- evidence: app/(admin)/layout.tsx:21-53: await getCurrentUser() → await getActiveCompanyContext() → await getUserCompanies() → await requireCompanyBillingAppAccess() → Promise.all(notifications, unreadCount, liveTheme). getActiveCompanyContext itself is ~5 sequential queries (lib/database/company-context.ts:108-259: createClient/auth.getUser, profile select, getUserCompanies, membership row, company row, plus an optional heal write at line 164). React cache() (lib/database/auth.ts:16, company-context.ts:71,104) correctly dedupes page-level re-calls, but the chain itself is serial. app/technician/layout.tsx:21 parallelizes only the last pair.
- why: This is the fixed tax on every cold load, hard refresh, and first visit — nothing in the shell (nav, notifications) or the page slot streams until roughly 7-8 dependent Supabase round trips complete. On a non-edge region that is easily 300-800ms of pure waterfall before the route's own loading.tsx even appears.
- suggestion: Inside getActiveCompanyContext, fetch profile + memberships concurrently after auth.getUser; kick off requireCompanyBillingAppAccess and the notifications Promise.all concurrently with getUserCompanies (they only need company.id). Alternatively move notifications/unread-count into a Suspense-wrapped shell region so the layout returns after the context chain.

### [P2/SYSTEMIC] Giant single-file 'use client' page monoliths (2,200+ lines) hydrate as one unit; 380 of 749 shared components are client
- category: bundle-hydration | effort: HIGH
- evidence: wc -l on 'use client' files: shared/components/reports/OfficeReviewQueueSection.tsx 2,207 lines (mounted eagerly at shared/components/reports/OperationalReportsSections.tsx:337 on Reports); marketing-hq/MarketingAiHqPageView.tsx 1,831; marketing-hub/MarketingPostDraftForm.tsx 1,808; jobs/JobsPageView.tsx 1,282 ('use client' line 1, 19 useState hooks); invoices/InvoicesPageView.tsx 1,273; estimates/EstimatesPageView.tsx 1,166. Full top-15 in inventory. 380/749 .tsx files under shared/components contain 'use client' (grep -l count). Every admin page.tsx is a Server Component (0 matches for 'use client' in app/**/page.tsx) but each immediately renders one of these client monoliths, so effectively the whole visible page hydrates.
- why: Each hub ships a single large client chunk that must parse/hydrate before any interaction; a monolith also means every state change re-renders the whole page tree (JobsPageView's 19 useStates live at the top). This is simultaneously the audit's consistency risk: 2,000-line files are where token/system drift hides.
- suggestion: The pattern to change is the '<Domain>PageView owns everything' convention. Split the read-only list/table rows into Server Components streamed from the page, keeping only the filter bar, selection state, and sheets as client islands. Start with OfficeReviewQueueSection (Reports) and JobsPageView (Work) as the two worst offenders.

### [P3/LOCAL] Marketing homepage LCP hero is deliberately hidden ~520ms then faded 780ms
- category: lcp | effort: LOW
- evidence: app/globals.css:729-760: .ah-hero-fade { opacity: 0; animation: ah-hero-fade 0.78s ... both } with .ah-hero-fade-6 { animation-delay: 520ms }. Applied to the hero product screenshot at shared/components/homepage/HomepageHero.tsx:85-96, which is the next/image with priority + sizes (HomepageProductFrame). prefers-reduced-motion correctly restores opacity (globals.css:779-784).
- why: An element at opacity:0 does not paint, so the LCP timestamp on the page most sensitive to first impressions is pushed out by the stagger delay plus part of the fade — roughly 0.5-1.0s of self-inflicted LCP on top of image load. The choreography is polished, but it charges its cost to the headline metric and to the visitor's first read of the product.
- suggestion: Keep the stagger for text tiers but start the product frame at a low non-zero opacity (e.g. 0.01 is enough for paint, or fade from 0.4) and drop its delay to <=200ms; or gate the entrance on image onLoad so the fade never adds to network time.

### [P3/LOCAL] Continuous repaint animations: 16s infinite background-position sweep and a height-animating keyframe
- category: animation-jank | effort: LOW
- evidence: app/globals.css:804-828 .mc-silver-sweep animates background-position over 16s infinite (paint-only property, never composited — continuous rasterization while on screen); globals.css:927-937 @keyframes mc-spine-rail-vertical animates height (layout property) alongside transform; globals.css:434,507,547 auth-metric-pulse 3s infinite, login-command-sheen 9s infinite, login-control-loop-signal 8s infinite on the login screen. All other keyframe families (mc-hero-stage, mc-fade-up, ah-hero-fade) are transform/opacity only — good. All have prefers-reduced-motion overrides (globals.css:698-706, 946-954).
- why: Infinite paint-property animations keep the compositor thread busy for the page's entire lifetime — measurable battery/CPU cost on the marketing homepage and login screen (the login one runs while the user types credentials on low-end phones). The height keyframe forces layout each frame while the spine draws.
- suggestion: Rebuild mc-silver-sweep as a translated pseudo-element gradient (transform, compositable); drop the height half of mc-spine-rail-vertical (scaleY alone with transform-origin achieves the draw); consider pausing infinite loops when the section leaves the viewport (animation-play-state via IntersectionObserver class).

### [P3/LOCAL] Job status updates wait an artificial 500ms before refreshing the route
- category: interaction-latency | effort: LOW
- evidence: shared/components/jobs/JobWorkflowActions.tsx:205: window.setTimeout(() => router.refresh(), 500) after a successful status action; the action itself already calls revalidatePath('/work', '/dispatch', `/work/${jobId}`, ...) (app/actions/jobs.ts:102-105).
- why: The user's screen intentionally shows pre-mutation data for an extra half second after the server has confirmed the change. Combined with revalidatePath already invalidating the cache, the delayed client refresh is a second round trip whose only effect is to make the app feel 500ms slower than it is.
- suggestion: Call router.refresh() immediately (React 19 transitions keep the success toast stable across the refresh), or drop the client refresh entirely where the action's revalidatePath + returned job object already drive the visible state.

### [P3/SYSTEMIC] Dual refresh idiom: 54 client components call router.refresh() on top of server-action revalidatePath
- category: interaction-latency | effort: MEDIUM
- evidence: grep -l router.refresh shared/components/**/*.tsx → 54 files; 43 of 75 app/actions/*.ts modules call revalidatePath (spot-checked app/actions/jobs.ts:73-105, customers.ts:59-63, invoices.ts:205-238 — all revalidate every affected route). Examples of the doubled pattern: JobWorkflowActions.tsx:205, mobile/PullToRefresh.tsx:104 (legitimate), plus post-mutation refreshes across estimates/invoices/settings views.
- why: When an action revalidates and the client also refreshes, the RSC payload for the route is computed twice per mutation — the user pays one extra full server render per click, which on the hub pages means re-running the multi-stage Promise.all documented above. It also blurs which mechanism owns freshness, so future actions may omit revalidatePath believing the client refresh covers it.
- suggestion: Pick one owner per flow: server actions revalidate (current convention, correct), client calls router.refresh() only for flows with no action (pull-to-refresh, realtime). A lint note in the actions guide would prevent regression.

### [P4/SYSTEMIC] Signed-URL user imagery bypasses next/image with no remotePatterns configured; sizing discipline is good so CLS risk is low
- category: images | effort: MEDIUM
- evidence: 20 raw <img> occurrences (grep '<img' app shared) vs next/image in 7 files. next.config.ts images config sets only qualities: [70,75,90] — no remotePatterns, so Supabase-storage URLs cannot go through the optimizer anyway. Sampled containers are aspect-ratio-locked: CustomerRecentPhotosSection.tsx:40 (aspect-square wrapper), JobAttachmentCard.tsx:25 (aspect-[4/3]), BillingSignatureBlock.tsx:111 (max-h constrained). AvatarUploadControl.tsx:95 relies on CSS class sizing only.
- why: Full-resolution camera photos (receipts, job photos) are downloaded at original size into 144px-wide cards — wasted mobile bandwidth on the technician-facing screens where connectivity is worst. Layout shift is already handled by the aspect wrappers, so this is bandwidth polish, not CLS.
- suggestion: Either add the Supabase storage host to images.remotePatterns and migrate the photo grids to next/image with fill + sizes, or (cheaper) request Supabase storage image transformations (width param on the signed URL) for thumbnails.

### [P3/LOCAL] Reports page mounts the 2,207-line review queue eagerly regardless of whether the section is used
- category: bundle-hydration | effort: LOW
- evidence: shared/components/reports/OperationalReportsSections.tsx:26 imports OfficeReviewQueueSection statically and renders it at line 337; OfficeReviewQueueSection.tsx is 2,207 lines, 'use client' (line 1). No next/dynamic. The repo already uses next/dynamic successfully for DispatchMap (shared/components/dispatch/DispatchMapPanel.tsx:13-14) and QRCode (invoices/InvoicePaymentCollectionCard.tsx:19), so the pattern exists.
- why: Reports is the roadmap's known-unfinished page, but this specific cost — the single largest client file in the codebase parsed and hydrated on every Reports visit — will survive the visual redesign unless the loading strategy changes with it.
- suggestion: next/dynamic the review queue with its skeleton as fallback, or split it server/client during the planned Reports redesign.

### [P4/LOCAL] 40MB of marketing screenshots ship in public/, including multiple versioned duplicates
- category: assets | effort: LOW
- evidence: du -sh public/marketing/screenshots → 40M. Referenced files are reasonable (mission-control-hero.png 436K, served via next/image with priority/sizes at HomepageProductFrame); the bulk is unreferenced variants (reports-feature-card.png + -v3, reports-workspace-facebook-card-v2, leads-feature-card + -v3, comparison/ shots) kept from the capture tooling.
- why: Runtime is unaffected (next/image optimizes what is referenced), but every deployment uploads and hosts 40MB of stale variants, and anyone auditing images has to distinguish live assets from capture-script residue.
- suggestion: Move capture-script output out of public/ (scripts already know their output dir) or prune unreferenced variants; keep only the screenshots homepage-tokens.ts and SeeAltairInActionSection.tsx actually reference.

### [P4/LOCAL] Legacy /jobs, /estimates, /invoices routes cost a full server round trip just to redirect
- category: perceived-speed | effort: LOW
- evidence: app/(admin)/jobs/page.tsx:12-15 and app/(admin)/estimates/page.tsx:13-18 are await-searchParams-then-redirect() pages into /work and /sales. Any stale bookmark, notification link, or in-app reference to the old paths pays layout resolution (the serial chain in finding 2) plus a redirect before the real page starts loading.
- why: Small, but it stacks on the layout waterfall: a user opening a bookmarked /jobs link waits through the full admin-layout chain twice conceptually (redirect + destination). Middleware or next.config redirects() would skip the RSC render entirely.
- suggestion: Move these param-preserving redirects to next.config redirects() (or the request boundary) so they resolve before the App Router renders a layout.

## Inventory
## Top 15 largest 'use client' components (wc -l)

| Lines | File | Route it loads on |
|---|---|---|
| 2,207 | shared/components/reports/OfficeReviewQueueSection.tsx | /reports (eager, static import) |
| 1,831 | shared/components/marketing-hq/MarketingAiHqPageView.tsx | /marketing/hq |
| 1,808 | shared/components/marketing-hub/MarketingPostDraftForm.tsx | /marketing |
| 1,389 | shared/components/network/north-star-m11/NetworkNorthStarView.tsx | /network (north-star) |
| 1,282 | shared/components/jobs/JobsPageView.tsx | /work (19 useState at top level) |
| 1,273 | shared/components/invoices/InvoicesPageView.tsx | /sales |
| 1,166 | shared/components/estimates/EstimatesPageView.tsx | /sales |
| 1,161 | shared/components/network/NetworkReferralsPageView.tsx | /network |
| 897 | shared/components/customers/CustomerImportPageView.tsx | /customers/import |
| 853 | shared/components/jobs/JobWorkflowDocumentHost.tsx | /work/[jobId] |
| 839 | shared/components/technician/TechnicianJobCommandCenter.tsx | /technician |
| 822 | shared/components/team/north-star-m12/TeamMemberProfileNorthStarView.tsx | /team |
| 758 | shared/components/settings/TeamMembersTable.tsx | /settings/users |
| 753 | shared/components/customers/CustomersPageView.tsx | /customers |
| 733 | shared/components/marketing-hub/MarketingHubPageView.tsx | /marketing |

Client/server split: 0 of the ~30 app/(admin) page.tsx files (and 0 anywhere in app/**/page.tsx) are client components; 380 of 749 shared/components .tsx files contain "use client". Total client-file line count ≈ 91,470.

## Heavy-import map

| Dependency | Where imported | Loading strategy |
|---|---|---|
| mapbox-gl (+CSS) | shared/components/dispatch/DispatchMap.tsx:4-5 only | next/dynamic via DispatchMapPanel.tsx:13-14, geocode via server action on mount, AsyncSection loading contract — correct |
| react-qr-code | shared/components/invoices/InvoicePaymentCollectionCard.tsx:19 | next/dynamic — correct |
| lucide-react | 400 files import from "lucide-react" barrel | Next 16 default optimizePackageImports covers it |
| chart libs / framer-motion / date libs / lodash / moment | none in package.json or source | n/a |
| Server-only heavies (openai, stripe, twilio, @sentry/nextjs) | lib/* only | not in client bundles |

## Data-fetching audit (server pages)
- Promise.all present in 20 app/(admin) pages + layout + technician layout/pages + query layer (chunked-in, dashboard, reports, invoices, jobs, customers-page...).
- React cache(): lib/database/auth.ts:16,30; company-context.ts:71,104; 15+ list queries (listEstimates, listInvoices, listJobs, notifications, workflow-reminders...).
- Sequential stages remain in: app/(admin)/layout.tsx:21-53 (4 stages); sales/page.tsx:123→152→221→229; work/page.tsx (listJobsPage → Promise.all → billing summaries → getCustomerById); lib/database/services/dashboard.ts:417,553,592,759,830.
- Suspense: only in (auth) pages; none in admin. loading.tsx: 43 total, every admin route covered, all content-shaped skeletons (AdminShellContentLoadingState + per-route north-star skeletons), aria-busy set.
- Pagination: DEFAULT_PAGE_SIZE 50 / MAX_PAGE_SIZE 100 (lib/database/queries/pagination.ts:45,52); CUSTOMER_OPTION_LIMIT 25; SEARCH_CANDIDATE_LIMIT 500; CUSTOMER_MATCH_CAP 200; listDeletedJobs unbounded but retention-window-bounded (jobs.ts:1038-1049, documented). No virtualization library — acceptable at 50-row pages.

## Images & fonts
- <img>: 20 occurrences, all signed-URL user content (receipts, job photos, signatures, avatars, logos); sampled wrappers are aspect-locked (aspect-square, aspect-[4/3]) → low CLS. next/image in 7 files (homepage hero with priority + sizes at HomepageHero.tsx:90-96; SeeAltairInActionSection). next.config.ts images: only qualities [70,75,90]; no remotePatterns.
- Fonts: next/font/google — Geist + Geist_Mono (app/layout.tsx:8-14), Instrument_Serif ((marketing)/layout.tsx:1); self-hosted at build, CSP notes confirm; fallback stacks defined in globals.css:303,725. No FOUT/CLS concern.

## Animation inventory (app/globals.css)
- 20 @keyframes total. Transform/opacity-only (safe): mc-hero-stage, mc-hero-deck-rise, mc-fade-up, ah-hero-fade, auth-panel-enter, auth-hero-enter, auth-tier-enter, mc-spine-rail (scaleX).
- Paint/layout offenders: mc-silver-sweep (background-position, 16s infinite, :804-828), mc-spine-rail-vertical (height, :927-937), auth-metric-pulse 3s infinite (:434), login-command-sheen 9s infinite (:507), login-control-loop-signal 8s infinite (:547).
- prefers-reduced-motion blocks at :294, :698-706, :779-789, :946-954 cover all families. backdrop-blur usage: ~20 files, 1-3 uses each — sticky bars/drawers only, no overuse.
- transition-all: 42 occurrences across 26 files (minor; prefer transition-colors/transform).

## Client-side timers / refresh
- JobsTodayCardList.tsx:81-87 — 60s interval clock tick re-rendering day list (benign).
- JobWorkflowActions.tsx:205 — setTimeout(router.refresh, 500) after mutation (finding).
- FounderScreenshotCaptureControl — polling, dev-only. HomepageRealitySection:79 — marketing interval.
- router.refresh() in 54 components; PullToRefresh.tsx:104 legitimate.
- revalidatePath in 43/75 app/actions modules; spot-checks (jobs.ts:73-105, customers.ts:59-63, invoices.ts:205-238) revalidate all affected routes including detail paths.
- Intercepted @modal routes for estimates/invoices detail (with own loading.tsx) give fast in-context document opens — good pattern worth noting as a strength.
