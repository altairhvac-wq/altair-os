# Altair Community Experience

**Version:** 1.0  
**Status:** First Draft — Living Document  
**Product name:** Altair Community

---

## 1. Document Authority

### Purpose

This document defines the complete user experience, information architecture, interaction philosophy, design intent, responsive behavior, empty-state strategy, trust model, and long-term direction for **Altair Community**.

### Scope

This specification covers how business owners and community members should experience Altair Community: what they see, what they can do, how trust and relationships work, how content types behave, and how the experience remains valuable from a very small local community through larger regional participation.

### Authority relationship

This document is subordinate to:

1. The Altair Mission
2. The Altair Principles
3. The Altair Standard
4. The Altair Personality
5. [`ALTAIR_DESIGN_FOUNDATION.md`](./ALTAIR_DESIGN_FOUNDATION.md) — product UI design constitution
6. The enduring experience model in [`ALTAIR_EXPERIENCE_MAP.md`](./ALTAIR_EXPERIENCE_MAP.md)
7. The approved Mission Control / Horizon philosophy in [`ALTAIR_ART_DIRECTION.md`](./ALTAIR_ART_DIRECTION.md)

It is the authoritative **experience specification for Altair Community**. It is not the global design constitution. Where Community visual or interaction decisions conflict with the Design Foundation, the Design Foundation wins unless this document is intentionally revised.

Implementation should follow this document unless the product intentionally revises it.

### Implementation-agnostic

This document is intentionally **implementation-agnostic**.

It defines experience outcomes, not systems.

Database schemas, APIs, React components, route structures, RPCs, TypeScript interfaces, migrations, and technical architecture belong in architecture and development documentation — not here.

The current Network feature may inform terminology and existing capabilities. It is evidence of what exists today, not the definition of the desired final experience.

---

## 2. Vision

Altair Community is the business community built into Altair.

Altair already helps an owner operate one company with clarity and control. Community expands that promise outward: owners should also be able to grow through trusted relationships with other businesses — especially nearby ones facing the same pressures.

Altair Community is not a social media platform.  
It is not a discussion forum.  
It is not designed to maximize engagement or screen time.

It exists so business owners can:

- solve real problems faster
- discover relevant opportunities
- build meaningful business relationships
- contribute to another owner's success
- celebrate progress that actually matters

The long-term vision is simple: a business owner opens Community because something valuable may have happened since the last visit — someone needs help they can give, an opportunity fits their capacity, a trusted partner shared work, or a relationship needs a next step.

Helping another business should strengthen the community as a whole. Community should become one of the reasons people choose Altair over competing field-service platforms.

---

## 3. Community Mission

Altair Community exists to connect local business owners in meaningful ways so businesses succeed together.

Every interaction should create value for at least one business.

The Community should make it easy to:

- ask for help
- offer help
- discover opportunities
- build trusted partnerships
- celebrate meaningful progress

Community succeeds when businesses succeed together.

---

## 4. Core Promise

Every meaningful visit to Altair Community should create at least one of these outcomes:

1. A real business problem moves closer to resolution.
2. A useful opportunity becomes visible and actionable.
3. A trusted relationship is started, strengthened, or activated.
4. Practical knowledge is gained from another owner.
5. Meaningful progress is acknowledged without turning into performance.

If a visit creates none of these, the experience failed — even if the owner spent time in the product.

---

## 5. Experience Thesis

### Why should an owner open Community?

Because Community is where local business value concentrates: help requests they can answer, opportunities that fit their capacity, introductions worth making, and relationships worth maintaining.

### What should they feel in the first ten seconds?

Calm confidence that this place is alive for a purpose — not noisy for attention. They should immediately see whether someone needs help, whether help is available to them, and what the highest-value next action is.

### Why should they return tomorrow?

Because Community creates outcomes that compound: answered requests, filled opportunities, warmer relationships, and a growing sense that nearby owners are allies rather than strangers.

### What makes this fundamentally different from a social network?

Social networks optimize for attention, identity performance, and endless content. Altair Community optimizes for **business outcomes between owners**. Relationships matter more than followers. Contribution matters more than popularity. Action matters more than posts. Silence is acceptable when nothing needs doing. Noise is never the product.

---

## 6. Core Principles

### Solve Real Problems

Every feature must help solve genuine business challenges: overflow work, subcontracting, hiring, equipment, advice, referrals, partnerships, and local operational needs.

