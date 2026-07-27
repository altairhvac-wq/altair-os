# Altair Homepage Storyboard

- **Status:** Implementation-ready narrative blueprint
- **Version:** 0.2
- **Audience:** Founder, brand, design, and future homepage implementation
- **Related Canon:** Chapter 26 — The Altair Manifesto
- **Related product design:** `docs/altair/ALTAIR_DESIGN_FOUNDATION.md`
- **Related visual language:** `docs/branding/ALTAIR_DESIGN_LANGUAGE.md`
- **Related founder rule:** `docs/altair/FOUNDER_MODE.md`

---

## Important distinction

This document defines **strategic narrative direction**, not final copy and not production UI.

- Headline territories below are strategic directions, not locked sentences.
- Supporting-copy territories describe intent and tone, not finished prose.
- Scene names are planning labels; final section titles may differ.
- No React components, CSS, routes, or production homepage code should be changed from this document alone.

The current Mission Control homepage was audited as visually premium but emotionally closer to a polished SaaS brochure than a human company with a mission. This storyboard is the narrative replacement for that structure.

Current production homepage structure (for contrast only; do not preserve as the future model):

1. Product-forward hero with HVAC headline and dashboard mockup
2. Reality / pain vignettes
3. Operating-system workflow and module spine
4. Founding member / closed beta offer
5. Anonymous founder note
6. Final CTA card

The future homepage must reverse that order of belief: recognition and mission first; product as mechanism and proof; human trust before the ask; invitation last.

---

# Part 1 — Audit of Storyboard v0.1

This audit evaluated the nine-scene draft against narrative strength, specificity, human trust, product relationship, business-wide positioning, emotional payoff, commercial clarity, pacing, mobile viability, and authenticity risk.

## 1. Narrative strength

**Verdict:** The emotional arc is real and stronger than the current production page. Beginning, middle, and end are present.

| Strength | Weakness |
|---|---|
| Calm → weight → challenge → mission → mechanism → relief → trust → invitation is a genuine story | Scenes 4 and 8 both perform “mission/ambition,” creating redundancy |
| Scene 3 is a necessary philosophical turn | Scene 3 → 4 can feel like two manifesto beats in a row |
| Scene 5 as first product reveal is correct | Scene 6 risks becoming a benefits tour if not tightly constrained |
| Story can work without animation if each scene has a clear still composition | Scene 2’s “horizontal sequence” and Scene 4’s “pinned text” are desktop-biased and unsafe as required understanding |

**Conclusion:** Keep the arc. Compress ambition. Make every scene readable as a still vertical scroll.

## 2. Specificity

v0.1 drifts toward interchangeable brand language in places:

- “A better way to work”
- “Join the mission”
- “Across industries”
- “Clarity compounds”
- “Serious tools. Human standards.”
- “Help businesses operate with confidence”

These can sound premium and empty at the same time.

**Correction rule:** Stay broad through operational truths, not through category adjectives.

Believable across industries without becoming vague:

- messages waiting
- money unfinished
- people needing direction
- priorities unclear
- work following the owner home
- a team that does not know what happens next
- the day becoming visible again

Avoid claiming retail, consulting, creative, and field operations are equally mature product fits today. Speak to the shared operational condition; let industry pages carry specificity later.

## 3. Human trust

**Verdict:** Concentrating the full founder section in late Scene 7 is emotionally correct, but arriving with zero human signal until after the product can feel corporate.

Recommendation based on the desired journey, not SaaS convention:

1. **Seed trust early** — Scene 4 may carry a short attributed line or quiet byline once an approved founder name exists. Not a biography. Not a portrait gallery.
2. **Keep the full human trust anchor after product proof** — Scene 7 remains the concentrated founder section.
3. **Do not move the full founder essay before Scene 5.** Belief in the problem and mission should come first; competence proof second; intimate human accountability third; invitation last.

## 4. Product relationship

Intended role: **mechanism and proof behind the transformation.**

v0.1 risks:

- Scene 5 headline territory drifting into feature inventory (“less chasing,” “connected information,” module-adjacent framing)
- Scene 6 “outcome cards” becoming a SaaS benefits grid
- Optional UI fragments multiplying into a second product tour

Guardrail: product appears to answer “how does a better day become possible?” — never “here is everything Altair includes.”

## 5. Business-wide positioning

**Risk:** Brand ambition is broader than current product strength.

Confirmed product reality (for positioning honesty, not homepage slogan use):

- Strongest today for operational, service-oriented, workflow-heavy businesses
- Core loop centers on customers, work/jobs, people, estimates/invoices/money, and day-level visibility
- Current production homepage and product inventory remain HVAC/trades-shaped
- Expansion is intentional; universal fitness is not yet true

