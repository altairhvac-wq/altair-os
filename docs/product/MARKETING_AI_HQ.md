# Marketing AI HQ — Architecture

Status: V1 foundation (founder-only). This document is the source of truth for
the Marketing AI HQ module: what it is, how it is shaped, and the rules every
future role addition must follow.

Related docs: `docs/product/MARKETING_AI_FOUNDATION.md` (the constitution
every role inherits — purpose, brand personality, voice, the Altair Promise,
philosophy, workflow checklist, approval rules; machine-readable form in
`lib/marketing/foundation.ts`), `docs/development/AUTONOMOUS_WORKFLOW.md`
(session guardrails), `docs/product/ALTAIR_BRAIN.md` (production module
inventory), `AGENTS.md` (repo-wide conventions).

## What this is

An AI marketing team for marketing **Altair OS itself**, run from the founder
account. It is deliberately NOT fourteen agents. It is:

- **one shared brain** — Postgres tables holding goals, brand voice, standing
  creative direction, generated work items, and collected metrics;
- **deterministic code** for everything code can do — collection, scheduling,
  arithmetic, filtering, formatting;
- **a small number of AI call points** ("roles") that each do one judgment or
  creation task and write their output back into the shared brain.

Publishing is human-gated: every generated item lands in an approval queue on
the Marketing tab. Nothing reaches the outside world without an explicit
founder action. This extends the existing Marketing Hub rather than replacing
it — approved items become `marketing_posts` drafts (the proven, existing
pipeline to Facebook/Instagram publish and manual posting).

## The three-layer cost model

Every capability in the vision decomposes into three layers. Keeping them
separate is what keeps AI spend at cents per item instead of dollars:

1. **Collection (pure code, $0 AI).** Cron-driven collectors pull numbers and
   facts (site analytics, social metrics, competitor changes, mention feeds)
   into `marketing_metrics`. A model never "watches" anything.
2. **Math (pure code, $0 AI).** Rollups, deltas, close rates, ROI, drop-off
   points are SQL/TypeScript. The model reads a computed summary — it never
   computes.
3. **Judgment & creation (the only AI spend).** Strategy narrative, copy,
   scripts, creative direction, reply drafts. Batched (weekly strategist run,
   content batches), never always-on. Prompts share a stable brand-kit prefix.

## Roles

A role = a prompt builder in `lib/marketing/roles/` + the shared provider call
+ a typed parser. Roles are rows of behavior, not services. V1 ships the
first three; the rest bolt on without schema changes:

| Role | V1 | Trigger | Output → `marketing_items.kind` |
| --- | --- | --- | --- |
| Strategist | ✅ | Monday run / manual | `strategy_report`, `directive` |
| Copywriter | ✅ | weekly batch / manual | `social_post`, `email_draft` |
| Brand Manager | ✅ (config, no AI) | founder edits | `marketing_directives.kind = 'brand_kit'` |
| SEO Specialist | ✅ | weekly batch / manual | `seo_page`, `blog_article` |
| Video Producer | ✅ (brief stage) | manual | `video_brief` — exports JSON for the AltairDemoTool render pipeline |
| Competitor Intel | later | daily collector + weekly digest | `intel_digest` |
| Creative Director | later | weekly memo | `directive` |
| Analytics | later | collectors + SQL; AI narrates only | feeds `strategy_report` |
| Reputation | later | mention collector | `reply_draft` |
| Advertising | much later | proposals only; code-enforced caps | `ad_proposal` |

Role registry lives in `shared/types/marketing-ai-hq.ts`
(`MARKETING_AI_ROLES`) so UI and engine agree on the closed set.

## Data model (migration `133_marketing_ai_hq_foundation.sql`)

Three tables + one enum set, all founder-scoped but company-anchored (so the
engine productizes to tenants later by widening RLS, not by rebuilding):

- **`marketing_directives`** — the brain's long-lived state. `kind`:
  `hq_config` (goals, ICP, positioning), `brand_kit` (voice, tone, banned
  claims, visual notes), `creative_direction`, `strategy_note`. One active row
  per (company, kind) — versioned by superseding, never edited destructively
  (`superseded_at` + partial unique index on active rows).
- **`marketing_items`** — every unit of generated work. `kind` (see roles
  table), `status`: `draft → approved | rejected`, plus `converted` when an
  approved item is pushed into `marketing_posts`. Content is `jsonb`
  (per-kind shape, validated in TypeScript), with `title` + `body_text`
  denormalized for list rendering. Carries `role`, `run_id`, `channel_hint`,
  `review_note`.
- **`marketing_runs`** — engine run ledger (mirrors
  `platform_automation_runs` shape): `run_key` (`strategist_weekly`,
  `copywriter_batch`, …), status, timings, `totals` jsonb, sanitized
  `error_summary`, and `report` jsonb for the strategist's structured output.
