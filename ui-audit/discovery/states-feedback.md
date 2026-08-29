# a4aabb4e8c0cfd24a

## Summary
State coverage is a genuine strength of this codebase: 43 loading.tsx files give every production admin route a layout-matching skeleton (a real parameterized skeleton system — MasterListPageLoadingState/MasterDetailPageLoadingState plus per-panel LoadingState components with north-star variants, not spinners), the global error trio (app/error.tsx, an unusually well-reasoned app/global-error.tsx, app/not-found.tsx) is excellent, pending states are near-universal (108 files with useTransition, a Button primitive with loading/aria-busy), empty states distinguish no-data from no-results with permission-aware copy, destructive flows go through a full archive/trash/restore lifecycle rather than hard deletes, and there are zero alert() calls. The weaknesses are architectural rather than page-level: there is no toast/feedback primitive anywhere, so success/error surfacing is hand-rolled in ~36 components and many lifecycle mutations succeed silently; confirmation is split between the branded AltairConfirmDialog (3 consumers) and window.confirm (18 call sites, including bulk permanent customer deletion); and the de facto feedback banner (SettingsAlertBanner, 25 files) is invisible to screen readers. The two public customer-facing token routes — the surfaces where a tenant's homeowner pays an invoice — are the least-covered routes in the app (no loading, no scoped error, fallback CTA to an internal login). Fixing four shared primitives (feedback primitive, confirm-dialog migration, banner aria-live, address-join helper) resolves the large majority of findings.

## Findings

### [P2/SYSTEMIC] No toast/notification primitive — success and error feedback is hand-rolled per component, and many mutations succeed silently
- category: feedback-architecture | effort: HIGH
- evidence: Zero matches for toast/Toast/sonner/react-hot-toast in package.json, app/, and shared/. Instead: 36 files roll their own setSuccess/successMessage state (e.g. shared/components/invoices/InvoiceStatusActions.tsx, shared/components/settings/CompanyProfileForm.tsx lines 69-79), 25 files use SettingsAlertBanner, CustomersPageView.tsx:204-221 hand-rolls bulkActionMessage/bulkActionTone/bulkActionFailureDetails. Single-entity lifecycle actions complete with NO explicit confirmation: shared/components/customers/CustomerLifecycleControl.tsx:73-81 — archive success is just router.refresh(); same pattern in JobLifecycleControl, ServiceItemLifecycleControl.
- why: Every new surface reinvents feedback plumbing, producing four coexisting patterns (inline banner, tone-state banner, silent refresh, redirect). Users get no positive confirmation on archive/trash/restore, and consistency erodes as panels multiply. One shared feedback primitive (banner-or-toast) is the highest-leverage fix in this dimension.
- suggestion: Introduce one design-system feedback primitive (an AltairActionFeedback banner or lightweight toast region with success/warning/error tones + aria-live) and migrate the 36 hand-rolled sites; make lifecycle success explicitly confirmed.

### [P2/SYSTEMIC] Two confirmation systems: AltairConfirmDialog (3 consumers) vs window.confirm (18 call sites) — native browser dialog guards the most destructive flows
- category: destructive-actions | effort: MEDIUM
- evidence: AltairConfirmDialog (shared/design-system/dialog/AltairConfirmDialog.tsx) is used by only ExpenseLifecycleControl.tsx, InvoiceLifecycleControl.tsx, DesignLabSavedThemesPanel.tsx. window.confirm has 18 call sites in 12 files: CustomerLifecycleControl.tsx:63,107,156; CustomersBulkActionBar.tsx:65,83,101 (incl. bulk PERMANENT delete of customers); EstimateBatchSelectionBar.tsx:52; InvoiceBatchSelectionBar.tsx:52; JobLifecycleControl.tsx:58; JobsBulkActionBar.tsx:66; LeadDetailPanel.tsx:239; lifecycle/EntityLifecycleBulkBar.tsx:115,271,298 (shared bulk bar for estimates/invoices/expenses/service-items); MarketingPostDraftForm.tsx:792,905; ServiceItemLifecycleControl.tsx:87. Sibling inconsistency: InvoiceLifecycleControl uses the branded dialog while CustomerLifecycleControl/JobLifecycleControl use window.confirm for identical operations.
- why: window.confirm is unstyled, blocks the main thread, cannot show consequence details or a danger-toned button, is inconsistent with the brand on the exact moments (permanent delete) that most need trust, and cannot be keyboard/AT-tuned. Two systems for one job violates the project's own single-primitive rule.
- suggestion: Migrate all 18 window.confirm sites to AltairConfirmDialog; the shared EntityLifecycleBulkBar alone converts 4 panels at once.

