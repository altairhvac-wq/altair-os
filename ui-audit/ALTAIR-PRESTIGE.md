# Altair Prestige — visual foundation

The canonical record of Altair's visual language: what it is, why, and the rules
future work follows. Supersedes ad-hoc styling decisions. Read this before
adding a colour, a shadow, a radius, or a card.

---

## 1. The problem this campaign solves

Before this work, **Altair had no single source of visual truth.** The product's
appearance was decided at *runtime* by a combination of three independent
switches, producing three materially different products:

| # | Condition | What the user sees |
|---|---|---|
| 1 | Default source (no env flag, no DB theme) | Legacy cool slate/cyan page surfaces + neutral graphite chrome |
| 2 | `NEXT_PUBLIC_NORTH_STAR_SHELL=true` | North Star page surfaces + neutral graphite chrome |
| 3 | Condition 2 **+ a promoted Design Lab theme row** | North Star surfaces + **olive** chrome |

Two discoveries drove this campaign's architecture:

**(a) The olive identity was never in the codebase.** The warm olive chrome the
product actually renders came from a row in the `design_lab_themes` Postgres
table — 80 inline CSS custom properties injected onto `.admin-north-star-shell`
by `app/(admin)/layout.tsx` via `getLiveDesignLabTheme()`. That row is
`company_id`-scoped and is named **"im not sure"**. It is not version-controlled,
not reviewable in a diff, not portable between environments, and applies to
exactly one tenant. Every other company on the platform saw neutral graphite.

**(b) The env flag is undocumented as required.** `NEXT_PUBLIC_NORTH_STAR_SHELL`
is `true` in `.env.local` but **commented out in `.env.example`**, so a fresh
environment renders the legacy skin.

Consequence: "what Altair looks like" was unanswerable from the repository.

### The rule that follows

> **Altair's visual identity lives in source, in tokens, and applies by default.**
> No env flag, no database row, and no per-tenant override is required to see the
> real product. Runtime theming may *layer on top* of the canonical foundation;
> it may never *be* the foundation.

---

## 2. Design inputs

The Prestige direction is a fusion, not a repaint:

deep graphite-olive chrome · warm mineral/parchment canvas · porcelain-ivory
surfaces · champagne brass · emerald semantics · warm dark ink · subtle material
depth.

The promoted DB theme was harvested as *reference* — it is the olive direction
the product owner responded to — but not adopted verbatim. Its specific problems,
corrected in the canonical palette:

- `--north-star-sidebar: rgb(155 162 103 / 22%)` — a translucent olive wash whose
  final colour depended on whatever sat behind it. Chrome must be opaque and
  self-defined.
- `--altair-graphite: #1a2029` — reintroduced the **retired blue-black** family
  the codebase had explicitly moved away from, putting cool blue back into a
  warm palette.
- `--north-star-section-title: rgb(70 92 31 / 94%)` — a muddy olive-green for
  section headings that fought the brass accent for attention.

---

## 3. Decisions log

Decisions that matter, with rationale. Appended as the campaign proceeds.

### D-1 · Canonical tokens live in `app/globals.css`, not the database
The Design Lab live-theme feature is **preserved** (it is a legitimate
platform-admin exploration tool and removing it would delete working
functionality). But it is demoted from *source of truth* to *override layer*.

**Action required by a human, not done here:** the promoted theme row
("im not sure") still overrides chrome for the founder's company. It must be
un-promoted via the Design Lab UI for that company to see the canonical
foundation. This was deliberately **not** done automatically — it is a write to
the production database affecting live product appearance, which is outside what
this campaign should do unattended.

### D-2 · No database mutations during this campaign
All visual work is source-only. Validation that required bypassing the live
theme was done with a temporary, reverted local change — never a DB write.
`ui-audit/prestige-bypass.mjs on|off` toggles it. **It is currently OFF and
`app/(admin)/layout.tsx` is clean** — verify with `node ui-audit/prestige-bypass.mjs`
before committing; the bypass must never enter a commit.

### D-2b · Authenticated visual validation is currently blocked
`.playwright/founder-auth.json` no longer carries a Supabase session (see D-12
for how it was lost). Re-creating it needs an interactive sign-in with the
owner's password, which is outside what this campaign may do, so the final
palette sweep was verified against the build, the contrast gate, a residual-
literal scan and the public surfaces — **not** against authenticated
screenshots. Restore it with:

```
npm run capture:founder-auth
```

Then re-shoot: `AUTH_STATE=.playwright/founder-auth.json node ui-audit/shots.mjs post 1440`.

### D-3 · Repaint by redefining the palette, not by codemodding 1,400 call sites
The decisive structural finding: **Altair is not painted by its design tokens.**
An inventory of active surfaces found the product is painted by raw Tailwind
palette utilities — `border-slate-200` ×447, `bg-white` ×664, `bg-slate-50`
×272, `text-slate-*` ×2,966, `cyan-*` ×669 — roughly 1,400 surface/border call
sites that bypass every `--altair-*` and `--north-star-*` token. Re-pointing the
token layer alone would have repainted almost nothing.

Three options existed:

1. Codemod ~1,400 class strings across hundreds of files. Correct end state,
   enormous regression-prone diff, and no test suite exists to catch breakage.
2. Grow the `!important` override engine that already repaints utility classes
   inside the shell scope — the very thing the audit criticised (382
   `!important` declarations, selectors matching escaped arbitrary classes).
3. **Redefine what the palette names mean.** Tailwind v4 generates its palette
   from `--color-*` theme variables, so overriding them repaints every existing
   call site with zero component edits and zero override rules.

Option 3 was taken. `slate`/`gray` → a warm stone ramp; `cyan` → brass;
`emerald` deepened into the palette. **Lightness and ordering are preserved at
every step**, so existing contrast relationships — including the Phase 0
accessibility fixes — survive.

Consequence to know: `slate` and `cyan` are no longer literal in this codebase.
Read them as "the neutral ramp" and "the accent ramp". New work should still
prefer semantic roles.

This also changed the North Star fork's priority: because both branches are
painted from the same remapped palette, the legacy branch is now warm too. The
fork is a **code-duplication** problem, not a visual-fragmentation one.

### D-4 · Elevation is a first-class role, because flatness was measured
The product read flat for a concrete reason, not a subjective one: probing
computed styles in the running app showed card `box-shadow` resolving to
`rgba(0,0,0,0) 0px 0px 0px 0px` — fully transparent — and `globals.css`
carried explicit `box-shadow: none` on `.admin-card`, `.admin-panel`,
`.admin-section-surface`, and every `.altair-surface-*`. A card was a fill plus
a hairline and nothing else.

