# Altair OS — Deep UI/UX Audit — Final Report

**Date:** 2026-08-28 · **Method:** 8-pass audit — 9 parallel code-discovery agents (routes/shells, tokens/theme, hardcoded values, component duplication, states/feedback, accessibility, responsive, copy, perf-as-UI) + hands-on walkthrough of the running app at 1440/1024/390px with ~180 screenshots (fold, full, expanded-scroll, interactive states, print emulation, technician view-mode) in `ui-audit/SCREENSHOTS/`. Per-dimension detail in `ui-audit/discovery/*.md`. Raw findings log in `ui-audit/FINDINGS.md`.

**Scope notes.** Findings already known to the project (roadmap panels, feature-gaps.md) were excluded. One correction to the project's own records: **the "Shift Time hardcoded to zero" bug listed in feature-gaps.md appears fixed** — Reports now shows real shift hours (22.8h, 1 open shift, long-running-shift alert). Also `/marketing`, `/platform`, `/alpha-tracker` showed "Access restricted" for the founder account in this local environment (platform-admin detection not configured locally) — audited from code only.

---

## 1. Executive assessment

**Overall UI maturity: 6 / 10.** Altair has genuinely strong bones — a documented token system, a real shell/layout tier, honest data discipline, excellent skeletons, and a distinctive brand direction — but it is visibly three products stitched together: a premium dark-brass marketing/login world, an olive-and-tan admin world, and a residue of an older cool-slate/cyan world that bleeds through on every screen. The gap between "technically functional" and "feels finished" is concentrated in a small number of shared causes, not spread across 40 pages.

| Dimension | Score | Rationale |
|---|---|---|
| Visual polish | 5.5 | MC v2 pages are clean, but flagship pages ship visible collisions (hub header title overpainting its subtitle at 1440 and 1024), warm-vs-cool gray mixing inside single table cells, and off-palette blue/cyan accents on nearly every screen. |
| Design consistency | 4 | Four token generations, ~10 live visual systems, 712 `northStar ?` dual-skin ternaries, three primary-button looks on billing pages, four empty-state families, four stat-strip styles across four hubs. |
| Information hierarchy | 6 | Page bones are good (stat strips, glance counts, honest empty states), but the least urgent state (blue "Scheduled" pills) is the loudest color on the Jobs table, a red "Past due" flood fills a whole column, and Job Detail stacks two near-identical pill rows (workflow status vs content tabs). |
| Navigation | 6.5 | Grouped sidebar + hub IA with param-preserving redirect tombstones is genuinely good. Schedule is hidden behind an unlabeled 20px icon, mobile shows two different orderings of 13 destinations, and "Work vs Jobs" naming fights itself on one screen. |
| Desktop UX | 7 | Lists, filters, forms, and detail pages work well; import wizard is excellent. Dead Search button in the header, no success feedback, and native browser confirm/validation pull it down. |
| Mobile UX | 5 | Real card lists, a handsome dark launcher home, pull-to-refresh. But the owner top bar renders icons on top of text, the Today job card loses its title entirely, leading stat pills clip off-screen (`justify-end`), header/nav scroll away, bulk operations don't exist, and owner "View as Technician" has a 75%-dead bottom nav. |
| Accessibility | 5.5 | Outstanding overlay/dialog and button primitives; then two token-level contrast failures (muted text 2.74:1 on dark report/dispatch cards; 3.7–4.4:1 on light non-white surfaces at 10–11px), unlabeled money-entry grids, keyboard-unreachable rows in two tables, and no popover keyboard support. |
| Interaction quality | 5.5 | Pending states near-universal (108 files, aria-busy Button). But destructive actions use `window.confirm` (18 sites incl. bulk permanent delete), archive/restore succeed silently, validation is the browser's native bubble, and a 500ms artificial delay slows job status updates. |
| Perceived quality | 5 | The seams read as unfinished: marketing promises black-and-brass, the app opens olive-and-tan; cyan notification cards in the header of every page; navy total chip vs graphite chrome; "1 estimates"; dead date "Trial ends Aug 13" shown on Aug 28. |
| Brand distinctiveness | 6.5 | The identity that exists (gear wordmark, brass on near-black, "operating system" motif, serif display, bespoke illustrations) is genuinely distinctive — worth an 8–9. It just isn't applied to the product's main surface. |
| Design-system maturity | 5 | Foundation docs and primitives are top-decile for a codebase this size; adoption is ~⅓ and enforcement is zero (the "never hardcode a hex" rule is violated 1,364 times in shared components, 316 times inside the design system itself). |
| Production readiness (UI) | 6 | No data-loss-class UI bugs found; but whole-dollar rounding on the public Pay Now amount, the stale trial pill, and the broken mobile owner top bar are trust-level defects that should block "paid customers" positioning until fixed. |