### [P2/SYSTEMIC] Shared feedback banners have no aria-live/role — dynamically-appearing errors and successes are silent to screen readers
- category: a11y-feedback | effort: LOW
- evidence: shared/components/settings/SettingsAlertBanner.tsx (used in 25 files, including invoice/estimate send-email success and error banners via InvoiceStatusActions.tsx:215-230) renders a plain div with no role="alert"/aria-live. Contrast: shared/components/auth/AuthShell.tsx:460 AuthMessage correctly sets role="alert". App-wide there are 61 role="alert", 34 role="status", 53 aria-live occurrences — so the pattern is known but the most-reused banner lacks it. (Side note: SettingsAlertBanner north-star variant also hardcodes hex values, lines 35-49.)
- why: Action results (send failed, payment recorded, invoice voided) appear only visually; AT users get no announcement after submitting, which is a trust and usability failure on billing flows.
- suggestion: Add role/aria-live to SettingsAlertBanner (error=alert, success/info=status); this fixes 25 surfaces in one edit.

### [P2/LOCAL] Public customer-facing token routes have no loading or scoped error boundary; the fallback error screen sends homeowners to the internal login
- category: state-coverage | effort: LOW
- evidence: app/estimate-approval/[token]/ and app/invoice-payment/[token]/ each contain only page.tsx (verified by ls) — no loading.tsx, error.tsx, or not-found.tsx anywhere above them except the root. Pages do handle invalid/expired tokens well (invoice-payment page.tsx:51-80). But an unexpected server error falls to app/error.tsx:46-51 whose CTA is "Back to dashboard" linking to "/" — which for an anonymous homeowner redirects to the tenant's SaaS login. No loading boundary means a blank browser tab while the server fetches, on the page where the tenant's customer pays money.
- why: These are the only two screens a tenant's own customers ever see; a blank load and an error screen pointing to a login they don't have damages the tenant's brand, not just Altair's.
- suggestion: Add loading.tsx and a scoped error.tsx for both token routes with customer-appropriate copy ("contact the company that sent this link") and no dashboard link.

### [P3/LOCAL] team/[membershipId] notFound() ejects users to the global 404 outside the admin shell
- category: state-coverage | effort: LOW
- evidence: app/(admin)/team/[membershipId]/page.tsx:18,33 calls notFound(), but the nearest not-found.tsx is the global app/not-found.tsx — there is no not-found.tsx in the route dir and none at the (admin) level. All five other detail routes (customers/[customerId], jobs/[jobId], work/[jobId], estimates/[estimateId], invoices/[invoiceId]) have scoped not-found.tsx files.
- why: A stale team-member link drops the office user out of the navigation shell onto a bare 404, inconsistent with every sibling detail route.
- suggestion: Add app/(admin)/team/[membershipId]/not-found.tsx (or an (admin)-level not-found.tsx to backstop all admin routes).

### [P3/LOCAL] Two admin loading states deviate from the skeleton standard (spinner / generic pulse blocks)
- category: loading-consistency | effort: LOW
- evidence: app/(admin)/marketing/hq/loading.tsx renders a centered animate-spin border spinner; app/(admin)/platform/bugs/loading.tsx renders generic h-24 animate-pulse cards. Every other admin route (41 of 43 loading.tsx files) uses layout-matching skeletons: per-panel *LoadingState components with north-star variants, or MasterListPageLoadingState / MasterDetailPageLoadingState (shared/design-system/shell/), which mirror header, summary strip, filter toolbar, and row structure.
- why: The skeleton system is one of the strongest parts of the product; the two outliers produce a visibly different loading language on those panels.
- suggestion: Replace both with MasterListPageLoadingState or a panel-specific skeleton.

### [P3/SYSTEMIC] pre-wrap user text without break-words lets unbroken strings (URLs, long tokens) overflow cards
- category: long-content | effort: LOW
- evidence: 14 whitespace-pre-wrap render sites lack break-words/break-all: shared/components/customers/CustomerDetailTabs.tsx:447 (customer notes — user-generated), auth/SignUpForm.tsx:96 (invite personal message — written by another user), leads/LeadActivityTimeline.tsx:102, invoices/InvoiceMessageAiAssistant.tsx:188, jobs/CompletionNotesAiAssistant.tsx:223, jobs/JobSummaryAiAssistant.tsx:246, marketing-hq/MarketingAiHqPageView.tsx:973,981,1267,1277, marketing-hub generators (2 files). Otherwise truncation discipline is good: 186 component files use truncate/line-clamp, and table primitives bake it in (customers/customer-list-presentation.ts:59-60).
- why: A pasted URL in a customer note or invite message forces horizontal overflow of the card/panel, breaking the layout the surface hierarchy depends on.
- suggestion: Add break-words wherever whitespace-pre-wrap renders user or AI text; consider a shared UserTextBlock class.