**Do not use:** for every company / for every business / built for everyone / any business can use Altair.

**Do use:** a defensible operational category based on how work moves through an organization. See Homepage Positioning Boundary below.

## 6. Emotional payoff

The desired payoff is present and correct:

- quieter start
- fewer loose ends
- team knows what happens next
- confidence in the state of the business
- work no longer following the owner everywhere
- regained time and mental space

Keep these tied to software-supported outcomes. Do not escalate into lifestyle fantasy, family montage as proof, or sentimental overclaim.

## 7. Commercial clarity

v0.1 under-specifies when the visitor learns:

- what Altair is
- what kind of work it helps organize
- who it is best suited for
- what to do next
- what closed beta means

Placement without damaging the story:

| Answer | First appears | Reinforced |
|---|---|---|
| Human recognition | Scene 2 | Scenes 3–4 |
| Core belief | Scene 3 | Scene 4 / Invitation bridge |
| Why Altair exists | Scene 4 | Scene 7 |
| What Altair is | Scene 5 | Scene 6 |
| Who it is for | Scene 4 (people) + Scene 5/6 (operational fit) | Invitation |
| Closed beta meaning | Scene 7 (honest stage) | Invitation |
| What to do next | Invitation | Nav secondary only |

## 8. Page length and pacing

Nine full cinematic sections will feel long.

| Scene | Density risk | Guidance |
|---|---|---|
| 1 | Medium | Photography carries; one headline + one sentence |
| 2 | High if montage-heavy | Short sequence; photography + fragments; no icon grid |
| 3 | Low–medium | Short transition; copy must do the work; whitespace is the argument |
| 4 | Medium–high if manifesto-length | One purpose statement; absorb ambition here; no second manifesto later |
| 5 | Medium | Product UI must appear; copy stays short |
| 6 | High if benefits-listed | Photography-led outcomes; max three moments |
| 7 | Medium | Portrait + letter-length text |
| Old 8 | Redundant | Merge into Scene 4 bridge or Invitation opening |
| Invitation | Medium | Honesty over offer-stack |

## 9. Mobile experience

Unsafe dependencies in v0.1:

- horizontal scroll as primary understanding for Scene 2
- long pinned text/image compositions
- motion-required storytelling
- dense multi-node workflow reveals

Mobile rule: normal vertical scroll; one image + one thought per viewport; product as one readable frame; founder portrait with short readable text; no hidden carousel meaning.

## 10. Authenticity risks still present

- AI-generated photography that looks like brand cinema instead of lived work
- Over-directed “quiet luxury” morning scenes
- Fake founder intimacy without approved name/story/photo
- Vague mission repeated twice
- False universality
- Invented customer outcomes
- Stock-photo emotion
- Excessive poetic language
- Too much darkness/luxury styling unsupported by product honesty
- Polished brand language ahead of company behavior and closed-beta reality

---

# Part 2 — Refined Narrative Blueprint

## Purpose

The homepage exists to build belief, trust, and emotional connection before presenting Altair OS.

It should answer, in order:

1. Do these people understand what it feels like to carry a business?
2. Do they believe something better is possible?
3. Why does Altair exist?
4. How does the product quietly support that better day?
5. Who is building this, and can I trust them?
6. Am I invited to participate?

It does not exist to win a feature comparison in the first viewport.

## Core belief

From Canon Chapter 26:

> Business should create freedom, not consume it.

Every scene should either reveal the cost of the opposite reality or make this belief feel attainable through operational honesty.

## Desired visitor feeling

By the end of the page, the visitor should feel:

- understood
- calmer
- hopeful
- confident that a real system exists
- curious
- emotionally connected to the mission
- willing to trust the people building it
- clear on a next step

The visitor should **not** primarily leave thinking:

- this has many features
- this uses AI
- this looks like another CRM
- this is another SaaS startup
- this is only for HVAC companies
- this is for literally every business

## Emotional arc

**Calm → Recognition → Challenge → Mission → Mechanism → Relief → Trust → Invitation**

Ambition is no longer a standalone late scene. It is absorbed into Scene 4 and briefly restated as the bridge into the Invitation.

## Recommended scene order

| Scene | Working title | Narrative job |
|---|---|---|
| 1 | The Quiet Before the Day | Open with possibility and human scale |
| 2 | The Weight of Running Something | Make the visitor recognize their life |
| 3 | This Should Not Be Normal | Short philosophical turning point |
| 4 | Why Altair Exists | Mission, people, and restrained ambition |
| 5 | The Product Appears | Altair as supporting mechanism and proof |
| 6 | A Better Way to Work | Outcomes after clarity returns |
| 7 | The Human Trust Anchor | Founder and standards, honestly |
| 8 | The Invitation | Participate; do not get sold |