### Action Over Attention

Community is designed around action, not content consumption. Screens should push toward solving, connecting, recommending, resolving, or celebrating — not scrolling.

### Relationships Over Followers

Trusted business relationships are the unit of value. Follower counts and popularity must never become the primary measure of success.

### Contribution Over Popularity

Reputation comes from helping, referring, answering, introducing, and collaborating — not from volume, virality, or visibility.

### Local First

Nearby businesses are often the most valuable connections. Prioritize nearby requests, opportunities, events, and introductions when useful, without forbidding valuable non-local relationships.

### Quality Over Quantity

Ten meaningful relationships beat one thousand inactive members. Prefer fewer high-trust interactions over high volume.

### Trust Is Earned

Trust accumulates through contribution, reliability, and completed collaboration. It is never purchased, gamed, or displayed as a vanity scoreboard.

### Calm Over Noise

Community should feel composed and purposeful. If an element exists only to create urgency theater or keep someone browsing, remove it.

### Useful Before Impressive

Prefer the useful next step over impressive empty polish. Clarity beats spectacle.

### Small Communities Must Still Feel Alive

The experience must remain valuable with one, three, or ten businesses. Emptiness should invite contribution, not feel broken. Never fabricate activity to simulate scale.

---

## 7. Anti-Patterns

Altair Community explicitly prohibits:

- infinite feeds
- follower counts
- generic likes as the primary response
- popularity rankings
- engagement bait
- public vanity metrics without business value
- unstructured generic posting
- dark patterns that manufacture urgency or obligation
- unnecessary notifications whose only job is re-engagement
- forcing businesses to perform publicly
- turning Community into an advertising wall
- empty dashboards filled with fake activity
- gamified badges that reward noise over outcomes
- “create post” as the default mental model

“Ask the Community” is preferred over “Create Post.”

---

## 8. Success Criteria

Community is successful when owners return because it consistently creates value.

### Primary outcome metrics

- businesses helped
- referrals completed
- questions answered
- opportunities filled
- introductions made
- trusted relationships created
- response time to requests
- repeat participation
- percentage of active businesses that receive or provide value

### Explicitly rejected as primary success metrics

- time spent scrolling
- follower counts
- likes / reactions volume
- viral content
- raw post volume

Meaningful outcomes are more valuable than engagement metrics.

---

## 9. Community Content Model

Community content is not “posts.” Each type exists to create a specific business outcome.

### Help Request

| Dimension | Guidance |
|-----------|----------|
| **Why it exists** | Make it easy to ask for concrete help with a real business need. |
| **Who creates it** | A business owner or authorized community member needing help. |
| **What it should contain** | Need, context, category, urgency, location/service area relevance, timing, and what a good response looks like. |
| **Primary action** | **I Can Help** |
| **Expire / resolve** | Resolves when help is secured or the need ends; expires when time-sensitive usefulness ends. |
| **Successful outcome** | A qualified business offers help and the request is resolved with a thank-you or closed outcome. |

### Opportunity

| Dimension | Guidance |
|-----------|----------|
| **Why it exists** | Surface work, capacity, resources, or partnerships another business can act on. |
| **Who creates it** | A business with overflow, capacity, equipment, hiring need, or partnership intent. |
| **What it should contain** | Opportunity type, scope, location, timing, qualifications, and what “interested” means. |
| **Primary action** | **Interested** (then continue conversation) |
| **Expire / resolve** | Expires when filled, withdrawn, or no longer timely. |
| **Successful outcome** | A fit is found and the opportunity is filled or closed with a clear result. |

### Question

| Dimension | Guidance |
|-----------|----------|
| **Why it exists** | Owner-to-owner knowledge sharing with a path to a useful answer. |
| **Who creates it** | A business seeking practical advice or recommendations. |
| **What it should contain** | Clear question, relevant context, locality if needed, and recommendation category when applicable. |
| **Primary action** | Answer / **Recommend Someone** |
| **Expire / resolve** | Can close when answered; evergreen value may remain visible after closure. |
| **Successful outcome** | An accepted or clearly useful answer; thanks exchanged; knowledge remains findable. |

### Win