- **`marketing_metrics`** — collected numbers: `source`, `metric`, `dimension`
  jsonb, `value` numeric, `observed_on` date. Unique on
  (company, source, metric, dimension, observed_on) so collectors are
  idempotent upserts.

### RLS posture (V1)

Founder-only is enforced in the application layer via
`requirePlatformAdmin()` / `canAccessPlatformAdmin()` on every page, action,
and engine entry point — same pattern as the existing founder marketing
features. At the database layer the four tables are **service-role only**
(like `platform_automation_runs`): `authenticated` gets no direct grants, so
even a compromised authenticated session cannot read HQ state. All access
flows through server-only code that has already passed the founder check.
When this productizes, per-company RLS policies get added and grants widen —
an additive migration.

## Engine flow

```
cron (vercel.json, CRON_SECRET-gated route /api/cron/marketing-ai)
  └─ engine.runDueTasks()
       ├─ collectors (code only) → marketing_metrics
       ├─ copywriter batch (if due) → drafts into marketing_items
       └─ strategist (if due, Mondays) →
            reads directives + metrics rollups (SQL) + last run report
            → strategy_report item + refreshed directives
manual (founder clicks in HQ UI) → same engine functions via server actions
approve (founder) → marketing_items.status = approved
                  → optional convert → marketing_posts draft (existing hub)
```

Every engine run writes a `marketing_runs` row; the run detail view in the HQ
UI is the observability story. AI calls go through the existing
`lib/ai/provider.ts` (`generateDraftText`) — same env flags
(`AI_FEATURES_ENABLED`, `OPENAI_API_KEY`, `AI_MODEL`), same rate-limit
guardrails, same "draft text only" system prompt contract.

## Channel packaging layer

`shared/types/marketing-channels.ts` is the single registry of platform
specs: which fields each platform requires (caption, title, description,
tags…), their character limits, and conventions. The copywriter fills the
exact `fields` object for a post's channel, code clamps every value to the
platform limit (the AI is never trusted on limits), the queue renders and
inline-edits those fields per spec, and future upload adapters read
`content.fields` directly — content is publish-ready the moment it is
approved, with zero reformatting. Adding a platform = adding a registry
entry; prompts, validation, and UI all follow from it.

## Distribution layer

The HQ's Distribution tab reports, per platform, whether approved content
can flow out automatically or manually. Facebook has one-click publish from
the queue (approve → convert to hub post → publish through the existing
connected-Page pipeline, all human-triggered). Instagram rides the same
connection once image support lands. Video briefs export as schema-exact
AltairDemoTool RawScript JSON (`{ videoTitle, beats: [{ narration,
directions }] }`) — the demo engine runs them directly
(`node dist/cli.js <file> --tts elevenlabs --capture playwright`); YouTube/
TikTok upload fields stay packaged on the queue item for upload time.
Everything else is copy/paste from packaged fields
until its API adapter is built — adding an adapter never requires content
rework because packaging happens at generation time.

## Hard rules

1. **No autonomous publishing.** The engine writes `marketing_items` only.
   Converting to a `marketing_posts` draft and any publish click is a human
   action. (Ads, when they arrive, follow the stronger rule: AI proposes,
   deterministic code enforces budget caps, humans approve spend.)
2. **No fabricated facts.** Prompts receive only structured context from the
   brain; the existing founder-draft honesty rules (no invented users,
   integrations, revenue) are inherited verbatim in the brand kit defaults.
3. **Founder-gated end to end.** Page, actions, cron handlers, and queries
   all check platform admin (or CRON_SECRET for the cron entry).
4. **Cheap by construction.** New roles must state their layer split
   (collect/math/judge) in this doc before implementation. If a proposed AI
   call can be SQL, it's SQL.
5. **Additive migrations only**, per repo convention.

## File map (V1)

```
supabase/migrations/133_marketing_ai_hq_foundation.sql
shared/types/marketing-ai-hq.ts          # domain types, role registry, parsers
lib/marketing/                            # server-only engine
  store.ts                                # service-role reads/writes for the 4 tables
  brand.ts                                # brand-kit + hq-config defaults & prompt prefix
  metrics.ts                              # rollup SQL helpers (code-math layer)
  roles/copywriter.ts                     # prompt builder + response parser
  roles/strategist.ts                     # prompt builder + response parser
  engine.ts                               # run orchestration + run ledger
app/actions/marketing-ai-hq.ts            # founder-gated server actions
app/api/cron/marketing-ai/route.ts        # CRON_SECRET-gated scheduled entry
app/(admin)/marketing/hq/page.tsx         # HQ surface (founder-only)
shared/components/marketing-hq/*          # queue, config editors, run history
```

The existing `/marketing` page gains a founder-only "AI HQ" entry point; the
existing hub, drafts, connected accounts, and publish flows are untouched.
