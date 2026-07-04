# ALTAIR ART DIRECTION

We are not building software.

We are building an environment.

Altair should feel like standing above your business and seeing the entire horizon.

## Design Philosophy

The interface should feel:

* Calm
* Spacious
* Guided
* Intelligent
* Premium
* Confident

The interface should never feel:

* Dense
* Corporate
* Spreadsheet-like
* Generic SaaS
* Widget-heavy
* Overwhelming

---

# Horizon Intelligence

Altair's visual identity is called:

Horizon Intelligence

Users should feel like they are looking over their business from above.

The software should feel like a horizon, not a collection of tools.

---

# Experience Hierarchy

Pages should follow this hierarchy:

1. Hero (40%)

The page should establish emotional context.

2. Focus (25%)

What needs attention.

3. Pulse (20%)

What is healthy.

4. Opportunities (10%)

What could improve.

5. Momentum (5%)

What is going well.

---

# Atmosphere

Every page should contain subtle atmosphere.

Atmosphere examples:

* Soft gradients
* Horizon lines
* Light beams
* Terrain shapes
* Ambient glows
* Depth layers

Atmosphere should never become decoration.

Atmosphere exists to reduce mental load.

---

# Software Reduction

Reduce:

* Cards
* Borders
* Widgets
* Tables

Increase:

* Stories
* Space
* Hierarchy
* Guidance

---

# The Golden Rule

Users should feel:

"I am running my company."

Not:

"I am using software."

---

# Living Note (2026-07-03)

Master Shell V2, Visual Polish A–F, and Micro-Interaction A–B are **complete** on major admin surfaces. **North Star Phases M1–M14 and dispatch are complete** behind `NEXT_PUBLIC_NORTH_STAR_SHELL=true`. Legacy UI when flag off.

Next operational focus: authenticated production smoke and first external beta companies — not additional concept iteration. See `ALTair_MASTER_STATUS.md` and `ALTair_CURRENT_SPRINT.md`.

---

# Approved North Star Shell Direction (2026-06-16)

**Status:** Founder-approved. Concept iteration stops here.

After multiple isolated concept routes and palette explorations, the preferred shell direction is:

**Mission Control Original Refined**

## Visual Formula

**Graphite shell + brass command accents + slate operating backing + ivory work cards.**

| Layer | Treatment |
|-------|-----------|
| **Shell** | Dark graphite grouped left sidebar |
| **Command** | Brass/gold accents; dark command hero |
| **Operating canvas** | Slate/blue backing behind lower operating sections |
| **Work surfaces** | Ivory cards on slate backing |
| **Typography** | Readable dark text on light cards |
| **Status** | Semantic status colors kept separate from brand/command accents |

## What Worked

- Grouped left sidebar
- Dark graphite shell
- Command hero / operating picture
- “Do this first” primary action
- Action / Work / Money operating model
- Slate backing behind lower operating sections
- Ivory cards on slate backing
- Brass/gold as command/brand accent
- Small cool field-ops signal is okay if restrained

## What Did Not Work

- Full light SaaS
- Paper/report dashboard
- Full dark cyber/cyan dashboard
- Strict black/gold token purity that killed visual richness
- Beige/ivory-only workspace with no contrast
- Changing layout and palette at the same time

## Founder Decision

This direction is **good enough** to stop concept iteration for now.

- Do **not** keep creating more palette concepts.
- Do **not** keep redesigning the shell blindly.
- Future work should use this as the current preferred North Star direction.

## Production vs Concept

| Surface | Status |
|---------|--------|
| **Production app (flag on)** | North Star M1–M14 + dispatch — grouped sidebar, dashboard command hero, workspace/intelligence/operations pilots |
| **Production app (flag off)** | Legacy Master Shell V2 UI |
| **Concept routes** | Research/reference only — not production targets to copy wholesale |

**Primary reference:** `/altair-shell-color-lab-v1` — palette `mission-control-refined` (Mission Control Original Refined).

**Other concept routes (retain, do not delete):** `/altair-shell-north-star-v1`, `/altair-shell-north-star-v2`, `/altair-shell-north-star-v3`, `/command-center-v1`, `/workspace-v1`, `/altair-design-lab`.

**Founder design lab:** `/platform/design-lab` — live token editing and dashboard replica preview.

## Next Step: Beta Smoke, Not More Concepting

North Star production migration is **complete behind flag**. The next track is **authenticated production smoke** and **first external beta companies** — not additional palette exploration or blind shell redesign.

### Phased Migration (Complete)

| Phase | Focus | Status |
|-------|-------|--------|
| **M1** | Grouped left sidebar shell | **Complete** |
| **M2** | Dashboard pilot | **Complete** |
| **M3–M14** | List/detail/workspace pilots | **Complete** |
| **Dispatch** | Command shell + mobile polish | **Complete** |

### Non-Negotiable Preserves

- Routes
- Supabase / RLS / server actions
- Billing / print / overlay behavior
- Dispatch behavior (board internals, mobile sheets, workbench row)
- Do **not** productionize concept routes wholesale

See `ALTair_MASTER_STATUS.md`, `ALTair_V2_ROADMAP.md` Phase 9, and `shared/design-system/shell/README.md`.
