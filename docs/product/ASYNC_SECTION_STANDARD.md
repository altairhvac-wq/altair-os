# AsyncSection standard & Server-Component data-fetch scoping rule

**Status:** Proposed (component shipped, migrations pending review)
**Origin:** Demo-video pipeline QA work, Aug 5–6 2026. Two production bugs — the Dispatch map's mid-load capture and the Sales tab's 10-query re-fetch — plus the discovery that a *validated* demo video shipped with several beats showing skeleton screens, are all instances of the two failure shapes this doc standardizes against.

## Part 1 — AsyncSection: every async widget announces its own state

`shared/components/async/AsyncSection.tsx` wraps any widget that finishes loading *after* its page shell renders, and emits a standardized, automation-readable state contract:

- while loading: `data-testid="{feature}-loading"` + `aria-busy="true"` (+ your skeleton as `fallback`)
- when ready: `data-testid="{feature}-ready"` (+ the real content)

The rule going forward: **any client-side async widget (map panels, charts, AI summaries, anything geocoding/fetching after mount) gets wrapped in AsyncSection.** Hand-adding testid pairs (the original Dispatch fix) is superseded by this — same contract, impossible to half-remember.

`aria-busy="true"` is deliberate: the demo pipeline's stale-frame detector treats visible `aria-busy` elements as loading indicators (signal 3), so wrapped widgets can never silently appear half-loaded in a captured frame, even if nobody writes a `wait_for` for them. It's also the correct accessibility semantic.

### Why the page-level testid isn't enough

`page-work` (etc.) appears when the shell mounts. The content inside can still be skeleton placeholders. Automation that waits on the page testid then screenshots gets a frame that *looks* broken — and skeletons are neither spinners nor "Loading…" text, so they historically evaded detection. This exact shape shipped: the previous "See How It Works" master shows skeletons for the Work, Job detail, Dispatch, Customers, and Sales beats (verified frame-by-frame against the rendered mp4).

### Migration order

1. **Dispatch map panel** (first, replaces the hand-added testid pair in `DispatchMapPanel.tsx` — the pair's names stay identical, so existing automation keeps working unchanged).
2. Work hub job list (its skeleton shipped into the video).
3. Sales hub tab panels, Customers list, Reports cards — opportunistically as pages get touched.

## Part 2 — Data-fetch scoping rule for Server Components reading `searchParams`

Two rules, both violated today in ways users can feel as lag:

**Rule A. A `searchParams` change must not re-run unrelated work.** Reading `searchParams` makes the whole Server Component dynamic — every tab click, filter pill, or row selection re-executes the function and therefore every query in it. Fetch only what the *current* view needs, or split per-tab work so a param change re-runs a slice, not the world.

**Rule B. A shared read path must never run write side-effects.** Status syncs, backfills, reconciliation — anything that mutates — must not live inline in a page render. It runs per navigation, per user, concurrently, and turns "open a tab" into a write amplification problem. Move writes to explicit actions, scheduled jobs, or at minimum a debounced/cached service that no-ops when fresh.

### Audit results (Aug 6 2026)

| Page | Rule A (over-fetch on param change) | Rule B (inline writes) | Notes |
|---|---|---|---|
| `sales/page.tsx` | **Violation** — 11-query `Promise.all` re-runs on every tab/filter/selection change | **Violation** — `listInvoicesWithBillingSync` runs the overdue-status sync on a read path (its internals were batched Aug 5, so it's *fast* now, but still a write on read) | The original bug. Batching fixed the symptom; the shape remains |
| `customers/page.tsx` | **Violation** — 5-query refetch on every tab switch (Customers ⇄ Pipeline), queue filter, or lead selection | **Violation** — `ensureInvoiceBillingStatesSynced` runs inline before stats, on every param change | Second confirmed instance of the full Sales shape. Selecting a single lead re-runs the company-wide sync |
| `work/page.tsx` | **Likely violation** — 6 queries re-run when `status`/`view`/`priority`/`unassigned` params change, yet `JobsPageView` receives *all* jobs and filters client-side (`initialStatusFilter` naming implies client state). Verify how the filter pills write the URL; if they `router.push`, every pill click is a full server refetch for nothing | Clean | |
| `dispatch/page.tsx` | Minor — `focus`/`technicianId` changes re-run 4 queries; `date` changes legitimately need a refetch. Day-scoped queries keep it cheap | Clean | Lowest priority |
| `estimates/page.tsx`, `invoices/page.tsx` | Clean — legacy redirects into Sales hub | Clean | |

### Suggested fix order

1. **Customers Rule B** — move `ensureInvoiceBillingStatesSynced` out of the render path (same treatment Sales needs; consider one shared "billing states fresh as of X" cache with a short TTL so both pages read, neither writes).
2. **Sales Rule B** — same, replacing `listInvoicesWithBillingSync` on the read path with plain `listInvoices` + the shared freshness mechanism.
3. **Work Rule A** — confirm pills are client-state; if they write the URL, make them client-state (or `router.replace` with `shallow` semantics) so the server component stops re-running.
4. Sales/Customers Rule A — split per-tab fetching.

Rule B first: it's the only one that *writes* on hot paths, and it's two lines of movement per page once the freshness mechanism exists.
