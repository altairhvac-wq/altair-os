> **Status update:** The core design-lab bug (§3–6) is fixed and verified as of this update. Canvas, sidebar, chrome border, header strip, and content-well are now separately editable, screenshot-confirmed isolated from each other, and confirmed working end-to-end through save → publish → real live `/` dashboard. See "Resolution log" at the end of this doc for what shipped, what was found along the way, and what's still open.

# Altair-Op Structure Audit & Unification Plan

Written after a direct code audit of `AltairDemoTool` (the video generator) and `altair-os` (the app, including the design-lab and founder/homepage). Goal: one coherent structure that supports (a) fully automated video generation and (b) a design lab that actually shows you what you're editing — no more guessing, no more "which page is this."

---

## 1. TL;DR

- The video generator isn't blocked where its own docs say it is. The Altair-side piece it was waiting on (`/api/demo/fingerprint`) already exists. What's left is verification, not new architecture.
- The design-lab bug isn't a fluke — there are **three different "design lab" implementations** in the codebase, one of which previews a hand-built **replica** of the dashboard instead of the real thing, and the founder/homepage page uses a **completely separate, disconnected token file** that no lab currently touches. "I changed a color and couldn't see it" is an accurate description of the actual architecture, not user error.
- All of this is fixable without inventing new patterns — the real product already has a working live-theme mechanism (`AdminShell` + `getLiveDesignLabTheme`); it's just under-scoped and duplicated. The fix is consolidation and finishing the wiring, not a rebuild.

---

## 2. Video Generator (`AltairDemoTool`) — Status & Sync Plan

### What exists today
An 8-stage pipeline (`docs/BUILD_PLAN.md`), "Option C": no human take is ever recorded — a script drives Claude → an Action Plan → Playwright browser automation → TTS narration → deterministic ffmpeg compositing, entirely automated.

| Stage | Status per docs | Actually |
|---|---|---|
| 1. Script → Action Plan (Claude) | not started | not started |
| 2. Preflight Guard | scaffolded | scaffolded, and its target now exists (see below) |
| 3. TTS Generation | not started | stub + ElevenLabs provider code exists (`src/tts/`), untested end-to-end |
| 4. Browser Execution & Capture | not started, blocked | Playwright capture code exists (`src/capture/playwright.ts`); blocked on env verification, not missing code |
| 5. Timeline Alignment | not started | `src/timeline/align.ts` exists with tests |
| 6. Visual Compositing | not started | `src/compose/buildFilterGraph.ts` exists with tests |
| 7. Render & Export | not started | `src/render/` exists with tests |
| 8. Validation Report | not started | `src/report/` exists with tests |

The status table in `docs/BUILD_PLAN.md` undersells how much is actually scaffolded — most stages have real code and tests behind them, they've just never been run together end-to-end against a live target.

### The actual blocker, precisely
`README.md` says: *"blocked on the Altair side — a dedicated demo database + seed script + demo deployment must exist before Stage 4 can run."*

That's now half-solved. `altair-os/app/api/demo/fingerprint/route.ts` exists, is dev-only (404s outside `NODE_ENV=development`), and is keyed off `DEMO_TOOL_FINGERPRINT` — built recently, after `BUILD_PLAN.md` was last written. **The doc is stale, not the blocker.**

Still genuinely missing:
1. Confirm `AltairDemoTool/.env` has `ALTAIR_DEMO_FINGERPRINT` set to match `altair-os`'s `DEMO_TOOL_FINGERPRINT` (both default to `altair-demo-local-v1` — check both `.env`/`.env.local` haven't diverged from that default unintentionally).
2. A real seeded demo company/dataset in `altair-os` for the automation to click through — check `lib/database/queries/demo-data.ts` / `canManageDemoData` (already referenced in the codebase) to see how much of this already exists versus needs a seed script.
3. A saved Playwright auth state (`ALTAIR_DEMO_STORAGE_STATE`) so capture can run headless without re-logging in every run — `src/cli.ts` already expects this env var; nothing currently produces it. Needs a small `scripts/save-demo-playwright-auth.mjs` in the `altair-os` repo (referenced in a comment in `cli.ts` but not confirmed to exist yet — check).
4. Stable `role`/`test-id` selectors on whatever demo flow gets scripted first — this is a per-page requirement, not a one-time setup. Every panel the generator will ever click through needs to keep its selectors stable across redesigns (see §6, Cursor brief).