The `--elev-*` ramp pairs a tight **contact** shadow (anchors the edge) with a
broad **ambient** shadow (gives air), plus a 1px inset highlight so surfaces
read as lit from above. Kept cheap deliberately: small blur radii, no
`backdrop-filter`, no filter stacks, no animated shadows.

### D-5 · Semantic loudness must track consequence
`--altair-information` was `#2563EB` — generic SaaS blue. It marks the most
*routine* state in the product (a scheduled job, a normal-priority dispatch
block), so it was making calm states the loudest thing on the Dispatch board,
out-shouting overdue money. It is now a calm slate-teal (`#55707A`): still
legible as "cool / informational", no longer a shout. Success moved onto the
Prestige emerald; warning and danger kept their warm hues.

Report chart series were raw Tailwind-400 hexes (`#38BDF8`, `#34D399`,
`#A78BFA`, …) authored directly in a style module — the loudest off-brand
element left. They now come from canonical `--chart-1..6` roles, and the report
icon chips draw from the same ramp, so a chip and its chart line finally agree.

### D-6 · One chrome per role, not per breakpoint
The admin header was white below 768px and dark chrome above it, because the
rule painting it lived inside a `min-width: 768px` block. The same owner saw two
different products depending on device. Chrome is now the graphite surface at
every width. This also removed a client-side `useMobileViewport()` read from the
shell's first paint.

### D-7 · Accessibility is gated, not assumed
`ui-audit/contrast-check.mjs` checks every text/ground pair the foundation
introduces against WCAG AA and **fails the run** on a regression. It caught two
real failures on first execution — `ink-muted` on the sunken canvas (4.34) and
`brass-text` on canvas (4.08) — which were fixed by solving for compliant values
(`--pg-ink-500` → `#655E4E`, `--pg-brass-700` → `#77591B`) rather than accepting
them. Re-run it after retuning any canonical role.

### D-8 · Display typography carries identity; the sans carries the work
Instrument Serif was already in the project but scoped to the marketing layout,
so the product itself was set entirely in one sans — a large part of why the
admin read generic beside the brand surfaces. It is promoted to the root layout
and registered as the `font-altair` utility.

It appears in exactly one place in the shell (the greeting). That restraint is
the point: one display moment reads as identity, serif everywhere reads as
costume. Note for future work: `--font-*` is a reserved Tailwind v4 theme
namespace — declaring a display face in a plain `:root` block resolves empty at
runtime and silently falls back to the sans. Register it in `@theme inline`.

### D-9 · Atmosphere must be nearly invisible
Environmental geometry on the canvas is drawn with two repeating linear
gradients at ~1% ink. The first attempt (2.2% ink, 88px period, plus
`background-attachment: fixed`) was visibly striped and banded — it read as a
rendering bug, not atmosphere. Rule learned: if you can identify the pattern
without looking for it, it is too strong.

### D-10 · Every Tailwind hue family is remapped, or the sweep is not finished
D-3 remapped `slate`/`gray`/`cyan`/`emerald` and stopped there, which left the
product two-toned: warm neutrals underneath, stock Tailwind accents on top. An
inventory of what remained found ~2,000 further call sites across `sky`, `blue`,
`indigo`, `violet`, `purple`, `teal`, `amber`, `orange`, `red`, `rose`, `pink`.

The single most important of these was **amber, at 684 call sites**. Tailwind's
amber is a bright, high-chroma gold; sitting beside real champagne brass it read
as the cheaper of two golds. The product effectively had a **second brand
accent, louder than the first** — precisely the "cheap gold" failure this
campaign set out to avoid. Amber now *is* the brass ramp, so gold appears once
in the product and always means the same thing.

The rest were mapped by *role*, not by hue similarity:

| Family | Becomes | Why |
|---|---|---|
| `sky` `blue` `teal` | calm steel | informational, must not shout |
| `indigo` `violet` `purple` | muted plum | categorical, must stay distinct from steel |
| `amber` | brass | the accent |
| `orange` | ochre | warning — deliberately kept orange so it never reads as gold |
| `red` | deep warm red | danger |
| `rose` `pink` | terracotta | the tier *below* danger |

`rose` was deliberately **not** collapsed into `red`. The receivables-aging ramp
uses rose as the severity tier immediately below danger, so flattening them
would have destroyed a real distinction in the data. Categorical hues are
desaturated so they coexist with parchment, never merged so they stop
distinguishing.

Lightness ordering is preserved at every step, so existing contrast
relationships survive the remap.

### D-11 · Gate contrast by what a colour PAINTS, not by the colour
Extending the contrast gate over the remapped families produced 11 failures.
Chasing them naively would have made the palette worse.

Auditing all 36 call sites of the failing mid steps showed they are
overwhelmingly **icons** — `<Receipt className="h-4 w-4 text-amber-600" />`,
`iconClassName="text-rose-600 bg-rose-50"` — which WCAG scores as non-text
content at 3:1, not 4.5:1. Two of the "failures" (`text-orange-600`,
`text-pink-600`) had **zero call sites** and were pure fiction. Solving them all
at 4.5 would have dragged `amber-600` to `#7f642d`, effectively on top of
`amber-700`, collapsing the ramp and darkening every `bg-amber-600` surface in
the product to fix text that mostly wasn't text.

The gate now models role: `TEXT_ON_LIGHT` at 4.5, `ICON_ON_LIGHT` and
`ICON_ON_CHROME` at 3.0, listing only steps the codebase actually uses. That
left two real problems, both fixed at the right layer:

- `amber-600` fell just under 3:1 against the sunken canvas → nudged to
  `#987836` (a token fix, ramp shape intact).
- Five sites genuinely painted *prose* with a `-600` step — three of them error
  messages — → moved to `-700` (a call-site fix, palette untouched).

207 checks, all passing. Rule: before darkening a ramp to satisfy a gate, check
whether the failing call sites are text at all.

### D-12 · A screenshot harness must never be able to destroy its own credentials
`ui-audit/shots.mjs` ended every run with `await ctx.storageState({ path: AUTH })`
to keep rotating Supabase tokens fresh. Done unconditionally that is
destructive: a run that lands on `/login` writes the **logged-out** state over a
working session file, and the session cannot be recovered without signing in
again.

That is what happened here. `.playwright/founder-auth.json` — a file AGENTS.md
lists under *do not edit manually* — was reduced to a single Facebook pixel
cookie, and a batch of "product screenshots" turned out to be five captures of
the sign-in page. The near-miss worth naming is that they are *plausible*: a
dark, brass-accented login screen looks enough like the product to be accepted
at a glance.

The harness now writes back only a state that still carries an `sb-*-auth-token`
cookie, and exits non-zero with an explicit warning otherwise. Validation
tooling should fail loudly rather than quietly capture the wrong thing.