**Removed as a full scene:** former Scene 8 — The Mission. Its durable ambition line lives inside Scene 4 and as a short bridge into Scene 8.

---

## Visual direction

The homepage should feel editorial, cinematic, human, disciplined, calm, and premium — never luxury-theater or AI-startup spectacle.

### Material atmosphere

- dark cinematic opening (Graphite)
- restrained warm neutral sections (Stone / Paper)
- graphite, stone, paper, ink
- brass accents used sparingly as command and emphasis
- strong typography
- generous whitespace
- documentary-style photography
- limited, deliberate product UI

### Rhythm

- Scenes 1–4: photographic and typographic
- Scene 5: first controlled product reveal
- Scene 6: outcome photography with optional restrained UI evidence
- Scene 7: human portraiture and direct language
- Scene 8: quiet invitation

### Avoid

- glowing cards, glassmorphism as primary language, floating dashboards everywhere
- neon, generic gradients, abstract AI imagery
- stock handshakes, fake smiling laptop teams
- equal-weight feature cards and icon grids
- “AI-powered” visual clichés

## Photography direction

Photography should feel documentary, authentic, imperfect, warm, quiet, observant, and grounded in real work and real life.

Subject hierarchy:

1. People
2. Relationships and responsibility
3. Places where work actually happens
4. Quiet personal outcomes
5. Product UI only when it clarifies a human moment

Do not let construction, HVAC equipment, vans, hard hats, or tools define the entire brand world. They may appear as one honest part of a broader operational world.

Prefer real workplace photography over AI generation for launch-critical trust surfaces. If generated imagery is used in exploration, it must not ship as founder proof, customer proof, or “documentary” evidence.

## Product-reveal strategy

**First real Altair screenshot appears in Scene 5.**

It should not appear in the hero.

After Scene 5:

1. One composed product moment answering how a better day becomes possible
2. Optional Scene 6 evidence fragments tied to earlier pressures
3. Never equal-weight feature grids or UI wallpaper

Product UI is the supporting character. People and outcomes remain the hero.

## CTA strategy

1. Low-commitment exploration
2. Product interest after belief
3. Closed-beta invitation used sparingly
4. Founder/company trust that makes the ask mutual

Placement:

- Scene 1: no hard sell; optional quiet continue cue only
- Scenes 2–4: no conversion CTA
- Scenes 5–6: optional low-commitment product interest
- Scene 7: trust, not conversion pressure
- Scene 8: primary invitation CTA

Avoid repeating the same CTA in every section.

## Homepage copy rules

Avoid:

- revolutionary / next-generation / unlock your potential
- transform your workflow
- AI-powered as a headline
- unsupported “secure by design”
- simplify your business without emotional context
- long module lists in the hero
- HVAC-only brand definition
- generic CRM language
- excessive “operating system”
- for every company / for every business / built for everyone

Prefer lived language: time, clarity, confidence, weight, dinner, loose ends, trust, quiet systems, next action, fewer repeated questions, the day becoming visible.

---

# Scene-by-scene blueprint

## Scene 1 — The Quiet Before the Day

- **Scene number:** 1
- **Working scene name:** The Quiet Before the Day
- **Narrative role:** Opening emotional space; establish human scale and possibility before software
- **Core truth:** Before the noise, every serious business still carries an idea of a freer life
- **Visitor question being answered:** Is this another software pitch, or something more human?
- **Visitor emotion entering:** Neutral, evaluative, possibly skeptical
- **Visitor emotion leaving:** Quieter, curious, opened rather than sold
- **Primary message:** There is a calmer place to begin than a feature list
- **Headline territory:**
  1. Before the day takes over
  2. There is a quieter way to begin
  3. The morning still belongs to you
- **Supporting-copy territory:** One short sentence about possibility and the cost of losing it — no modules, no industry lock-in, no commercial ask
- **Visual subject:** Owner or operator alone in a real workspace before the day starts
- **Photography or product UI:** Photography only
- **Product information allowed:** None
- **Trust evidence required:** Atmospheric only — lived detail, not claims
- **CTA behavior:** None required; optional quiet “Continue” cue only
- **Desktop structure:** Full-bleed documentary opening; brand as hero-level signal; one headline; one sentence; deep Graphite atmosphere with natural morning light
- **Mobile structure:** Full-bleed image; brand + headline + one sentence; no secondary offer stack in the first viewport
- **Transition into the next scene:** Light and quiet give way to density; the day arrives
- **Clichés and risks to avoid:** Dashboard hero; HVAC-only framing; floating badges; motivational poster tone; stock sunrise with no lived detail; luxury-home fantasy disconnected from work
- **Implementation readiness status:** Ready for copywriting after Scene 1 headline selection; photography brief required before visual production