### Recommendation
Don't touch pipeline code yet. Run the 4-item checklist above first — it's entirely verification and small scripting, and it may unblock Stage 4 with zero architecture changes. Then do one real dry run: Stage 1 script → Stage 4 capture against local dev, `--dry-run`, before wiring TTS/render.

---

## 3. Design-Lab Audit — why a color change "disappeared"

### Three competing "design lab" surfaces exist right now

| Route | File | What it actually is |
|---|---|---|
| `/altair-design-lab` | `app/(admin)/altair-design-lab/page.tsx` | Static component showcase. Hardcoded sample JSX, no live data, no persistence. A style-guide page, not an editor. |
| `/platform/design-lab` | `app/(admin)/platform/design-lab/page.tsx` → `DesignLabPageView` (30 files under `shared/components/platform-admin/design-lab/`) | The real one. Database-backed themes, color controls, contrast checker, export panel. This is almost certainly the one you were using. |
| `/altair-shell-color-lab-v1` | `app/(concept)/altair-shell-color-lab-v1/page.tsx` → `ColorLabView` | **Corrected after Cursor's Phase 0/1 audit (see below): not a competing editor.** Multiple docs (MASTER_STATUS, ART_DIRECTION, EXPERIENCE_MAP, V2_ROADMAP, shell README) cite it as the primary North Star palette *reference* — the current production tokens in `shared/design-system/north-star/tokens.ts` are a documented (comment-only, no runtime import) copy of its palette. Out of scope for retirement. |

> **Audit correction (Cursor, [date of your run]):** `/alpha-tracker` is live production (nav item "Feedback"), not a dead concept page — remove it from any retirement list. `/command-center-v1` and `/workspace-v1` are cited as deferred Phase 6 roadmap adoption candidates, not orphans. `/altair-design-lab`, `/dashboard-north-star-v1`, and `/altair-shell-north-star-v1/2/3` have zero code references but product docs explicitly say "retain" — code-orphan status alone does not authorize deletion; that's a founder call, not a Cursor task, and not urgent since none of it caused the original bug. Separately: `/platform/design-lab` itself is not in `PlatformAdminSubNav` — URL-only today. Worth fixing regardless, low risk.

Three tools with overlapping names, doing different things, all reachable and live. That alone is enough to lose track of "which page am I on."

### Confirmed: a specific mislabeled/bundled token caused the "nav change moved the whole canvas" symptom
In `app/globals.css`, `.admin-north-star-shell.admin-canvas` (the page canvas background) is driven by `var(--north-star-root)`, while the sidebar is driven by the separate `var(--north-star-sidebar)` — two real, distinct CSS variables. But in the lab's editor, both are bundled into one edit target called **"Chrome shell"** (`design-lab-edit-targets.ts`: fields `northStarRoot`, `northStarSidebar`, `northStarTopbar`, `northStarPanel`, `northStarBorder`, all under one card). "Root" reads like it should mean the sidebar/nav root — it actually drives the entire canvas background. Picking the "root" swatch while intending to recolor the nav bar would recolor the canvas instead, while the sidebar's own token never moved. **Fix:** split "Chrome shell" into visually distinct groups in the editor UI (canvas/root vs. sidebar vs. topbar vs. panel), and/or rename `northStarRoot`'s label from something chrome-adjacent to something explicit like "Page canvas background" so its actual effect is unambiguous. Do this as part of Phase 2/3 (§4 items 2–3), not a separate pass — it's the same "make scope impossible to misread" work.

### The real lab edits two different token vocabularies at once
`design-lab-edit-targets.ts` groups editable fields into targets like `chrome-shell`, `sidebar-states`, `brass-ladder` (all `northStar*` keys — the current shell's design language, per `AGENTS.md`: *"North Star variants are colocated in domain-specific `north-star-*` folders"*) **and** `altair-materials`, `altair-status` (`altair*` keys, which map 1:1 to the real product's `--altair-*` CSS variables in `shared/design-system/foundation/altair-tokens.ts`). Both live in the same flat list of editable "targets" with no visual separation of "this affects the current shell chrome" vs. "this affects the foundational tokens used everywhere in the product." Easy to edit the wrong one and not know it.

### The live-apply mechanism exists, but is scoped and staged — this is the actual bug
Good news: there's already a real, working mechanism for applying a saved theme across the live app. `app/(admin)/layout.tsx` calls `getLiveDesignLabTheme(companyId)` and passes the result through `buildDesignLabLiveStyleVars` into `AdminShell`, which wraps **every real authenticated admin page**. So a theme that has been saved and marked "live" genuinely does apply app-wide — this isn't vaporware.