### [P3/SYSTEMIC] Literal "{city}, {state}" joins render orphaned commas when address fields are empty
- category: empty-rendering | effort: LOW
- evidence: 6 sites join address parts with hardcoded commas: shared/components/customers/CustomersTable.tsx:190, customers/CustomerJobsSection.tsx:152, customers/north-star-m3b/CustomerDetailNorthStarHero.tsx:127, jobs/JobDetailPageView.tsx:206, jobs/JobWorkflowDocumentHost.tsx:139 (renders into customer-facing workflow documents), jobs/north-star-m4b/JobDetailSideRailDispatchCard.tsx:52.
- why: A customer or job saved without city/state shows ", " or "City, " — dishonest-looking blanks in tables, the job detail, and printable documents, versus the em-dash placeholder discipline used elsewhere (CustomersTable.tsx:181).
- suggestion: Add a formatCityStateZip helper in shared/types or shared/lib that filters empty parts, and use it at all 6 sites.

### [P4/LOCAL] Remove-from-network fires immediately with no confirmation
- category: destructive-actions | effort: LOW
- evidence: removeFromMyNetworkAction is invoked directly in the click transition with no confirm step: shared/components/network/north-star-m11/NetworkNorthStarView.tsx:489-501 and shared/components/network/NetworkReferralsPageView.tsx:391-403. The action is reversible (addToMyNetworkAction exists), which caps severity.
- why: One-click removal of a partner is the only destructive-flavored mutation found with no confirmation at all; inconsistent with every lifecycle flow.
- suggestion: Either keep it (reversible) but add an undo affordance in feedback, or route through AltairConfirmDialog like other removals.

### [P4/LOCAL] Auxiliary auth/billing routes lack loading boundaries
- category: state-coverage | effort: LOW
- evidence: No loading.tsx (and no covering parent boundary — app root has none) for: app/(auth)/forgot-password/, app/(auth)/reset-password/, app/activate-subscription/, app/install/, and the four (marketing) pages (pricing, welcome, privacy, terms). login and signup do have loading.tsx (AuthPageSkeleton).
- why: Minor — these pages are light — but forgot/reset password are anxiety-prone flows where a blank tab during server render reads as breakage.
- suggestion: Add an (auth)/loading.tsx group boundary reusing AuthPageSkeleton; one file covers both password routes.

## Inventory
## Boundary coverage map (page.tsx routes vs loading/error/not-found)

Global: app/error.tsx YES · app/global-error.tsx YES (inline-styled, digest-only, deliberate) · app/not-found.tsx YES. Root app/ has NO loading.tsx.

Totals from glob: 80 page.tsx · 43 loading.tsx · 9 error.tsx · 6 not-found.tsx.

| Route | loading | error | not-found | Notes |
|---|---|---|---|---|
| (admin)/ group boundary | YES (AdminShellContentLoadingState) | YES (RouteErrorView, in-shell) | no | Backstops all admin routes |
| (admin)/(home) dashboard | YES (3-variant skeleton) | YES | — | |
| customers | YES | group | — | |
| customers/[customerId] | YES | YES | YES | Full trio |
| customers/import | parent | group | — | |
| jobs / work | YES both | group | — | |
| jobs/[jobId] / work/[jobId] | YES | YES | YES | Full trio both |
| estimates · [estimateId] · @modal | YES all 3 | group | [estimateId] YES | |
| invoices · [invoiceId] · @modal · [invoiceId]/edit | YES / YES / YES / parent | group | [invoiceId] YES | edit covered by parent boundaries |
| payments, expenses, price-book, dispatch, leads, technicians, sales, team, time, time-clock, payroll, schedule, network, community, marketing | YES each | group | — | |
| marketing/hq | YES — SPINNER outlier | group | — | |
| platform · platform/bugs | YES / YES — generic pulse outlier | group | — | |
| reports · reports/tax-summary | YES both | group | — | |
| settings (+10 subpages) | settings-level YES; subpages rely on it | settings-level YES | — | |
| team/[membershipId] | YES | group | **NO** (calls notFound() at page.tsx:18,33 → global 404, exits shell) | |
| alpha-tracker, altair-design-lab, *-v1/v2 concept pages | parent only | group | — | exploration artifacts |
| (auth)/login, signup | YES | app/error | — | AuthPageSkeleton |
| (auth)/forgot-password, reset-password | **NO** | app/error | — | |
| setup | YES | app/error | — | |
| activate-subscription, install | **NO** | app/error | — | |
| estimate-approval/[token] (PUBLIC) | **NO** | **app/error fallback — dashboard CTA wrong for homeowner** | — | invalid/expired handled in-page (page.tsx:50-79) |
| invoice-payment/[token] (PUBLIC) | **NO** | **same** | — | same (page.tsx:51-80) |
| (marketing) pricing/welcome/privacy/terms | NO | app/error | — | low stakes |
| tech (legacy) + subroutes | YES root; notifications own | YES | — | |
| technician + schedule | YES root | YES | — | |

