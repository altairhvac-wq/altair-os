# Lint policy

The lint gate is enforcing. `npm run lint` must exit 0, and CI fails the build
when it does not. Warnings are allowed; errors are not.

## The one rule that was downgraded, and why

`react-hooks/set-state-in-effect` is configured as a **warning** in
`eslint.config.mjs`. It is the only severity override in the repository.

`eslint-config-next` 16 ships this React Compiler rule as an error. It fires 61
times across 44 components. Every occurrence was read individually during the
launch-readiness pass, and all of them fall into three deliberate patterns:

| Pattern | Example |
| --- | --- |
| Server prop → local optimistic state after a Server Action + `router.refresh()` | `InvoiceStatusActions`, `EstimateStatusActions`, `JobWorkflowControls` |
| Reset transient UI state when a key changes (filters, route) | `usePageBulkSelection`, `TechnicianMobileShell` |
| `setMounted(true)` hydration guard so the first client render matches the server | `ModalPortal`, `PwaInstallPrompt` |

None of these is a correctness defect. The rule is a performance and idiom
warning — the "you might not need an effect" guidance — not a soundness rule.

Fixing all 61 would mean restructuring state ownership across the invoice,
estimate and job-workflow surfaces. The launch audit identified those money
paths as working correctly and explicitly warned against casually rewriting
them. Taking real behavioral risk there to satisfy a stylistic rule is a bad
trade, so the rule was downgraded rather than the code rewritten.

It is a **warning**, not `off`, on purpose: the signal stays visible in local
runs and in CI output, and new occurrences are still reported.

## What was NOT downgraded

Every other `react-hooks` rule keeps its default **error** severity. The four
render-correctness rules that were failing were fixed in code, not silenced:

| Rule | Site | Fix |
| --- | --- | --- |
| `react-hooks/rules-of-hooks` | `OperationalResolutionQueueSheet` | Hooks hoisted above the early return; the `queueType === null` case is now a render decision, not a change in hook order. |
| `react-hooks/immutability` | `CashHealthChartCard`, `ReceivablesAgingChartCard`, `TopRevenueSourcesChartCard` | The `let cumulative` accumulator mutated inside a render-time `.map()` moved into the pure `buildDonutArcs` helper in `shared/lib/reports/donut-arc-geometry.ts`. |
| `react-hooks/static-components` | `OperationalMomentumSection` | `getTrendIcon()` became the `TREND_ICONS` constant map, matching `QUEUE_ICONS`. |
| `react-hooks/refs` | `useSheetEscape` in `shared/hooks/useScrollLock.ts` | The latest-callback ref write moved out of render and into a commit-phase effect. |

If one of these fires, the code is wrong — not the rule. Do not extend the
severity override block to cover them.

## Removed from the lint surface

Nine root-level Playwright scratch scripts (`_check-page.js`, `_shot.js`, and
siblings) were tracked in git despite being matched by the `/_*.js` line in
`.gitignore` — they had been committed before that line existed, so the ignore
had no effect on them. They produced nine `@typescript-eslint/no-require-imports`
errors. They were unreferenced one-off debugging captures and were removed from
tracking rather than fixed.

## Adding a new override

Don't, unless the same three conditions hold and are written down here:

1. The rule is stylistic or performance-oriented, not a soundness rule.
2. Every current occurrence has been read and confirmed intentional.
3. Fixing them would carry more behavioral risk than the rule removes.