---

## 2. What is already good (preserve these)

1. **The token foundation's design** — 27 semantic roles with ink-on-paper vs theme-flipping ink distinction, AA-calibrated status pairs, `:where()` zero-specificity primitives, documented architecture. The design of the system is not the problem; adoption is.
2. **The overlay family** — AltairDialog / MobileSheet / MobileSideDrawer share `useDialogFocusTrap`, refcounted scroll lock, Escape handling, auto title/description wiring, bottom-sheet→modal morphing. Dependency-free and better than many component libraries.
3. **The Button primitive** — inert disabled links, aria-busy loading, per-variant focus rings with a contrast rationale, motion-reduce. (Adoption, again, is the gap.)
4. **The skeleton system** — 43 layout-matching `loading.tsx` skeletons that mirror header/filter/row structure; only 2 outliers.
5. **Honest-data discipline** — em-dash empties, "No reviews yet", "not a CLV model", real time-clock categories instead of invented ones. This is a durable trust asset; it survived the audit intact.
6. **Hub IA + redirect tombstones** — param-preserving redirects with archival comments; role routing centralized; permission-filtered nav from one source.
7. **The archive → trash → restore lifecycle** — no hard deletes in normal flows; bulk variants; recoverability designed in.
8. **The brand ingredients** — gear wordmark, brass-on-near-black, Instrument Serif display, the control-loop diagram, the caught-up illustration, the mobile launcher home. The login left panel and Reports page are the visual north star the rest should converge on.
9. **The customer import wizard** — stepper, duplicate policy stated up front, per-source export guidance, honest limits. Best-in-app UX writing.
10. **Perf fundamentals** — server pagination everywhere, React cache(), lean dependencies (no chart/animation/date libs), dynamic imports for mapbox/QR, next/font. No jank-by-design.
11. **The technician app's offline copy** ("You're offline. Your entries are still here…") and sticky-chrome mobile shell pattern.
12. **Print/PDF groundwork** — letter @page, chrome hiding, monochrome neutralization (one navy chip escapes it — see findings).

---

## 3. Top 10 highest-impact problems (ranked)