### D-13 · The second palette: 2,532 colours the remap could never reach
Remapping `--color-*` (D-3, D-10) repaints every `bg-slate-100`-style utility —
but it cannot touch a colour authored as a literal. A scan found **2,532
arbitrary-hex call sites** across 228 distinct values: `text-[#17130E]`,
`from-[#111b2e]`, `stopColor="#38bdf8"`. An entire second palette, hand-authored,
invisible to the token layer.

Most of it is already warm and roughly on-direction — a hand-rolled ancestor of
the palette this campaign formalised. Codemodding all 2,532 would be a huge
diff for little gain. So the sweep targeted only what is genuinely *off*:
**370 cool sites across 83 values, every one clustered at hue 214–220** — the
retired blue-black family, still alive as literals.

The worst of it sat in `shared/design-system/north-star/tokens.ts`, whose own
header comment named it a *"Moon graphite frame"*: a complete cool blue-grey
chrome system (`#273140` / `#1A2029` / `#AEB6C2` / `#DCE3EC` / `#64748B`) with
**109 importers**, carrying the cool cast across Leads, Time, Payroll, Expenses
and the billing documents. Two chrome families were running side by side.

**The shift preserves WCAG relative luminance, not HSL lightness.** Naively
holding HSL lightness while rotating blue→olive *raises* luminance sharply
(green is far brighter than blue at equal L) and would have silently broken
contrast everywhere. Each replacement instead binary-searches lightness until
relative luminance matches the original — deltas came out ≤1e-3, so every
existing contrast relationship survives exactly. The results landed on the
Prestige materials on their own (`#1a2029` → `#1c211a`, which *is*
`--pg-graphite-900`), which was a good independent check that the palette is
coherent.

Three deliberate exclusions, because a blanket sweep would have been wrong:

- **The steel and plum ramps** (D-10) are cool *on purpose*. Without an explicit
  protect-list the sweep would have warmed them into the surrounding palette and
  destroyed the categorical distinctions it exists to preserve. This was caught
  in the dry run, not after.
- **`altair-shell-color-lab-v1` and the Design Lab defaults** are palette
  *tooling* — the hex values are the subject matter, not the product's
  appearance. Rewriting them would have corrupted a comparison tool. (Follow-up
  worth knowing: the Design Lab's defaults are therefore still cool.)
- **The user's uncommitted work** (`AdminMobileHome.tsx`,
  `CustomersMobileCardList.tsx`) — excluded by path so the campaign could not
  absorb it.

The codemod also rewrote hexes inside *comments*, including ones documenting
history — leaving `north-star-chart-styles.ts` claiming `#BAB09B` is "sky". Six
comment lines were restored by hand afterwards. Worth remembering: a
colour-literal codemod does not know the difference between a value and a
citation.

### D-14 · Measuring the golds before consolidating them
> **Partly superseded.** The deferral here was overturned by D-15 (the owner
> called for the retirement), and the count was corrected by D-16 (66 values,
> not 8). The reasoning below is kept because the *method* — measure ΔE before
> assuming duplicates — is what produced both later decisions.

The brand accent is the most identity-carrying colour in the product. The eight
most common variants, covering ~618 literal call sites:

| hex | sites | nearest canonical brass | ΔE |
|---|---:|---|---:|
| `#8a6324` | 170 | brass-700 `#77591b` | 6.4 |
| `#d4af37` | 115 | brass-500 `#c2a05a` | **22.8** |
| `#c9a44d` | 102 | brass-500 | 8.6 |
| `#e6d092` | 72 | champagne-400 `#d9c188` | 5.6 |
| `#b88a2e` | 54 | brass-600 `#a4823a` | 11.8 |
| `#c6a757` | 44 | brass-500 | 5.3 |
| `#b8943f` | 42 | brass-600 | 9.0 |
| `#8b7232` | 19 | brass-600 | 8.9 |

The measurement changed the decision. The intuitive read — "eight golds, collapse
them" — is wrong: pairwise ΔE shows **no true duplicates** (the closest pair,
`#c9a44d`/`#c6a757`, is still 4.8 apart). These are not accidents; they are a
parallel, hand-tuned brass ramp that mostly tracks the canonical one.

`#d4af37` is the genuine outlier at **ΔE 22.8** — brighter, more saturated,
more yellow. That is the cheap metallic gold, and it is the one worth removing.

Consolidating all 618 sites would restyle auth, marketing, pricing and PWA —
surfaces that currently look good and that **could not be visually verified this
pass** (D-2b). Executing an unverifiable 618-site restyle of working surfaces to
satisfy a tidiness argument would repeat the D-11 mistake in a larger form. So
it is documented, not done.

The one place it was fixed: `TechnicianHomeScreen` had its chips repainted onto
the canonical ramps (D-10) while its three eyebrow labels stayed `#d4af37` —
an inconsistency this campaign introduced. Those labels now use `#c2a05a`
(6.8:1 on the technician wallpaper).

### D-15 · `#D4AF37` retired (supersedes the deferral above)
Done at the owner's direction. **139 replacements across 12 files** — more than
the 115 first counted, because the gold also lives in `rgb()/rgba()` form
(`rgba(212,175,55,…)`, `rgb(212 175 55 / …)`) that a hex scan never sees.

Only the Tailwind bracket form `-[#d4af37]` and the numeric `rgb()` triple were
targeted. That was the safety property: the bracket form never appears in prose,
so the historical citations in comments survived automatically — the failure
mode D-13 had to clean up by hand.

**The swap makes the accent darker**, so every dark ground it lands on was
measured first rather than after: brass-500 holds **6.0–8.0:1** across the
marketing black, auth deeps, cards and chrome; **5.7:1** at `/90`; and the one
`/70` use is an icon at 4.1:1 against a 3.0 bar. All are now permanent cases in
the contrast gate.

Two design tokens mattered more than any call site: `--altair-brass-interactive`
(light) and `--altair-brass` (dark) *were* `#D4AF37`, so this repaints every
`altair-brass` consumer at once. Their comments claimed the value was "locked",
which was no longer true and would have misled the next reader.

**What the screenshot caught that the codemod could not.** With the accent
retired everywhere around it, the primary sign-in CTA — which carries its own
pair, `#e5bd59 → #bc852c` — became the only bright metallic gold left on the
page. Desaturating a surface's context without its loudest control does not make
it coherent; it isolates the control. The CTA now runs champagne-400 →
brass-600, still lit top-to-bottom so it reads as raised metal, dark label
holding 5.3:1 on the darkest stop.

