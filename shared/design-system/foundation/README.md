# Altair Design Foundation — semantic token layer

Authoritative spec: `docs/altair/ALTAIR_DESIGN_FOUNDATION.md`. This folder is the
implementation of that document's Color System section — nothing more. Read
the Foundation before changing anything here.

## Status

**Infrastructure only.** This layer defines the tokens; no page or component
consumes them yet. Introducing it changes no rendered pixel. Future phases
migrate existing legacy and North Star colors onto this layer — see the
Foundation's "Migration Philosophy" section.

## The hierarchy

```
Material               (Graphite, Stone, Paper, Ink, Brass — the Foundation's five materials)
   ↓
Semantic token          (--altair-*, this folder — the only approved names for a material's color)
   ↓
Component               (Button, Card, Table, Badge, ... — consumes a token, never a raw hex)
   ↓
Page                    (composes components — never reaches past them for a color)
```

A page never depends on a raw color. A component never depends on a raw
color. Only the semantic token layer is allowed to know an actual hex value.
Changing a palette later — a brighter Brass, a cooler Stone — means changing
values in exactly one place (`app/globals.css`) instead of hunting through
every page and component that happened to hardcode that color.

## Where the tokens live

| Layer | File | Purpose |
|---|---|---|
| CSS custom properties | `app/globals.css` (`:root` and `[data-theme="dark"]`) | The actual values, light and dark |
| Tailwind utilities | `app/globals.css` (`@theme inline`) | Generates `bg-altair-*`, `text-altair-*`, `border-altair-*`, etc. |
| TypeScript reference | `altair-tokens.ts` | Typed role names + `var(--altair-*)` accessor for non-Tailwind contexts (inline styles, SVG, chart libraries) |

There is one canonical set of tokens, not a parallel system per module. Do not
add a second token file for a specific page or feature — extend this one.

## The roles

Each role maps to one of the Foundation's five materials or its Color System
table. Values are defined once per theme scope; the role name never changes.