1. **Money renders rounded where money changes hands (P1).** The one shared `formatCurrency` uses `maximumFractionDigits: 0` across 380 call sites — including invoice line items, totals, billing emails, and the public **Pay Now** amount. A customer clicks Pay Now on "$1,235" and is charged $1,234.56; rounded line items visibly fail to sum. `shared/types/customer.ts:171`.
2. **The brand schism.** Marketing, login, the mobile launcher, and Reports speak black/graphite + brass. The desktop admin speaks olive chrome + tan canvas + white plates. The legacy cool-slate/cyan generation bleeds through both (notification dropdown, org tree, technician accents, counts, eyebrows, checkboxes). Three products in one session; the premium one is not the one users live in.
3. **The North Star fork + token debt is the cost multiplier.** 712 `northStar ?` ternaries keep two complete skins alive in 160 files; `north-star/tokens.ts` is a 928-line hex-only second token layer feeding 107 files; globals.css is a 5,136-line override engine with 382 `!important` repainting Tailwind classes; slate utilities outnumber semantic tokens ~3:1. Every fix below costs ~2× until this is retired.
4. **The hub header primitive breaks on flagship pages.** `MasterPageHeader` (compact + center slot): the `shrink-0` title overpaints its own subtitle and the center strip clips — visible on Work at 1440 ("Work" over "…wh…"), Work and Customers at 1024, Sales' tabs ("Estimate Pipe…" cut mid-word at default desktop width). One primitive, every hub, always on screen.
5. **Muted-text contrast fails at the token level.** `--altair-ink-muted` #64748B measures 2.74:1 on the dark report/dispatch cards (9–10px labels!) and 3.7–4.4:1 on every non-white light surface, across 345 uses; brass small-text is 3.7–4.0:1 despite an "AA-safe" comment. Two one-line token fixes repair hundreds of sites.
6. **Mobile owner chrome is broken and mobile capability is second-class.** Top bar paints a calendar glyph over "Owner / Admin" and badges over icons; Today's job card renders without job title or customer; leading stat pills clip off-screen (`justify-end`); header + nav rail scroll away (technician shell keeps its chrome); bulk operations don't exist below 768px; owner "View as Technician" bottom nav bounces 3 of 4 tabs back to Home.
7. **The 768–1100px dead zone.** Fixed 232px sidebar + card→table swap at md + 720–1040px table min-widths ⇒ every ledger horizontally pans through the entire tablet band; mobile card lists vanish exactly where space is tightest.
8. **Confirmation/feedback architecture is missing.** No toast/feedback primitive (36 hand-rolled patterns; archive/restore succeed silently); `window.confirm` guards 18 destructive sites including bulk permanent customer delete while invoices get the branded dialog; core forms rely on native browser validation bubbles; SettingsAlertBanner (25 surfaces) is silent to screen readers.
9. **Status color language is broken in practice.** "Scheduled" renders as loud blue pills (the least urgent state, loudest color on the Jobs table) beside a full column of red "Past due" dates; invoice "sent"=blue vs estimate "sent"=amber; leads speak sky/violet/indigo; dispatch/schedule use blue dots and blue selection; three badge systems (StatusPill / a verbatim-copied styles file / raw palette).
10. **Dead chrome and stale states leak distrust.** A Search button that does nothing on every page (aria-labeled, announced to screen readers); "Trial ends Aug 13, 2026" shown 15 days after Aug 13; "Settings → Team" instructions for a tab renamed to Users (6 sites); every tab titled "Altair OS"; "1 estimates"; "1 item need attention".

---

## 4. Systemic findings (shared-cause)

