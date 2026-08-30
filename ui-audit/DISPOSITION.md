# Audit disposition

Status of every original finding, re-checked against the code as it stands
rather than carried forward from the audit's own conclusion. Where the audit
turned out to be wrong, the row says so.

Last reconciled: 2026-08-30, branch `prestige-visual-foundation` (second pass:
dark-surface sweep).

## How to read this

| status | meaning |
|---|---|
| **fixed** | the user-visible defect is gone, and something verifies it |
| **partial** | materially advanced; the row names what is left |
| **stale** | the claim was wrong, or is no longer true |
| **open** | reproduces today, with a file:line |

A row is never marked fixed because a token underneath it changed colour.

---

## Fixed

| id | what it was | evidence it is gone |
|---|---|---|
| S-4 | blue-black literals | palette remap; contrast gate |
| S-5 | muted/brass contrast | gate case, was 3.99 on sunken canvas |
| S-7 | nested anchor → hydration failure | `querySelectorAll("a a")` = 0, six routes × two widths |
| S-8 | MasterPageHeader title overpaints its subtitle | `min-w-0 flex-auto`, /work verified |
| S-12 | money rounded on customer-facing paths | all four `formatCurrency` → `formatCurrencyExact` in the payment email |
| S-23 | `prefers-color-scheme` flipped `--foreground` invisible | override deleted, absence guarded by comment |
| S-24 | three unrelated chart colour languages | single `--chart-*` series, consumed via `var()` |
| L-1…L-4 | dead Search button, stale trial pill, tab titles, copy | quick-wins pass; L-4 verified by zero `aria-label="Search"` |
| L-6, L-10, L-18 | — | re-verified clean |
| L-15 | money fields announced as unlabelled | `useId` + `htmlFor` in both line-item editors; 14 search inputs given `aria-label`; probe asserts every visible control has an accessible name |
| **new** | dark-surface badges 2.17–4.02:1 | not in the original audit. `STATUS_TONE_CLASS_ON_DARK`, now 9.5–12.4:1, eight gate cases |
| **new** | mobile label taps focused an invisible input | `useId` in three components; probe drives two panels at 390px |
| **new** | dark/paper token mismatch product-wide | 14 colour pairs → **0** on three probes: 31 routes × 4 widths, every gradient stop, and 9 opened detail panels |
| **new** | muted ink under AA at every call site | `#7C7259` measured 4.46 on paper; fixed at the token (93 literals, 45 files — see S-2) |
| L-9 | "Next" column printed last-service data | renamed to Attention; the two cue kinds that duplicated a neighbour now render "—" |
| L-12 | unread notifications wore the brand accent; no Escape | unread is `info`; Escape via the existing stack-aware `useSheetEscape`, verified by driving it |
| L-14 | public token routes had no boundaries | loading/error/not-found on both segments, plus `noindex` |
| L-15 | money fields announced as unlabelled | `useId` + `htmlFor`; 14 search inputs named; probe asserts it |

## Partial

| id | advanced | left |
|---|---|---|
| S-1 | flag default flipped and documented | 556 `northStar ?` ternaries in 96 files; delete the losing branch, then the flag |
| S-3 | **393 → 166 `!important`, 5,897 → 5,674 lines.** Dead families deleted, inert flags dropped, both proved inert by a 49,946-property computed diff | the escaped-class override engine at `globals.css:1616-1640`; the seven near-identical ledger blocks are still seven |
| S-6 | the P1 inside it is fixed (duplicate ids) and the headline claims are refuted — see *stale* | wasted render is real and P2: detail panel ×2 at 5 call sites, dashboard doubled, 7 ledgers ship table+cards |
| S-10 | verbatim-copied styles file collapsed onto `STATUS_TONE_CLASS`; lead palette, resolution queue, dispatch and expenses mapped by meaning | ~12 domain badges are still not `StatusPill` adapters |
| S-16 | sidebar collapses to an icon rail below 1024px | ledger card-to-table swap still at `md`, so 768–1023px pans |
| S-18 | ellipsis normalised | Trash / Work / Quote vocabulary; 204 "Failed to" strings |
| S-19 | 42 routes export metadata | the two public token routes and six admin detail routes |
| S-22 | **last artificial 500ms delay deleted** | no admin Suspense streaming; 2,207-line client queue |
| S-25 | Tailwind `source(none)` build-break hazard closed | no ESLint ratchet for hex literals |
| L-5 | server-decided `trialHasEnded` | not on `CompanySubscriptionBillingSummary` |
| L-7 | loud blue resolved at token level | red flood on the scheduled column; "Past due" vs "Overdue" |
| L-11 | stat-strip clipping fixed | mobile page title |
| L-13 | grammar fixed; **the avatar disks are now brass tokens** | dot-only status still needs a text pair |
| L-16 | blue selection → brass; **shoulder labels 3.05 → 4.65** | shoulder-hour label *overlap* (a layout issue, not contrast) |
| L-17 | **duplicate "Opportunities" heading removed** | lifecycle button alignment |
| L-20 | auth generations unified on `AuthShell` | fabricated `OPERATIONAL_SNAPSHOT` tiles |
| L-22 | phone formatting applied | six naked address joins |
| L-23 | **price book keyboard-operable** — 21/21 rows, Enter opens the panel | `scope="col"`, header casing, missing-cost pills |
| L-24 | icon chips semantic on the live dashboard | four aria pluralisations; delete `TodayNeedsAttentionSection` |

