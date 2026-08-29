# a374d50d546e4baf9

## Summary
The CSS foundation is four accreted token generations — legacy admin (--surface-*/cyan), North Star (52 --north-star-* vars), the Altair Design Foundation (27 --altair-* semantic roles), and hardcoded-hex TypeScript token objects (north-star/tokens.ts) — held together by a ~1,700-line globals.css override layer that repaints Tailwind utility classes (including escaped arbitrary classes like `.bg-\[\#FBF7EF\]`) with 382 !important declarations. The project's own "never hardcode hex" rule is violated 1,364 times across 202 component files (280 distinct hex values), including 316 hexes inside shared/design-system itself, and the Aug 2026 Platinum Circuit retune only moved the CSS variables — the retired blue-black #1A2029/#273140 family survives hardcoded in overlays, dispatch, and detail heroes, directly contradicting globals.css's "no blue hue left anywhere" claim. There is no user-reachable dark theme ([data-theme="dark"] is fully defined but nothing ever sets it), while a leftover create-next-app prefers-color-scheme block flips default text to near-white on light surfaces for dark-OS users. Scale coherence is weak: 1,000+ arbitrary text sizes (text-[10px] ×512), 261 arbitrary shadows, and 13 distinct arbitrary radius values dwarf the 2 radius / 3 shadow tokens. The good news: the Foundation layer (altair-tokens, button/field-styles, AltairTable/AltairDialog :where() primitives) is genuinely well-designed, WCAG-aware, and already at ~1,506 utility usages — the fix path exists; adoption and deletion of the patch layer are what's missing.

## Findings