| Dimension | Guidance |
|-----------|----------|
| **Why it exists** | Celebrate meaningful business progress that reinforces optimism and trust. |
| **Who creates it** | A business sharing a genuine milestone. |
| **What it should contain** | What happened, why it matters, and optional context — not vanity metrics theater. |
| **Primary action** | Acknowledge / **Thank You** (lightweight, sincere) |
| **Expire / resolve** | Naturally ages out of prominence; not a permanent popularity contest. |
| **Successful outcome** | Peers acknowledge progress; community morale strengthens without ranking winners. |

### Event

| Dimension | Guidance |
|-----------|----------|
| **Why it exists** | Help owners discover relevant local and professional gatherings. |
| **Who creates it** | A business, organizer, or community curator. |
| **What it should contain** | What, when, where, who it’s for, capacity if relevant, and how to express intent. |
| **Primary action** | Express interest / RSVP intent |
| **Expire / resolve** | Expires after the event time. |
| **Successful outcome** | Relevant owners discover it and take a clear attendance action. |

### Introduction

| Dimension | Guidance |
|-----------|----------|
| **Why it exists** | Connect two businesses when a third party sees mutual value. |
| **Who creates it** | A community member who knows both sides. |
| **What it should contain** | Why the introduction matters, what each side might gain, and consent-aware framing. |
| **Primary action** | **Connect Us** / accept introduction |
| **Expire / resolve** | Resolves when accepted, declined, or completed. |
| **Successful outcome** | Both businesses connect and can continue privately. |

### Referral

| Dimension | Guidance |
|-----------|----------|
| **Why it exists** | Hand off real customer/work opportunity to a trusted business. |
| **Who creates it** | A business sending work they cannot or should not take. |
| **What it should contain** | Enough context to act, urgency, and clear handoff expectations — without exposing confidential customer detail beyond necessity. |
| **Primary action** | Accept / continue handoff |
| **Expire / resolve** | Tracks through accepted, declined, converted, won, lost, or cancelled outcomes. |
| **Successful outcome** | The receiving business can act; the source business gets closure on outcome when appropriate. |

### Recommendation

| Dimension | Guidance |
|-----------|----------|
| **Why it exists** | Point another owner to a person, vendor, tool, or partner worth trusting. |
| **Who creates it** | An owner with direct experience. |
| **What it should contain** | Who/what is recommended, for what situation, and why — not generic endorsements. |
| **Primary action** | View recommended business / save / ask follow-up |
| **Expire / resolve** | Remains useful while context stays valid; can be withdrawn if no longer true. |
| **Successful outcome** | Another owner finds a trusted option faster. |

---

## 10. Signature Actions

Community actions should sound like business behavior, not social reactions.

### I Can Help

The signature interaction. Signals willingness and competence. Should lead to a clear next step: message, claim intent, coordinate, or mark involvement — not a disposable emoji.

### Ask the Community

The preferred creation verb. Frames contribution as a request for help or knowledge, not as publishing content.

### Recommend Someone

Routes value through people. Prefer naming a fit over leaving a vague comment.

### Connect Us

Starts a purposeful introduction. Better than passive “follow.”

### Interested

Expresses fit for an opportunity without fake enthusiasm. Should open a path to conversation or qualification.

### Thank You

Closes the human loop after help, answers, referrals, or introductions. Reinforces generosity without becoming a like button.

### Mark Resolved

Ends the request/opportunity lifecycle honestly. Resolution is a first-class outcome.

### Save

Keeps relevant opportunities, businesses, or answers for later without requiring public performance.

### Message or Continue Conversation

Moves from public intent to private coordination. Most real value completes off the homepage.

### Why these beat generic social reactions

Likes, follows, and endless comments optimize for visibility. These actions optimize for **progress**: help offered, fit expressed, trust transferred, problem closed.

### Lightweight acknowledgments

A restrained acknowledgment on Wins (or rare peer thanks) may be appropriate when it is sincere and secondary. It must never become the central behavior, ranking mechanism, or substitute for “I Can Help,” introductions, referrals, or resolution.

---

## 11. Community Homepage Information Architecture

The Community homepage answers, in priority order:

1. Is this community alive?
2. Does anyone need my help?
3. Can someone help me?
4. What opportunities exist?
5. What positive progress is happening?
6. Who should I know?
7. What needs my attention?

### Intended regions (not all required at once)