---

## Scene 2 — The Weight of Running Something

- **Scene number:** 2
- **Working scene name:** The Weight of Running Something
- **Narrative role:** Recognition engine; visitor should feel seen
- **Core truth:** Owning a business means carrying an invisible stack of unfinished decisions
- **Visitor question being answered:** Do these people understand my actual day?
- **Visitor emotion entering:** Calm, slightly open
- **Visitor emotion leaving:** Recognized, slightly tense — “this is my day”
- **Primary message:** The weight is rarely one thing; it is messages, money, people, and loose ends arriving together
- **Headline territory:**
  1. Then the day arrives all at once
  2. The weight is rarely one thing
  3. Messages. Money. People. Loose ends.
- **Supporting-copy territory:** Specific lived fragments — unanswered messages, a decision waiting, someone needing direction, money not closed, work following the owner home. Cross-industry through operational texture, not through naming every sector
- **Visual subject:** Sequential documentary moments of operational pressure in ordinary workplaces
- **Photography or product UI:** Photography only; if a screen appears, it is an ordinary device in a human scene, not an Altair shot
- **Product information allowed:** None
- **Trust evidence required:** Empathy specificity; no fake pain statistics
- **CTA behavior:** None
- **Desktop structure:** Short vertical or gentle sequential frames; staggered text; denser pacing than Scene 1 without chaos theater
- **Mobile structure:** One pressure per scroll step; stacked sequence; no horizontal-scroll dependency; no five-icon pain grid
- **Transition into the next scene:** After recognition peaks, stop and challenge the assumption that this is simply the cost of ownership
- **Clichés and risks to avoid:** Generic pain-point icon row; technician-van-only imagery; shame marketing; exaggerated overwhelm; competitor-category naming
- **Implementation readiness status:** Ready for copywriting; requires photography subjects across more than one kind of workplace

---

## Scene 3 — This Should Not Be Normal

- **Scene number:** 3
- **Working scene name:** This Should Not Be Normal
- **Narrative role:** Short philosophical turning point; create permission to want better
- **Core truth:** The dream was never supposed to disappear under administration
- **Visitor question being answered:** Is this just how business has to feel?
- **Visitor emotion entering:** Recognized, slightly heavy
- **Visitor emotion leaving:** Relieved that the weight is named as unacceptable; ready for a different belief
- **Primary message:** Chaos is not the rightful price of building something
- **Headline territory:**
  1. This should not be normal
  2. Chaos is not the cost of ownership
  3. You did not build this to be buried by it
- **Supporting-copy territory:** One clear Canon-aligned argument. Business created for freedom should not consume it. No product name. No manifesto wall.
- **Visual subject:** A pause — threshold, still desk, daylight still available
- **Photography or product UI:** Photography / typographic hold
- **Product information allowed:** None
- **Trust evidence required:** Point of view, not proof claims
- **CTA behavior:** None
- **Desktop structure:** Short section; large type; generous whitespace; hold longer than Scene 2
- **Mobile structure:** Headline-dominant; minimal supporting text; short line length
- **Transition into the next scene:** Once the visitor accepts that the current normal is wrong, introduce why Altair exists
- **Clichés and risks to avoid:** Anger-bait; “disrupt the industry”; instant product pivot; fake stoic founder poetry; making this a full-length manifesto
- **Implementation readiness status:** Ready for copywriting; keep intentionally short in layout

---

## Scene 4 — Why Altair Exists

- **Scene number:** 4
- **Working scene name:** Why Altair Exists
- **Narrative role:** Mission before product; introduce the people Altair serves; absorb restrained ambition formerly isolated in old Scene 8
- **Core truth:** Altair exists to return time, clarity, and confidence to people who carry a business
- **Visitor question being answered:** Why does this company exist, and who is it for?
- **Visitor emotion entering:** Philosophically aligned, waiting for who is speaking
- **Visitor emotion leaving:** Mission clarity; beginning of human trust; curiosity about how this becomes real
- **Primary message:** Altair exists for the people who carry the weight — and for businesses that need one connected way to run the day
- **Headline territory:**
  1. Why Altair exists
  2. Built for the people who carry the weight
  3. Clarity, time, and confidence — returned