## Loading-state quality
- shared/design-system/shell/MasterListPageLoadingState.tsx, MasterDetailPageLoadingState.tsx, MasterBillingDetailOverlayLoadingState.tsx: parameterized structural skeletons (summary cards, view tabs, filter toolbar, row variants) using .admin-skeleton class — mirror MasterListPageLayout exactly.
- Per-panel LoadingState components in shared/components/{customers,jobs,estimates,invoices,expenses,leads,reports,settings,time-clock,network,dispatch,service-items,platform-admin,technician,dashboard}/ — most with legacy + north-star variants switched by isNorthStarShellEnabled.
- Outliers: marketing/hq (spinner), platform/bugs (pulse blocks), team + technicians loading.tsx (inline pulse divs but still structural).

## Mutation feedback
- useTransition: 108 files. useFormStatus: 0. useActionState: 5 (auth forms, with AuthSubmitButton pending + role="alert" AuthMessage).
- Pending discipline verified in samples: CompanyProfileForm (all inputs disabled, aria-busy, Button loading), CustomersBulkActionBar (isBusy props), TeamMembersTable (pendingMembershipId), InvoiceStatusActions (workflowBusy).
- Button primitive (shared/design-system/components/Button.tsx): loading prop → Loader2 spinner, aria-busy, blocks activation.- Toast system: NONE (0 matches in package.json/app/shared). Success feedback = 36 files with local setSuccess state + 25 SettingsAlertBanner consumers + silent router.refresh() in lifecycle controls + redirect-on-create (CustomersPageView.tsx:539 pushes to new detail).
- alert() calls: 0.

## Destructive-action inventory (app/actions/)
61 destructive-flavored exported actions across 15 modules; full lifecycle pattern (archive/moveToTrash/restore/restoreFromTrash/permanentlyDelete) for customers, jobs, estimates, invoices, expenses, service-items, plus bulk variants; voidInvoice/voidEstimate; cancelJob; deleteMarketingPost; removeFromMyNetwork; cancelTeamInvite; company-deletion (cancel).
Confirmation split: AltairConfirmDialog — ExpenseLifecycleControl, InvoiceLifecycleControl, DesignLabSavedThemesPanel. window.confirm — 18 sites/12 files (listed in finding). Custom two-step inline confirm — TeamMembersTable (confirmingAction), InvoiceStatusActions void (showVoidConfirm). Unconfirmed — removeFromMyNetworkAction (2 sites, reversible).

## Error display pattern
Uniform {error?: string} action results → formatActionError() → inline setError near control, or SettingsAlertBanner / bulk-tone banner (CustomersPageView tone: success|warning|error with per-row failure details, partial-failure selection retained — lines 352-386). No silent error swallowing found in samples. a11y: 61 role="alert" / 34 role="status" / 53 aria-live overall, but SettingsAlertBanner has none.

## Empty states
shared/design-system/components/EmptyState.tsx (toned, action buttons) + per-panel variants (CustomersEmptyState, JobsEmptyState, DispatchEmptyState, TeamMembersEmptyState…). 52 files with empty-state markers. Distinguishes no-data vs no-results (CustomersEmptyState variant prop) and permission-aware copy ("Customers will appear here once someone on your team adds them"). Detail tabs honest: CustomerDetailTabs TabEmpty at lines 319, 369, 409, 451, 475, 528, 601; JobDetailPageView "No description provided."/"No notes on file." (326-333).

## Long content
truncate/line-clamp in 186 component files; table primitives carry truncate in presentation tokens (customer-list-presentation.ts:59-60). Gaps: 14 whitespace-pre-wrap sites without break-words; 6 literal "{city}, {state}" joins that render orphaned commas on blank data.