| Token | Material / role | Foundation reference |
|---|---|---|
| `stone` | Stone — secondary structural backing | "Secondary Surface" |
| `paper` | Paper — the work surface | "Primary Surface" |
| `paper-elevated` | Paper, brightest register | "Elevated Surface" |
| `paper-subtle` | Paper, palest/quietest register | "Canvas" |
| `graphite` | Graphite — the operating shell | "Canvas / Primary Surface (chrome)" |
| `ink` | Ink, full strength | "Primary Text" |
| `ink-secondary` | Ink, supporting strength | "Secondary Text" |
| `ink-muted` | Ink, quietest strength | "Muted Text" |
| `ink-on-paper` | Ink, full strength, anchored to Paper (not the theme's dominant surface) | "Primary Text" on a Paper-family surface |
| `ink-on-paper-secondary` | Ink, supporting strength, anchored to Paper | "Secondary Text" on a Paper-family surface |
| `ink-on-paper-muted` | Ink, quietest strength, anchored to Paper | "Muted Text" on a Paper-family surface |
| `border` | Quiet separation | "Border" |
| `border-strong` | Deliberate emphasis (selection, focus) | "Strong Border" |
| `brass` | Brass — the one command per screen | "Primary Command" |
| `brass-interactive` | Brass, hover/active state | (Primary Command interaction state) |
| `success` | Completed / healthy / resolved — icon/dot/border strength | "Success" |
| `warning` | Needs attention soon — icon/dot/border strength | "Warning" |
| `danger` | Failed / blocking — icon/dot/border strength | "Danger" |
| `information` | Neutral system communication — icon/dot/border strength | "Information" |
| `success-foreground` | Success, small-text-safe reading strength | "Success" (text on a light surface) |
| `success-surface` | Success, quiet tinted background | "Success" (background) |
| `warning-foreground` | Warning, small-text-safe reading strength | "Warning" (text on a light surface) |
| `warning-surface` | Warning, quiet tinted background | "Warning" (background) |
| `danger-foreground` | Danger, small-text-safe reading strength | "Danger" (text on a light surface) |
| `danger-surface` | Danger, quiet tinted background | "Danger" (background) |
| `information-foreground` | Information, small-text-safe reading strength | "Information" (text on a light surface) |
| `information-surface` | Information, quiet tinted background | "Information" (background) |

`brass` and `brass-interactive` must never be reused to represent status —
use `success` / `warning` / `danger` / `information` (and their `-foreground`
/ `-surface` pairs) instead. This mirrors the Foundation's rule that command
and status must never visually collide.

### Why status roles come in three strengths

`success`, `warning`, `danger`, and `information` are tuned as a mid-strength
hue — the right strength for an icon, a dot, or a 15%-opacity border, but not
dark enough to read as small text at the Foundation's 4.5:1 threshold on a
Paper-family surface. The Status Pill pilot proved this by calculation: the
plain `success` token measured as low as 3.35:1 as small badge text on a
Paper-family surface.

Rather than darken the base role (and break its job as an icon/border color)
or accept an inaccessible badge, each status role gained two companions:

- `{status}-foreground` — the same hue, darkened until it clears 4.5:1 as
  normal-sized text against the surfaces it is paired with.
- `{status}-surface` — a quiet, pale tint of the same hue, calibrated to pair
  with `{status}-foreground`.

These two are defined identically in `:root` and `[data-theme="dark"]`,
because they are calibrated against Paper, and Paper itself never changes
value between the two themes (see `paper` / `paper-elevated` above, which set
that precedent already). Any status feedback surface that renders small text
on a Paper-family background — a badge, an inline alert, a banner — should
reach for `{status}-foreground` / `{status}-surface`, not the base
`{status}` role, whenever it is rendering text rather than an icon, dot, or
border.

### Why Ink needed a Paper-anchored companion

`ink` / `ink-secondary` / `ink-muted` are calibrated against whichever
surface *dominates that theme* — dark text on light Paper in `:root`, light
text on dark Graphite/Stone chrome in `[data-theme="dark"]`. That is correct
for content sitting on the theme's dominant surface, but `paper` and
`paper-elevated` are deliberately **theme-invariant** (see above — Paper
never changes value between themes, because it is meant to visually "lift"
off the darker dark-theme backdrop as a bright card). Pairing the flipping
`ink` role directly against theme-invariant Paper produces light-text-on
-light-Paper in the dark theme — proven by measurement during the Input/
Field pilot (`text-altair-ink` measured 1.18:1 against `bg-altair-paper
-elevated` in the dark scope, against a 4.5:1 requirement).

`ink-on-paper` / `ink-on-paper-secondary` / `ink-on-paper-muted` exist for
exactly this case: any control whose content sits directly on a Paper-family
surface, regardless of theme. They are defined identically in `:root` and
`[data-theme="dark"]`, using the same three hex values as `:root`'s existing
`ink` family — the same precedent already set by the status foreground/
surface pairs above. Any interactive control anchored to Paper (Input,
Textarea, Select today) should reach for these instead of the flipping
`ink` family; anything anchored to Stone or Graphite chrome should keep
using the flipping `ink` family as before, since Stone and Graphite *are*
theme-adaptive and pair correctly with it.

## Light and dark, one component

Every token has a light value (`:root`) and a dark value (`[data-theme="dark"]`).
A component that writes `bg-altair-paper` never branches on theme — the value
resolves correctly wherever it renders. No `.dark`-prefixed Tailwind variants
and no theme-conditional logic should ever be needed inside a component for
color alone.

No theme toggle exists yet; `[data-theme="dark"]` is the reserved attribute
hook for whenever that lands. Adding it here now costs nothing today and
avoids a second migration later.

## Rules for anyone touching UI color after this phase

- Never introduce a raw hex value in a component or page. If the semantic
  layer doesn't have the right role, propose a new one here — do not reach
  for an arbitrary value "just this once."
- Never create a second token system for a specific page, module, or
  North Star variant. Extend this one.
- Prefer the Tailwind utility (`bg-altair-paper`) over the CSS variable
  (`var(--altair-paper)`) over the TypeScript helper (`altairToken("paper")`),
  in that order — reach for the TypeScript helper only where Tailwind classes
  genuinely cannot apply (inline styles, SVG, canvas/chart libraries).