- **Supporting-copy territory:** Human company voice drawn from Canon 26.1–26.3 and 26.6. Name the people: owner, office manager, employee, growing team, entrepreneur. State ambition once: serious operational clarity without enterprise bloat. Do not claim every business type is an equal fit. No module list.
- **Visual subject:** Editorial documentary portraits and work contexts across roles; not a fake diverse stock collage
- **Photography or product UI:** Photography only
- **Product information allowed:** Conceptual only — systems that help people build rather than hold them back; no screenshots
- **Trust evidence required:** Optional early founder seed: approved name + one attributed sentence once available. No invented biography.
- **CTA behavior:** None, or soft textual bridge (“Here is how that becomes possible”)
- **Desktop structure:** Mission statement + short people passage + one ambition line; optional quiet byline
- **Mobile structure:** One resonant short block; no multi-column belief cards; no pinned-scroll dependency
- **Transition into the next scene:** The visitor now asks “how?” — product may appear as mechanism
- **Clichés and risks to avoid:** About-page tone; HVAC lock-in; false universality; “passionate about innovation”; feature sneak-preview; repeating a second manifesto later
- **Implementation readiness status:** Ready for copywriting once positioning boundary is accepted; founder byline blocked until public name approval

---

## Scene 5 — The Product Appears

- **Scene number:** 5
- **Working scene name:** The Product Appears
- **Narrative role:** Reveal Altair OS as mechanism and proof, not the page protagonist
- **Core truth:** A better day becomes possible when the work has one place to land and the people responsible can see what matters
- **Visitor question being answered:** How does Altair actually help?
- **Visitor emotion entering:** Mission-ready; asking “how?”
- **Visitor emotion leaving:** Clear that a real system exists; curious, not overwhelmed
- **Primary message:** Altair is the quiet system behind clearer days — not a feature carnival
- **Headline territory:**
  1. Then the work has a place to land
  2. A quieter system behind a clearer day
  3. The day becomes visible again
- **Supporting-copy territory:** Answer the mechanism in operational outcomes: priorities visible, next actions clearer, fewer repeated handoffs, less work following the owner home. Mention the product name once with restraint. Include one plain sentence for what Altair is: software that helps organize customers, work, people, and money in one connected operation. Avoid AI-powered, module grids, CRM language, and “all-in-one platform.”
- **Visual subject:** One composed North Star product frame in a calm material environment
- **Photography or product UI:** First primary product UI reveal; real screenshot only
- **Product information allowed:** Mechanism-level only — visibility, priorities, connected day-to-day operation. No laundry list.
- **Trust evidence required:** Real current product screenshot; no fictional collage
- **CTA behavior:** Optional low-commitment product interest; closed-beta primary CTA still premature
- **Desktop structure:** Headline settles; one product frame; short mechanism copy; editorial framing, not glowing SaaS collage
- **Mobile structure:** Single readable crop; generous caption space; no eight-node workflow spine
- **Transition into the next scene:** From mechanism to lived relief — what the day feels like when the system is doing its job
- **Clichés and risks to avoid:** Feature grid; module laundry list; hero-sized dashboard relapse; “operating system” repetition; turning proof into inventory
- **Implementation readiness status:** Ready for copywriting; blocked for visual production until approved real screenshots are selected

---

## Scene 6 — A Better Way to Work

- **Scene number:** 6
- **Working scene name:** A Better Way to Work
- **Narrative role:** Emotional and operational payoff; make tomorrow imaginable
- **Core truth:** The goal is not more software; the goal is a day that stays under control
- **Visitor question being answered:** What actually changes if this works?
- **Visitor emotion entering:** Product-aware; evaluating usefulness
- **Visitor emotion leaving:** Hopeful; able to picture a quieter, clearer operation
- **Primary message:** Clarity returns as fewer loose ends, a team that knows what happens next, and work that no longer follows the owner everywhere
- **Headline territory:**
  1. When everyone knows what comes next
  2. The day stops following you home
  3. Fewer loose ends. More forward motion.
- **Supporting-copy territory:** Moments, not features. Prefer three payoff truths maximum: clearer priorities; a team that knows what happens next; evenings/mental space returned. No ROI theater. No invented customer metrics.
- **Visual subject:** Documentary relief — aligned team moment, calm close of day, owner leaving while light remains
- **Photography or product UI:** Photography-led; optional one restrained UI fragment as evidence, not a second tour
- **Product information allowed:** Outcome evidence only
- **Trust evidence required:** Believable daily outcomes; no fabricated testimonials here
- **CTA behavior:** Optional product-interest CTA only; do not repeat primary closed-beta ask
- **Desktop structure:** Two or three paired moments maximum; slow reassuring pace; whitespace between beats
- **Mobile structure:** Stacked moments; if “cards” appear they must remain editorial moments, not equal SaaS feature tiles
- **Transition into the next scene:** The visitor can imagine the outcome; now they need to know who stands behind it
- **Clichés and risks to avoid:** Before/after gimmicks; fake ROI; happy-laptop stock; benefits grid; sentimental family proof as substitute for operational truth
- **Implementation readiness status:** Ready for copywriting; keep shorter than a full feature section

