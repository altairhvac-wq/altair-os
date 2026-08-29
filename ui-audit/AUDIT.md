# Altair OS — Deep UI/UX Audit (2026-08-28)

Working log for the autonomous UI/UX audit. Findings accumulate in FINDINGS.md; final synthesis in FINAL-REPORT.md.

## Method

- Pass 1 — System discovery (parallel code readers: routes/shells, tokens/theme, hardcoded values, component duplication, states, a11y, responsive, copy, perf-as-UI)
- Pass 2 — Product walkthrough in the running app (desktop 1440, intermediate ~1024/820, mobile 390)
- Pass 3 — Visual forensics on screenshots + implementation trace
- Pass 4 — Responsive/mobile deep dive
- Pass 5 — Component/design-system trace (connect visual symptoms to shared primitives)
- Pass 6 — UX / states / accessibility interactive checks
- Pass 7 — "What did I miss?" review
- Pass 8 — Synthesis → FINAL-REPORT.md

## Baseline (from altair-design-system skill — treat as intent, audit against it)

- Semantic token foundation: `shared/design-system/foundation/altair-tokens.ts` (stone/paper/graphite/ink/border/brass + semantic), CSS in `app/globals.css`.
- Surface hierarchy: 5 levels (canvas → section → card → tile → list row), `shell/surface-hierarchy.ts`.
- Two sanctioned surface systems: MC v2 (Dashboard + panels 2–13), Report Surface (Reports only). Dispatch has a locked dark "ops command" exception.
- Brass = single brand accent (~2% target). Semantic colors load-bearing, never decorative.
- 16-panel roadmap: 1–13 done; **14 Schedule, 15 Time Clock, 16 Settings NOT started** (known).

## Already-known issues (do NOT re-report as discoveries)

- Shift Time hardcoded to zero in `buildReportsPageData` (known bug).
- Technician name truncation in JobScheduleRow ("Role Smoke Tech…") — known minor.
- Reports remaining work: visual tiering, sparklines, Operations Snapshot merge, Recommended Actions, Business Score (paused).
- Feature gaps list (photos, ratings, PTO, GPS map, lead value, job tasks/duration, forecasts, memberships, reviews, appointments entity, call tracking) — deliberate honest cuts, not audit findings.
- Homepage hero uncommitted/unwired files — known, awaiting decision.

## Incident log (audit-inflicted, resolved)

- 2026-08-28: Writing Pass-1 discovery notes into `ui-audit/discovery/` broke the dev build — Tailwind v4 auto source detection scans every non-gitignored repo file, and an agent report contained the literal class `rounded-[var(--radius-STAR)]`-with-an-asterisk, which fails CSS parsing. All mobile + part of tablet screenshots from the first run captured the Next build-error overlay and were discarded/re-run. Remediation: defused the literal, scrubbed capture-report.json, `touch app/globals.css` (mtime only, no content change), restarted `next dev` (Tailwind's candidate registry never un-learns within a session). **Product takeaway (real finding): any doc/JSON committed to the repo containing a malformed class-shaped string can break dev AND `npm run build`. Consider explicit `@source` config or gitignoring non-source dirs.**

## Status

- [x] Baseline loaded (skill + tokens + roadmap)
- [x] Pass 1 discovery workflow (9 dimensions → ui-audit/discovery/)
- [x] App running + authenticated (founder auth, magic-link refresh via repo tooling)
- [x] Pass 2 walkthrough (~180 screenshots, 3 viewports → SCREENSHOTS/)
- [x] Pass 3–6 (visual forensics, responsive verification, interactive states, print, technician view, validation probe)
- [x] Pass 7 review (corrections: Shift Time bug now fixed; platform-admin gates env-limited locally; audit-inflicted CSS incident documented above)
- [x] Pass 8 final report → FINAL-REPORT.md

Note for the maintainer: `.playwright/founder-auth.json` was refreshed during the audit via the repo's own magic-link flow; a rotated working copy lives in the session scratchpad (outside the repo). `.claude/launch.json` was added for dev-server preview. `ui-audit/capture-audit*.mjs` are audit tools, safe to delete or keep.