**Deliberately not changed:** `shared/components/brand/brand-assets.ts`. Its
`goldAccent` feeds `ALTAIR_GOLD_GRADIENT_STOPS`, which paints the logo mark, and
the palette carries a dated approval ("Platinum Circuit, Version 2, approved Aug
2026"). Repainting a company's approved mark is a brand decision, not a UI
consistency one. A mark using a richer metallic gradient than flat UI chrome is
also normal practice. One line changes it if wanted.

Also untouched: three uses in `AdminMobileHome.tsx` (uncommitted user work) and
the historical citations in comments.

### D-16 · The gold problem is 66 values, not eight
Retiring `#D4AF37` prompted a full inventory rather than a targeted one, and the
real number is much larger than D-14 reported: **66 distinct gold values across
831 call sites** (hue 35–58, saturation > 0.25). D-14 saw only the top eight.

`#c2a05a` is now the second most common at 110 sites, behind `#8a6324` at 170.
The next tier — `#c9a44d` (102), `#e6d092` (72), `#b88a2e` (54), `#c6a757` (44),
`#b8943f` (42), `#d6be78` (40) — is where consolidation would pay next.

The lesson repeats D-14's: *measure the whole set before deciding the shape of
the fix.* A targeted request surfaced a structural finding that a targeted
answer would have hidden.

### D-17 · The gold ramp folded onto five steps
Done at the owner's direction: **1,248 replacements across 176 files**, folding
20 off-ramp golds onto the five canonical steps. The top five values in the
codebase are now exactly those steps (554 of 834 gold sites); the remainder is
excluded tooling.

**Targets were chosen by direction, not by ΔE.** Nearest-ΔE is the intuitive
rule and it is wrong here: a dark gold paints text on a *light* ground, so a
lighter replacement loses contrast, while a light gold paints text on a *dark*
ground, so a darker one does. Each value was assigned the canonical step that
clears its threshold on the grounds it actually sits on:

| → | from | ground |
|---|---|---|
| brass-700 `#77591b` | `#8a6324` `#9a7209` `#8b7232` `#6b5a2e` `#6b4e1a` `#9a7028` `#977d2a` | light |
| brass-500 `#c2a05a` | `#c9a44d` `#c6a757` `#b8943f` `#b8a882` | dark |
| brass-600 `#a4823a` | `#b88a2e` `#b8860b` | dark |
| champagne-400 `#d9c188` | `#d6be78` `#d4c4a0` `#d4b76a` `#e3cb7d` | dark |
| champagne-300 `#e8d9ac` | `#e6d092` `#e8ddc2` `#e5dac5` | dark |

**This fixed ~199 sites that were already failing AA.** `#8a6324` (153 sites)
measured 3.94:1 as text on light ground; `#9a7209` 3.20; `#8b7232` 3.37;
`#9a7028` 3.24. All now sit at 4.75–6.3 on brass-700. The consolidation was
worth doing for legibility, not only for consistency.

**Two spellings, two passes.** The hex form was only a third of it: the same
golds live in `rgb()`/`rgba()` (`138,99,36` alone appeared 384 times), and a
third tranche were bare CSS declarations (`color: #8a6324`) that no
Tailwind-bracket pattern reaches. The bare-hex pass is comment-aware — it splits
the file into comment and code segments and rewrites only code — so the
historical citations survived automatically this time instead of needing repair.

**What the mechanical audit got wrong.** A per-file "dominant surface" heuristic
flagged 23 suspected wrong-ground uses. Twenty-two were false positives: a file
can hold both light and dark regions, so a Graphite sidebar with light chips
reads as "light", and `#77591B` looked like dark-gold-on-dark when it was
actually the light branch of an `isDark` ternary. Resolving them meant reading
the containers — `detailSiteContextAddress` uses ivory text, so its panel is
dark; `LegalPageShell` is `bg-[#fbf7ef]`, so it is light. **The heuristic found
nothing; reading the code found everything.**

**The one real defect was mine, from the previous pass.** `AuthShell`'s tier-1
label sits on a *light* card, not the dark hero. It was `#D4AF37` at 2.00:1 —
already failing — and D-15 moved it to `#C2A05A` at 2.36:1, still failing,
because I verified that pass against dark grounds only. It is now brass-700 at
6.19:1, matching the other two tiers. Lesson: when one value is used on both
ground families, verifying "the" ground is not verification.

**Hover direction is ground-dependent.** Lead links read
`text-[#8A6324] hover:text-[#B88A2E]` — brightening on hover, which on paper
*reduces* contrast. Folding fixed the base but preserved the bad direction
(3.48:1 on hover). On a light ground hover must deepen, so it now goes to
amber-800 `#5F4715` (8.19:1).

The gate now pins which step is legal on which ground — light → brass-700 text /
brass-600 indicators, dark → brass-500 / champagne-400 / champagne-300 — so the
fold cannot silently invert later. 231 assertions, all passing.

**Still excluded:** the approved logo palette (`brand-assets.ts`), the Design Lab
and color-lab tooling whose hex values are their subject matter, and the
uncommitted user files.

### D-18 · The tablet band gets a rail, not a hidden sidebar
The sidebar appeared at `md` at its full `14.5rem`, so at 768px the content
column was **536px** — narrower than a phone in landscape. The damage was real,
not cosmetic: the Customers page header collided with its own subtitle, the stat
strip clipped mid-word ("OTAL CUSTOMERS"), and table columns fell off the edge.

Two ways to fix it. Moving the breakpoint to `lg` and letting the existing
mobile nav cover 768–1023 is the smaller change, but it takes persistent
navigation away from a device that has room for it. Collapsing to a **68px icon
rail** keeps the nav and returns ~164px to content, so that is what this does.

Details that matter more than the width:

- Labels are `max-lg:sr-only`, **not** `hidden`. A `display:none` label is not
  in the accessibility tree, which would have left every rail link an unnamed
  icon to a screen reader. Group headings and the "Limited workspace access"
  note get the same treatment.
- Each link carries a `title`, because on the rail a tooltip is the only way a
  sighted pointer user can confirm a destination.
- The active state already used a centred brass underline, so it needed no
  change — it simply centres under the icon.
- The top-bar greeting is hidden below `lg`. With the rail in place the
  functional controls take the width they need, and the greeting was truncating
  to "Good ev…" / "Satu…", which reads as a rendering bug rather than identity.
  The serif moment waits until there is room for it.

**Known, and fixed separately in D-19.** `admin-page-header` lays out a
`flex-1 min-w-0` title block beside `shrink-0` tabs and buttons, so the title
yields all available space instead of the tabs wrapping. Measured at 1024px the
title block collapses to **98px**, and both the page title and its description
truncate into it; the same compression shows at 390px. It is pre-existing, it is
on a different breakpoint from the rail, and `admin-page-header` is shared by
every admin page — changing its flex model deserves its own pass with its own
verification across all surfaces, not a drive-by inside a sidebar fix.

### D-19 · The page header collapsed the wrong thing
`MasterPageHeader` laid out a `flex-1 min-w-0` title block beside a centre slot
and `shrink-0` actions. Two independent faults compounded:

1. `flex-1` is `flex: 1 1 0%` — a **zero basis**, so the title block made no
   claim on width at all and yielded everything to its neighbours.
2. `sm:shrink-0` lived *inside* the default `titleClassName` string, so any page
   passing a custom title class silently lost it. The title then competed with
   its own subtitle and truncated first — which is never the right loser.

Measured before the fix: the Customers hub title block collapsed to **98px** at
1024px, and on **/work the title rendered at 0px at 1024, 1280 and 1440** — the
page title was invisible at every desktop width, and once the block was too
narrow to contain a non-shrinking title, the title overflowed and printed on top
of the neighbouring stat strip.

The fix is three small changes, each addressing one fault:

- `flex-auto` (`flex: 1 1 auto`) so the block starts from its content width and
  is always wide enough to contain the title. `min-w-0` stays, so the subtitle
  still truncates — which is the correct thing to sacrifice.
- `sm:shrink-0` hoisted out of the fallback string onto every title.
- `lg:flex-wrap`, scoped to the breakpoint where the centre slot actually
  renders. From `lg` up the natural widths genuinely exceed the row (966px of
  content in 766px on the Customers hub at 1024), so without a wrap the
  shortfall lands on the tab strip, whose labels break over two lines and clip.
  Below `lg` there is no centre slot and the row fits, so wrapping there would
  add height for nothing.

Two things this pass tried and backed out, because measuring beat assuming:

- **Wrapping at every width.** It fixed 1024 but cost 40px of header height at
  768 to recover a 12px shortfall. Scoping the wrap to `lg` kept 768 at its
  original height.
- **An `overflow-x` utility on the centre wrapper.** The wrapper's own comment
  claimed the content would scroll, so this looked like the missing piece — but
  probing showed the strip *inside* it already carries `overflow-x: auto`
  (scrollWidth 667 against clientWidth 272). The utility was redundant and was
  removed rather than left as dead CSS.

Verified across /customers, /sales, /work and /team at 390, 768, 1024 and 1440:
no truncated titles, no overlap. Header height is unchanged everywhere except
where content genuinely does not fit on one row.

---

## 4. Phase 1 — visual authority

### D-20 · One stylesheet scope owns tokens
"Who owns the final runtime design value?" had no short answer. Tokens were
declared in **three** stylesheet scopes plus a database-driven inline style, and
the same name could be defined in two of them at once.

Measured before touching anything:

| scope | declarations |
|---|---:|
| `:root` (5 blocks) | 170 |
| `.admin-north-star-shell` | 46 |
| `[data-theme="dark"]` | 30 |

**29 of the shell's 46 were byte-identical to `:root`, and none differed.** They
were a fossil: before the Prestige palette the two scopes carried genuinely
different values, and once both aliased the same roles the second scope became
pure ambiguity. The other 17 were shell-only surface aliases that
`.north-star-list-page-canvas`, `.north-star-detail-page-canvas` and
`.north-star-page-header` consume *without* being textually nested in the
shell — they worked only by inheritance, and rendered unstyled anywhere the
shell was absent.

The shell block is gone; the 17 moved to `:root`. Authority is now:

> **`:root` declares every token. `[data-theme="dark"]` re-declares the dark
> set. The Design Lab inline style on the shell element is the only runtime
> override. Nothing else.**

**This was verified, not assumed.** `ui-audit/token-snapshot.mjs` reads the
*computed* value of every custom property found in any stylesheet, on the shell,
on the main region and on the root, across five routes — 6,600 values. Before
and after the refactor: **0 changed, 0 lost**, plus 85 that newly resolve
(the relocated aliases, which is the point). Re-run it around any future token
move; reading CSS cannot tell you what a three-layer cascade resolves to.

### D-21 · A var that aliases an overridable var must live in the overridden scope
The first pass of D-20 moved everything to `:root` and the snapshot caught two
values changing: `--north-star-text-light` and `--north-star-text-light-muted`
went from the Design Lab's olive to canonical ink.

The cascade reason is worth remembering. Both were aliases —
`--north-star-text-light: var(--north-star-section-title)` — and the Design Lab
sets `--north-star-section-title` *inline on the shell element*. Declared in the
shell scope the alias resolved against the inline override; hoisted to `:root`
it resolves against the `:root` value and silently stops tracking the theme.

Both turned out to have **zero CSS consumers**. They are backward-compatibility
keys read from previously saved theme rows by `design-lab-theme-tokens.ts`,
which migrates them onto the split roles. Declaring them in CSS made dead names
look live, so the declarations were removed and the migration code left alone.

Rule: an alias of a Design-Lab-overridable token either lives in the scope the
override lands on, or does not exist.

---

## 5. Phase 2 — foundation primitives

### D-22 · Destructive confirmation is the product's, not the browser's
**19 `window.confirm` call sites across 11 files** guarded destructive actions —
archive, move to trash, permanent delete, cancel jobs, delete marketing posts.
A native confirm is OS chrome: unstyleable, outside the app's focus model, and
the single loudest way a "premium" product announces that it is a web page.

`AltairConfirmDialog` already existed; nothing had migrated because the
primitive is declarative (`open` + `onConfirm`) while every call site was
synchronous and inline. That gap is where migrations stall, so the fix was a
bridge rather than 19 rewrites — `useConfirm()` returns a promise-based
`confirm()` plus the element to render:

```
if (!(await confirm({ title: "Delete 3 customers?", destructive: true }))) return;
```

Resolution deliberately matches `window.confirm`: it settles on choice and
closes. Callers already own their in-flight state — they were written against a
blocking API — so each migration stayed a local edit. All 19 sites are migrated;
the product has no native confirms left.

The copy improved in passing. `window.confirm` takes one string, so every
message was a run-on question. The dialog has a title *and* a description, so
the question is now short and the consequence sits under it.

### D-23 · Native controls need an accent or the OS picks one
Checkboxes rendered in **Windows blue** in every table in the product. The
`accent-color` property was set — but only inside five near-identical
`.<entity>-north-star-ledger input[type="checkbox"]` rules, so any checkbox
outside those five ledgers fell back to the OS accent.

One unlayered rule now covers `checkbox`, `radio`, `range` and `progress` from
a `--control-accent` role. This is the shape most of the remaining `!important`
override engine should collapse into: a role token plus one base rule, instead
of a per-surface rule repeated until someone notices a gap.

### D-24 · A focus ring must survive a theme it has never seen
The focus work in D-12's follow-up made rings solid and measured them at 4.0:1
against canonical chrome. Re-measured against the **Design Lab's** sidebar —
`rgba(155 162 103 / 0.22)`, which composites to `rgb(100 110 79)` — the same
ring is **1.3:1**.

Nothing regressed; the ring was only ever guaranteed against grounds *we*
control, and a runtime theme can move chrome anywhere on the lightness scale.
The indicator is now two rings, and the pair is what passes: brass carries dark
grounds, a near-black halo carries light and mid ones. Measured — themed sage
3.3, canonical chrome 4.0, paper 17.4, canvas 14.6.

The hostile ground is now a permanent case in the gate (`themedSage`). Any
future focus treatment has to survive a theme nobody designed against.

**Method note.** This was found because the dev server had been serving a
22-minute-stale CSS chunk and a rebuild changed a measurement that "passed"
earlier. Turbopack reused the cached chunk across a full server restart;
only `rm -rf .next/dev` cleared it. When a live measurement disagrees with the
source, check that the server is serving the source before believing either.

### D-25 · A database row may theme the chrome; it may not redefine the product
Reading the *running* product rather than the stylesheet exposed the real answer
to "who owns the final runtime design value?": for 25 properties, a database
row did — and it disagreed with source.

The promoted Design Lab theme was injecting, over the warm foundation:

| property | injected | source |
|---|---|---|
| `--altair-information` | `#2563EB` | `#55707a` |
| `--altair-graphite` | `#1A2029` | `#1c211a` |
| `--altair-ink-muted` | `#64748B` | `#665f4d` |
| `--altair-ink-on-paper-muted` | `#64748B` | `#665f4d` |
| `--north-star-work-text-muted` | `#64748B` | `#655e4e` |
| …plus 20 more surface/ink values | cool | warm |

`#2563EB` is the exact generic SaaS blue D-5 removed. `#1A2029` is the retired
blue-black D-2 named as a defect. `#64748B` is stock slate-500. **Committed
source fixes were being partially undone at runtime, per company.** It is also
why every uppercase label on the new Today strip rendered blue-grey the first
time it was screenshotted.

The fix is a boundary, not a deletion — the Lab is real product value. Live
promotion is now restricted to the groups that describe the *shell's identity*
(`chrome`, `sidebar-states`, `text-on-chrome`, `brass`). The groups that are the
product's contract are source-owned and no longer overridable:

- `altair-foundation` — success / warning / danger / information and the ink
  ladder. If a theme can redefine "danger", the product has suggestions rather
  than semantics.
- `surfaces` and `hub-work-tables` — the material foundation under every page
  and data table. Moving those repaints the product, not the chrome.

The Design Lab's own preview sandbox still renders every token, so the tool
stays fully explorable; what changed is which edits can escape it. Verified in
the running app: injected properties fell from ~110 to 37, `--altair-information`
resolves to `#55707a`, `--altair-graphite` to `#1c211a`, and the sidebar keeps
the Lab's olive.

No database row was mutated.

### D-26 · The dashboard now says what the business is doing, not only what broke
The desktop dashboard rendered exception buckets and nothing else — an owner
could not see jobs on today's board, what was collected, or what was
outstanding. `DashboardData` already carried all of it (`operations.*`,
`money.*`, including a 7-day collections series); the desktop surface simply
never rendered it, while the mobile home did.

`MissionControlV2TodayStrip` adds four cells — jobs today, collected today,
outstanding, overdue — above the exception board. Rules it follows:

- **Every number is read from the live snapshot.** There is deliberately no
  sample fallback: fabricated money on an owner's dashboard is worse than an
  absent section, so with no data the strip does not render.
- **Semantic colour is earned.** Overdue is danger-toned only when something is
  actually overdue; a red `$0` would make the calmest possible state look like
  a problem.
- **One band with hairline dividers, not four cards**, so the exception board
  below stays the heaviest thing on the page.

The "you're all caught up" panel was also demoted. It means *nothing to do*, yet
it was the largest, loudest block on the page — a 9.75rem panel dominated by a
688×384 illustration, sitting under six things that did need attention. The art
is now a quiet right-edge accent at 35% and the card is sized by its content.

---

## 6. Phase 4 — page migration

### D-27 · Severity strips take severity colour; only categories take category colour
Reports drew **eight identical brass sparklines**, because `KpiSparkline`
hardcoded `text-altair-brass` on its `<svg>` — no caller could change it. Two
problems followed. Brass at eight instances on one page is not an accent, it is
the page's default line colour. And "Overdue" wore the **brand** accent, which
is the one colour a money-at-risk figure must never wear.

The stroke is now a `toneClassName` prop (defaulting to brass, so the other
callers are untouched), and the period ledger passes tones by meaning:

| card | tone | why |
|---|---|---|
| Collected | success | money in is genuinely positive |
| Outstanding | neutral | owed but not late — informational |
| Overdue | danger | money at risk |
| Net income est. | brass | the period's summary — one brand moment |

Brass on that strip went from four lines to one, which is what restores it to
accent weight.

Categorical tints stay where they belong — the icon chips, and the Key metrics
strip below, where the values genuinely are different categories rather than
points on a risk scale. This follows the house rule that severity is meaning,
not category.

---

## 7. Known remaining debt

Recorded so the next engineer inherits the list rather than rediscovering it.

**The promoted theme row still exists.** D-25 stops it redefining the
foundation, but the sidebar is still the Lab's translucent
`rgba(155 162 103 / 0.22)` rather than the canonical opaque graphite. That is a
legitimate per-company chrome choice now, not a hidden override — but the
translucency means the sidebar's final colour still depends on what sits behind
it, which is the property D-2 criticised. Un-promoting the row (a Design Lab UI
action, not a migration) would show the canonical chrome.

**~~The mobile owner home is a visual generation behind.~~** *Resolved — see
D-28.* Original note kept for context:
`shared/components/dashboard/AdminMobileHome.tsx` is a near-black slab with
all-gold accents while the desktop is warm parchment, it still carries three
`#d4af37` literals and cool greys, it does not get the Today strip, and its
"1 in progress · 0 done" line clips. It was excluded from every sweep because
it carries an uncommitted `data-testid` edit that is not ours to commit; git
stages per file, so touching it would absorb that edit. It needs one decision
from the owner, then a single pass.

**~736 North Star branch points across 167 files.** With the flag now defaulting
on (D-22's neighbour) and both branches painting from the same remapped palette,
these are duplication rather than divergence. The opt-out is retained so a
regression can be bisected; collapsing them is a mechanical follow-up, best done
per route family with screenshots either side.

**The `!important` override engine remains.** D-23 showed the pattern it should
collapse into — one role token plus one base rule, instead of a per-surface rule
repeated until someone notices a gap. `accent-color` was one instance; the
ledger `border-color` rules beside it are others.

**`--altair-brass` on light is `#977d2a`, not a canonical step.** It predates the
brass ramp and sits between brass-600 and brass-700. Harmless, but it means the
answer to "which brass is this?" is still five steps plus one.

**Technician experience unverified.** `/technician` redirects to the owner home
for an admin account, so the real technician surfaces need a technician login to
audit.

---

### D-28 · The mobile home screens are a register, not an oversight
`AdminMobileHome` and `TechnicianHomeScreen` are dark "home screen" slabs on a
warm product. That is a deliberate mobile pattern, not a page that failed to get
the canvas, so the migration kept the register and corrected the palette rather
than flattening it into the desktop surface.

What changed: the three `#D4AF37` labels became canonical brass-500, and the
cool grey ink ramp (`#e6e8eb` / `#9b9fa6` / `#6b7075`) and the shared wallpaper
gradient moved onto warm equivalents with **WCAG relative luminance held
constant** — deltas ≤3e-4, so nothing about legibility moved. The wallpaper is
shared by three files (`AdminMobileHome`, its loading state, and
`TechnicianHomeScreen`); all three were changed together, because warming one
of a shared background is how a product ends up with two near-identical darks.

The mobile ink ramp now has its own gate cases, since it sits on a ground
nothing else in the product uses: brass 6.8, primary ink 13.7, secondary 6.3,
muted glyph 3.4.

Two things deliberately not changed. Gold density on this surface is high — every
label and count — but that is the screen's design, and it is now canonical brass
rather than the cheap metallic. And the "1 in progress" line that appeared
clipped in screenshots is covered by the **Next.js dev indicator**, not by
product layout; there is nothing to fix.

This file had been excluded from every previous sweep because it carried an
uncommitted `data-testid` edit that was not ours to commit. The owner authorised
including it, so the migration and that line land together.

---

### D-29 · Un-promoting the theme exposed two tokens that were never declared
The promoted Design Lab row was reverted through the product's own control
("Revert to default" in Saved themes → `revertLiveDesignLabThemeAction`), not a
migration or a direct write. It flips `is_live: false` on one company-scoped
row; all four saved themes remain, and "im not sure" is still an active draft,
so re-promoting is one click.

With the override gone, the canonical chrome renders — sidebar `#1c211a`,
topbar `#232922`, no inline style on the shell at all — and **two source
defects the theme had been masking became visible**:

- `--north-star-caught-up-fill: var(--pg-emerald-100)` referenced a step that
  was never defined. Only emerald 500–800 existed, so the dashboard's "all
  caught up" card had **no background**.
- `--north-star-plate` was referenced by four Marketing Hub sections and
  declared **nowhere** — not in CSS, not in the Design Lab vocabulary. Those
  panels have always painted transparent, with only their border visible; the
  theme never masked this one, it was simply never noticed.

Both are fixed at the source of truth: `--pg-emerald-100: #d7e9de` completes the
ramp (matching `--color-emerald-100` in the `@theme` remap), and
`--north-star-plate: var(--surface-card)`. No override was layered on top.

A scan for `var(--x)` with no fallback where `--x` is never declared now returns
**zero** (`--font-altair-display` is supplied by `next/font` and is not a real
miss). Worth re-running after any token move: an undefined custom property
fails silently as "no background", which is exactly the kind of defect a
runtime theme can hide for months.

---

## 8. Audit completion

### D-30 · Rounded money on 73 surfaces where money is money
The original audit's P1 — "money renders rounded where money changes hands" —
was fixed at the *primitive* level (a `formatCurrencyExact` was added) but never
at the *call sites*. A per-site classification of all 226 rounded uses found
**73 that are money of record**, four of them P1 and customer-facing:

`lib/email/billing-send.ts` rendered the invoice payment email's "Amount due"
hero and plain-text line with the rounded formatter, while the Pay-now CTA
directly beneath it (`billing-email-layout.ts`) used the exact one. **The same
email disagreed with itself**, and Stripe charges
`Math.round(roundCurrency(balanceDue) * 100)` cents — so a customer emailed
"$1,235" is charged $1,234.56. The estimate email had the same defect on the
number a customer reads before approving.

The other 69 are figures of record that must reconcile:

- **Printable tax summary** — control totals and their component rows rounded
  independently, so Payments-by-Method no longer sums to Total payments, and
  aging buckets no longer sum to Outstanding.
- **Reconciling triads** — Customer 360, customer card and detail hero each
  render Invoiced / Collected / Balance side by side, where
  Balance = Invoiced − Collected. Rounding all three independently makes the
  subtraction visibly wrong.
- **List-vs-record contradictions** — invoice and estimate *lists* rounded while
  their *detail pages* were exact, so the same field disagreed with itself
  across two screens.
- **Price book** — `unitPrice` is the price copied into line items; an $89.99
  item read "$90" in the catalog and "$89.99" everywhere it was used.
- Payment disputes and card failures (amounts being clawed back), per-invoice
  balances in the resolution queue and exception board, and material-charge
  previews rendered above `step="0.01"` inputs.

All 73 now use `formatCurrencyExact`. **No rounded currency remains anywhere in
`lib/email/`, `lib/payments/`, `app/invoice-payment/`, `app/estimate-approval/`
or `shared/components/billing/`.** 153 rounded uses remain and are legitimately
approximate — dashboard glance tiles, chart axes, abbreviated KPIs.

No business calculation was touched; only presentation. The cent-precision
values were always there.

### D-31 · The mobile audit findings, verified one by one
The original audit's mobile section was re-checked against current code rather
than assumed fixed by the palette work. Two claims were already resolved; five
were still real.

**Fixed here**

- *Notification badge painted over the glyph.* The trigger was a 36px box and
  the unread count sat at `right-1 top-1` — on top of the bell, so the icon
  became unreadable exactly when it had something to report. Badge moved to the
  corner with a chrome ring; trigger raised to 44px.
- *Touch targets under 44px.* `AltairDialogClose` was `h-8 w-8` — and this
  component **is** the mobile bottom sheet, so it was the close affordance for
  every sheet in the product, at 32px, on the surface where thumbs are least
  accurate. Now 44px on touch, 32px from `sm`.
- *Admin chrome scrolled away on mobile.* `.admin-top-shell` was only positioned
  inside the `min-width: 768px` block, so below that the company switcher,
  notifications, view-as and sign-out scrolled off and could not be reached
  without returning to the top of a long ledger. The technician shell already
  kept its chrome. Now sticky below 768px; desktop keeps `relative` because the
  shell there is a fixed-height column with its own inner scroll.
- *Today's job card lost its title.* `JobScheduleRow` is a `flex-wrap` row where
  title, time, assignee and status all competed for one line, truncating the one
  thing that identifies the job. The title block now takes `basis-full` below
  `sm`. Verified at 390: 290px needed, 290px available.
- *Owner "View as Technician" bounced tabs back to Home.* Not the rule the audit
  blamed — that had already been fixed. The surviving cause is hydration:
  `useStoredOwnerViewMode` returns `"owner_admin"` from the server snapshot, so
  the redirect effect ran against the *server* value and navigated away from
  `/tech/*` before the client store resolved. The effect now waits one commit.

**A residual the audit missed.** The stat strips' leading pills no longer clip on
mobile, but `sm:justify-center` recreated the same defect from 640px: a centered
flex row cannot be scrolled back to its first item once it overflows, so the
leading pills were unreachable. Centering now starts at `lg`, where the strip
fits. Five strips corrected; verified reachable at 390/768/1024.

**Still open, and why.** Bulk operations remain unavailable below 768px on
Customers only — the other four mobile card lists already accept selection
props. The fix belongs in `CustomersMobileCardList.tsx`, which is one of the
protected uncommitted files, so it is reported rather than changed.

### D-32 · Two semantic collisions the palette remap caused
Auditing status meaning rather than status colour found that the `@theme` remap
(D-10) had destroyed two distinctions it was supposed to preserve. Both were
verified numerically before being fixed.

**Amber had become brass.** `--color-amber-700` was byte-identical to
`--altair-brass` (`#77591b`), so every `bg-amber-50 text-amber-700` badge in the
product — and amber was carrying *"needs attention"* in a dozen status maps —
started painting in the **brand accent**. It also left two golds doing the same
job: the same business event (an estimate sent) rendered brass on the Leads list
and warning-gold on the Estimates list.

D-10's reasoning was right about the pixels and wrong about the meaning: amber
*was* a second competing gold, but the fix should have moved it to warning, not
to brand. Amber now resolves onto the warning ochre family, and `amber-700` is
literally `--altair-warning-foreground`, so the utility classes and the semantic
tokens finally agree. Separation from brass: **dE 23.8**.

The gate then caught the second-order problem immediately: the warning
foreground was `#9f5704`, which measures **4.43 on canvas and 3.99 on the sunken
canvas** — below AA as prose. Both it and amber-700 moved to `#935004`, which
clears 4.5 on every light ground (4.52 worst case). This is why the gate exists.

**Violet and indigo were the same ramp.** Byte-identical at every step, so lead
`contacted` and lead `scheduled` painted the same pixels — two funnel stages
made indistinguishable by the pass meant to harmonise them. Violet now runs warm
mauve and indigo cool blue-plum: **dE 4.7 at the pale badge fill, 17–24 at the
text steps**, both still calm beside parchment, both well above AA.

The lesson worth keeping: a palette remap must be audited against what each
family *means*, not only against how it looks. Collapsing two hues is only safe
when nothing is using them to tell two things apart.

### D-33 · One tone table, and two statuses that were lying
`StatusPill` and `shared/lib/operational-status-styles.ts` each declared their
own copy of the same five tone class strings. They were **byte-identical**,
which is what made the duplication invisible — and it meant a change to
StatusPill reached **none of the twelve files** importing the operational maps.
That fork is the structural reason the vocabulary drifted, so it is the thing
worth fixing rather than any individual badge.

Both now read `STATUS_TONE_CLASS` from
`shared/design-system/components/status-tone.ts`, which also carries the
meaning of each tone so a future map picks by *what the state is* rather than by
what colour looks right:

| tone | means |
|---|---|
| `neutral` | nothing has happened yet, or closed without consequence |
| `info` | in motion, or waiting on someone else — not a problem |
| `success` | the good terminal state |
| `warning` | needs a human soon |
| `danger` | money or access at risk |

Two statuses were then corrected against that vocabulary:

- **Estimate `sent` was `warning`, invoice `sent` was `info`** — the same word,
  eleven lines apart in one file, rendering steel on one row of a customer's
  billing tab and gold on the next. Both mean the document has gone out and the
  ball is with the customer, which is a normal waiting state; the escalation is
  `overdue` / `expired`. Both are now `info`.
- **Membership `suspended` was `neutral`** — revoked access rendered at the
  same weight as a draft invoice, the quietest tone in the system for a
  security-relevant state. Now `danger`.

**Deliberately not changed.** `scheduled` / `dispatched` / `arrived` share
`info`. The audit called them indistinguishable, but they carry distinct labels,
and the house rule is that colour must never be the only differentiator — three
more tones would break that rule rather than serve it. The remaining per-domain
maps (leads, dispatch North Star, expense category) still hold raw palette
literals; they are recorded as open rather than rewritten here.

### D-34 · What actually needed a toast, and what did not
The audit's "archive/restore succeed silently / 36 hand-rolled patterns" was
checked flow by flow. As written it is **largely false**: bulk archive and
restore in all six list views already produce a tone-coded banner carrying
success and failure counts *and* a per-item failure list, which is richer than a
toast could be. Single-entity archive emits no worded confirmation, but the
button set swaps, the status badge changes, and the detail hero renders "This
customer is archived…". The accurate claim is *no worded confirmation*, not
*silent*.

What is reproducible: **27 ad-hoc feedback helpers under 8 different names with
incompatible signatures**, six near-duplicate `formatBulk*ResultMessage`
functions, and ~160 distinct feedback state variables.

**Migrated — the effect was genuinely invisible:**

- *Platform founder signals.* The server already writes the sentence — "Marked
  as contacted.", "Snoozed for 3 days.", "Note saved." — and `runAction` threw
  it away. The signal re-sorts or leaves the queue, so nothing on screen said
  which of four buttons had fired.
- *Send / resend from the resolution queue* (4 handlers). The item leaving the
  queue says "resolved"; it does not say an email reached the customer. Email
  delivery is the archetypal invisible side effect.
- *Alpha tracker status.* `if (result.error || !result.item) return;` discarded
  the failure entirely — a rejected update was indistinguishable from a slow one.
- *Two copy-to-clipboard buttons* whose `catch` swallowed clipboard rejection.

**Deliberately not migrated,** because a toast would be worse:

- Bulk operations — the banner must stay readable and carry per-item detail
  ("INV-1042: customer has no email").
- Customer import — a dedicated result page with counts and per-row reasons.
- Copy-to-clipboard *success* — the icon already changes at the point of action.
- Clock in/out — the entire clock UI flips state.
- Public estimate approval — redirects to a confirmation page.
- Optimistic list mutations where the row visibly moves or disappears.
- Field validation — belongs on the field.