### [P1/SYSTEMIC] globals.css is a 1,700-line utility-class override engine, not a stylesheet — 382 !important declarations repaint Tailwind classes emitted by components
- category: token-architecture | effort: HIGH
- evidence: app/globals.css:1040-1069 targets escaped arbitrary classes (`.admin-north-star-shell .bg-\[\#FBF7EF\] { background-color: var(--north-star-work-row) !important }` for 8 enumerated ivory hexes); :1398-1500 rewrites `.text-slate-400/500/600/700/900`, `.text-cyan-700`, `.bg-cyan-600` inside header/notification/settings scopes; :2393-2520 restyles `.bg-cyan-600`, `.bg-indigo-600`, `.border-amber-200/300`, `.text-amber-800/900` inside dispatch; grep counts 382 `!important` in globals.css and 111 selectors targeting utility-class names. The enumeration already leaks: components emit `hover:bg-[#EFE4CB]` (2), `hover:bg-[#F5F0E4]` (5), `bg-[#FAF6EE]` (17, incl. shared/components/marketing-hub/*), `bg-[#FFF3D6]` (13) — none covered by the patch, so those elements render warm ivory inside the normalized cool blue-gray work surface. Selectors are case-sensitive (`bg-[#fbf7ef]` would be missed).
- why: Every component's rendered appearance depends on globals.css knowing its exact class string. Any Tailwind rename, hex-case change, or new ivory value silently escapes normalization (already happening — 37 unpatched ivory-class occurrences). It makes the codebase lie: reading a component tells you the wrong colors. This is the single highest-leverage refactor target: migrating components to the --altair-* roles they already have available deletes this entire layer.
- suggestion: Freeze the patch layer (no new selectors), then retire it scope-by-scope by moving the targeted components onto altair semantic utilities / northStar token objects. Add a lint rule banning arbitrary-value color classes (bg-[#...]) in shared/components.

### [P1/SYSTEMIC] Aug 2026 Platinum Circuit retune only changed CSS variables — the retired blue-black #1A2029 family survives in ~40 hardcoded sites, so overlays and heroes render the old blue chrome against the new neutral-black chrome
- category: token-drift | effort: MEDIUM
- evidence: globals.css:1019-1024 claims "no blue hue left anywhere in the chrome", but: globals.css:4570-4572 `.overlay-form-root[data-overlay-surface="north-star"] { background-color: #1a2029 }` (every mobile create/edit form), :2917-2923 expense mobile detail panel `background: #1a2029`, :2394-2431 dispatch workflow buttons `linear-gradient(#273140, #1a2029)`, :2964-2971 `.north-star-detail-hero` gradient rgb(34 43 56)→rgb(17 24 33) (customer/job detail heroes). shared/design-system/north-star/tokens.ts:549,557,584,592 hardcode `bg-[#1A2029]` / `from-[#273140]` for estimate+invoice overlay panels; :100,118,148,184 keep the blue #111B2E/#1A2538/#243448 dashboard hero family. Repo-wide counts: #1a2029 ×24, #273140 ×15, #0f141b ×13. shared/design-system/components/report-surface.ts:8-9 still documents Graphite as "#1A2029" though --altair-graphite is now #303132/#212122 (globals.css:137,208).
- why: Users see two competing darks: neutral black/graphite shell (retuned) framing blue-black overlays, dispatch CTAs, and detail heroes (not retuned). The retune comment asserting completeness is false, so the next developer trusts the wrong invariant. This is the direct cost of the hex-hardcoding pattern: a one-variable rebrand required ~40 manual edits that never happened.
- suggestion: Sweep all #1A2029/#273140/#111821/#0F141B/#2A3648 literals onto --altair-graphite/--north-star-* vars (or retune them deliberately), and fix the stale comments in globals.css:1022 and report-surface.ts:8.

### [P1/SYSTEMIC] 1,364 hardcoded hex occurrences (280 distinct values) in shared/components — the project's own foundational rule is the most-violated rule in the codebase, including 316 hexes inside shared/design-system itself
- category: token-adoption | effort: HIGH
- evidence: grep '#[0-9a-fA-F]{6}' shared/components/*.tsx → 1,364 occurrences / 202 files; 1,161 remain after excluding exploration dirs (color-lab, north-star-v1/v2/v3, homepage, design-lab, marketing, auth). shared/design-system/*.ts → 316 (north-star/tokens.ts is a 928-line file of hex-laden Tailwind strings: text-[#17130E] ×284 repo-wide, text-[#4F4638] ×240, text-[#8A6324] ×155). Legacy palettes still dominate the foundation: text-slate-* ×2,966 and cyan-* ×669 occurrences vs ~1,506 altair-* utility occurrences (158 files). altair-tokens.ts:20 explicitly says "never hardcode a hex value"; globals.css:108-111 says components "must consume these roles ... instead of hardcoding hex values".
- why: Token migration is ~⅓ done and the un-migrated ⅔ is why the override layer (finding 1) and the failed retune (finding 2) exist. Trust in the design system's documentation collapses when its own modules are the biggest offenders — northStarListTokens/northStarDetailTokens are the sanctioned MC v2 vocabulary yet are pure hex.
- suggestion: Convert north-star/tokens.ts values to var(--altair-*)/var(--north-star-*) references first (highest leverage — 20 consumers inherit the fix), then burn down slate/cyan pages panel-by-panel per the existing roadmap.

### [P2/SYSTEMIC] Dark theme is fully specified but unreachable, while a leftover create-next-app prefers-color-scheme block flips default text to #ededed on light surfaces for dark-OS users
- category: theme-architecture | effort: LOW
- evidence: globals.css:200-243 defines the complete [data-theme="dark"] token set; grep for data-theme across all .ts/.tsx finds only comments (altair-tokens.ts:5,127) — no setter, no toggle, no Settings control. Meanwhile globals.css:281-286 (@media prefers-color-scheme: dark) flips --background/--foreground to #0a0a0a/#ededed — boilerplate from create-next-app — while body keeps `background: var(--surface-canvas)` (#f3f5f7) and inline #f4f7fa from app/layout.tsx:74-78. body{color:var(--foreground)} (globals.css:300-304) therefore resolves to near-white text on a near-white canvas for any element relying on inherited color when the OS is in dark mode. app/layout.tsx:27 sets viewport colorScheme:"light", which does not stop the media query from matching.
- why: Any unstyled text (error boundaries, third-party embeds, future components that forget an explicit text class) becomes invisible for dark-mode users — a silent trap that will bite exactly where styling attention is lowest. Separately, the dead [data-theme] scope is 44 lines of tokens that can drift unnoticed since nothing renders them; altairToken()'s documented theme-awareness (altair-tokens.ts:124-131) is a promise the app cannot keep.
- suggestion: Delete the prefers-color-scheme block (the app is explicitly light-first) or point it at real dark tokens; either ship the data-theme toggle or mark the dark block as staged-infrastructure with a test that fails if values drift from :root intent.

### [P2/SYSTEMIC] Brass, the 'single brand accent', exists as 20+ unmanaged gold hexes with three competing canonical values
- category: color-hierarchy | effort: MEDIUM
- evidence: Tokens define brass as #977D2A/#D4AF37 (--altair-brass, globals.css:168,226) and #B8912F/#D4AF37/#9A7209 (--north-star-brass/gold/bronze, :53-55). But components and globals hardcode a parallel family: #C9A44D ×79, #C6A757 ×44 (north-star/tokens.ts eyebrows/rails), #B8943F ×42, #B88A2E ×38, #E6D092 ×51, #D6BE78 ×30, #8A6324 ×155, plus #8B7232, #9A7028, #DABB55, #F5E6A3, #E8DDC2, #6B5A2E, #D4B05A, #F0E4B8 — 20 distinct brass-family hexes repo-wide. Focus rings alone disagree: rgb(201 164 77 / 0.35) (globals.css:1534, checkbox focus :1730), --north-star-brass-ring rgb(212 175 55 / 0.28) (:89), ring-altair-brass/40 (report-surface.ts:47).
- why: The 2% brass budget (color-hierarchy.ts:5) can't be governed when 'brass' is 20 slightly-different golds; gradients, rings, and icons visibly disagree across adjacent panels (dashboard hero uses #C6A757, list ledgers #C9A44D, tokens say #D4AF37). A future brass retune repeats finding 2's failure mode.
- suggestion: Declare a brass ramp (e.g. brass-100..900) as CSS vars derived from #D4AF37, map every existing hex to a step, and forbid new gold literals.

### [P2/SYSTEMIC] No typographic scale: 1,000+ arbitrary font-size utilities, 29 distinct one-off sizes, sub-9px text in production components
- category: typography | effort: MEDIUM
- evidence: shared/components arbitrary sizes: text-[10px] ×512, text-[11px] ×430, text-[9px] ×49, text-[8px] ×4, text-[7px] ×1, text-[13px] ×26, text-[15px] ×11, plus 21 more distinct rem values (text-[2.35rem], text-[1.85rem], text-[0.925rem]...). The @theme block (globals.css:245-279) registers zero typography tokens — only colors and two font vars. CSS classes hand-roll their own sizes (admin-heading-page 1.25rem/800, ledger thead 0.625rem, altair-table-head 0.6875rem). Fonts loaded: Geist Sans + Geist Mono (app/layout.tsx:7-15, next/font), Instrument Serif as --font-altair-display scoped to app/(marketing)/layout.tsx:1-8 only — `.ah-hero-display` (globals.css:724-727) falls back to ui-serif if referenced outside marketing.
- why: 10px/11px uppercase-tracked micro-labels are the app's de facto body-adjacent size (942 occurrences) — below comfortable readability and impossible to retune globally; 7-9px text (54 occurrences) fails legibility outright at standard DPI. Without named steps, every new component invents its own size, which is exactly the observed distribution.
- suggestion: Register a type scale in @theme (e.g. --text-micro 11px / --text-label 12px floor), migrate text-[10px]/text-[9px] usages up to the floor, and ban arbitrary px font sizes below 11px.

### [P2/SYSTEMIC] L5 density register rewrites element geometry and spacing utility classes with !important inside every form — utilities no longer mean what they say
- category: css-architecture | effort: MEDIUM
- evidence: globals.css:1180-1248: `.admin-north-star-shell .admin-shell-main` forces min-height:2rem on all inputs/selects, 0.75rem labels, and rewrites `.space-y-3/4/5/6` child margins to 0.625rem, `.pb-4/5/6`→0.75rem, `.pt-/.mt-/.mb-4/5/6`→0.75rem, all !important, desktop-only. This silently overrides the canonical field-styles.ts contract (min-h-11 sm:min-h-9, field-styles.ts:16) and any intentional pb-6 that isn't about form density.
- why: Deliberate as a single density knob, but it's a specificity landmine: component code and rendered output diverge for any spacing utility inside a form, Tailwind spacing classes become unreliable inside .admin-shell-main, and the 2rem control height conflicts with the design system's own min-h-9 desktop standard without either file referencing the other.
- suggestion: Move density into tokens the controls consume (--control-height, --form-gap) set on the shell scope, so field-styles reads var() instead of being overridden; delete the utility-class-targeting rules.

### [P3/SYSTEMIC] Radius and shadow scales exist as tokens but are outnumbered ~30:1 by ad-hoc literals; MC v2 then zeroes radii via overrides
- category: scale-coherence | effort: MEDIUM
- evidence: Tokens: --radius-panel 0.875rem, --radius-section 0.75rem (globals.css:15-16); --shadow-card/panel/sticky (:21-23). Usage: rounded-[var(--radius-STAR)] (literal defused for Tailwind scanner) ×8 total, vs arbitrary rounded-[1rem] ×54, rounded-[1.25rem] ×35, rounded-[1.5rem] ×17, and 10 more distinct arbitrary radii (1.75, 1.35, 1.4, 1.2, 0.95, 0.7rem...). 261 arbitrary shadow-[...] literals in components/design-system (northStarTokens heroShell shadow-[0_16px_48px_-16px_rgba(0,0,0,0.48)...], tokens.ts:100). Meanwhile globals.css:1649-1656 sets border-radius:0 on .admin-card/.admin-panel/.altair-surface-workspace inside the shell, and :1254-1262 flattens .admin-page-header — the sharp-vs-soft decision is implemented as yet another override rather than a token change.
- why: Corner radius is one of the strongest visual-identity signals; 13 competing radii plus a radius-zeroing override layer means adjacent cards disagree (1rem vs 1.25rem vs 0 within a page) and the sharp/soft brand direction can't be tuned in one place despite --radius-section being 'Design Lab editable' (mc-surface.ts:9).
- suggestion: Extend the radius scale (--radius-card, --radius-plate, --radius-hero), map arbitrary values onto it, and express the MC v2 sharp look by setting the vars to 0 in the shell scope instead of overriding classes.

### [P3/LOCAL] Chart/SVG colors are half-tokenized: the sanctioned altairToken() helper has exactly one consumer, and the chart-style module mixes var(--altair-*) with 8 hardcoded Tailwind-palette hexes
- category: charts | effort: LOW
- evidence: No chart library exists (no recharts/d3/chart.js imports) — charts are hand-rolled SVG. shared/components/reports/north-star-chart-styles.ts:10,28 hardcode REVENUE_SKY #38BDF8 / pointPeak #7DD3FC; :74 stroke #F43F5E; :108-112 categorical strokes #34D399/#A78BFA/#FBBF24/#2DD4BF/#FB7185 — while :35-79 correctly use var(--altair-success/warning/danger). north-star/tokens.ts:201-202 duplicates --altair-success's value as literal healthScoreGradientStart #059669. altairToken() (altair-tokens.ts:129) is consumed by exactly one component: shared/components/dispatch/DispatchMap.tsx. report-icon-tints.ts uses raw Tailwind palette classes (bg-sky-500/25 etc.) by design.
- why: Chart hues bypass the semantic system, so the sky-blue revenue line and rose stroke are invisible to any theme/retune work, and the categorical set can collide with semantic meanings (rose #FB7185 next to --altair-danger). The one-consumer altairToken shows the inline-style token path is documented but not adopted.
- suggestion: Define chart-series tokens (--chart-1..6 + --chart-revenue) as CSS vars and route north-star-chart-styles.ts through altairToken()/var().

### [P3/LOCAL] Report Surface — the Reports-only register — already leaks into Schedule and Customers, eroding the two-system boundary
- category: surface-systems | effort: LOW
- evidence: report-surface.ts is imported by shared/components/schedule/ScheduleDayCell.tsx, app/(admin)/schedule/loading.tsx, and shared/components/customers/LeadPipelineMetricsHeader.tsx (grep: 20 importers total, 17 in reports/). mc-surface.ts:4-5 states Reports uses report-surface 'instead' — the boundary is prose-only, unenforced.
- why: The audit brief treats a third visual language as a finding; the mechanism that would create one is exactly this kind of quiet cross-import. Schedule is known-legacy (roadmap panel), but LeadPipelineMetricsHeader puts dark Graphite report chrome inside the light Customers hub.
- suggestion: Either bless these as intentional (rename the module surface-dark.ts) or move the two non-Reports consumers onto mc-surface; add an ESLint import-boundary rule for report-surface.

### [P3/SYSTEMIC] Retired cyan/teal accent system is still defined, still rendered, and still being patched over per-page
- category: legacy-accent | effort: MEDIUM
- evidence: --accent-teal #0891b2 + hover live at globals.css:17-19; consumed by .admin-section-link (:4267-4279) and hardcoded #0891b2 in .admin-heading-eyebrow (:4228-4235). Cyan focus/selection persists in .admin-list-row/.admin-table-row/.admin-segmented-item/.admin-filter-card-active (rgb(6 182 212), rgb(236 254 255), :4002-4155). Components still emit 669 cyan-* utilities, which the shell then repaints (.bg-cyan-600 overrides at :1444,:2394,:2776; .text-cyan-700 at :1444). --accent-teal-muted is defined and never consumed (1 occurrence = its definition).
- why: Cyan is the pre-brass brand accent; it resurfaces on any legacy path the patch layer doesn't cover (focus rings and selected rows are keyboard-user-facing), and every patched cyan is double work — emitted then overridden.
- suggestion: Replace cyan focus/selection primitives in .admin-* classes with the brass/ink equivalents already used by altair primitives, then delete --accent-teal*.

### [P4/LOCAL] Root shell background literal doesn't match the token its comment claims to match
- category: token-drift | effort: LOW
- evidence: app/layout.tsx:17-18: `/** Matches --surface-canvas in globals.css */ const APP_SHELL_BACKGROUND = "#f4f7fa"` — but globals.css:5,7 define --surface-canvas: #f3f5f7. The literal paints html+body inline (layout.tsx:74,78), so first-paint/overscroll shows a 4th near-white distinct from the canvas.
- why: Tiny visually, but it's the token system's thesis failing at the very root element: a duplicated value with a comment asserting sync that drifted. Also unthemeable (inline style can't respond to any future dark scope).
- suggestion: Delete the literal; set backgroundColor via the CSS var or a shared constant exported next to the token.

### [P4/SYSTEMIC] Token vocabulary carries duplicates, dead entries, and false documentation
- category: token-hygiene | effort: LOW
- evidence: --surface-panel ≡ --surface-card (both #fafbfc, globals.css:9-10). The 52-var --north-star-* family is defined twice (:38-98 :root, :977-1030 .admin-north-star-shell) with one deliberate divergence (--north-star-text-muted aliasing) — a standing drift risk. Dead: --accent-teal-muted (0 consumers), altairSurfaceLevelClass (surface-hierarchy.ts:49-55, only re-exported). Stale docs: globals.css:112-114 still claims 'nothing in the product consumes these tokens yet' (≈1,506 usages exist); altair-tokens.ts:4 cites docs/product/ALTAIR_DESIGN_FOUNDATION.md while globals.css:105 cites docs/altair/ALTAIR_DESIGN_FOUNDATION.md; single-purpose component vars pollute the global namespace (--north-star-caught-up-fill, globals.css:52).
- why: Each stale comment or duplicate is small, but together they teach developers to distrust the token files, which drives the hardcoding behavior measured in finding 3.
- suggestion: One hygiene pass: dedupe panel/card, collapse the double NS definition into the shell scope only, delete dead tokens, correct the two doc paths and the 'infrastructure only' comment.

## Inventory
# Altair OS — Theme architecture inventory (tokens / CSS foundation dimension)

## 1. Build pipeline
- **Tailwind v4, CSS-first**: `@import "tailwindcss"` (globals.css:1); no `tailwind.config.*` anywhere; postcss.config.mjs = `@tailwindcss/postcss` only.
- **`@theme inline`** (globals.css:245-279) registers **colors only** (27 `--color-altair-*` mappings + background/foreground) and 2 font vars (`--font-sans`→geist-sans, `--font-mono`→geist-mono). **No spacing, typography, radius, or shadow tokens are registered with Tailwind** — those are consumed via arbitrary values (`rounded-[var(--radius-section)]`) or raw literals.
- globals.css is **5,136 lines**; ~65% of it is scoped override CSS (`.admin-north-star-shell …`, per-page ledger/filter-bar/header rules), not foundation.

## 2. Theme scopes
| Scope | Location | Status |
|---|---|---|
| `:root` light (legacy admin) | globals.css:3-99 | Live. `--surface-canvas #f3f5f7`, `--surface-section #eef1f4`, `--surface-panel ≡ --surface-card #fafbfc`, `--surface-tile #f7f8fa`, `--surface-muted`, `--border-subtle/strong`, `--radius-panel .875rem`, `--radius-section .75rem`, `--accent-teal #0891b2` (+hover/muted), `--shadow-card/panel/sticky`, then the full 52-var `--north-star-*` family |
| `:root` Altair Foundation | globals.css:123-198 | Live/canonical. 27 roles: stone/paper(+elevated/subtle)/graphite/ink(+secondary/muted)/ink-on-paper×3/border(+strong)/brass(+interactive)/4 status hues + 8 status foreground/surface pairs. AA-calibrated (brass #977D2A on light, #D4AF37 on dark) |
| `[data-theme="dark"]` | globals.css:200-243 | **Dead — nothing in the repo ever sets `data-theme`** (grep: comments only). No theme toggle exists anywhere in the product. Paper/status pairs intentionally constant; ink flips light; brass brightens |
| `@media (prefers-color-scheme: dark)` | globals.css:281-286 | **Leftover create-next-app boilerplate**: flips `--background/--foreground` to #0a0a0a/#ededed while body stays light → inherited-color text goes near-white-on-white for dark-OS users |
| `.admin-north-star-shell` | globals.css:977-1031 | Re-declares the entire NS family + `--north-star-work-*` (blue-gray work surfaces #E8EDF3/#DCE3EC/#FFF) + `--page-canvas-top/mid/deep` (#303132/#212122/#0a0a0a) |
| Viewport meta | app/layout.tsx:27 | `colorScheme: "light"`; html/body painted inline `#f4f7fa` (≠ `--surface-canvas #f3f5f7` despite comment claiming match) |

**Answer to "is there a light theme at all / a toggle?"** — The app is light-first with a permanently dark chrome (sidebar/topbar/page-frame). Dark theme tokens exist but are unreachable; no toggle. Design Lab (platform-admin) is a token-editing tool, not a user theme switch.

## 3. Distinct visual/token systems found in code (count: 10 live + exploration)
1. **Legacy admin light** — `--surface-*`/`--border-*`/`--accent-teal` + ~80 `.admin-*` classes (cards, tables, metric tiles w/ cyan focus + per-hue icon gradients, globals.css:3237-4453). Live on mobile canvas + un-migrated panels.
2. **Altair Surface Hierarchy** (Phase 1) — `.altair-surface-canvas/section/card/tile/list(-row)` + attention variant (globals.css:3258-3454; shell/surface-hierarchy.ts). Live. Also carries NS bridge classes (`.altair-surface-ns-card/tile`, ivory — the "legacy ivory shadows" lineage).
3. **Altair Design Foundation** — `--altair-*` 27 roles + Tailwind utilities + `altairToken()` (foundation/altair-tokens.ts) + canonical Button/Field/Table/Dialog primitives (`:where()`-wrapped, zero-specificity — well engineered). Live, canonical, ~1,506 utility occurrences / 158 files.
4. **North Star CSS vars** — 52 `--north-star-*` + work-surface + page-canvas families; chrome, ledgers, filter bars. Live on all desktop admin.
5. **North Star TS token objects** — north-star/tokens.ts (928 lines): dashboard hero (blue #111B2E family), list pages (moon graphite + `bg-[#DCE3EC]` bands), detail pages, estimate/invoice documents (`bg-[#1A2029]` overlays), dispatch — **pure hardcoded-hex Tailwind strings** (largest hex source: #17130E ×284, #4F4638 ×240, #8A6324 ×155 repo-wide).
6. **MC v2 surface** — components/mc-surface.ts; mixes three var families in single class strings (`--radius-section` + `--north-star-plate-border` + `--surface-section` + `text-altair-ink-on-paper`). 20 importers; consumed by dashboard/mission-control-v2 + hub pages.
7. **Report Surface** — report-surface.ts + report-icon-tints.ts (dark Graphite register, all altair tokens + Tailwind palette chip tints). 20 importers — 17 in reports/, **3 leaks**: schedule/ScheduleDayCell, app/(admin)/schedule/loading, customers/LeadPipelineMetricsHeader.
8. **Technician light shell** — `.tech-canvas/.tech-shell/.tech-header/.tech-bottom-nav` (slate/white frost, globals.css:4637-4702). Legacy tech area.
9. **Auth/login dark navy** — `.auth-*`/`.login-*` (#0D1724 autofill, cyan glows, gold sheen animations, gear motif; globals.css:379-711). Logged-out.
10. **Marketing dark** — `.mc-homepage` #08090C + `.ah-hero-*` + glass cards; Instrument Serif `--font-altair-display` loaded only in app/(marketing)/layout.tsx.
- **Exploration (not counted, but hex-heavy):** altair-shell-color-lab-v1, altair-shell-north-star-v1/v2/v3, design-lab replicas; `.admin-command-surface` cyan-glow dark card (globals.css:4704-4734) appears to be a v2-era remnant.

## 4. Scale coherence
- **Typography**: fonts = Geist Sans (body via `--font-geist-sans`), Geist Mono (32 `font-mono` uses), Instrument Serif (marketing only). **No type scale**: text-[10px] ×512, text-[11px] ×430, text-[9px] ×49, text-[8px] ×4, text-[7px] ×1, +24 more distinct arbitrary sizes; CSS classes define their own (0.625rem ledger heads, 1.25rem page headings).
- **Spacing**: no tokens; Tailwind defaults + the L5 density register (globals.css:1180-1248) which **rewrites spacing utility classes with !important inside forms**.
- **Radius**: 2 tokens vs 13 distinct arbitrary values (rounded-[1rem] ×54, [1.25rem] ×35, [1.5rem] ×17…); MC v2 shell zeroes radii by override (globals.css:1649-1656).
- **Shadows**: 3 tokens vs 261 arbitrary `shadow-[…]` literals.
- **Motion**: ~20 keyframes (auth×5, login×2, homepage/mc×7, skeletons×2, dialog×2, nav underline, drawer); **all properly guarded by prefers-reduced-motion** (9 reduce blocks) — a genuine strength.
- **Scrollbars**: three treatments (9px admin shell thin-slate; 6px login + dispatch panel; hidden mobile nav rail).
- **Print**: comprehensive (globals.css:4784-5135): letter @page, force-white body, neutralizes 9 Tailwind hue families via `[class*=]` attribute selectors, per-document (invoice/estimate/tax) break-inside + compaction, hides chrome. Solid, though coupled to Tailwind class naming.

## 5. Charts/SVG color sourcing
- No chart library — hand-rolled SVG (reports/RevenueTrendChartCard, ReportKpiCard, CashHealth/ReceivablesAging/SalesFunnel/TopPerformers, dashboard sparkbars).
- reports/north-star-chart-styles.ts: **mixed** — `var(--altair-success/warning/danger)` for trend strokes, but hardcoded #38BDF8/#7DD3FC (revenue), #F43F5E, and 5-color categorical set #34D399/#A78BFA/#FBBF24/#2DD4BF/#FB7185.
- `altairToken()` (the sanctioned inline/SVG API) has **exactly 1 component consumer**: dispatch/DispatchMap.tsx.
- northStarTokens duplicates `--altair-success` as literal #059669 gradient stops (tokens.ts:201-202).

## 6. Key metrics (grep-verified)
| Metric | Value |
|---|---|
| Hardcoded 6-digit hexes, shared/components/*.tsx | 1,364 occurrences / 202 files (1,161 excl. exploration+marketing+auth) |
| Hardcoded hexes, shared/design-system/*.ts | 316 |
| Hardcoded hexes, app/**.tsx | 16 |
| Distinct hex values (components+design-system) | 280 |
| Distinct brass/gold hexes repo-wide | 20 |
| `!important` in globals.css | 382 |
| Selectors targeting utility-class names in globals.css | ~111 |
| altair-* utility occurrences / files | ~1,506 / 158 |
| text-slate-* occurrences (components) | 2,966 |
| cyan-* occurrences (components) | 669 |
| Arbitrary text sizes | 1,073 (text-[10px] 512, text-[11px] 430) |
| Arbitrary shadow-[…] | 261 |
| Ivory arbitrary bg classes targeted by CSS patch | 8 enumerated; ≥37 occurrences escape (hover:bg-[#EFE4CB]×2, hover:bg-[#F5F0E4]×5, bg-[#FAF6EE]×17, bg-[#FFF3D6]×13) |
| `--north-star-*` vars | 52 (defined twice: :root + shell scope) |
| `--altair-*` roles | 27 (all consumed; status pairs 15-29 uses each) |
| Dead tokens | --accent-teal-muted, altairSurfaceLevelClass, [data-theme=dark] scope (unreachable) |

## 7. Notable strengths (context for the lead)
- The Foundation layer is high quality: role-based naming, ink-on-paper vs flipping-ink distinction, AA-verified status foreground/surface pairs, `:where()` zero-specificity primitives (AltairTable/AltairDialog) that let NS overrides win without !important, reduced-motion coverage everywhere, thoughtful iOS safe-area/zoom handling. The problem is not the design of the token system — it is that adoption stalled at ~⅓ and the gap is bridged by the override/patch layer instead of migration.
