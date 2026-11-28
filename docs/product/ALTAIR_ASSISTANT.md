# Altair Assistant: architecture and rules

Status: **under construction**. Pieces 1 (the how-to library) and 2 (the
engine and the list of abilities) are built. Nothing calls a model yet: no
provider adapter, no screen and no server action exist, so the assistant is
not reachable by anyone. This document is the shape every later piece must
fit. Owner direction, 2026-11-27: build it so it can keep growing until it
can do nearly everything in the product, by typing or by voice.

Owner-facing design and decisions: `reports/AI assistant design - 2026-11-27/`
(not in the repository).

## The goal

One assistant a person can ask or tell, in their own words, from any screen:

1. **Know the product**: answer "how do I...?" from checked how-to notes.
2. **Know the company**: answer questions about the signed-in company's own
   records, read only, with every figure traced to its source.
3. **Do the work**: prepare an action and carry it out when the person presses
   a button.
4. **By voice**: the same three, spoken and heard.

It grows by adding entries to lists, never by adding special cases.

## The five layers

```
 surfaces      panel (text) | voice | later: phone-assistant shortcuts, API
                    |
 engine        one conversation loop; provider-neutral; knows no surface
                    |
 capabilities  one registry: every lookup and every action, each with its
               permission rule, its input shape and its source
                    |
 knowledge     the how-to library (shared/lib/help)          <- built
                    |
 the product   existing queries (lib/database/queries), existing Server
               Actions (app/actions), access control, RLS
```

### 1. Knowledge: the how-to library (built)

`shared/lib/help/`: a typed catalog of short notes. Three readers: the
signed-in Help page (`/help`), the public pages (`/how-to`), and the
assistant's "read a how-to note" capability.

- A note names the permission that can follow it (`requires`), using the same
  permission names as `lib/database/types/roles.ts`.
- Every on-screen label a step quotes is anchored to the source file that
  renders it. `npm run verify:help-notes` fails when that text is gone, so a
  screen cannot change its words without its note being found.
- Changing a screen includes changing its note. That is part of done.

### 2. Capabilities: one registry (built)

`lib/assistant/capabilities/registry.ts` is the list; the types are in
`lib/assistant/types.ts`. Today it holds `help.search` and `help.read`. A
capability is a single entry:

| Field | Meaning |
| --- | --- |
| `id` | Stable name, shaped like the public API's permission names (`invoices.read`, `jobs.create`) so the API and the assistant share one list. |
| `kind` | `read` or `write`. |
| `allowed(context)` | Uses the helpers in `lib/database/access-control.ts`. Never a role-name check of its own. |
| `input` | A strict schema. The model fills it; the server validates it. |
| `run(context, input)` | **Read**: calls an existing query with the caller's session client and returns a slim, purpose-built result plus `source` (label, in-app link, time read). **Write**: returns a *proposal*; it changes nothing. |
| `commit` | Write only: the existing Server Action the confirm button calls. |

The menu of capabilities offered to the model is built per person from
`allowed(context)`. A technician's assistant does not contain the invoices or
business-numbers capabilities at all.

### 3. Engine: one conversation loop (built)

`lib/assistant/engine/run.ts` (`runAssistantTurn`). It is handed the person's
context, the question, the capability list and a model, and returns text,
blocks the app draws, sources and a trace. It imports no database, Supabase
or Next module, so it can answer for nobody but the person it was handed and
runs in the verifier with a scripted model.

Whatever the model does, the engine: offers and runs only read capabilities
this person is allowed; validates input strictly before a capability sees it
(`engine/input.ts`); wraps every result as data with markers a record cannot
close (`engine/text.ts`); strips links, images and markup from the reply;
withholds any dollar amount no capability returned; and stops after three
rounds of lookups, three lookups a round.

The model is one function behind `AssistantModel` in `types.ts`. Adapters go
in `lib/assistant/providers/`, one per provider; none exists yet, because it
should be written against a live key and proven on the test list.

Switch and limits: `lib/assistant/env.ts` (`AI_ASSISTANT_ENABLED`, off by
default, and off whenever `AI_FEATURES_ENABLED` is off) and
`lib/assistant/admission.ts` (a 2-second pause, 40 questions a person a day,
through the existing `check_and_record_ai_request`). The company's monthly
token ceiling is still shared with the drafting features; a separate
assistant allowance needs a migration and is not built.

`npm run verify:assistant` checks the registry and executes the engine
against every rule above.

### 4. Surfaces

- **Panel**: a button in the office top bar and the technician top bar.
- **Voice**: speech-to-text in front of the engine, text-to-speech behind it.
  A transport, not a second assistant.
- **Later**: the public API and phone-assistant shortcuts call the same
  capabilities.

### 5. The test list

`evals/assistant/`: real questions with expected capability calls and
answers, run per role against the scratch project. It includes questions that
must be refused and records poisoned on purpose. A model or prompt change does
not ship unless the list passes. This is also how a provider is switched.

## Rules that never bend

1. **Tenant.** The company comes from `getActiveCompanyContext()` on the
   server. No capability takes a company id from the model or the browser.
2. **No service role.** A capability's query uses the session client. A
   verifier fails the build if anything under `lib/assistant/` imports
   `createServiceRoleClient`. RLS stays the last wall.
3. **Role.** A person gets through the assistant only what their screens
   show. Results are slim shapes built for the purpose, so a column a role
   must not see is never in what the model receives.
4. **The numbers are the product's.** Figures, rows and totals are rendered
   by the app from capability results, with their source. The model writes
   the sentence around them and never states an amount of its own.
5. **Records are data.** Text from notes, emails and customer fields is never
   an instruction. The design does not rely on the model obeying that: it has
   no capability that sends anything out, its answers render no outside links
   or images, and a write needs rule 6.
6. **A person presses the button.** A write capability only proposes. The
   confirm card is drawn from the stored proposal, not from model text; the
   press calls the existing Server Action as that person; the proposal is
   single-use and expires.
7. **Never money, never the keys.** No capability takes or records a payment,
   refunds, voids, deletes for good, changes prices, pay or business numbers,
   manages people, or touches billing or the Stripe connection.
8. **Bounded.** Per-person and per-company limits, a product-wide cap, a
   master switch and a per-company switch. Limits fail closed.
9. **Quiet logs.** Who, company, when, which capabilities, token counts,
   outcome. Never the question, the answer or record content.
10. **Provider-neutral.** The engine speaks its own message and tool types;
    one adapter per provider. No provider type leaks past the adapter.
11. **Every capability ships with tests**: allowed, refused, and wrong-company.

## How it grows

Adding an ability is: one registry entry, its tests, its how-to note if the
screen is new, and its questions on the test list. Nothing else changes. If a
new ability cannot be expressed that way, the registry is what gets improved,
not the rules.

## Build order

| Piece | What | State |
| --- | --- | --- |
| 1 | How-to library, Help page, public `/how-to` pages, verifier | Built |
| 2 | Capability registry and engine, limits, switch, verifier (`verify:assistant`) | Built |
| 2b | A provider adapter, written against a live key | Not started |
| 3 | Read capabilities (records) with sources | Not started |
| 4 | Panel, office and technician | Not started |
| 5 | Test list, per role, on scratch | Not started |
| 6 | Voice | Not started |
| 7 | Write capabilities with confirm cards (after the public API's permission list) | Not started |