| ID | Sev | Finding | Cause / leverage point |
|---|---|---|---|
| S-1 | P1 | Two complete visual skins per component (712 ternaries / 160 files); dead slate branch still ships | `NEXT_PUBLIC_NORTH_STAR_SHELL` flag — flip default, delete losing branch |
| S-2 | P1 | Second hex-only token layer feeds 107 files; theming/Design Lab can't reach it | `shared/design-system/north-star/tokens.ts` — re-back ~40 hexes with `var(--…)`; zero call-site edits |
| S-3 | P1 | globals.css override engine: 382 !important, selectors targeting escaped Tailwind classes, spacing utilities rewritten inside forms; unpatched ivory classes already leak (37 occurrences) | Freeze layer; migrate scopes to tokens; density via CSS vars not class overrides |
| S-4 | P1 | Failed chrome retune: retired blue-black #1A2029/#273140 survives in ~40 sites (mobile form overlays, dispatch CTAs, detail heroes, estimate/invoice total chips) against the new neutral graphite; globals comment falsely claims completion | Sweep literals → graphite vars; fix comments |
| S-5 | P1 | Muted/brass contrast token failures (345 + 52 uses) | Darken `--altair-ink-muted`; add graphite-anchored muted role; brass-text companion token |
| S-6 | P1 | Double-render institutionalized: 215 hidden/shown pairs; detail-panel primitive renders children ×2; 11 ledgers ship table+cards; whole dashboard doubled; forms with duplicate required inputs / duplicate `name` | `DesktopConditionalDetailPanel`, ledger pattern, `OperationalDashboardView`; render-once strategy + lint guard |
| S-7 | P1 | Nested `<a>` in PaymentsMobileCardList (card-Link wrapping CustomerNameLink) → hydration failure discards server tree on Sales hub — on desktop too, via S-6 | `PaymentsMobileCardList.tsx:33-80` |
| S-8 | P2 | MasterPageHeader title/center collision + clipping (Work 1440/1024, Customers 1024, Sales tabs) | Rework compact header: title row + strip row, or allow wrap with min title width |
| S-9 | P2 | Primary CTA identity forked: DS graphite vs slate-900 vs emerald-600 vs brass gradient (Expenses) vs navy (Customers/Work) — per-page primary color | Route 10 billing/action files through `buttonClassName`; decide brass-vs-graphite primary once |
| S-10 | P2 | Status/badge system forked 3 ways; semantic drift ("sent" differs by document type) | StatusPill as single source; lead palette → semantic tones |
| S-11 | P2 | Feedback architecture absent (no toast; silent lifecycle success; banner not aria-live) | One AltairActionFeedback primitive; aria-live in SettingsAlertBanner (1 edit → 25 surfaces) |
| S-12 | P2 | window.confirm vs AltairConfirmDialog split (18 vs 3) | Port lifecycle/bulk-bar family; EntityLifecycleBulkBar converts 4 panels at once |
| S-13 | P2 | No popover primitive: bell/company switcher/view switcher lack Escape/arrows/focus management | Build AltairPopover on existing hooks |
| S-14 | P2 | Micro-type has no scale: text-[10px] ×659, text-[11px] ×507, ≤9px ×60; eyebrow hand-rolled 362× with 12 trackings | Named eyebrow/meta/micro utilities, defined in mc-surface first |
| S-15 | P2 | Sibling copy-paste families: 11 StatStrips (935 lines), 10 SearchFilterBars, 6 MobileCardLists, 12 EmptyStates, 35 local Skeletons | Extract GlanceStatStrip, ListSearchFilterBar, MobileCardList scaffold, EmptyState adapters, one Skeleton |
| S-16 | P2 | Tablet dead zone 768–1100px (sidebar fixed + md swap + min-w tables) | lg swap for wide ledgers, or md icon-rail sidebar, or column demotion |
| S-17 | P2 | AltairTable has no mobile contract; uncovered tables pan on phones (Service Items, Time entries, analytics, report queues) | Add card-projection/column-priority contract to the table primitive |
| S-18 | P2 | Copy generations: 138 Title Case vs 633 sentence; 194 "Failed to X." vs 311 "We couldn't…"; Trash/Recently Deleted/In trash; Quote/Estimate; Approved/Accepted; Work/Jobs; cancelled/canceled; "…" vs "..." | Vocabulary table + mechanical sweeps; formatActionError template fallback |
| S-19 | P2 | Zero per-route metadata — every tab "Altair OS" (admin, technician, public invoice/estimate) | Title template + per-segment metadata; generateMetadata on details |
| S-20 | P2 | Third dark mobile register in 4 files (private hex ramp + decorative cyan/emerald/amber gradient tiles); admin mobile header still legacy light/cyan; technician shell cyan accent | Bless-and-tokenize the dark launcher ramp; migrate mobile header to NS tokens; decide technician accent |
| S-21 | P2 | Brass is 20 unmanaged golds + `rgba(138,99,36,α)` ×300+ arbitrary borders/rings | Brass ramp tokens + 3 border/ring vars |
| S-22 | P2 | Perceived speed: zero admin Suspense streaming; serial 7–8-round-trip layout chain; 2,207-line client monoliths; 500ms artificial refresh delay; dual revalidate+refresh | Stream list-first on Work/Sales; parallelize context chain; split PageViews; delete the setTimeout |
| S-23 | P2 | prefers-color-scheme leftover flips `--foreground` near-white while body stays light (invisible inherited text for dark-OS users); [data-theme=dark] fully defined but unreachable | Delete the block; decide dark-mode roadmap explicitly |
| S-24 | P3 | Chart color language split: brass sparklines vs sky-blue Revenue Trend vs hex categorical ramp disconnected from icon tints | `--chart-*` tokens consumed via var() |
| S-25 | P3 | No enforcement of any color/type rule (0 lint rules); Tailwind v4 scans all non-ignored files — any doc with a malformed class-shaped string breaks dev AND build (reproduced during this audit) | ESLint ratchet + explicit `@source` config |
| S-26 | P3 | z-index folklore (z-[70] ceiling documented only in a comment); dead DesktopNav + deprecated nav exports; 40MB stale marketing screenshots in public/ | Layer scale in shell tokens; deletion pass |

