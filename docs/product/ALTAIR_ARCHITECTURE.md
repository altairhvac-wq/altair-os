# Altair OS — Navigation & Naming Architecture (the constitution)

**Status:** Proposed standard — decisions in §4 need founder sign-off; everything else is codification of what already exists.
**Written:** Aug 6 2026, after a full inventory of `app/(admin)`, `nav-items.ts`, hub registries, and both design labs.

## 1. What exists today (verified inventory)

**The hub-and-redirect pattern is already consistently implemented and is GOOD. Keep it.** Six legacy routes (`/jobs`, `/estimates`, `/invoices`, `/payments`, `/leads`, `/technicians`, `/time-clock`) all redirect into their hub's tab with query params preserved, each via a typed registry lib (`shared/lib/{hub}/{hub}-hub.ts`). Detail routes (`/jobs/[id]`, `/estimates/[id]`, `/invoices/[id]`, `/customers/[id]`) stay standalone. This is textbook.

The disorganized feel comes from five things layered on top:

1. **Label ↔ route mismatches** — the sidebar says one name, the URL says another: "Feedback" → `/alpha-tracker`, "Community" → `/network`, "Labor & payroll" → `/time` (gated by a `/time-clock` permission), "Work" → `/work` but its detail rows live at `/jobs/[id]`. Every mismatch is a ghost tab: what you clicked and where you land don't share a name, and `isAdminNavItemActive` needs hand-written special cases to keep the right tab lit.
2. **Six dead experiment routes still mounted as top-level pages:** `dashboard-mission-control-v2`, `dashboard-north-star-v1`, `dashboard-north-star-v2`, `command-center-v1`, `workspace-v1`, plus `altair-design-lab`. Any link into these leaves the canonical app entirely — with no nav item active (a literal ghost).
3. **Four shell experiments in `shared/components`** (`altair-shell-color-lab-v1`, `altair-shell-north-star-v1/-v2/-v3`) alongside the live `admin/` shell.
4. **Two design labs:** `/altair-design-lab` (component workshop) and the platform-admin design lab (live theme editor that injects CSS vars via `AdminShell`). Related jobs, unrelated tools.
5. **Three-plus visual vocabularies:** altair tokens (canonical), MC v2 / Report Surface (intentional, documented), and the V2 lab components — which are built on raw `slate-*` classes, not tokens. The lab that's supposed to define the system doesn't use the system.

## 2. The naming law (one ID drives everything)

Every destination has exactly one kebab-case **id**. Everything derives from it mechanically:

| Derived thing | Pattern | Example (`id = work`) |
|---|---|---|
| Route | `/{id}` | `/work` |
| Nav label | Title-case of id (or explicit `label`, but see §4) | Work |
| Nav link testid | `nav-link-{id}` | `nav-link-work` |
| Page-ready testid | `page-{id}` | `page-work` |
| Async widget (AsyncSection `feature`) | `{id}-{widget}` | `work-job-list`, `dispatch-map-panel` |
| Hub tab param | `?tab={tab-id}` (kebab), default tab omits param | `/sales?tab=estimate-pipeline` |
| Tab testid | `tab-{id}-{tab-id}` | `tab-sales-invoices` |
| List row testid | `{entity}-row` (entity singular) | `job-row`, `invoice-row` |
| Permission key | the route itself | `/work` |

Rules:
- **A new special case in `isAdminNavItemActive` is a design smell.** If active-state matching needs a hand-written exception, the id law is being violated somewhere — fix the name, not the matcher.
- **Testids and AsyncSection feature names are API** — the demo-video pipeline and screenshot scripts key off them. Renaming one is a breaking change: grep `D:\AltairDemoTool` and `scripts/capture-founder-marketing-screenshots.mjs` first, update in the same pass.
- **Permission keys equal routes.** The `/time` ↔ `/time-clock` permission indirection in `getAdminNavItems` gets deleted when §4's rename lands.

