# The Altair Design Foundation

*The constitution for every visual decision made in Altair OS.*

---

## Preface

Altair has reached the point every serious piece of software eventually reaches: the ideas are good, the direction has been chosen, and the risk is no longer "what should this look like" but "why doesn't everything look like it agreed on an answer." A comprehensive audit of the interface confirmed what the founder had already sensed. Altair does not need a new visual direction. North Star — the graphite shell, the brass accents, the slate backing, the ivory work surfaces — is the right direction, and it has already proven itself across the product. What Altair needs is a single, unambiguous design language that every future decision can be checked against, so that the product stops accumulating parallel visual systems and starts converging on one.

This document is that language. It does not propose anything new. It names, organizes, and makes permanent the direction that has already been chosen, so that no future contributor — human or AI — has to re-derive it from scratch, guess at intent, or invent a variation because the rule wasn't written down.

Treat this as a handbook, not a spec sheet. It describes how Altair should feel and why, so that the right pixel-level decision becomes obvious rather than negotiated. Where this document and an individual component disagree, the component is wrong. Where this document and a deadline disagree, the deadline should move, not the standard.

---

## The North Star Statement

> Altair should feel like a master craftsman's workbench — organized, dependable, and quietly premium. Every screen should help a business owner make the next decision with confidence.

This is the single sentence every other decision in this document exists to defend. A workbench is not decorated; it is arranged. Every tool has a place because it has a use, and the person standing at it can find what they need without thinking about the bench itself. That is the standard Altair is held to. Not "does this look good," but "does this help someone who is running a business make their next decision faster and with more confidence than they had before they looked at the screen."

Two words in that statement do most of the work and deserve to be unpacked:

**Organized.** Nothing in Altair should require the user to hunt, guess, or remember where something lives. Order is a feature, not an aesthetic — it is what makes the workbench usable under pressure, not just pleasant when things are calm.

**Quietly premium.** Premium in Altair is never loud. It is the feeling of a well-made tool: the weight is right, the fit is right, nothing rattles. It is communicated through material quality, precision, and restraint — never through ornamentation, animation for its own sake, or visual noise dressed up as sophistication.

Every principle, material, color, and component decision in this document is a more specific expression of that one sentence. When in doubt, return to it.

---

## Core Design Principles

Altair's design principles are not a checklist to satisfy. They are a way of thinking that should be internalized before a single pixel is placed.

**Calm beats clever.** A clever interface draws attention to itself. A calm interface draws attention to the work. Altair is used by people running businesses under real pressure — a job that fell behind schedule, an invoice that needs to go out today, a technician who didn't show up. The interface's job in that moment is to stay out of the way and be trustworthy, not to impress. Cleverness is a tax the user pays in attention they don't have. Calm is a gift the interface gives back.

**Every pixel earns its place.** Nothing appears on screen because it looks nice, fills space, or because a component library made it easy to add. Every label, icon, divider, and shadow must justify its existence in terms of what it helps the user understand or do. If removing an element changes nothing about comprehension or action, it should be removed. Restraint is not the absence of design — it is the hardest form of it.

**Whitespace is a feature.** Space is not what's left over after content is placed; it is placed deliberately, with the same intent as the content itself. Whitespace is what allows the eye to find the important thing first. A dense screen is not an efficient screen — it is a screen that has outsourced its organizing work to the user's attention instead of doing that work itself.

**Color communicates meaning, not personality.** Altair's palette exists to tell the user something true about the state of their business — what needs attention, what succeeded, what is at risk — not to express a brand mood. A color that appears for decorative reasons in one place and a meaningful reason in another teaches the user to stop trusting color, which is the one thing a color system cannot survive. Every color earns the right to appear by carrying a consistent meaning everywhere it is used.

**The work is the hero.** The interface is not the product. The job, the invoice, the customer, the schedule — that is the product. Chrome, containers, and decoration exist only to present that content clearly and get out of the way. Any design decision that makes the interface itself more prominent than the information it holds has inverted the priority.

**Motion explains; it never entertains.** Every animation in Altair must answer the question "what changed, and where did it go?" If an animation cannot answer that question, it is decoration wearing the costume of feedback, and it should not exist. Motion is a tool for continuity and orientation, not a tool for delight.

**Premium comes from restraint.** Cheap software overcompensates — heavier shadows, louder gradients, more animation, more color, more badges. Expensive tools, the kind a craftsman actually reaches for, do the opposite: they say less and mean more. Every material, weight, and radius in this system errs toward less, because restraint is the only kind of premium that ages well and the only kind that scales across hundreds of screens without becoming exhausting.

**Consistency builds trust.** A user who learns how one table, one form, and one dialog behaves should never have to relearn that behavior somewhere else in the product. Every inconsistency — a button that looks the same but behaves differently, a card that means something different on two pages — is a small withdrawal from the user's trust in the software. Consistency is not visual sameness for its own sake; it is the mechanism by which the interface becomes predictable enough to stop thinking about.