## 5. Page / feature findings (local)

| ID | Sev | Where | Finding |
|---|---|---|---|
| L-1 | P1 | Mobile owner top bar | Calendar glyph painted over "Owner / Admin"; badge over nav icon; (dev-only camera over trial pill). Legacy light/cyan header branch. |
| L-2 | P1 | Work Today (mobile) | Job card renders with no job title/customer — title block collapses to a sliver in the JobsTodayCardList + JobScheduleRow flex composition. |
| L-3 | P1 | Owner "View as Technician" | /tech/time, /tech/receipts, /tech/notifications all redirect back to /technician → bottom nav 75% dead for the exact persona the switcher serves (drift between duplicated tech layouts). |
| L-4 | P1 | Admin header (all pages ≥640px) | Dead Search button — focusable, labeled, does nothing. Remove or wire. |
| L-5 | P2 | Billing banner | "Trial ends Aug 13, 2026" shown after that date; resolver stays TRIAL with past trialEndsAt and UI has no "ended" guard. |
| L-6 | P2 | Estimate/invoice documents + print | Total lives in a retired-navy chip; on print it becomes a near-black box with dark, barely legible text — the only grand total on the printed document. Empty dashed logo placeholder also prints. |
| L-7 | P2 | Jobs table (All view) | Blue "Scheduled" pill column = loudest element; entire SCHEDULED column red "Past due" on stale-scheduled rows — alarm fatigue; "Past due" wording collides with invoice vocabulary. |
| L-8 | P2 | Job detail | 10-stage workflow bar styled identically to the content tab row directly beneath it — status reads as navigation; two pill rows stacked. |
| L-9 | P2 | Customers list | NEXT column duplicates LAST SERVICE ("Last service Jul 13, 2026" under a NEXT header); STATUS column 100% "Active" pills on the filtered view. |
| L-10 | P2 | Sales hub | 4th tab clips mid-word ("Estimate Pipe…") at 1440; bulk select is "Check all" (brass) here vs "Select all" (cyan) on Customers/Work/Price Book; "1 estimates" pluralization. |
| L-11 | P2 | Mobile list pages | Stat strips `justify-end` → leading pills (the non-zero ones) clipped off-screen (Customers, Sales); page title sr-only on mobile so band shows only a truncated subtitle. |
| L-12 | P2 | Notifications dropdown | Cyan card family (legacy accent) in the global header; no Escape/keyboard support; 36px trigger. |
| L-13 | P2 | Settings → Users | Org tree entirely in legacy cyan; "1 item need attention" grammar; color-dot-only status on Overview cards; blue dots for trial state. |
| L-14 | P2 | Public token pages | No loading.tsx/error.tsx; error fallback CTA "Back to dashboard" sends a homeowner to the tenant login. |
| L-15 | P2 | Line-item editors (invoice/estimate) | Visible labels not associated (no htmlFor/id) — money fields announce as "edit text, blank"; native validation bubbles on New Customer. |
| L-16 | P3 | Dispatch | Pre-7AM axis labels overlap into a jumble; 9px lane metadata on dark; blue selection border + blue pin in a brass system. |
| L-17 | P3 | Customer 360 | Lifecycle buttons misaligned (full-width Edit vs right-floating Archive vs different-width Move to Trash); "Opportunities" label duplicated (section + card eyebrow). |
| L-18 | P3 | Schedule | Single dark week strip (report-surface leak) floating in an empty tan canvas; blue "Scheduled" dots; known-unstarted panel — fold into redesign with Dispatch pairing. |
| L-19 | P3 | /install | Raw PWA debug JSON rendered to all visitors. |
| L-20 | P3 | Auth family | login (dark/brass) vs signup+forgot (cream/navy) — two generations; fabricated stats on signup rail; /welcome embeds an outdated product screenshot. |
| L-21 | P3 | Community | Sixth tab style, cream stat tiles, nested dark frame — another one-off register; "INVITES IN 0 / 2 pending out" contradiction. |
| L-22 | P3 | Job detail (real data) | Unformatted phone (7075902564); address join renders "5, Hill AFB" orphan comma; greeting targets vary (company on desktop, first name on mobile, none on technician). |
| L-23 | P3 | Price Book | 19 of 21 items "Missing cost" gray pills + all-identical Taxable/Status columns; lowercase table headers unlike sibling ledgers; row-click only (no keyboard path). |
| L-24 | P4 | Dashboard | "Needs attention" grid leaves an unbalanced empty cell; icon chips read categorical (cheerful green $ on a past-due item) rather than semantic; collapsed accordions hide all content behind tiny counts. |