## 3. Hub & tab convention (codifying the existing good pattern)

- A **hub** is a top-level destination with tabs: Work, Sales, Team, Customers. Each has `shared/lib/{id}/{id}-hub.ts` exporting: `{HUB}_TAB_IDS` (as const), labels record, default tab, `resolve{Hub}Tab()`, `build{Hub}Href()` — exactly the `sales-hub.ts` shape. No component builds a hub href by hand.
- Default tab omits `?tab=`; legacy redirects force it (already the convention).
- Legacy redirect routes are **permanent** — external links and muscle memory depend on them. They are 15-line files; they never get "cleaned up."
- New sub-destinations are tabs in an existing hub or details under it — never a new top-level route without deliberately adding it to the constitution's table.

## 4. Naming decisions needed (founder sign-off — recommendations included)

| # | Today | Problem | Recommendation |
|---|---|---|---|
| 1 | "Feedback" → `/alpha-tracker` | Route named after an internal phase, label says something else | Rename route to `/feedback`, keep `/alpha-tracker` as permanent redirect. "alpha-tracker" will read stale post-alpha anyway |
| 2 | "Community" → `/network` | Two names for one concept | Pick one word and use it for both. Slight lean: **Community** (label is what users say out loud) → route `/community`, `/network` redirects |
| 3 | "Labor & payroll" → `/time`, permission `/time-clock` | Three names for one concept | id `payroll`: route `/payroll`, label "Payroll", `/time` redirects, permission key becomes `/payroll` |
| 4 | Work hub rows open `/jobs/[id]` | Hub and entity names differ | **Accept and document** — "Work" is the place, "job" is the entity; `job-row` and `/jobs/[id]` are entity-named, which follows §2. No change |
| 5 | `/schedule` hidden from nav (header calendar icon) | Route exists, no nav item — intentional? | Keep, but document it in nav-items.ts as deliberate (it already has a comment; move it into the constitution's table so it stops looking like an accident) |

## 5. Experiment lifecycle rule

- Experiments live **only** under `/platform/lab/*` (platform-admin gated), never as top-level sibling routes.
- Promotion means **replacing the canonical page in place, deleting the experiment route in the same PR**. v2 replaces; it never coexists.
- Archive now (move code you want to keep into `docs/design-archive/` or a git branch, then delete the routes): `dashboard-mission-control-v2`, `dashboard-north-star-v1`, `dashboard-north-star-v2`, `command-center-v1`, `workspace-v1`, and the four `altair-shell-*` component dirs.
- Merge the two design labs into one `/platform/lab` with two sections: Components (the current `/altair-design-lab` content) and Theme (the live-vars editor). One door, everything behind it.

## 6. One visual vocabulary

- The V2 lab components (`HeroHeader`, `PriorityCard`, `PulseCard`, `MetricCard`, `InsightCard`, `ActionCard`, `StatusPill`, form primitives) migrate off `slate-*` onto altair tokens (`stone/paper/ink/border` + semantic). Mechanical find-and-map; the components' shapes are good.
- After that, the app has exactly three sanctioned surface systems, all token-fed: base (light paper), MC v2 (dashboard dark cards), Report Surface (reports dark cards). Anything else is drift.
- The color-hierarchy budget (~90% neutral / 8% semantic / 2% brass) applies to every screen, and semantic colors keep strict meaning (red = bad news, never a category color).

## 7. The video-editor contract

The demo pipeline scripts (AltairDemoTool) address the app exclusively through this table. It IS the public API of the UI:

| Page (id) | Ready signal | Async widgets (`{feature}-ready`) | Rows |
|---|---|---|---|
| dashboard (`/`) | `page-dashboard` | — | — |
| work | `page-work` | `work-job-list` (planned) | `job-row` |
| dispatch | `page-dispatch` | `dispatch-map-panel` (exists) | — |
| team | `page-team` | — | `technician-row` |
| customers | `page-customers` | — | `customer-row` |
| sales | `page-sales` | per-tab (planned) | `estimate-row`, `invoice-row`, `payment-row` |
| reports | `page-reports` | per-card (planned) | — |
| Job detail | `page-job-detail` | — | — |

Rule: a demo script may only wait on `page-{id}`, `{feature}-ready`, `tab-{id}-{tab}`, or `{entity}-row`. If a script needs anything else, the page is missing a hook — add the hook, don't teach the script CSS selectors (that's how the founder-screenshot script went stale).

