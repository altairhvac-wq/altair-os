# Autonomous visual direction, curation and Studio assembly

**Phase 4.** Written 2026-09-10. Branches: `feat/visual-curation` (agent platform),
`feat/video-editor` (Altair OS), `feat/hvac-series` (AltairDemoTool).

The objective was one sentence: *a Director-created video draft must arrive in
Studio containing real, intentionally selected visuals, rather than narration
and timing with an empty visual layer.* It does now. This is what was wrong,
what was built, what it costs, and what is still missing.

---

## 1. The audit: why drafts arrived without assets

The first instinct was that no asset-selection capability existed. That was
wrong, and it mattered — building one would have produced a second, competing
opinion about the same library.

What is actually in the repositories:

| Module | What it does | Who called it |
| --- | --- | --- |
| `asset-library.ts` | Reads the librarian's index into `AvailableFootage` | the daily pilot, the Director |
| `asset-retrieval.ts` | Ranks that footage against **one requirement**, deterministically, with a per-factor score and a plain-words reason for every result | **its own test, and its benchmark. Nothing in production.** |
| `video-plan-to-reel-assets.ts` | Assigns real asset ids to beats via a model call | the render path only |
| `video-plan-to-assets.ts` | Turns a plan into `content.assets` — **the path that feeds Studio** | the promotion CLI |
| `draft-from-plan.ts` (Altair OS) | Turns a plan into an `EditorProject` | Studio |

The gap was a **missing join**, in two halves.

`video-plan-to-assets.ts` says in its own header why it refuses to name assets:

> *a reelPlan's scenes each need an `assetId` resolved from the asset library …
> Forcing one would mean inventing asset ids this repository has no authority to
> name.*

That was the correct refusal **for a module with no retrieval in front of it**.
It emits `rawScript` — narration plus free-text directions — and defers.

Downstream, `buildDraftFromPlan` mapped `visualDirection` to a clip **label**
and set no `assetId`. So the visual layer was empty by construction, and every
existing test passed while it was happening, because nothing asserted that a
draft had pictures.

`asset-retrieval.ts` — 370 lines of exactly the thing needed, tested and
benchmarked — had been written and never wired in.

**The fix was the join, not a new system.** Nothing in `asset-retrieval.ts` was
changed.

---

## 2. What was built

### Agent platform — four modules, one pipeline

```
beat ──► visual-intent.ts ──► visual-curation.ts ──► visual-mode-router.ts
          (what to SHOW)        (retrieval +          (which producer
                                 continuity)            answers it)
                                      │
                                      ▼
                              studio-draft.ts  ──► the portable document
                                (the boundary)
```

**`visual-intent.ts`** — a beat's `visualDirection` is one free-text line, and
three layers were each re-guessing the same two questions from it: what is being
shown, and why. A `VisualIntent` answers them once, in a vocabulary a router, a
retriever and a preflight check can all act on:

- `purpose` — establish / evidence / explain / contrast / emphasis / resolve
- `subject` — product_ui / trade_work / document / person / concept / data
- `mustShow` — the concrete nouns the shot has to contain
- `mediaPreference` — motion / still / **null** (the common, honest answer)

Derived deterministically from any existing beat, with the signals that fired
recorded in `derivedFrom`. A Director-supplied intent wins outright. The plan
schema gained an **optional** `visualIntent` — offered to the model, never
demanded, exactly as `platformCopy` is.

**`visual-mode-router.ts`** — the choice between the four things that can put a
picture on screen, made in one place instead of by accident:

| Mode | When |
| --- | --- |
| `real_asset` | a library asset cleared the score floor **and** covers what the beat named |
| `diagram` | the subject is abstract (`concept`/`data`) and the library has nothing |
| `code_animation` | the plan said so |
| `on_screen_text` | the plan said so |
| `pending_capture` | nothing exists, and only a real capture would be honest |
| `pending_generation` | nothing exists, and a generated image would be legitimate |

Two rules are load-bearing:

- **Evidence cannot be generated.** A beat whose purpose is `evidence` claims
  "here is the actual thing". Satisfying it with a generated image would make
  the video assert something false, so its unmet state is a *capture*
  requirement — a different job for a different person. Product screens are
  treated the same way.
- **`generated_image` is always pending.** Nothing in this system calls a
  generator. A gap becomes a named brief a human can act on.

**`visual-curation.ts`** — orchestration, continuity, preflight.

Continuity rules are arithmetic, not taste, and are applied by narrowing the
pool *before* ranking, so a continuity rule can never leave a beat with nothing:

- no asset reappears within 3 beats
- no asset carries more than 2 beats of one video

Preflight produces a 0–100 score that is *literally* the findings subtracted
from 100 — not a separate opinion — and every finding names an action.

**`studio-draft.ts`** — the boundary. A portable document, and a **thrown
refusal** to emit one containing a drive letter, a UNC path, a `..` segment or a
`file:` URL. The whole document is re-scanned after assembly, because the field
that leaks will be the one nobody thought to check.

### Altair OS — the draft becomes a project with pictures

- **`shared/types/visual-selection.ts`** — the arrival contract. It re-runs the
  boundary rule rather than trusting the sender, and degrades gracefully:
  an unreadable visual becomes `pending_capture` *with the problem named*,
  because a malformed draft and an uncurated plan need different answers.
- **`draft-from-plan.ts`** — reads `beat.visual`, puts a real `assetId` on the
  clip, and returns a `frames` map keyed by clip id — **the same map shape a
  rendered episode supplies**, so the canvas, the timeline and the media browser
  all display a curated draft through code paths they already had.
- **Inspector → "Visual decision"** — mode, intent, asset, confidence band,
  the reason, any warnings, the pending requirement, and the ranked
  alternatives with their thumbnails. Clicking one is an ordinary `onPatch`, so
  a swap is an ordinary edit and `diffEditorProjects` already had a word for it
  (`asset_replaced`). **No change to the learning system was needed** — it just
  needed the edit to be possible.
- **Canvas** distinguishes the two absences: "chosen, no thumbnail exported
  here" vs "no asset chosen for this beat".
- **Studio intake** reports `4/6 shots` and the preflight findings *before* the
  operator decides to open a draft.

### AltairDemoTool — `export-library-previews.mjs`

Studio can name the shot it chose but cannot read the library. This exports
small JPEGs for **exactly the assets one draft names** (selections and
alternatives) into `public/studio/library/`. Video assets are seeked to 1s, with
a first-frame retry for clips shorter than that. Untrusted ids are refused three
times over — string check, resolved-path check, and a naming self-check that
fails loudly if the slug rule drifts from the other two repositories'.

---

## 3. The real proof