**Humans decide; software supports.** Altair never pretends to make the decision for the business owner. It surfaces what matters, ranks it by urgency, and gets out of the way of the judgment call that belongs to the human. The interface's highest calling is confidence, not automation theater — showing the right thing at the right moment so the person in charge can act, not manufacturing the appearance of intelligence for its own sake.

---

## Material System

Altair is not built from flat colors dropped onto a screen. It is built from a small set of materials, each with a defined job, a defined feeling, and defined boundaries. Thinking in materials rather than colors is what keeps the interface feeling like one crafted object instead of a set of independently painted parts. A material is chosen because of what it needs to do — hold structure, carry work, communicate command, render text — and its color follows from that job, not the other way around.

Altair's five materials are **Graphite**, **Stone**, **Paper**, **Ink**, and **Brass**.

### Graphite — the shell

Graphite is the operating structure of Altair: the sidebar, the top-level chrome, the command surfaces that frame the work but are not themselves the work. It is dark, dense, and architectural — the material equivalent of a machine's housing.

- **Purpose:** to establish where the "operating system" ends and the "work" begins. Graphite tells the user, at a glance, "you are inside Altair" before they've even looked at the content.
- **Emotional feeling:** grounded, serious, permanent. Graphite should feel like it was engineered, not decorated.
- **Where it is used:** global navigation, the application shell, command surfaces, and anywhere Altair is asserting its own structure rather than displaying a business record.
- **Where it should never be used:** as a background for reading dense operational content — invoices, job details, tables of records. Graphite is a frame, not a page. Content that must be read carefully belongs on Paper, not on Graphite.
- **Relationship to other materials:** Graphite is the base the other materials sit inside. Brass appears on Graphite as the accent that says "this matters, act here." Stone is the transitional material between Graphite's structure and Paper's work surfaces.

### Stone — the operating backing

Stone is the quiet, cool backing that sits behind the actual work — the canvas an operator's tools are laid out on, not the tools themselves. It is muted, structural, and deliberately unremarkable.

- **Purpose:** to give work surfaces somewhere to rest without competing with them. Stone is what makes a Paper card look like it's sitting on something solid rather than floating on nothing.
- **Emotional feeling:** settled, neutral, dependable. Stone should never be noticed directly — it should only be felt as "the page feels composed."
- **Where it is used:** the backing behind operational sections, secondary structural surfaces, dividers between zones of a page, and any area whose job is to organize rather than inform.
- **Where it should never be used:** as a surface for primary reading content, and never layered so heavily that it starts competing with Paper for attention. Stone that gets noticed has failed its job.
- **Relationship to other materials:** Stone sits between Graphite and Paper — cooler and quieter than Graphite's density, but not as bright or inviting as Paper. It is the negative space that gives Paper its contrast.

### Paper — the work surface

Paper is where the actual work of the business lives: the job card, the invoice, the customer record, the line item. It is warm, bright, and legible — built for sustained reading and careful decisions.

- **Purpose:** to hold content the user needs to read, understand, and act on with full attention. If Graphite is the machine's housing, Paper is the workbench surface itself — where the actual craft happens.
- **Emotional feeling:** clear, warm, trustworthy. Paper should feel like the good stationery of a business that takes itself seriously — not sterile, not cold, not clinical.
- **Where it is used:** cards, panels, tables, forms, documents, and anywhere the user is reading or entering real business information.
- **Where it should never be used:** as a wraparound background for the entire application shell. Paper that surrounds everything stops signaling "this is the work" because it no longer contrasts with anything.
- **Relationship to other materials:** Paper is what Graphite and Stone exist to frame. Ink is written on Paper. Brass may accent Paper sparingly to mark a primary action, but Paper's job is to let content — not accents — be the loudest thing on it.

### Ink — the material of meaning

Ink is not a background; it is the material that carries language and number — every heading, label, body sentence, and figure in the product. Typography is Ink's only job, and it is treated with the seriousness that implies.

- **Purpose:** to make every word and number in Altair unambiguous in its importance. Ink's darkness, weight, and size are how hierarchy is communicated before color ever gets involved.
- **Emotional feeling:** precise, legible, confident. Ink should never feel decorative — its entire value is in disappearing into pure legibility.
- **Where it is used:** everywhere text and numerals appear, at varying strengths — primary Ink for what must be read, secondary and muted Ink for what supports or explains.
- **Where it should never be used:** Ink should never be diluted below the point of comfortable reading merely to appear "elegant" or "light." Illegible restraint is not restraint — it is a failure of the material's one job.
- **Relationship to other materials:** Ink's contrast requirement is what determines whether it sits on Paper, Stone, or Graphite — the same semantic weight of text (primary, secondary, muted) must remain legible on every material it is placed on.

### Brass — the material of command

Brass is Altair's only material that is allowed to be warm, bright, and attention-getting — and precisely because of that, it is used the least. Brass marks the primary action, the thing the business owner should do next.