---

## Scene 7 — The Human Trust Anchor

- **Scene number:** 7
- **Working scene name:** The Human Trust Anchor
- **Narrative role:** Concentrated human accountability; replace anonymous corporate language
- **Core truth:** Altair is being built by people who take responsibility seriously and are still earning trust through action
- **Visitor question being answered:** Who is building this, and can I trust them?
- **Visitor emotion entering:** Interested; still deciding whether to trust the company
- **Visitor emotion leaving:** Personally connected; willing to believe real people stand behind the product
- **Primary message:** Real people, real standards, honest stage — trust before the ask
- **Headline territory:**
  1. Built by people who take this personally
  2. A note from the founder
  3. Still being built. Already held to a standard.
- **Supporting-copy territory:** Direct explanation of why Altair was built; convictions from Canon 26.4–26.7; acknowledge closed beta / still improving; no fake scale. If early founder seed appeared in Scene 4, this is the full human section, not a duplicate manifesto.
- **Visual subject:** Authentic founder photograph; possible quiet secondary image of real building work
- **Photography or product UI:** Photography only
- **Product information allowed:** Stage honesty only — what is real, what is still being improved. No feature tour.
- **Trust evidence required:** Approved public founder name; authentic photograph; approved origin story; truthful readiness language. Customer quotes only if real and approved.
- **CTA behavior:** None, or soft trust action (“Read the manifesto”); conversion belongs in Scene 8
- **Desktop structure:** Portrait + letter-length text; static; intimate; minimal motion
- **Mobile structure:** Portrait first; short readable letter; do not bury under benefit chips
- **Transition into the next scene:** Trust established; invitation can now feel mutual rather than extractive
- **Clichés and risks to avoid:** Anonymous founder note as final state; invented biography; fake team wall; “trusted by thousands”; overproduced personal-brand photography
- **Implementation readiness status:** Not implementation-ready until founder package is supplied; copy territory can be drafted around approved facts only

### Founder information that must be supplied before Scene 7 ships

Do not invent missing personal facts. Required:

- Approved public founder name for homepage use
- Approved founder photograph(s)
- Approved short origin story / why Altair was built
- Any personal details allowed publicly
- Whether additional builders are named or shown
- Any quotes that may be attributed

Internal references currently use the first name “Jeremiah” in product sample data and founder-facing docs. That is **not** sufficient approval for homepage biography. Confirm public naming, surname if used, portrait, and origin narrative before implementation.

---

## Scene 8 — The Invitation

- **Scene number:** 8
- **Working scene name:** The Invitation
- **Narrative role:** Close with participation, honesty, and a clear next step
- **Core truth:** If this belief resonates, you are welcome to help shape what comes next
- **Visitor question being answered:** What can I do next, and what does closed beta mean?
- **Visitor emotion entering:** Aligned; considering a next step
- **Visitor emotion leaving:** Invited; clear; emotionally connected enough to act without feeling trapped
- **Primary message:** Join while Altair is still being built — honestly, selectively, and with mutual responsibility
- **Headline territory:**
  1. Help shape what comes next
  2. Build a better business with us
  3. If this feels familiar, you belong in the conversation
- **Supporting-copy territory:** Transparent closed-beta language; limited onboarding capacity; what kind of operational business is a good fit; no fake urgency; no benefit bingo repeating Scene 6. Optional one-line ambition bridge from former Scene 8: serious clarity without enterprise bloat.
- **Visual subject:** Quiet closing composition; warm paper/stone or dusk calm; brand present
- **Photography or product UI:** Human invitation leads; product optional as small supporting still only
- **Product information allowed:** Fit + stage only
- **Trust evidence required:** Accurate closed-beta explanation; no fabricated scarcity or social proof
- **CTA behavior:** Primary invitation CTA lives here; one lower-commitment alternative allowed
- **Desktop structure:** Short ambition bridge optional; clear invitation; one primary action; honest supporting sentence
- **Mobile structure:** One primary button; short honest sentence; no repeated benefit grids
- **Transition into the next scene:** End of page / footer with restrained navigation only
- **Clichés and risks to avoid:** “Ready to simplify your business?”; identical CTA for the fifth time; fake scarcity; pricing gimmicks as emotional climax; HVAC-only founding language; “for every business”
- **Implementation readiness status:** Ready for copywriting after closed-beta explanation is confirmed accurate