But:
- It's a **two-step process** — edit, then save, then mark live — not instant. If you're changing a color and expecting to see it reflected immediately on some other page you have open, that won't happen until you publish.
- The live override is scoped to `.admin-north-star-shell` (per `design-lab-export.ts` comments and `design-lab-live-vars.ts`). If you're looking at a page outside that shell — the public marketing site, an unauthenticated flow, or a component that doesn't consume that scope — nothing will change no matter what you publish.
- The **preview inside the lab itself**, meanwhile, largely renders `DesignLabDashboardReplica.tsx` — a hand-built stand-in for the dashboard using fixture data, explicitly documented in its own comment as a "design-tool sample board," not the live `OperationalDashboardView` that actually renders at `/`. So the in-lab preview and the real live page are, structurally, two different component trees. They're meant to look the same, but a discrepancy between them is a "which page is this" bug waiting to happen by design, not a one-off glitch.

### The founder/homepage page isn't wired to any of this
`shared/components/homepage/homepage-tokens.ts` is a standalone file of hardcoded hex values, explicitly commented "marketing-only." It has no relationship to `altair-tokens.ts`, no relationship to the design-lab tool, and nothing in `/platform/design-lab` can touch it. If part of what you were trying to do was change founder-page colors through the lab, that's not a bug — there's currently no path for that at all.

### Net effect
Given three lookalike tools, two token vocabularies in one editor, a preview that's a separate replica from the real page, a publish step that isn't instant, and a public page the tool can't reach at all — "I changed a color and it just wasn't there" is the expected outcome of the current structure, not an isolated glitch.

---

## 4. Target Architecture — the proper way, not the quick patch

1. **One design lab, made discoverable.** `/platform/design-lab` is already canonical per product docs — the immediate fix is adding it to `PlatformAdminSubNav` (it's currently URL-only). **Route deletion is deprioritized and mostly off the table**, per Cursor's Phase 0/1 audit: `/alpha-tracker` is live production, not a retirement candidate at all; `/altair-shell-color-lab-v1` is a documented palette-provenance reference, not a duplicate editor; `/command-center-v1`/`/workspace-v1` are cited deferred-roadmap adoption candidates. The remaining zero-reference orphans (`/altair-design-lab`, `/dashboard-north-star-v1`, `/altair-shell-north-star-v1/2/3`) are explicitly marked "retain" in product docs — leave them alone pending an explicit founder decision; none of them caused the original bug.
2. **Preview the real thing, not a replica.** Replace `DesignLabDashboardReplica`'s fixture markup with the actual `OperationalDashboardView` (or the relevant real page component), rendered inside the lab with the in-progress (unsaved) token overrides applied via the same CSS-variable mechanism already used for the live theme — just scoped to the preview pane instead of the whole shell. This is a real, bounded engineering task: the plumbing (`buildDesignLabLiveStyleVars`, CSS custom properties) already exists; it's being fed a fixture instead of the live tree. Fixing that is the single highest-leverage change in this whole plan.
3. **Separate the two token vocabularies visibly.** In the editor UI, split "Shell chrome (North Star)" from "Foundation tokens (used everywhere)" as clearly distinct sections — not just distinct `group` metadata under the hood. Someone should never again be unsure which scope a field they're editing affects.
4. **Make "what's live right now" impossible to miss.** Since publish is a real, separate step, the lab should say so explicitly — a persistent "Editing draft — not live" vs. "Currently live" state, and a diff/preview of exactly what changes on publish.
5. **Give the founder/homepage page a real editing path.** Two options, and this is a call for you (§6): (a) migrate `homepage-tokens.ts` values into the same `--altair-*` CSS variable system and extend the lab's scope to include a "Marketing / Founder page" target group, or (b) keep marketing intentionally separate (some teams do want marketing pages decoupled from product theming) but then build it its own small, explicitly-named lab rather than leaving it with zero tooling. Either is legitimate; leaving it as-is (silently untouchable) is the only wrong answer.
6. **Keep the export/copy-paste path, but make it optional, not the only power move.** The current `design-lab-export.ts` JSON/CSS snippet export is a reasonable "hand this to a developer" escape hatch — keep it — but it shouldn't be the primary way real changes reach the app now that live-publish exists.

---

## 5. Phased execution order

**Phase 0 — Confirm, don't assume.** Before any of the above, check `docs/product/ALTair_MASTER_STATUS.md` and `docs/product/ALTair_BRAIN.md` (per `AGENTS.md`, these are the repo's own current-state source of truth) for anything that contradicts or supersedes what this audit found — this plan was built from code inspection, not those docs, and they may already have context on why three lab implementations exist (e.g. an in-progress migration).