- **Purpose:** to draw the eye to the single most important control or signal on a screen. Brass is a pointer, not a paint.
- **Emotional feeling:** confident, premium, deliberate — the polished fitting on an otherwise plain, well-made tool.
- **Where it is used:** the primary action on a screen, key brand moments, and command accents inside Graphite chrome. Brass should typically appear once, or a small handful of times, per screen.
- **Where it should never be used:** as a background fill, as a color applied "because it's the brand color," or on more than one competing element per view. Brass that is everywhere stops meaning "do this" and starts meaning nothing. Brass must also never be reused to represent status (success, warning, danger) — status colors are semantic and must stay visually distinct from command accents so the two systems never collide in the user's mind.
- **Relationship to other materials:** Brass earns its brightness by contrast with everything else being quiet. It only works because Graphite, Stone, Paper, and Ink are disciplined enough to make room for it.

---

## Color System

Colors in Altair are never chosen by a component author picking a hex value they like. They are consumed as **semantic roles** — a fixed vocabulary of tokens whose meaning stays constant everywhere it is used, in both the light and dark themes. A component that hardcodes a raw color has, by definition, stepped outside the design system, even if the color happens to match. The role, not the value, is what a component is allowed to depend on.

The semantic roles are:

| Role | What it communicates |
|---|---|
| **Canvas** | The base plane of the application shell — where everything else sits |
| **Primary Surface** | The main resting surface for a page's principal content |
| **Secondary Surface** | Structural backing behind or between primary surfaces (Stone's role) |
| **Elevated Surface** | A surface raised above its neighbors — a panel, popover, or active card |
| **Border** | The quiet line that separates adjacent regions without announcing itself |
| **Strong Border** | A border used deliberately to draw a firmer boundary — selection, focus containers, emphasis |
| **Primary Text** | The Ink used for content that must be read and understood |
| **Secondary Text** | Supporting Ink — labels, metadata, captions |
| **Muted Text** | The quietest Ink — placeholders, disabled states, timestamps, the least important word on the screen |
| **Primary Command** | Brass — the one action per screen that matters most |
| **Decorative Accent** | Restrained brand warmth used outside of direct calls to action — never a substitute for status color |
| **Success** | Something completed, healthy, or resolved |
| **Warning** | Something that needs attention soon but is not yet broken |
| **Danger** | Something that has failed, is blocking, or requires immediate action |
| **Information** | Neutral, non-urgent system communication |

### Dark theme — Graphite-forward

Altair's primary, flagship experience is dark and Graphite-forward. In this theme, Graphite dominates the shell, Stone forms the operating backing behind sections, Paper appears deliberately as bright work cards that stand out against the darker surroundings, and Brass carries real weight against the dark field.

- **Canvas / Primary Surface (chrome):** deep Graphite — the near-black structural tone of the shell and sidebar.
- **Secondary Surface:** Stone — the cooler slate backing behind operating sections, several steps brighter than Canvas but still structural, not a work surface.
- **Elevated Surface:** Paper — bright, warm ivory, reserved for cards and panels that hold actual business content and are meant to visually "lift" off the darker backing beneath them.
- **Border / Strong Border:** a cool, low-contrast Graphite-family line for ordinary separation; a firmer version for selection and focus containment.
- **Primary Text on dark chrome:** light, warm Ink for legibility against Graphite.
- **Primary / Secondary / Muted Text on Paper cards:** dark Ink at three strengths — full-strength for content, a warmer secondary tone for supporting text, and a cooler muted tone for the least important text.
- **Primary Command:** Brass, at its brightest and most legible against the dark field — this is where Brass does its most important work.
- **Success / Warning / Danger / Information:** conventional, instantly recognizable semantic hues (green, amber, red, blue-family) chosen for clarity against dark surfaces — deliberately never derived from the Brass family, so status and command never compete for the same visual vocabulary.

### Light theme — Paper-forward

Where Altair renders in a light theme, the dominance inverts without the materials changing identity. Paper becomes the dominant canvas rather than the accent surface, Stone becomes the secondary structural tone that organizes space between Paper surfaces, and Graphite recedes to a supporting role — reserved for the highest-contrast text and any chrome that still needs to assert itself as structural.

- **Canvas:** a quiet, cool near-white — Paper's palest register, used as the resting plane of the page rather than as an individual card.
- **Primary Surface:** brighter Paper — the card and panel tone that holds content, now the norm rather than the exception.
- **Secondary Surface:** Stone — the same cool, muted family as in the dark theme, now used to softly separate zones on a bright page instead of anchoring dark chrome.
- **Elevated Surface:** the brightest, cleanest Paper tone, reserved for the surface that is currently active or in focus.
- **Border / Strong Border:** a soft cool line for ordinary separation; a firmer, still restrained line for selection and focus.
- **Primary / Secondary / Muted Text:** dark Ink at the same three strengths as the dark theme — full-strength Graphite-dark for content, a warm secondary tone for support text, and a cooler muted tone for the least important text.
- **Primary Command:** Brass, tuned for legibility and contrast against bright Paper rather than dark Graphite, but carrying exactly the same meaning: this is the one thing to do next.
- **Success / Warning / Danger / Information:** the same semantic hues as the dark theme, tuned for contrast against light surfaces — the meaning of each color must never change between themes, only its exact tone.

### The non-negotiable rule

No page, component, or one-off screen may introduce a raw color value that is not already backed by one of these semantic roles. If a designer or engineer needs a color that doesn't exist in this system, that is a signal to propose a new semantic role for review — never to reach for an arbitrary hex value "just this once." A design system with exceptions is not a design system; it is a suggestion.

---

## Typography

Altair's typography exists to establish hierarchy before color ever needs to be involved. A well-typeset screen should be scannable in grayscale — if removing all color still leaves the important things obviously important, typography has done its job.

**Why Geist is retained.** Geist is a clean, highly legible, neutral grotesque with excellent numeral tabularity — exactly what a product built around operational numbers, schedules, and financial figures needs. It has no personality of its own to compete with the content, which is precisely the point: a typeface for a tool should be transparent, not expressive. Because Altair's premium feeling comes from restraint and material quality rather than typographic flourish, there is no reason to introduce a second typeface for UI text. A single, disciplined type family reinforces consistency in exactly the way a second "distinctive" font would undermine it.

**Hierarchy before color.** Every screen should be legible in its structure through size, weight, and spacing alone. Headings are distinguished from body text by scale and weight, not by introducing a new color. Color is reserved for meaning — status, command, accent — never for creating hierarchy that type weight and size should have created on their own. If two pieces of text need to look different in importance, the first tool is size or weight; color is the last tool, not the first.

**Headings.** Headings exist to orient, not to decorate. Each heading level should have a single, consistent visual treatment used everywhere it appears — a user should be able to tell a page title from a section title from a card title without reading the words, purely from their type treatment.

**Body text.** Body copy is set for sustained, comfortable reading — never so small that it strains, never so large that it fights the content around it for space. Body text carries the bulk of legibility responsibility, and its size and line height should never be sacrificed for density's sake.

**Supporting text.** Captions, helper text, and metadata are set smaller and in a quieter Ink strength than body text, but never so quiet that they become inaccessible. Supporting text should feel like an aside, not an omission.

**Numerical data.** Numbers are Altair's most consequential content — money, quantities, dates, durations. Numerals are set with consistent tabular alignment wherever they appear in a column, so that a business owner can visually total or compare figures without the numbers appearing to wobble. Numerical hierarchy (a total versus a line item) is communicated primarily through weight and size, exactly as textual hierarchy is.

**Tables.** Table type is smaller and denser than prose type, but never so small that it stops being comfortable at a glance. Column headers are quieter than the data beneath them — the header orients, the data informs, and the data should always be the more prominent of the two.

**Line height, weight, and whitespace.** Line height in Altair is generous enough that paragraphs and stacked rows never feel like they are touching. Weight is used sparingly — most text is regular weight, with medium and bold reserved for headings, primary actions, and the handful of numbers that genuinely need to stand out. Typography is never tightened purely to save space; when space is short, the answer is to remove content, not to compress the text that remains.

---

## Layout System

Layout is the rhythm the entire product moves to. A user who has learned the rhythm of one page should feel that same rhythm on every other page, even if the content is completely different.

**Page rhythm.** Every page follows the same basic shape: an orienting header, a body that does the actual work, and consistent vertical spacing between the sections that make up that body. The rhythm should be predictable enough that a returning user's eye already knows roughly where to look before the page even finishes loading.

**Spacing scale.** Altair uses a small, fixed set of spacing steps rather than arbitrary gaps chosen per component. Each step in the scale has a job — the tightest step separates closely related elements (an icon and its label), a middle step separates fields within a group, and the largest steps separate whole sections of a page from one another. A new, one-off spacing value is never introduced to make one screen "feel a little better" — if the existing scale doesn't produce the right rhythm, the layout is the thing that should change, not the scale.

**Content width.** Different kinds of pages call for different reading widths. A form or document benefits from a narrower, centered column that keeps line lengths comfortable. A dense operational view — a board, a wide table — benefits from using more of the available width, because its job is to show relationships across many records at once. Content width is chosen by what the page is for, never left to stretch arbitrarily to fill the viewport.

**Vertical rhythm.** Sections within a page are separated by consistent, generous space — enough that the eye can tell where one concern ends and the next begins without needing a heavy divider or border to do that job. Borders and shadows are a fallback for separation, not the default.

**Grid philosophy.** Altair's grids exist to align related things, not to fill space with columns. A grid of cards should read as a considered arrangement, not as a generic gallery. Alignment is a promise to the user's eye — once something is aligned to something else, it stays that way everywhere that pattern repeats.

**Whitespace and density.** Whitespace is treated as active, not leftover. That said, density is not fixed across the entire product — a page whose job is rapid scanning of many records is allowed to be denser than a page whose job is a single focused decision. What never changes is that density is a deliberate choice tied to the page's purpose, not an accident of cramming more in because it fit.

**Dashboard versus Workspace pages.** A Dashboard page and a Workspace page are laid out for fundamentally different jobs, and their layouts should look different because of it. The Dashboard uses more open space, larger hierarchy, and fewer simultaneous elements, because its job is orientation — it wants the user to absorb a small number of important things quickly. A Workspace page is denser and more tabular, because its job is to let the user actually do the work — enter data, review a list, act on many records — and excess whitespace there would only slow that work down. Neither layout is "more premium" than the other; each is correct for what it is asked to do.

---

## Radius System

Altair uses a small, disciplined set of corner radii, and every radius in the product should map to one of them.

- **A tight radius** for the smallest interactive elements — pills, small buttons, badges — where a soft edge should be felt but not seen as a design statement.
- **A standard radius** for the everyday building blocks — inputs, buttons, list rows — the default choice when nothing more specific is called for.
- **A generous radius** for cards, panels, and dialogs — the containers that hold meaningful chunks of content and benefit from feeling more deliberately "placed" than a plain rectangle.

Arbitrary, one-off radius values are never acceptable. A radius that doesn't match this scale is a visible tell that a component was built outside the system, and it should be corrected rather than left as a "small" exception — small exceptions are exactly how consistency erodes.

---

## Shadow System

Shadows in Altair exist for one reason: to communicate that something is physically above something else — a popover above a page, a dragged card above a list, a dialog above everything. They are not a decorative finish applied to make a surface "feel nicer."

**Why shadows exist.** A shadow tells the eye there is a gap between two surfaces before the user has to reason about z-index or layering conceptually. It is a physics cue, not a styling flourish.

**When they should appear.** Shadows belong on elements that are genuinely elevated relative to their surroundings — an actively floating panel, a menu, a modal, a card being dragged. A surface that sits flush with its container in the normal flow of the page does not need a shadow to look important; it needs correct spacing and material contrast instead.

**When borders should replace shadows.** For static surfaces that sit at the same level as their neighbors — a card in a grid, a section on a page — a quiet border is almost always the more honest and more restrained choice than a shadow. A border says "this is a distinct region"; a shadow says "this is floating above the page," and those are different claims that should not be made interchangeably.

**When whitespace should replace both.** In many cases, neither a border nor a shadow is needed at all — enough space between two regions is sufficient separation on its own. Reaching for a border or a shadow should be a conscious decision made after whitespace alone has been ruled out as insufficient, never the reflexive first move.

---

## Motion

Motion in Altair is a communication tool with a narrow job description: explain what just changed and where things went. It is never used to entertain, to signal personality, or to make an interaction "feel more alive."

**Animation philosophy.** Every animation must be justifiable by finishing this sentence: "this motion helps the user understand that ___ changed, or where ___ went." If it cannot finish that sentence, it should not exist, no matter how polished it looks in isolation.

**Duration.** Motion in Altair is quick — fast enough to feel responsive and immediate, never so long that the user is left waiting on the interface instead of acting. A user should never feel that an animation is standing between them and the next thing they want to do.

**Purpose.** Motion is used for state transitions (something opened, closed, or changed state), spatial continuity (something moved from one place to another and the user should be able to track where), and feedback (an action was received and something is happening as a result). Motion is never used purely to introduce content onto the screen for the sake of an entrance.

**When animation should never occur.** Animation should never be applied to content that is simply appearing as part of normal page load, to purely decorative elements, or repeatedly to the same element in a way that becomes a distraction rather than a cue. It should also always respect a user's preference for reduced motion — when in doubt, less motion, not more, is the safer and more premium choice.

---

## Buttons

Altair recognizes four kinds of actions, and a user should be able to tell which kind of action a button represents without reading its label.

**Primary action.** The one thing the screen most wants the user to do. It is the most visually assertive control on the screen and carries Brass. There should typically be exactly one primary action visible at a time — if a screen seems to need two, that is a sign the screen is trying to do two jobs and should be reconsidered, not a sign that two primary buttons are needed.

**Secondary action.** A legitimate, supported alternative to the primary action — "cancel," "go back," "save as draft." It is visually present but clearly subordinate to the primary action, so the two never compete for the eye's first stop.

**Destructive action.** An action with consequences that are hard or impossible to undo — delete, remove, deactivate. It uses the Danger role, and it is never allowed to visually resemble a primary action just because it happens to be the most likely next click on that particular screen. A destructive action should always require the same level of confidence from the user as its consequences deserve.

**Quiet action.** A minor, low-stakes, or supplementary action — an icon-only control, a text link masquerading as a button, a tertiary option. Quiet actions are the least visually assertive of the four and should never be styled up to compete with primary actions; their entire value is in being available without being loud.

**Visual hierarchy.** The four kinds of actions should be visually distinguishable from across the room, before a user reads a single label — that distinction is what allows someone moving quickly through their day to act with confidence rather than caution.

---

## Forms

A form in Altair should feel less like "filling out a form" and more like simply telling the software what happened. The best form is one the user barely notices as a form at all — it disappears behind the task it is capturing.

**Inputs.** Inputs are calm by default and become clearly, unmistakably present the moment they are focused, in an error state, or contain something the user needs to double-check. An input that looks the same whether it is empty, focused, valid, or invalid has failed at its one job.

**Selects.** Selection controls should make the available choices obvious and the current choice unambiguous at a glance, without requiring the user to open the control just to confirm what is currently selected.

**Checkboxes and similar controls.** Binary and multi-select controls should have a state that is legible even at a quick glance across a dense list — a user scanning a table of checkboxes should be able to tell which are checked without stopping to look closely at each one.

**Validation.** Validation should tell the user what to fix, not merely that something is wrong. It should appear close to the field it concerns, use the Danger role consistently, and never punish the user by clearing what they already entered. Validation is a form of respect for the user's time, not a gate to make them prove they were careful.

**Focus.** Focus states must always be visible, for every interactive element, in every theme, regardless of input method. A user navigating by keyboard should always be able to tell exactly where they are on the page. This is not a nicety — a focus state that disappears is a broken interface for some portion of every user base.

**The disappearing form.** The measure of a well-designed form is how little the user remembers about the form itself afterward — they should remember what they accomplished, not the fields they had to click through to accomplish it.

---

## Tables

Tables carry a disproportionate share of Altair's real work — customer lists, job schedules, invoices, expenses — and deserve to be treated as a first-class surface, not a default HTML element with some padding added.

Altair tables should feel like **operational ledgers**, not spreadsheets. A ledger is something a professional trusts with the health of their business; a spreadsheet is a blank tool that has no opinion about what matters. The difference is entirely in the details:

**Density.** Table rows are denser than prose, because scanning many records quickly is the entire point of a table — but density must never cross the line into rows that blur together. A user should be able to tell where one row ends and the next begins without effort.

**Readability.** Every column should be scannable independently — a user looking only at the "amount" column should be able to read every value in it without visual interference from neighboring columns. Alignment (numbers right-aligned and tabular, text left-aligned) is not a cosmetic choice; it is what makes scanning possible at all.

**Keyboard accessibility.** A user should be able to move through a table's rows and act on a row without touching a mouse. Tables are a place where power users live, and power users expect the keyboard to work.

**Selection.** When rows can be selected, the selected state must be unmistakable and must persist visibly as the user continues to interact with the table around it — a user should never lose track of what they've already selected.

**Hover.** Hovering a row is a lightweight, quiet cue that says "this is what you're about to interact with" — never a heavy visual change that competes with the data itself.

**Focus.** Precisely as with forms, keyboard focus within a table must always be visible and must move in a logical, predictable order.

**Hierarchy within rows.** Not every cell in a row carries equal weight — a customer's name and an invoice's total deserve more visual weight than a secondary reference number in the same row. Hierarchy inside a table follows the same size/weight-before-color rule as the rest of the typography system.

**Whitespace.** Even a dense table benefits from generous padding within each cell — the density that matters is the number of rows visible at once, not how cramped each individual row feels. A ledger is dense in information, never dense in discomfort.

**Why paper, not spreadsheet.** A spreadsheet is neutral about what matters in it; every cell looks the same regardless of importance. A ledger, by contrast, is a professional document — it has clear headers, deliberate emphasis on totals and important figures, and a clean, calm surface a business owner would be comfortable handing to their accountant. That is the standard: every table in Altair should look like it was kept by someone who cared, not generated by a tool that didn't.

---

## Dashboard

The Dashboard is Altair's Brain — the one screen in the entire product whose job is not to help the user do a specific piece of work, but to tell them, at a glance, how their business is actually doing right now and what needs their attention first. Nothing else in Altair is asked to do this job, and that is exactly why the Dashboard is allowed to look different from every other page.

**Attention hierarchy.** The Dashboard is organized by urgency, not by data category. The first thing a user sees should be what most needs their decision today — not an alphabetical or arbitrary arrangement of every metric the product happens to track. Everything on the Dashboard is ranked by how much it matters to the next decision, and its visual weight should follow that ranking exactly.

**Operational overview.** The Dashboard answers "how is my business doing" the way glancing at a well-run shop floor answers the same question for its owner — a fast, holistic read, not an exhaustive report. It trades completeness for immediacy; anything that needs deep investigation belongs in Reports, not on the Dashboard.

**Decision support.** Every element on the Dashboard should point toward a decision or an action, not merely display a number for its own sake. A statistic that doesn't help the user decide anything is not Dashboard content — it's Reports content, and it should live there instead.

**Avoiding KPI overload.** The single greatest risk to the Dashboard is the temptation to add "just one more metric." Every additional number on the Dashboard divides the user's attention and makes the one thing that actually matters today harder to find. The Dashboard's job is not to prove how much data Altair has — it is to protect the user's attention by showing only what changes their next move.

---

## Workspace Pages

Workspace pages — customers, jobs, estimates, invoices, expenses, and the other operational lists and details — exist to **perform work**, not to summarize it. Where the Dashboard is a glance, a Workspace page is a session: the user is here to do something specific — review a job, edit an estimate, follow up with a customer — and the page should be organized entirely around helping them do that quickly and correctly.

**The expected mental model.** A user opening a Workspace page should feel like they've walked up to a specific station on the workbench built for a specific kind of task, not like they've opened a smaller, busier version of the Dashboard. Workspace pages are allowed — and expected — to be denser, more tabular, and more detailed than the Dashboard, because thoroughness and precision are exactly what the job at hand requires. Summarized, ranked "what matters most" framing belongs on the Dashboard; a Workspace page's job is to give the user everything they need to complete the task in front of them, presented clearly enough that they never have to leave the page to find the missing piece.

---

## Reports

Reports is Altair's Analyze surface, and it exists for a different purpose than either the Dashboard or Workspace pages: it provides **evidence**, not operational attention.

Where the Dashboard tells a user what needs attention right now, Reports lets a user go looking for an answer to a specific question they already have in mind — "how did last quarter compare to this one," "which service line is actually profitable," "what does this customer's history look like over a year." Reports is deliberately calmer and more neutral in its presentation than the Dashboard, because it is not trying to direct the user's attention anywhere in particular — it is trying to answer their question honestly and let them draw their own conclusion. A report that tries to rank or dramatize its own findings the way the Dashboard does is doing the Dashboard's job in the wrong place.

---

## Mobile

Mobile in Altair is not a smaller rendering of the desktop experience — it is a first-class experience built for how field work actually happens: often one-handed, often outdoors, often between other tasks, and rarely in ideal conditions.

**Reachability.** The controls a technician or business owner needs most often should sit within comfortable reach of a thumb, not require a stretch across the screen. The most important action on a mobile screen should be the easiest one to reach, not merely the most visible one.

**Thumb zones.** Primary actions belong low and central on the screen, where a thumb naturally rests; secondary and destructive actions are deliberately placed further from that natural resting zone so they are harder to trigger by accident.

**Safe areas.** Content and controls must always respect device safe areas — notches, home indicators, rounded corners — so that nothing important is ever clipped, obscured, or uncomfortably close to the edge of the usable screen.

**Touch targets.** Every interactive element on mobile must be comfortably tappable without precision aiming, even when the user is walking, wearing gloves, or otherwise not operating in ideal conditions. A target that only works when tapped carefully is a target that will regularly be missed in the field.

**Navigation.** Mobile navigation is built for quick, single-handed movement between the small number of things a person in the field actually needs — it is not a condensed version of a desktop navigation tree, and it should never require the user to learn a second navigational model just because they're on a phone.

**First-class, not adapted.** The test for every mobile screen in Altair is not "does the desktop layout still work at this width" — it is "if this had been designed for a phone first, would it look like this." Anywhere the answer is no, the mobile experience needs its own attention, not a smaller version of someone else's decision.

---

## Accessibility

Accessibility in Altair is treated as a component of premium quality, not as a compliance checkbox to satisfy after the fact. A tool that only works well for some of its users is not a well-made tool — it is a well-made tool for a subset of the people who need it, and that has never been the standard a craftsman holds their work to.

**Contrast.** Every meaningful piece of text and every semantic color must remain clearly legible against its background, in both the light and dark themes, without requiring the user to already know what it says.

**Focus visibility.** Keyboard focus must always be visible, on every interactive element, in every state, in every theme. This is treated as a hard requirement, not a nice-to-have that can be sacrificed for a cleaner-looking control.

**Keyboard support.** Every action available to a mouse or touch user must also be available to a keyboard user, navigable in a logical and predictable order. A feature that only works with a pointing device is an incomplete feature.

**Screen readers.** Interface state — what's selected, what's expanded, what changed, what failed — must be communicated to assistive technology, not just conveyed visually. A user who cannot see the screen should still be able to understand what just happened.

**Touch targets.** As with mobile generally, every interactive element must be sized generously enough to be reliably operated by touch, regardless of the user's manual precision or the conditions they're operating in.

**Reduced motion.** Every animation in the product must respect a user's stated preference for reduced motion, and the interface must remain fully understandable and usable with all non-essential motion removed.

Accessibility done well is invisible — most users will never notice it was considered at all. That invisibility is exactly the point, and exactly why it belongs in the same category as every other premium-through-restraint decision in this document.

---

## Component Philosophy

Altair's shared primitives — Button, Card, Input, Table, Badge, Dialog, Drawer, Sheet, Tabs, Navigation, Empty State, and Loading State — exist so that every page in the product is built out of the same small vocabulary of parts, rather than each page quietly inventing its own version of a button or a card. A shared primitive is not merely a convenience for engineers; it is the mechanism by which consistency actually gets enforced across a product this large. If every page can invent its own card, no design system can survive contact with a real codebase.

Each primitive carries a clear, narrow set of expectations:

- **Button** communicates one of the four defined action types (primary, secondary, destructive, quiet) and nothing else — it should never be silently restyled into a fifth, undocumented variant.
- **Card** is Paper doing its job — a bounded surface for a related unit of content, using the radius and shadow rules already defined, never a bespoke container reinvented per page.
- **Input** behaves identically everywhere it appears — the same states, the same focus behavior, the same validation presentation, regardless of which form it lives in.
- **Table** is the operational ledger described above, consistent in density, alignment, and interaction across every list in the product.
- **Badge** communicates a small, discrete piece of status using the semantic color roles only — never a decorative color chosen for a specific page.
- **Dialog, Drawer, and Sheet** are the three sanctioned ways of presenting focused, elevated content above a page, each suited to a different scale of task, and none of them should be reinvented ad hoc when a page "just needs something a little different."
- **Tabs** organize related views of the same subject and should behave identically whether they appear on a Workspace page or a Reports page.
- **Navigation** is the user's sense of place in the product and must remain the single, consistent way of moving between areas of Altair — never duplicated by a page-specific navigation pattern.
- **Empty State** turns "there is nothing here" into useful guidance about what to do next, consistently, rather than a blank space or a generic placeholder that differs by page.
- **Loading State** preserves the shape of the content that is about to appear, so the page never jumps or reflows once the real content arrives.

Shared primitives should be the **only** visual language used throughout the application. A one-off component built to solve a single page's problem is, by definition, a second visual language — and the entire premise of this document is that Altair can only afford one.

---

## Migration Philosophy

Altair's interface today is the product of several eras of decisions, and it currently contains more than one visual system at once. That is the specific problem this document exists to end — not by replacing what exists with something new, but by giving every future decision a single destination to migrate toward.

**Legacy UI** is the earlier visual system still present in parts of the product. It is not wrong so much as it is unaligned — built under different assumptions, before North Star's direction and this foundation existed. Legacy UI is not something to defend or extend; it is inventory waiting to be brought forward.

**North Star** is the approved direction — the graphite shell, brass accents, slate operating backing, and ivory work surfaces already validated across the product. North Star is not a competing option to this document; it is this document's concrete expression in the interface. Where North Star's existing implementation and this document differ in small ways, this document should be treated as the more precise statement of the same intent, and North Star's implementation should converge toward it over time.

**The Altair Design Foundation** — this document — is the permanent reference both of the above are measured against. It does not belong to any single release or redesign; it is the standard that outlives them.

Future work should always be a migration toward this foundation, never the creation of a third visual system alongside the first two. Every time a page is touched, it is an opportunity to bring that page one step closer to this document — replacing a legacy pattern with a shared primitive, replacing a hardcoded color with a semantic role, replacing an ad hoc spacing choice with the defined scale. Unifying the product is not a separate project to schedule someday; it is the default posture of every future change.

---

## Future AI Guidance

This section exists specifically to be read by an AI agent — human or automated — before it writes a single line of interface code for Altair. Treat every rule below as binding.

- **Never invent a new visual language.** If a screen seems to need a treatment this document doesn't describe, the correct response is to extend an existing primitive or material, not to design something new from scratch.
- **Never introduce new spacing systems.** Use the existing spacing scale exactly as defined. A new gap value invented for a single page is a violation of this document, even if it looks fine in isolation.
- **Never introduce new color systems.** Every color used must trace back to one of the semantic roles defined in the Color System section. If a genuinely new need arises, propose a new role for review — do not add a raw value directly to a component.
- **Never create duplicate component variants.** Before building a new version of a button, card, table, or any other primitive, find and use the existing one. A "just slightly different" variant is how design systems fracture.
- **Always extend existing primitives.** When a primitive is close but not quite sufficient for a new need, the correct move is to extend that primitive's supported options, not to build a parallel component beside it.
- **Always preserve the material language.** Graphite, Stone, Paper, Ink, and Brass each have a defined job in this document. Do not repurpose one material to do another's job because it's convenient for a specific screen.
- **Always preserve the Dashboard / Workspace / Reports philosophy.** These three page types have deliberately different jobs and deliberately different layouts. Do not import Dashboard-style summarization into a Workspace page, or Workspace-style density into the Dashboard, or Dashboard-style urgency framing into Reports.
- **When in doubt, choose less.** Less color, less motion, less decoration, less novelty. This document consistently resolves ambiguity in favor of restraint, and any uncertain decision should be resolved the same way.
- **Cite this document before implementing.** Any UI-facing implementation prompt or plan should reference the Altair Design Foundation explicitly and check its proposed approach against it before writing code — not after, when the inconsistency is already built.

An AI agent that follows every rule above and still produces something that clashes with existing Altair screens has misunderstood a rule, not found a legitimate exception. There are no legitimate exceptions in this document.

---

## Closing

None of this exists to make Altair look a particular way for its own sake. It exists so that a business owner, staring at a screen after a long day, can find what they need, understand what matters, and make their next decision with a little more confidence than they had before they opened the app. That is the only test this document was ever written to pass, and it is the only test any future change to Altair's interface should be measured against.
