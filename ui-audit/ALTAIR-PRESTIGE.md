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

**Known and deliberately not fixed here.** `admin-page-header` lays out a
`flex-1 min-w-0` title block beside `shrink-0` tabs and buttons, so the title
yields all available space instead of the tabs wrapping. Measured at 1024px the
title block collapses to **98px**, and both the page title and its description
truncate into it; the same compression shows at 390px. It is pre-existing, it is
on a different breakpoint from the rail, and `admin-page-header` is shared by
every admin page — changing its flex model deserves its own pass with its own
verification across all surfaces, not a drive-by inside a sidebar fix.