**Phase 1 — Consolidate the surfaces.** Retire the two extra design-lab routes and the dead concept/vN pages. Low risk, immediately reduces confusion, no data-model changes.

**Phase 2 — Fix the preview to use real components.** The core architectural fix. Do it as its own pass, screenshot-verified before/after, per the project's own build-workflow discipline (skeleton first, one section at a time, verify before moving on).

**Phase 3 — Visually separate the two token vocabularies + add the live/draft state indicator.** UI-only, no data-model risk.

**Phase 4 — Decide and build the founder/homepage path** (§4.5) — needs your call first.

**Phase 4.5 — Standardize the `data-testid` convention on `Button` and other core interactive primitives** (§6). Independent of the design-lab work — can happen in parallel with Phases 1–4 — but do it before the first real Stage 4 capture run, since it's the difference between the generator reliably finding what it needs to click versus discovering gaps mid-run.

**Phase 5 — Video generator sync.** Run the 4-item checklist in §2, refresh `docs/BUILD_PLAN.md`'s status table to match reality, then attempt one real Stage 1→4 dry run against local dev.

**Phase 6 — Verification pass.** For each phase above: lint, `tsc --noEmit`, build, and — since this touches shared shell chrome — a manual pass over a few real admin pages to confirm nothing else quietly broke (the project's own `AGENTS.md` "Definition of done" checklist already covers this; just don't skip it because "it's just colors").

---

## 6. Selector identification — the direct link to the video generator

Checked this specifically because it's the exact mechanism the video generator depends on. Good news and a gap:

**Good news:** `AltairDemoTool/src/capture/playwright.ts` already refuses CSS selectors and XPath entirely — every step resolves via `page.getByTestId()` or `page.getByRole(role, { name: accessibleName })`, specifically to survive UI redesigns. And the canonical `Button` component (`shared/design-system/components/Button.tsx`) renders real semantic `<button>`/`<a>` elements with real visible text/labels, not a styled `<div>` with an onClick — so `getByRole` targeting already works reliably against any button built from it.

**The gap:** `Button` has no enforced `data-testid` convention. A caller can pass one through as a spread prop, but nothing requires it — so testid coverage across the app is whatever each page's author happened to add, not a guarantee. Two consequences: (1) the generator's `role`+`accessibleName` strategy is the only reliable fallback for un-tagged buttons, which breaks the moment two buttons on the same page share a label (e.g. two "Edit" buttons in a list — this is exactly what `TargetSelector`'s `nth` param was added to patch around, per `resolveLocator`'s comment); (2) there's no way to know which buttons are reliably targetable until a capture run fails on one.