| Region | Job |
|--------|-----|
| Community orientation / hero | Purpose, local framing, calm identity |
| Community health | Trustworthy vitality signals |
| Needs attention | Personal action queue |
| Businesses looking for help | Active Help Requests |
| Ask the Community | Primary creation path |
| Opportunities | Actionable capacity/work/resource openings |
| Questions | Knowledge requests needing answers |
| Community wins | Meaningful progress |
| Events | Relevant upcoming gatherings |
| Recommended connections | Who you should know next |
| My relationships | Active trusted partners and pending relationship work |
| Directory access | Tool entry, not the homepage itself |

### Prioritization and progressive disclosure

- Lead with the highest-value action for **this** business right now.
- Collapse empty regions rather than showing hollow modules.
- Prefer a short “needs attention” list over a wall of everything.
- Directory, full history, and broad browsing are secondary surfaces.
- Avoid competing primary CTAs on one view. One Brass command moment when possible: usually **Ask the Community** or **I Can Help**, depending on context.

The homepage owns current community value and highest-priority actions. It must not become a feed.

---

## 12. First Ten Seconds

Immediately after opening Community, a user should understand:

1. **Purpose** — this is a place to help and be helped by other businesses.
2. **Current activity** — whether real help, opportunities, or relationship actions exist (or that the community is early and needs contribution).
3. **Highest-value action** — the one best next step for them.
4. **Trust** — this is professional, calm, and earned — not performative.
5. **Local relevance** — nearby context matters when available.
6. **Absence of feed-like noise** — no endless scroll of low-value content.

If those six are unclear, the homepage is wrong — not the user.

---

## 13. Community Health

Health signals must be meaningful and honest. Avoid vanity statistics.

### Useful signals

- open help requests nearby
- opportunities available
- recent resolutions (help given, opportunities filled)
- active relationships / trusted partners
- questions awaiting answers
- upcoming events
- response freshness (“last help offered recently”) when trustworthy

### Avoid

- fake “online now” counts
- inflated activity counters
- leaderboards
- engagement streaks that reward presence over outcomes

### Scale guidance

| Scale | Health presentation |
|-------|---------------------|
| **Fewer than 10 businesses** | Emphasize invitation, profile completeness, first ask/offer, and founding contribution. Show honesty: “small and building.” |
| **10–100 businesses** | Show local vitality: open needs, recent resolutions, nearby opportunities. |
| **Larger regional communities** | Add relevance filtering and summarization so health remains scannable, not overwhelming. |

Never invent activity to make Community look bigger than it is.

---

## 14. Help Requests

Help Requests are the heart of Community action.

### Request categories (examples)

- overflow / capacity
- subcontracting
- hiring / temporary labor
- equipment needed
- business advice
- professional recommendation
- licensing / local regulation guidance
- emergency / time-critical operational help

### Experience requirements

The viewer must quickly understand:

- who needs help
- what they need
- where (location / service area)
- when (urgency and time sensitivity)
- whether they are likely qualified to help
- what happens after **I Can Help**

### Urgency and time sensitivity

Use clear urgency language and expiration. Time-sensitive requests should age visibly and leave the active surface when stale.

### Location relevance

Prefer local and service-area matches. Allow broader visibility when the need is non-local by nature (software advice, vendor recommendations).

### Trust and visibility

Default to community-appropriate visibility. Support more private or relationship-scoped requests for sensitive needs. Never require public performance to get help.

### Ownership and response behavior

The requesting business owns resolution. Responders express **I Can Help**, then continue coordination. Multiple offers may be possible; the owner chooses whom to proceed with.

### Resolution and expiration

Requests should be markable as resolved, withdrawn, or expired. Resolved requests can leave a light contribution trail without remaining as noise.

### Duplicate prevention

Guide users away from creating near-identical open requests. Prefer updating an existing request or marking resolved before asking again.

### Safety boundaries

Prohibit requests that solicit illegal services, share confidential customer data unnecessarily, harass, discriminate, or function as spam advertising.

---

## 15. Opportunities

Opportunities are supply-side or mutual-value openings. Help Requests are “I need.” Opportunities are “this is available / this could fit.”

### Opportunity types

- overflow work
- subcontracting
- referrals
- hiring
- joint bids
- equipment wanted
- equipment available
- warehouse or workspace
- temporary labor
- partnerships
- vendor opportunities

### How Opportunities differ from Help Requests