## 6. Design-system findings

Covered in S-1…S-5, S-9, S-10, S-14, S-15, S-21, S-24, S-25. Key numbers: 27 semantic roles (all consumed, ~1,963 utility uses) vs 6,468 raw palette utilities and ~950 active-surface hex literals whose top values ARE the token values retyped (#4F4638 ×149 = ink-secondary, #17130E ×110 = ink, #64748B ×58 = ink-muted). `altairToken()` has one real consumer. Radius: 2 tokens vs 13 arbitrary values (then zeroed by shell override); shadows 3 vs 261; type scale absent. Field/Input components have exactly 1 consumer while their class layer is broadly adopted under two names. The mission-control-v2 folder and report-surface are hex-free — proof the system works where used.

## 7. Responsive / mobile findings

S-6, S-16, S-17, L-1, L-2, L-11 + `useMobileViewport` SSR snapshot hardcodes mobile=true (desktop first paint runs mobile branches); duplicate/one-sided data-testids across variant pairs; dead mobile view components with a pre-armed duplication bug (PageSummaryStrip northStar branch missing sm:hidden); admin phone chrome scrolls away while technician shell demonstrates the sticky pattern; bulk operations desktop-only.

## 8. Accessibility findings

S-5 (contrast tokens), S-13 (popovers), L-15 (labels), plus: ServiceItemsTable/TimeEntriesTable `<tr onClick>` with zero keyboard path (complete blockers); AltairDialogClose 32px on mobile (primitive-level); NotificationBell 36px; TechnicianHomeScreen tiles `outline-none` with no focus replacement; dashboard has no h1; `<th>` never carries scope (one-line primitive fix); AdminPendingLabel not announced (role=status, one primitive fix); SettingsAlertBanner no aria-live (one edit, 25 surfaces). Strengths worth protecting: universal aria-labels on icon buttons (0 violations found), aria-current on all nav families, reduced-motion coverage on all 20 keyframes, dispatch board fully keyboard-operable with text-paired status dots.

## 9. UX findings

S-11, S-12, S-18, S-19, L-4, L-5, L-8, L-9 + Schedule discoverability (unlabeled icon; no Dispatch→Schedule link back); mobile nav dual ordering; "Select all/Check all" naming+color drift; 500ms artificial latency on job status updates; native validation on flagship forms; stale "Settings → Team" instructions (6 sites); estimate approval flow strong (public pages' copy is good — they just need boundaries).

## 10. Visual polish findings

Warm/cool gray interleaving within single cells (email warm brown, phone cool slate, stacked); navy-vs-graphite double dark; 20 brass variants; blue accents (trial pill, links, counts, checkboxes, "Summarize with AI", Revenue Trend, dispatch selection, schedule dots, teal org tree) throughout a brass product; hub band colors differ by group (olive vs near-black); segmented controls wrap/clip ("Lead Pipeline", "All Jobs 50", "Estimate Pipe…"); dispatch axis crush; two-canvas seam on mobile; empty dashed logo box on customer documents.

## 11. Perceived-premium findings

What blocks "expensive": (1) the identity split — users cross three worlds in one session; (2) chrome that lies or breaks (dead search, stale trial date, colliding headers, overlapping mobile icons); (3) micro-inconsistency mass (casing, pills, primary buttons, stat strips, ellipses) that reads as many hands, no editor; (4) silence after actions (no toasts) and OS-native dialogs at the highest-trust moments; (5) cool-slate residue muddying the warm palette. What already feels expensive: login, Reports, the mobile launcher, the caught-up illustration, the import wizard, honest empty states, skeletons.

## 12. Quick wins (disproportionate value, low effort)

1. `formatCurrencyExact` (cents) + sweep billing components/emails/public pages — the single highest trust fix.
2. Darken `--altair-ink-muted` (→ ~#556070) — one line, 345 sites; add graphite-anchored muted (→ #aeb6c2) in report-surface + dispatch-presentation — two files, both flagship dark pages.
3. Delete the dead Search button (10-line diff).
4. Trial banner: "Trial ends" → "Trial ended {date}" guard (and fix the resolver later).
5. Stat strips: `justify-end` → `justify-start` on mobile (unclips the meaningful pills).
6. `scope="col"` default in AltairTableHead; `role="status"` in AdminPendingLabel; aria-live in SettingsAlertBanner — three one-line primitive edits with app-wide reach.
7. Title metadata template `%s · Altair OS` + per-segment titles.
8. Copy sweep #1: "1 estimates", "1 item need attention", Settings→Team ×6, Select all/Check all unify, "…" codemod.
9. Print fix: force the estimate/invoice total chip to white/ink in @media print (the only total on the document).
10. Delete the create-next-app `prefers-color-scheme` block.
11. Remove the 500ms setTimeout before router.refresh in JobWorkflowActions.
12. `formatCityStateZip` + phone formatter at the 6 comma-join sites and customer contact renders.
13. /install: remove the debug JSON block.
14. Point remaining internal links at canonical hubs (skip redirect hops).

## 13. High-leverage components (redesign these first)

1. **MasterPageHeader** — every hub, every width; fixes collisions + clipping at the source.
2. **north-star/tokens.ts re-backing onto CSS vars** — 107 files inherit theming with zero call-site edits.
3. **A GlanceStatStrip primitive** — collapses 11 copies, fixes mobile clipping and per-hub drift at once.
4. **AltairTable mobile contract** — ends per-domain card-list heroics and the double-render for 11 ledgers.
5. **Button adoption on billing CTAs (10 files)** — retires two of three primary languages on the highest-trust screens.
6. **AltairConfirmDialog everywhere + AltairActionFeedback (new)** — the interaction-trust pair.
7. **AltairPopover (new, on existing hooks)** — header dropdowns get keyboard + Escape.
8. **StatusPill as the single tone source** — deletes the copied styles file and the lead palette fork.
9. **DS EmptyState adapters + single Skeleton export** — first-impression surfaces for every new tenant.
10. **DesktopConditionalDetailPanel render-once** — kills the worst double-render class (forms with duplicate inputs).

## 14. Things NOT to change

Everything in §2, plus: the hub-with-tabs IA and its redirect tombstones; the em-dash and "[Demo]" prefix conventions; the estimate/invoice document layout (fix the chip, keep the document); the dispatch fixed-width time-block honesty rule; the mobile launcher concept (tokenize it, don't kill it); the Reports information architecture; JobsPageView's "Today vs All" split; the beta feedback button concept (unify its variants); the existing print stylesheet approach.

## 15. Recommended redesign sequence

**Phase 0 — Stop the bleed (days).** §12 quick wins. No design decisions required.

**Phase 1 — The brand decision (one decision, then mechanical).** Decide the single visual north star. Recommendation: converge the admin toward the **dark-graphite + brass identity** that login, marketing, the mobile launcher, and Reports already share — it is the distinctive asset, already proven on 4 surfaces, and matches what customers are promised before they sign in. (The olive/tan MC v2 look can survive as the light *paper* register within that world — paper cards on graphite chrome — which is nearly what exists; the decision is about killing the third and fourth registers, not rebuilding pages.) Whatever the choice: write it down as the single source, and declare cyan/blue dead outside semantic "information".

**Phase 2 — Token consolidation (the enabler).** Re-back north-star/tokens.ts with vars → brass ramp + border/ring alpha tokens → slate→ink codemod (top 10 hotspot files first) → type scale (eyebrow/meta/micro) → radius/shadow mapping → delete cyan tokens and the #1A2029 family → ESLint ratchet + `@source` config so it never regrows.

**Phase 3 — Retire the northStar fork.** Flip default, delete losing branches family-by-family (~50% cost reduction for everything after).

**Phase 4 — Shell & chrome.** MasterPageHeader rework; mobile top bar rebuild on NS tokens; sticky mobile header + rail; md sidebar icon-rail (or lg table swap); dashboard h1; notification/company/view popover primitive.

**Phase 5 — Primitive completion.** Feedback/toast; confirm migration; table mobile contract; GlanceStatStrip; ListSearchFilterBar; EmptyState adapters; Skeleton export; render-once detail panel; z-scale.

**Phase 6 — Screen passes on new primitives.** Sales/Work/Customers/Team consistency; Jobs status-color rebalance (Scheduled→neutral, reserve red for genuinely late); Job Detail workflow-vs-tabs separation; dispatch axis + 10px floor; Reports tiering (already planned); Schedule+Time Clock+Settings panels (14–16) built on the consolidated system — not before it.

**Phase 7 — Mobile product pass.** Bulk selection on card lists; Today card fix; launcher iconography onto tokens; technician tree merge (/tech/* → /technician) fixing the view-as bounce; PWA polish.

**Phase 8 — Copy pass + guardrails.** Vocabulary table (Estimate/Approved/Overdue/Recently Deleted/Team); sentence-case sweep; error-voice template in formatActionError; metadata titles; then the lint/CI guards (hex ban, double-render grep, contrast check) so the system holds.

## 16. Prioritized findings table

See §4 (S-1…S-26) and §5 (L-1…L-24) — each row carries severity, scope, cause, and direction. Effort: S-1/S-3 HIGH; S-2/S-4/S-5/S-8/S-11/S-12/S-13/S-15 MEDIUM; most L-rows LOW-MEDIUM. Full per-dimension evidence with file:line references in `ui-audit/discovery/*.md`.

## 17. If we only fix 10 things

1. Cents-exact currency on all billing/payment surfaces.
2. The two muted-contrast token fixes (light + graphite).
3. MasterPageHeader collision/clipping rework.
4. Mobile owner top bar rebuild.
5. AltairConfirmDialog + feedback primitive replacing window.confirm and silent successes.
6. Kill cyan: notifications dropdown, org tree, technician accent → brass/ink system.
7. Status-color rebalance on Jobs/Dispatch/Schedule (Scheduled ≠ blue shout; Past-due flood).
8. Dead search + stale trial pill + top-5 copy fixes (Trash naming, 1 estimates, Settings→Team, tab titles, Work/Jobs).
9. Sticky mobile chrome + stat-strip clip + Today-card title.
10. Re-back north-star/tokens.ts onto CSS vars.

## 18. Final verdict

**What makes Altair look unfinished:** the seams. Three visual generations coexist on every screen path — premium dark-brass at the door, olive/tan inside, cool slate/cyan bleeding through from underneath — and the shared chrome sometimes lies (dead search, stale trial date) or visibly breaks (colliding headers, overlapping mobile icons, clipped tabs). None of it is structural.

**What makes Altair look good:** the bones and the honesty. The IA is sound, the layout tier is real, empty/loading/error states are designed, data is never faked, and there is a genuinely distinctive identity already shipping on four surfaces.

**What separates it from premium:** one brand decision plus token adoption plus ~10 shared primitives. This is not a "redesign 40 screens" product; it is a "finish the system you already designed, then let it repaint the screens" product.

**Primary problem class:** consistency/adoption (tokens, primitives, copy) ≫ layout ≫ interaction feedback ≫ color discipline. Architecture (the fork, the override layer) is the cost multiplier behind all of them.

**Largest leverage:** Phase 1–3 above — the brand decision, the token re-backing, and the fork retirement. Everything else gets twice as cheap afterward.