---

# Part 3 — Homepage Positioning Boundary

## 1. What Altair can credibly claim today

Altair can credibly claim that it helps operators run a connected business day: customers, work, people, and money visible in one system, with clearer priorities and fewer disconnected handoffs.

It can claim mission honesty from Canon 26.

It can claim closed-beta stage honesty.

It cannot yet claim mature product-market fitness for every business type.

## 2. What Altair is growing toward

A broader operational platform for businesses that want clarity, confidence, and freedom without enterprise bloat — across more industries over time, without abandoning the human mission.

## 3. Who the homepage primarily speaks to

Owners, operators, office leads, and growing teams who feel the weight of running something — especially businesses where customer relationships, scheduled or assigned work, people coordination, and money collection must stay connected.

## 4. Which businesses are likely not yet ideal fits

Be honest without listing insults:

- businesses that mainly need a simple brochure site, storefront, or single-purpose point tool
- highly specialized enterprise stacks that need deep vertical systems Altair does not yet replace
- teams whose core pain is not operational coordination across customers, work, people, and money
- organizations seeking AI spectacle more than day-to-day operational clarity

Industry-specific exclusion lists should live on later industry pages if needed, not as homepage negation theater.

## 5. How the page stays broad without becoming dishonest

- Speak in shared operational truths, not false universality
- Show multiple kinds of real work visually, without implying equal product maturity in every sector
- Define Altair by the movement of work through a business, not by one trade label
- Keep HVAC/trades as an honest current strength and early proving ground, not as the brand ceiling and not as the only pictured world

## 6. How industry-specific pages can support the brand homepage later

The brand homepage carries mission, recognition, mechanism, trust, and invitation.

Later industry pages may translate the same story into concrete workflows, screenshots, objections, and proof for HVAC, other trades, and future segments — without forcing the brand homepage back into a single vertical.

## Recommended homepage positioning sentence

**Recommended:**

> Altair is built for businesses where customers, work, people, and money need to move through one connected operation.

**Why this version is defensible:**

- Matches present product strengths without saying “HVAC software”
- Avoids “field-service software,” “CRM,” “dispatch software,” and “software for every company”
- Remains compatible with expansion
- Speaks to an operational condition rather than a vanity category

**Allowed nearby variants for exploration, not automatic adoption:**

- Altair helps businesses keep customers, work, people, and money in one clear operation.
- Altair is the quiet system for teams that need the day to stay connected.

**Rejected directions:**

- The operating system for HVAC companies
- Software for every business
- All-in-one CRM
- AI-powered business platform
- Field service management software (as brand-homepage identity)

---

# Part 4 — Homepage Content Hierarchy

Confirmed order, with one refinement: **who it is for** appears as people earlier and as operational fit later.

| Rank | Information | First appearance | Reinforcement |
|---|---|---|---|
| 1 | Human recognition | Scene 2 | Scenes 3–4 |
| 2 | Core belief | Scene 3 | Scene 4; Invitation bridge |
| 3 | Why Altair exists | Scene 4 | Scene 7 |
| 4 | What Altair is | Scene 5 | Scene 6 |
| 5 | What changes with Altair | Scene 6 | Invitation supporting line |
| 6 | Proof that the product is real | Scene 5 | Scene 6 optional evidence |
| 7 | Proof that the people are real | Scene 4 seed; Scene 7 full | Invitation tone |
| 8 | Who it is for | Scene 4 people; Scene 5/6 operational fit | Invitation fit sentence |
| 9 | Closed-beta transparency | Scene 7 stage honesty | Scene 8 explanation |
| 10 | Invitation | Scene 8 | Footer secondary only |

Navigation may expose Product / Pricing / Sign In without rewriting the story order of the page body.

---

# Part 5 — Minimum Trust Package Before Launch

## Required before the new homepage launches

- Founder name approved for public use
- Authentic founder photograph
- Approved founder origin story
- Real product screenshots from current North Star UI
- Accurate closed-beta explanation
- Clear privacy/security language only with evidence; omit unsupported claims
- Truthful description of product readiness

## Strongly preferred

- One or more real customer quotes
- Customer or pilot-company permission to use a name
- Founder video
- Real workplace photography
- Specific early outcome or anecdote that is true and approved

## Future trust assets