A six-beat HVAC plan whose **`visualDirection` strings are verbatim from real
`content.video_plan` artifacts** this platform produced (they are the retrieval
benchmark's own corpus — none was written to be findable), curated against the
real asset library.

**The library, honestly:** 318 indexed entries, **65 usable**. The other 253 are
correctly excluded — 214 unapproved UI-audit screenshots, 36 duplicates, 2
`pii-risk`, 1 with no suitability rating. Only 7 assets are HVAC-specific.

```
 1. Fast cuts: worn spiral notebook, whiteboard, shoebox of receipts
    intent  establish / document (motion) — must show notebook, receipt
    chose   — Needs generation (0.75)
    needs   …Searched 65 library assets; the closest are related but none is
            recorded as containing notebook or receipt.

 2. Working technician by a service van, phone in hand
    intent  establish / trade work — must show technician
    chose   raw-footage/hvac-trades/hvac-tech-doorstep-paperwork-01.mp4 (0.73)
    why     matches 6 requirement terms (technician, standing, service, van,
            driveway, hand), 2 in curated tags

 3. Split screen: confused tech vs confident tech
    chose   — Needs generation (0.75)

 4. Screen recording: Altair daily schedule
    chose   altair/dispatch/altair-dispatch-overview.png (0.66)
    !       is image, the beat asked for video

 5. Screen recording: Mark Complete → invoice → payment
    chose   altair/navigation/altair-notifications-overview.png (0.41)
    !       the beat asks for technician, taps, and nothing recorded about this
            asset says it contains them

 6. Wide shot of a branded HVAC van pulling up
    chose   raw-footage/hvac-trades/hvac-tech-doorstep-paperwork-01.mp4 (0.73)

6 beats — 4 library assets (3 distinct), 2 pending
preflight 64/100 — ready for Studio
```

**64/100 is the honest number.** Two beats describe things we do not own. The
draft says so, names what would have to be produced, and is still worth opening.

### Before / after

Both screenshots are the **same plan** — same six beats, same narration, same
timing — differing in exactly one thing, so the comparison isolates curation
rather than the subject matter.

| | |
| --- | --- |
| `ui-audit/video-editor/curated-draft-proof/before-uncurated-draft.png` | narration, captions, timing — and an empty visual layer. The canvas reads *"no asset chosen for this beat"*. The inspector has no visual decision to show. |
| `ui-audit/video-editor/curated-draft-proof/after-curated-draft.png` | an HVAC technician stepping out of a service van, under the caption "Written once. Typed again." The inspector names the asset, the intent, *strong · 0.73*, the reason, and four alternatives with thumbnails. |

`inspector-visual-decision.png` and `studio-preflight-findings.png` (same folder) show the two
panels close up.

---

## 4. Defects found and fixed

Every one of these was found by running against the **real** library. None would
have been caught by a fixture.

| # | Defect | Fix |
| --- | --- | --- |
| 1 | `before`/`after` were contrast signals matched with `includes`. "everything **after** the work that eats the week" classified a b-roll montage as a comparison. | Whole-word matching, and only unambiguous markers (`before and after`, not either half). |
| 2 | The diagram gate was `abstract subject **OR** explain/contrast purpose`. A contrast beat about a notebook and a shoebox of receipts routed to a templated diagram, which cannot show paper. | The **subject** decides. Purpose says what a shot is for; only the subject says whether a drawing can be it. |
| 3 | The score floor (24) was set on the arithmetic that a zero-term match tops out at 18. An orientation match adds 12, so an unrelated asset reached 30 and was installed — "Compressor cutaway" drew an Altair revenue report whose own reason read *"no requirement term matched"*. | An asset that matched **nothing** is refused at any score. |
| 4 | A score can be earned without covering what the beat named: a beat asking for a notebook and receipts drew a clip of an office manager with their head in their hands, on `hand` and `whiteboard`. | When a beat names things, at least one has to be there. |
| 5 | `diagram_graphic` beats fell through to general retrieval. "Discharge line, hot vapor pill" drew a technician on a doorstep, on the words `line` and `pill`. | A declared diagram is a diagram — unless the library holds an actual `category: graphic` asset, which keeps `diagram-plan.ts`'s cheapest integration path open. |
| 6 | `assertNoPrivatePaths` refused **every `https://` URL**, because its drive-letter pattern matched the `s:/` inside it. A librarian description with a link would have been rejected as a private path. | Word-boundary drive letters; the file-URL pattern tested first. A boundary check that fires on innocent documents is one somebody deletes. |
| 7 | The graphics track accepts stills only. A `diagram_graphic` beat answered with an `.mp4` would have produced a video clip on a track that refuses video — an invalid project. | The asset wins and the clip moves to the video track, which accepts every visual kind. |
| 8 | The learning-loop proof test read `process.env` directly, which this repo's own lint rule forbids. It had been failing on the branch. | Its two handles are declared in the validated config. |
| 9 | The inspector truncated *Intent* and *Asset* at 60% of the panel — the two facts an operator is there to read. | They wrap. |

---

## 5. Verification

| Suite | Result |
| --- | --- |
| Agent platform (`npm test`) | **2975 passed**, 5 skipped — up 78, all new |
| `verify:curated-draft` (new) | **27/27** |
| `verify:curated-draft-ui` (new, real browser) | **18/18** |
| `verify:video-editor` | 47/47 |
| `verify:edit-learning` | 32/32 |
| `verify:agent-loop` | 39/39 |
| `verify:video-editor-ui` | 30/30 |
| `verify:agent-loop-ui` | 13/13 |
| `tsc --noEmit`, `eslint`, `prettier --check` | clean, both repositories |
| `npm run build` | passes |

The regression floor held exactly. The browser suite is the one that matters
here: an `<img>` that 404s, a frame map keyed by the wrong id, or a preview URL
the parser rejected all pass the logic suite and produce precisely the empty
visual layer this phase existed to fix.

---

## 6. Costs, limits and decisions taken

**Nothing was spent.** Curation is a pure function — no model call, no network,
no generation. The same plan against the same index curates identically every
time, which is what makes the before/after comparison mean anything. The
model-assisted assignment on the reel path is untouched and still available.

**No self-modifying agents.** Curation reads the library and the plan; it writes
a document. Nothing rewrites a prompt, a weight, or its own source.

**Library thumbnails are gitignored.** `public/studio/library/` is deliberately
*not* tracked, and the distinction from `public/studio/<episode>/` matters:
those are slides this project rendered and owns, while these are downsampled
frames of a private asset library, exported only so an operator can see the shot
a curation chose. Committing them would put a private library into a public
deploy to solve a local-preview problem.

**Retrieval is lexical.** Five explainable, integer-weighted factors — no
embeddings, no vector store, no model call. That was `asset-retrieval.ts`'s
existing judgment and it was left alone: none of those can be justified before a
benchmark shows lexical matching is what is failing. Beat 5's `0.41` is that
limit showing honestly.

**The mixed-media check is conditional.** An all-product-UI video is the *right*
answer when that is all we own, and a planning failure when a technician at a
van was sitting right there. The preflight only fires when usable non-product
footage actually exists.

---

## 7. What is not done

1. **Server persistence** (`marketing_edit_sessions`) — explicitly the lowest
   priority and not started. Drafts and sessions remain per-browser
   `localStorage`. A draft generated on the laptop does not appear on a phone.
2. **The Director does not yet emit `visualIntent`.** The field is in the schema
   as optional; every intent today is derived. Deriving is deterministic and
   inspectable, which is arguably better than an unvalidated model guess — but
   the model knows things the word lists do not.
3. **The diagram route stops at a decision.** A beat routed to `diagram` names
   the mode; it does not yet produce a templated scene. `diagram-plan.ts` is the
   producer and is not wired to curation.
4. **Retention metrics are per-session, not aggregated.** The scorecard reports
   one session's retention; there is no bot-vs-human rollup across sessions yet.
5. **Only 7 HVAC-specific assets exist.** The deepest limit on curation quality
   is not the algorithm; it is that the library cannot answer an HVAC script.
   The pending requirements this phase produces are the shopping list.
6. **A pre-existing compositor bug remains documented, not fixed:**
   `buildFilterGraph` mis-orders `-map` on a zero-audio-clip timeline (ffmpeg
   exit −22). The render worker refuses silent jobs up front rather than
   destabilising the renderer that has a proven master behind it.

---

## 8. How to run it

```bash
# 1. Curate a plan against the real library  (agent platform)
npm run video:curate -- --plan=<plan.json> \
  --previews=C:/Users/User/Desktop/altair-os/public/studio/library \
  --out=<studio-draft.json>

# 2. Export thumbnails for exactly what it chose  (AltairDemoTool)
node production/slide-system/export-library-previews.mjs --draft=<studio-draft.json>

# 3. Re-run step 1 so the draft carries the preview URLs, then paste the
#    result into Marketing HQ → Studio → "Open a generated plan".
```

Verification:

```bash
npm run verify:curated-draft          # logic, no browser
npm run verify:curated-draft-ui       # real browser, needs a dev server
```