| | Help Request | Opportunity |
|---|--------------|-------------|
| Framing | Need-centered | Offer / opening-centered |
| Primary action | I Can Help | Interested |
| Success | Need resolved | Opening filled or matched |
| Tone | Ask for support | Invite participation |

An overflow job can be either, depending on framing. Prefer the type that makes the next action obvious.

---

## 16. Questions and Recommendations

Owner-to-owner knowledge sharing without becoming an unstructured forum.

### Appropriate topics

- professional recommendations
- software
- payroll
- insurance
- suppliers
- marketing
- hiring
- operations
- licensing
- local regulations

### Structure over free-for-all

Questions should be clear, categorized when useful, and closable. Answers should aim for usefulness, not debate. Recommendations should name a fit and a situation.

### Closure and evergreen value

- Support accepted / most useful answers.
- Encourage **Thank You**.
- Keep resolved questions discoverable when they remain evergreen.
- Retire outdated advice from prominence when context changes.

Avoid thread wars, reputation farming through comment volume, and open-ended “discuss” posts with no ask.

---

## 17. Community Wins

Wins celebrate milestones that strengthen optimism and trust — not performative vanity.

### What qualifies

- first hire / key hire
- major job completed under pressure
- meaningful partnership formed through Community
- resolved crisis with peer help
- anniversary of disciplined growth
- certification or capability that helps the local network

### What does not qualify as the center of gravity

- follower milestones
- vague hustle theater
- competitive bragging framed as ranking

### Acknowledgment

Peers may acknowledge sincerely. Acknowledgments must not create popularity contests, ranked “top wins,” or like-driven prominence.

Wins reinforce: *businesses here build, help, and improve — they do not perform for an audience.*

---

## 18. Events

### Event types

- meetups
- training
- trade shows
- association meetings
- volunteer events
- owner roundtables
- informal coffee or lunch events

### Experience-level requirements

- **Discovery:** relevant upcoming events visible without hunting
- **Relevance:** local / trade / owner-focused ranking when useful
- **RSVP intent:** clear interest without fake social RSVP games
- **Location:** place and logistics clarity
- **Capacity:** communicate limits when they matter
- **Expiration:** remove or archive after the event ends

Events exist to create real-world relationship value, not to pad an activity feed.

---

## 19. Introductions and Referrals

These are related but not the same.

| Concept | Meaning |
|---------|---------|
| **Connection** | Two businesses can find and contact each other. |
| **Introduction** | A third party connects two businesses for mutual value. |
| **Referral** | One business sends real work / a customer opportunity to another. |
| **Trusted partner** | A relationship strengthened by reliability and collaboration. |
| **Completed collaboration** | Proof that work or partnership actually happened. |

### Expected journey

1. Discover a business (directory, recommendation, event, or request).
2. Connect or receive an introduction.
3. Collaborate via opportunity, help, or referral.
4. Earn trusted-partner standing through successful outcomes — not a one-click badge.

### Trust implications

Introductions transfer social capital. Referrals transfer customer trust. Both require restraint, clarity, and respect for confidential information.

---

## 20. Relationships and Trust

### Relationship states (language may evolve)

Suggested progression:

1. **Discovered** — visible in Community / directory
2. **Connected** — mutual or accepted contact path exists
3. **Introduced** — brought together by a third party
4. **Collaborated** — completed help, opportunity, or referral together
5. **Trusted partner** — repeated reliability and preferred collaboration

Exact labels may change; the progression must remain earned.

### Display without becoming a review marketplace

Show contribution and relationship context carefully:

- helped / collaborated signals from real outcomes
- shared history between two businesses
- optional private notes for one’s own relationship CRM

Do not become Yelp for contractors. Avoid public star ratings, pile-on reviews, or shaming for non-response.

---

## 21. Community Reputation

Reputation is contribution-based.

### Possible signals

- businesses helped
- referrals completed
- questions answered
- successful introductions
- opportunities shared
- trusted collaborations
- member tenure

### Safeguards

Protect against:

- gaming and self-dealing
- quantity over quality
- popularity contests
- misleading totals
- public shaming
- star-rating behavior

Prefer outcome-weighted, abuse-resistant signals. Prefer private or restrained public presentation over leaderboard energy. Tenure alone never equals trust.

---

## 22. Business Profiles

A Community business profile answers:

1. Who are you?
2. What do you do?
3. Where do you serve?
4. How can you help?
5. What help are you looking for?
6. Why should another business trust you?
7. What relationships or contributions have you built?