**Recommendation — add as its own small phase:** standardize a required or auto-derived `data-testid` on `Button` and other core interactive primitives (e.g. derive one from the action's semantic name/label at the call site, or make the prop required in the type signature so it's caught at compile time rather than discovered at capture-run time). This is exactly the kind of "reuse existing components, fix at the shared source" move the project already favors elsewhere (see the payment-aggregation bug fix in the design-system skill's build discipline) — one change to `Button.tsx` benefits every page instead of patching selectors per-script.

This also means Phase 1's route consolidation isn't just a human-readability fix: retiring the duplicate design-lab routes and replacing the dashboard replica with the real component tree (Phase 2) removes duplicate automation targets too — right now, similarly-labeled buttons living on three different "design lab" pages are exactly the kind of ambiguity that breaks `getByRole` matching or silently clicks the wrong instance.

---

## 7. Open decisions — need your call before Cursor starts

1. **Founder/homepage tokens** — merge into the main design-system token system with the lab covering it (§4.5a), or build a small separate "marketing lab" (§4.5b)?
2. **`(concept)` route group** — confirm none of `dashboard-north-star-v1/v2`, `command-center-v1`, `workspace-v1`, `alpha-tracker`, `altair-shell-color-lab-v1`, `altair-shell-north-star-v1/v2/v3` are still an active reference before deletion. If unsure, safer first step is un-linking them from nav (if linked at all) and leaving the files for one more cycle rather than deleting outright.
3. **Publish flow** — keep the current save-then-mark-live two-step, or would you rather changes go live immediately with an undo, given this is a small internal tool and not a multi-editor system?

---

## 8a. Resolution log — what actually shipped

Real root cause, confirmed by tracing rather than guessed: the design-lab preview mounting the real `MissionControlV2View` (a good fix, §4.2) surfaced a pre-existing production CSS rule in `globals.css` that intentionally aliased the dashboard's content-well background to the sidebar color whenever the real Mission Control canvas was present. That's why "change the sidebar, watch the canvas move too" only appeared *after* the preview started using real components — it wasn't a lab bug, it was a dormant production coupling the lab finally exposed.

Decision made: make canvas and sidebar (and everything else bundled the same way) genuinely independent everywhere, not just in the lab preview. Shipped:

- Removed the `:has(.mc-dashboard-olive-canvas)` alias rule from `globals.css`; dashboard now falls back to its own already-existing independent default (`--north-star-content-well: #414a35`, distinct from sidebar's `#4a5540`) like every other admin page already did.
- Flattened `DesignLabDashboardShellClone`'s target structure (sidebar-shell/topbar-shell/chrome-two-tone as siblings, not nested inside chrome-shell) — fixes a secondary hover-outline bleed issue found along the way, confirmed not the color-bleed cause itself.
- Full audit of every CSS variable that was a real, independent token but stuck inside a bundled edit-target group (the same "Chrome shell" pattern that caused the original bug) — split into individual controls: page canvas, chrome panel, chrome border, header strip, content-well, altair-border/border-strong, work-border/border-strong, border-subtle/border-strong.
- Verified via repo scripts (`scripts/verify-design-lab-canvas-sidebar-independence.mjs`, `scripts/verify-design-lab-individual-edit-targets.mjs`) and screenshots in `public/marketing/screenshots/comparison/` — each control confirmed to move only its own region, siblings confirmed to stay put, and the full save → mark-live → real-dashboard path confirmed working end to end (then reverted off probe colors).

**Note on default contrast:** removing the alias left the dashboard's canvas/sidebar default color separation quite subtle (~9-11 RGB per channel) — flagged by Cursor as possibly reading like unintentional banding rather than deliberate two-tone at rest. Worth a visual gut-check; if it looks muddy, it's a one-line default-value change, not a rework.

**Still open, not urgent:**
- Non-color controls Cursor found real but didn't wire in: `--radius-panel`, `--radius-section`, `--north-star-sidebar-width`, `--shadow-*`. Same low-effort pattern as everything above whenever wanted.
- "Add brand-new elements that don't exist yet" (as opposed to exposing existing tokens) — deliberately deferred, needs its own scoping conversation before any code, not a drop-in extension of this work.
- Everything in §7 (route retirement decisions) and §5 Phase 5 (video generator sync) — untouched by this work, still open per their original sections above.
- §4.5 (founder/homepage token integration) — still not started; `homepage-tokens.ts` remains fully disconnected from the design-lab tool.

---

## 8. Brief for Cursor

Point Cursor at this document plus the project's existing discipline (already established in the `altair-design-system` skill and `AGENTS.md`) — same rules that already apply to every other panel:

- **Audit before building**, per the existing "ready to wire / buildable / not buildable" three-way sort — for each phase above, confirm the actual current state in code before changing anything (this doc is a starting map, not gospel — code may have moved since this audit).
- **Small, verifiable passes** — one phase at a time from §5, not one giant refactor prompt. Screenshot-verify the design-lab preview against the real page after Phase 2 specifically, since that's the change most likely to have subtle drift.
- **Reuse existing components/tokens** — the fix here is almost entirely re-pointing existing plumbing at the right target, not inventing new patterns.
- **Update source-of-truth docs in the same pass** — `docs/BUILD_PLAN.md` in `AltairDemoTool` and whatever route/roadmap doc `altair-os` tracks, per `AGENTS.md`'s own "Definition of done."
- **Local tooling that depends on page markup goes stale on redesign** — the project has already been bitten by this once (founder screenshot capture script selectors). Anything in `scripts/` that targets pages touched by this plan should be checked in the same pass.
- Run `npm run lint`, `npx tsc --noEmit`, and `npm run build` in `altair-os` after each phase before calling it done.