## Stale — the claim is now false

| id | claim | reality |
|---|---|---|
| L-19 | `/install` renders raw PWA debug JSON to all visitors | both collection and render are gated on `NODE_ENV === "development"` |
| S-6 | "215 hidden/shown pairs" | 17 real duplicate-render sites; most of the 198 responsive-hide utilities are column hiding or icon/label swaps |
| S-6 | "11 ledgers ship table and cards" | 7 |
| S-6 | "forms end up with duplicate `required` and `name=`, corrupting submissions" | **refuted.** Every form reading `FormData` and every `<form action={…}>` has zero duplicate names. The two literal duplicates are inert: one posts React state, the other sits behind a prop its only caller never passes |
| L-21 | "INVITES IN 0 / 2 pending" is a contradiction | two different metrics, not a conflict |
| L-13 | org tree "entirely in legacy cyan" | overstated; two avatar disks |
| S-22 | fix log said the artificial latency was removed | it was, in one of two copies — now both |
| S-19 | fix log claimed `generateMetadata` on the public token routes | false; still missing |

## Open

S-2 (938-line hex-only token layer, zero `var()`), S-9 (emerald primaries on
money surfaces), S-13 (no popover primitive — **the bell now has Escape**, but
the company switcher and view switcher still do not, and none has focus
management), S-14 (1,167 arbitrary micro-type
sites), S-15 (11 StatStrips, 10 SearchFilterBars, 13 EmptyStates), S-17
(AltairTable has no mobile contract), S-20 (technician cyan across ~25 files),
S-21 (340 arbitrary `rgba()` brass borders), S-26 (z-index folklore, dead
`DesktopNav`, 42M `public/marketing`), L-8 (workflow bar styled as the tab row
beneath it), L-9 (NEXT column prints last-service data), L-12 (notifications
cyan, no Escape), L-14 (public token routes have no loading/error boundary — a
homeowner gets a "Back to dashboard" CTA).

**Highest-leverage next:** L-14 is the only one on a public, unauthenticated
surface. S-13 and L-12 are the same fix. S-2 unblocks theming for zero call-site
edits.

---

## Deferred to a maintenance phase

Both are real and both are architectural. Neither causes a **confirmed
user-visible defect today** — all three contrast probes read zero across the
product — so they are documented here rather than fixed under a release.

### S-2 — the token layer is hex-only

`shared/design-system/north-star/tokens.ts`, measured 2026-08-30:

| | |
|---|---|
| lines | 947 |
| raw hex literals | 325 |
| distinct hexes | 62 |
| `var(--…)` references | **0** |
| files importing it | 109 |

**What it costs, concretely.** The muted-ink fix in this pass had to be applied
as a **93-literal sweep across 45 files**, because the same value is written out
at every call site instead of resolving through one custom property. A second
consequence: nothing in this layer can be reached by the Design Lab or any
future theming surface, since there is no property to override.

**The fix, when it is scheduled.** Back the ~62 distinct hexes with the `--pg-*`
and `--altair-*` properties that already exist in `globals.css` and that these
values were derived from. The class strings themselves do not change, so it is
zero call-site edits — the work is in the mapping and in verifying it. The
computed-style differ used for the `!important` removal
(`ui-audit/snapshot-chrome.mjs`) is the right proof: capture before, remap,
capture after, and require the ~50k properties to be identical.

**Do not** convert it piecemeal. A half-tokenized layer is worse than a
hex-only one, because then neither rule holds.

### S-21 — brass is not a ramp

Across `app/` and `shared/`, spacing-tolerant:

| pattern | count |
|---|---|
| `rgba(119, 89, 27, …)` | 332 |
| `rgba(194, 160, 90, …)` | 316 |
| `rgba(138, 99, 36, …)` | 39 |
| arbitrary-value brass classes in components | 524 |
| distinct golds in use | 10 |

*(The audit's original figure was 340. It reproduces at roughly twice that once
the pattern tolerates whitespace — my first count used the wrong spacing and
briefly suggested the finding was stale. It is not.)*

**The fix, when it is scheduled.** A brass ramp with the steps that are actually
in use, plus three border/ring properties for the alpha variants, then a sweep
of the 687 `rgba()` sites. Contrast is already handled — `--altair-brass` for
paper, `--altair-brass-interactive` for chrome — so this is consolidation, not
correction.

**Why it is safe to defer.** These are borders, rings and washes. The two places
where brass was doing something it should not — standing in for a *state*, and
being painted as text on chrome — are both fixed, and the probes hold the line.