### Intended sections

- About
- Services and capabilities
- Service area
- We Can Help With
- We Are Looking For
- Certifications or qualifications
- Community impact
- Trusted relationships
- Current requests or opportunities
- Contact and connection actions

### Avoid

- résumé-like personal branding theater
- consumer-review-heavy layouts
- follower counts
- influencer aesthetics

Profiles are tools for matching help, opportunity, and trust — not personal brands.

---

## 23. Directory and Discovery

The directory is a **tool**, not the homepage.

### Purpose

Find businesses by need, trade, location, capability, and complementarity when the homepage’s recommendations are not enough.

### Discovery dimensions

- trade
- location
- service area
- capability
- availability / accepting work or referrals
- certifications
- optional identity attributes (e.g., veteran-owned) when voluntarily provided
- complementary trades
- nearby businesses
- businesses that can solve a current need

### Search, map, filters, recommendations

Support list and map discovery where location data is trustworthy. Filters should reduce noise, not create complexity theater. Recommendations should answer “who can help with what I need?” before “who is popular?”

Directory access belongs on the homepage as an entry point, not as the dominant composition.

---

## 24. Notifications and Attention

Notify only when Community deserves interruption.

### Appropriate notifications

- someone can help with your request
- introduction received
- referral status change
- opportunity near you that matches stated needs/capabilities
- request nearing expiration
- event reminders the user opted into
- direct relationship activity requiring a response

### Rejected notification purposes

- “you haven’t visited in a while”
- engagement bait
- popularity alerts
- noisy digests of low-value activity

Notifications should be relevant, actionable, and restrained. Batch when possible. Prefer in-product “needs attention” over constant push.

---

## 25. Empty and Low-Activity States

This section is critical. Community must never fabricate activity.

### Scenarios and intent

| Scenario | Experience intent |
|----------|-------------------|
| **One business** | Explain value; complete profile; invite relevant businesses; state first offer/need. |
| **Three businesses** | Highlight mutual help potential; suggest first request or opportunity; encourage introductions. |
| **Ten businesses** | Show real local pulse; still teach contribution; keep density low. |
| **No active requests** | Offer Ask the Community + “I can help with…” profile prompts. |
| **No opportunities** | Invite sharing overflow/capacity; show directory for complementary trades. |
| **No events** | Suggest hosting a small owner coffee; optionally surface curated regional events when available. |
| **No trusted partners** | Recommend nearby complementary businesses; invite existing contacts into Altair. |
| **New user, no profile** | One clear path: complete Community profile (help offer + help need). |
| **Mature user, no current activity** | Calm zero state: “Nothing needs you right now” plus optional browse/invite — never fake urgency. |

### Empty-state rules

Empty states should:

- explain the value
- offer one clear next step
- teach contribution
- show how to invite relevant businesses
- use regional discovery where available
- avoid making the product feel broken

Honesty is more premium than simulated liveliness.

---

## 26. Community Seeding and Early Growth

Community must be valuable before network effects exist.

### Early-value strategies

- local launch groups rather than nationwide empty marketplaces
- invitations to known complementary businesses
- recommended founding businesses in a service area
- owner onboarding that asks what they can offer and what they currently need
- manually curated opportunities or events when appropriate
- trust-building before scale
- founder/community curation during closed beta when useful

Avoid shipping a giant empty directory and hoping activity appears. Prefer dense local usefulness over thin national presence.

---

## 27. Geographic Model

### Layers

| Layer | Role |
|-------|------|
| **Local community** | Default relevance frame for help, opportunities, and events |
| **Service area** | Where a business actually works |
| **City** | Practical discovery unit |
| **Region** | Broader matching when local density is thin |
| **State** | Wider professional knowledge and regulations |
| **National discovery** | Secondary; useful for tools, vendors, and non-local knowledge |

### Recommendation

Local-first by default. Expand radius when local density is insufficient or when the need is inherently non-local. Never trap a useful relationship behind an arbitrary wall — and never drown a small city in nationwide noise.

---

## 28. Permissions, Privacy, and Visibility

Experience-level expectations (not authorization implementation):

