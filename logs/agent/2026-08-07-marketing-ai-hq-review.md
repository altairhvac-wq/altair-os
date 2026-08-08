# Marketing AI HQ — build session review (Aug 7, 2026)

Everything below is sitting **uncommitted** in the altair-os working tree,
per the standing guardrail. Nothing has been committed, pushed, published,
or run against production.

## What got built

The V1 foundation of the Marketing AI HQ (founder-only), per the new
architecture doc at `docs/product/MARKETING_AI_HQ.md`:

**Data layer** — `supabase/migrations/133_marketing_ai_hq_foundation.sql`:
four service-role-only tables: `marketing_directives` (goals/brand kit,
versioned by superseding), `marketing_items` (the approval queue),
`marketing_runs` (engine ledger), `marketing_metrics` (future collectors).
No `authenticated` grants at all — founder gating is app-layer, DB is locked
to service role like `platform_automation_runs`.

**Engine** — `lib/marketing/`:
- `store.ts` service-role data access + item-flow stats (the code-math layer)
- `brand.ts` shared HQ/brand context block every role inherits (with the
  honesty rules from your existing founder prompts baked in as defaults)
- `roles/copywriter.ts` — batched social-post drafting (JSON in/out)
- `roles/strategist.ts` — weekly report: narrates computed stats, sets
  next-week focus that feeds the next copywriter batch
- `roles/seo.ts` — weekly pair: one comparison/alternative page draft + one
  educational article draft
- `engine.ts` — orchestration, run ledger, and cron due-task logic

**Surfaces**:
- `/marketing/hq` (founder-only via `requirePlatformAdmin`) — approval
  queue, strategy report view, brand & goals editors, run history
- Founder-only "Marketing AI HQ" banner link added inside the existing
  Marketing Hub page
- Approved social posts convert into normal Marketing Hub drafts
  (`source_type: product_update`), so your existing FB/IG publish flow and
  manual posting workflow apply unchanged

**Automation** — `app/api/cron/marketing-ai/route.ts` (CRON_SECRET-gated,
logs to `platform_automation_runs`), added to `vercel.json` daily at
12:30 UTC. Strategist fires Mondays; copywriter and SEO batches weekly.
Every run also appears in the HQ Runs tab.

**AI plumbing**: reuses your existing `lib/ai/provider.ts` (OpenAI,
`AI_FEATURES_ENABLED` + `OPENAI_API_KEY`), rate-limit guardrails, and the
"draft text only" contract. No new env vars.

## Verification done

- Scoped `tsc --noEmit` over every new/edited file + transitive imports: PASS
- Repo ESLint over every new/edited file: PASS
- `npm run build` was NOT run (too heavy for the verification channel I had
  while you were away) — run it before deploy per your usual gate.

## To turn it on

1. Apply migration `133_marketing_ai_hq_foundation.sql` to Supabase.
2. Ensure `.env.local` has `AI_FEATURES_ENABLED=true` and `OPENAI_API_KEY`.
3. Visit `/marketing/hq` (your founder account), fill in Brand & goals, save.
4. Hit "Run copywriter batch" — drafts land in the approval queue.

## Not done / next up

- Review + commit: your call, per the guardrail.
- Collectors (`marketing_metrics` is ready but nothing feeds it yet) —
  needs your analytics/social account details.
- Video briefs (wire to AltairDemoTool), email drafts, competitor intel,
  reputation, ads — architecture doc maps how each bolts on.
- SEO/blog drafts don't auto-convert anywhere yet — copy the markdown from
  the queue for now.