## 8. Shell Layer Model (added Aug 6 after the frame redesign)

Every pixel in the signed-in app belongs to exactly one of these layers. When editing a surface, identify its layer FIRST — each layer has one owning class and one variable set, all in `app/globals.css` unless noted.

| Layer | What it is | Owning class | Color source |
|---|---|---|---|
| L0 — Chrome | Sidebar + top bar + the frame around everything | `.admin-north-star-shell` (+ `.admin-shell-main`, which paints the same surface) | `--north-star-root` / `-sidebar` / `-topbar` |
| L1 — Page canvas | The floating rounded panel each page renders (the "moon graphite" blue) | `.north-star-list-page-canvas` / `.north-star-detail-page-canvas` / `.north-star-page-header` | `--page-canvas-top/-mid/-deep/-border`, `--page-header-top/-bottom` |
| L2 — Section/card | MC v2 plates, list containers inside the canvas | `mc-surface.ts` classes (`altairMcCardClass`, `altairMcListClass`) | `--surface-section` / `--surface-card`, `--north-star-plate-border` |
| L3 — Tile | KPI/metric tiles inside sections | `altairMcTileClass` | `--surface-tile` |
| L4 — Row | List/table rows | `altairMcListRowClass` + table row classes | row hover tokens |
| L5 — Controls | Form inputs, selects, textareas, labels, form gaps | The **density register** in `app/globals.css` (element-level, shell-scoped) + `field-styles.ts` primitives | Register's rem values |

Rules:
- **Control geometry belongs to L5, never to components.** The density register in globals.css sizes every form control at the element level — it deliberately outranks any utility class a component carries (canonical primitives, legacy `admin-form-input`, or local one-offs). "Forms feel too big/small" is ALWAYS an edit to the register's numbers, never a per-component padding hunt. Components choose *what* fields exist; L5 decides *how big* fields are. Desktop-only — mobile keeps 44px touch targets.
- **One variable set per layer.** A layer's color must never be a hardcoded hex in a rule body (the L1 blue was, until Aug 6 — now tokenized). If you need a new surface color, add a var at the layer's definition block, don't inline it.
- **The Design Lab themes layers, not rules.** Live theme overrides set layer variables (`--north-star-*`, `--page-canvas-*`); if a theme change doesn't take effect somewhere, that spot is violating rule 1 — fix the rule, don't add an override.
- **`--north-star-content-well` is retired as a visible layer.** L0 chrome now runs continuously behind L1; the variable remains only for legacy references and should not be reintroduced as a middle band.
- **Scrollbars are chrome.** The shell-wide slim scrollbar treatment in globals.css is part of L0; components never style their own scrollbars.

## 9. Rollout order (safe → structural)

1. Commit this doc; append the naming law + experiment rule to the altair-design-system skill. *(No code risk)*
2. Archive-and-delete the 5 experiment routes + 4 shell dirs (grep for imports first). *(Deletes only)*
3. Token-migrate the V2 lab components off `slate-*`. *(Visual, contained)*
4. §4 renames (#1–#3), each as: new route dir + old route becomes a redirect + nav-items id updated + permission key updated. *(Mechanical, verify nav active states)*
5. Merge design labs under `/platform/lab`. *(Move)*
6. AsyncSection adoption per its own standard doc (dispatch map first).