- **Business-visible information** — identity and capabilities a company chooses to present for discovery.
- **Community-visible information** — requests, opportunities, questions, wins, and events intended for the community surface.
- **Private requests** — sensitive needs visible only to chosen relationships or a restricted audience.
- **Relationship-only activity** — introductions, some referrals, and private coordination.
- **Employee vs owner access** — owners/admins typically govern Community identity and outbound trust actions; other roles may handle inbound operational items (e.g., received referrals) according to company permissions. Exact role policy remains an open product decision.
- **Blocked or hidden businesses** — members can reduce unwanted contact.
- **Reporting** — clear path to report spam, scams, harassment, or abuse.
- **Sensitive business needs** — hiring struggles, financial pressure, and similar topics deserve privacy controls.
- **Profile visibility** — businesses control whether they appear in discovery.

Do not design the authorization model here; keep expectations clear and human.

---

## 29. Safety and Community Quality

Practical professional standards:

- block spam and solicitation abuse
- reject scams and misleading opportunities
- prohibit harassment and discrimination
- forbid illegal service solicitation
- protect confidential customer information in referrals and requests
- prevent referral abuse and bait handoffs
- address repeated non-response patterns without public shaming
- provide reporting and moderation expectations appropriate to a professional community

Tone: firm, calm, practical. This is a business community, not an anonymous forum.

---

## 30. Desktop Experience

Align with [`ALTAIR_DESIGN_FOUNDATION.md`](./ALTAIR_DESIGN_FOUNDATION.md).

### Guidance

- **Hierarchy:** orientation → needs attention / help → opportunities → relationships → secondary discovery
- **Scanning:** owners should find the highest-value action without hunting
- **Section density:** calmer and more selective than Workspace ledgers; denser than pure marketing pages
- **Page width:** comfortable reading for narrative regions; wider only when directory/map relationships need it
- **Panels:** use for request/opportunity/profile detail when they improve decision-making
- **Side rails:** only when they help prioritize action (e.g., needs attention), never as widget clutter
- **Atmosphere:** restrained Mission Control / Horizon feel — calm, capable, local
- **Navigation:** Community owns community value; Directory, Profile, Relationships, and Detail surfaces own their jobs
- **Primary actions:** typically one Brass command per view — Ask the Community or I Can Help

Do not impose fixed percentage-based page compositions. Composition follows urgency and usefulness.

---

## 31. Mobile Experience

Mobile is first-class, not a shrunk desktop.

### Guidance

- **Priority stacking:** needs attention and help requests first; directory later
- **Reduced density:** one job per screen region
- **Sticky actions:** only when justified (e.g., I Can Help on a request detail)
- **Cards/lists:** prefer clear list rows and purposeful detail views; avoid card galleries as decoration
- **Filters:** progressive, not a wall of controls
- **Location context:** show nearby relevance when trustworthy
- **One-handed use:** primary actions in comfortable reach
- **No horizontal overflow**
- Preserve prominence of **I Can Help** and **Ask the Community**
- Large homepage sections collapse, paginate, or move to dedicated surfaces rather than forcing endless scroll

---

## 32. Accessibility

Community must meet the same accessibility bar as the rest of Altair:

- semantic controls and landmarks
- full keyboard navigation
- always-visible focus
- readable contrast on Graphite, Stone, and Paper
- respect reduced motion
- urgency communicated with language and icons, not color alone
- accessible status language (“Resolved,” “Urgent,” “Expires tomorrow”)
- action labels that make sense out of context (“I Can Help with overflow HVAC,” not “Submit”)
- screen-reader-friendly summaries for requests and opportunities
- touch targets sized for reliable field/office use

---

## 33. Visual and Interaction Direction

Translate the Design Foundation into Community-specific guidance.

### Materials and color

Use Graphite, Stone, Paper, Ink, and Brass with semantic success / warning / danger / information roles. Restraint first. Genuine elevation only when something is truly above the page. Meaningful motion only — explain change, never entertain.

### Community should feel

- trustworthy
- warm
- capable
- active
- generous
- local
- professional

### Community must not feel

- noisy
- gamified
- childish
- corporate-social
- influencer-driven
- like a consumer marketplace
- like a generic SaaS feed

Community is a craftsman’s mutual-aid network, not a social product wearing field-service clothing.

---

## 34. Ownership and Navigation

Each major surface owns a job. Prevent duplicate CTA ownership and competing surfaces.