- Case studies
- Customer metrics
- Customer logos
- Product reliability metrics
- Security documentation
- Implementation stories

Do not invent any proof. If a trust element is missing, omit it. Absence is more trustworthy than fabrication.

---

# Part 6 — Final Recommendation

1. **Recommended final scene order**
   1. The Quiet Before the Day
   2. The Weight of Running Something
   3. This Should Not Be Normal
   4. Why Altair Exists
   5. The Product Appears
   6. A Better Way to Work
   7. The Human Trust Anchor
   8. The Invitation

2. **Scenes merged, shortened, or moved**
   - Former Scene 8 (The Mission) merged into Scene 4 and a short Invitation bridge
   - Scene 3 kept, but shortened to a transition scene
   - Scene 6 shortened to two or three outcome moments
   - Early founder seed allowed in Scene 4; full founder section remains Scene 7

3. **Recommended location of first product screenshot**
   - Scene 5 — The Product Appears

4. **Recommended location of founder introduction**
   - Soft seed in Scene 4 once approved name exists
   - Full introduction in Scene 7

5. **Recommended location of the first meaningful CTA**
   - First meaningful commercial CTA: Scene 8 Invitation
   - Optional earlier: low-commitment product interest in Scene 5 or 6 only
   - Scene 1 must not carry closed-beta pressure

6. **Recommended homepage positioning sentence**
   - Altair is built for businesses where customers, work, people, and money need to move through one connected operation.

7. **Biggest remaining strategic risk**
   - Brand-homepage breadth outrunning product truth: sounding like a universal business platform while the strongest current product reality remains operational/service workflow software. The positioning sentence above mitigates this only if Scene 5–6 stay concrete and Scene 8 stays honest about fit and stage.

8. **Information Jeremiah must provide before copywriting**
   - Approved public founder name
   - Approved short origin story / why Altair was built
   - Which personal details may appear publicly
   - Confirmed closed-beta promise language that is operationally true
   - Any real customer quote, anecdote, or naming permission available now
   - Confirmation that the recommended positioning sentence is acceptable as brand-homepage boundary language

9. **Assets required before implementation**
   - Authentic founder photograph
   - Real North Star product screenshots for Scene 5 (and optional Scene 6 evidence)
   - Documentary photography set for Scenes 1–4 and 6 that is not HVAC-only
   - Final brand mark usage guidance for hero-level presence
   - Privacy/security evidence if any security claim will appear
   - Manifesto link destination if Scene 7 references it

10. **Whether the storyboard is ready for the copywriting phase**
   - **Yes, conditionally.** The narrative structure, positioning boundary, hierarchy, trust package, and scene jobs are ready for copywriting.
   - Final founder-facing copy and Scene 7 cannot be completed until the founder package is supplied.
   - No invented biography, testimonials, metrics, or universal-fit claims should enter the copy draft.

---

# Relationship to current homepage

| Current section | Future fate under this storyboard |
|---|---|
| HVAC product hero + dashboard | Replace with Scene 1 cinematic human opening |
| Reality vignettes | Evolve into Scene 2 lived-weight storytelling; broaden beyond field-service tropes |
| Operating system / module spine | Do not lead; absorb selectively into Scene 5 mechanism if needed |
| Founding member offer | Move into Scene 8 invitation; reduce brochure benefit cards |
| Anonymous founder note | Replace with Scene 7 named human trust anchor |
| Final CTA card | Rebuild as Scene 8 invitation, not hard sell |

---

# Validation checklist for future implementation

- [ ] Positioning is broad but defensible; not HVAC-exclusive; not “every business”
- [ ] Manifesto belief visible in narrative, not only footer slogans
- [ ] Product is supporting character: mechanism and proof
- [ ] First screenshot occurs at Scene 5
- [ ] Founder facts are real and approved
- [ ] No fabricated social proof
- [ ] CTA hierarchy respected
- [ ] Photography feels documentary and multi-context
- [ ] Copy rules observed
- [ ] Story understandable without animation
- [ ] Mobile story works as normal vertical scroll
- [ ] Page still feels calm on mobile

---

# Open decisions

1. Final Scene 1 headline within the approved territory
2. Final Scene 8 CTA language within the approved territory
3. Approved founder public identity package
4. Whether Scene 4 includes a founder byline seed
5. Whether Scene 6 includes one secondary UI evidence fragment
6. Photography commission vs. controlled generation for non-trust surfaces
7. Whether the manifesto appears as a linked full-page experience in addition to homepage scenes
8. Exact closed-beta explanation approved for public use

Until those are decided, this storyboard remains the strategic source of truth for the future homepage redesign.