| Surface | Owns |
|---------|------|
| **Community homepage** | Current community value and highest-priority actions |
| **Business profile** | Identity, capabilities, needs, and trust context |
| **Directory** | Discovery and search/map filtering |
| **Relationship area** | Invitations, connections, trusted partners |
| **Request detail** | One request’s context, responses, and resolution |
| **Opportunity detail** | One opportunity’s lifecycle and matching |
| **Question detail** | Answers, recommendations, and closure |
| **Event detail** | Logistics and RSVP intent |
| **Introduction / referral detail** | Hand-off status and next actions |

Lesson from Job Command Center: one page, one primary question. If two surfaces fight over the same CTA, consolidate.

---

## 35. Responsive Growth Strategy

| Stage | Experience emphasis |
|-------|---------------------|
| **1–10 businesses** | Invitation, profile completeness, first asks/offers, curated local warmth |
| **10–100 businesses** | Local matching, help/opportunity prominence, relationship building |
| **100–1,000 businesses** | Stronger relevance, filtering, and attention protection |
| **Multiple local regions** | Region-aware homes, cross-region discovery as secondary, local moderation capacity |

As density grows: increase relevance and curation, tighten anti-noise rules, and keep trust higher than reach. Growth must not turn Community into a feed.

---

## 36. Future Evolution

Possible future capabilities — not commitments:

- owner mentorship
- equipment exchange
- group purchasing
- regional communities
- community-supported hiring
- verified partner programs
- local training
- vendor relationships
- community challenges (outcome-based, not engagement games)
- disaster or emergency coordination
- AI-assisted introductions
- AI-assisted request matching

Every future capability must pass the Community principles and Decision Filter. AI may assist matching; humans remain responsible for trust and commitments.

---

## 37. Explicit Non-Goals

Altair Community should not become:

- LinkedIn
- Facebook Groups
- Reddit
- a generic social feed
- an advertising marketplace
- a review site
- a popularity contest
- a notification engagement engine
- a nationwide empty directory
- a replacement for operating the business inside Altair’s core product

Community supports the business. It does not become the business’s public stage.

---

## 38. Decision Filter

Approve a proposed Community feature only when it clearly does one or more of the following:

- solves a real business problem
- strengthens a meaningful relationship
- creates a relevant opportunity
- improves trust
- celebrates meaningful progress
- remains useful without exploiting attention

### Central question

> What is the most valuable thing this business owner can do for — or receive from — the community right now?

If a feature cannot help answer that question, it does not belong.

---

## 39. Open Questions

Genuinely unresolved product questions. Do not invent certainty here.

1. Should Community initially be owner-only, or include admins/office roles more broadly?
2. Which content is visible outside a trusted relationship versus only inside one?
3. How should geographical boundaries work by default (city vs radius vs service area)?
4. Should lightweight congratulations exist on Wins, and how do we keep them from becoming likes?
5. What qualifies a business to become a trusted partner — mutual action, completed collaboration, or explicit designation?
6. Which reputation metrics should be public versus private?
7. What moderation model is appropriate during closed beta versus broader launch?
8. How much of today’s Network referrals/directory should map 1:1 into Community terminology in the first shippable slice?
9. Should Help Requests and Opportunities remain separate types in v1, or start with a simpler unified “Ask / Offer” model?
10. When is national discovery helpful enough to surface by default without harming local focus?

---

## Appendix A — Terminology

Prefer Community language over social language:

| Prefer | Avoid as primary language |
|--------|---------------------------|
| Altair Community | Network (as final product name)* |
| business owner / business / community member | user / creator / influencer |
| request / opportunity / introduction / relationship | post / feed / follow |
| I Can Help | Like / Boost |
| Ask the Community | Create Post |
| trusted partner | follower |

\* Existing Network implementation terminology may remain in code and transitional UI until intentionally renamed. This document defines the destination experience name: **Altair Community**.

---

## Appendix B — Relationship to Current Network

The current Network experience provides useful evidence of existing capabilities:

- directory profiles and visibility
- trusted partner links (“My Network”)
- invitations into Altair
- cross-company referrals and outcomes

Those capabilities inform Community’s relationships, directory, invitations, and referrals. They do **not** define the full Community experience. Help Requests, Opportunities, Questions, Wins, Events, Community homepage prioritization, contribution reputation, and the action philosophy in this document are the destination design — whether or not they exist in the product yet.

---

*End of Altair Community Experience — First Draft*
