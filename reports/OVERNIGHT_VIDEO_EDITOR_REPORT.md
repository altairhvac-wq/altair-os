# Overnight run — the practice film

**Goal as stated:** one real, complete, editable practice film inside the editor,
using the new HVAC photo library.

**Status: that exists.** Open `http://localhost:3000/studio/editor/compressor-01`.

---

## What you can do this morning

| | |
| --- | --- |
| Open the editor | `/studio/editor/compressor-01` — resolves on the server, no import step |
| See a fully assembled timeline | 36 visual clips, 36 captions, 36 narration clips, 108 clips over 8 tracks, 5:50 |
| See the HVAC library used | 22 clips carry library photographs, 19 distinct assets, chosen by the real curation |
| Replace a visual asset | Library tab → search → click. The canvas follows immediately |
| Reorder / trim / hide | Ordinary timeline editing, unchanged |
| Edit captions | 36 caption clips, each with its text |
| Preview | Plays with the real narration |
| Render | `Render` is enabled for this project; the MP4 exists already |
| Keep editing | Autosaves to localStorage; reload restores; Reset returns to the snapshot |

---

## The film

**"How an HVAC Compressor Works — And Why Different Systems Use Different
Compressor Types"** — 36 beats, 5.70 minutes.

It covers what a compressor does to the refrigerant, then all five mechanisms —
reciprocating, scroll, rotary, screw, centrifugal — and where each belongs.

```
36 visual clips     22 library photographs (19 distinct)
                     8 text cards
                     3 diagram placeholders
                     3 pending-capture placeholders
36 captions
36 narration clips   314.4s of real synthesised speech (Piper, local, offline)
```

Every duration is **measured from the audio that exists**, not estimated from a
word count — `paceBeat({measuredSpeechMs})`. A cut in the editor is a cut in the
render.

**Rendered master:** `AltairDemoTool/production/slide-system/out/editor-compressor-01-job-practice-compressor-01.mp4`
1920×1080, H.264 + AAC, 341.76s, 29.5 MB.
`sha256 83f41a50afc41b3acd773e7f36aeffe9bd09502667f354fb707ce68413506d41`

It went through the normal compositor. The render script writes a JOB — a
project id, a compiled timeline and a bake plan — and hands it to
`run-editor-render-job.mjs`, the same worker every editor render uses. Nothing
in it calls ffmpeg or names a binary.

---

## Three defects found by looking at the rendered frames

These were only findable by extracting frames and looking. All three are fixed
and re-verified.

**1. Every clip that MOVED disappeared from the film.**
The scene bake resolves its picture from the web app's public tree —
deliberately, so it composites the same pixels the operator approved — while
staging only wrote the render masters. So exactly the clips someone chose to
push in or drift across came back reading `missing:`, and the still ones looked
fine. Half the film, and the half that looked most deliberate.

**2. Eight text cards composited BLACK.**
The text track is drawn as live type by both the canvas and the bake: a clip
there renders its `text`, never its frame. A rendered card is the other thing —
words already drawn into pixels. Cards now sit on the graphics track, where the
diagram placeholders already sat and already rendered correctly.

**3. After swapping an asset, the monitor kept showing the old photograph.**
`episode.frames` is the committed map and cannot answer for a clip whose asset
has since been replaced — at the one moment the monitor most needs to be honest.

---

## Photo library QC

216 frames opened and looked at by a reviewer briefed as an HVAC instructor
doing acceptance review, across six categories.

| verdict | count | what happens to it |
| --- | --- | --- |
| REGENERATE | 37 | `approved: false` — curation stops proposing it |
| MISLABELED | 21 | suitability −0.2 until the tags are corrected |
| QUESTIONABLE | 40 | suitability −0.15 |
| KEEP | 131 | unchanged |

**Nothing was deleted.** Full detail in `reports/hvac-photo-library-qc.md`.

Two REGENERATE assets were in the film. They are now honest IMAGE NEEDED cards
naming exactly what has to be shot — `res_015` (suction accumulator standpipe)
and `res_003` (valve plate reed valves).

### A curation weakness this surfaced, not fixed

Re-curating the whole plan with the verdicts applied was tried first. It moved
five beats and made **three of them wrong**: beat 18 asked for a reciprocating
valve plate and got a rotary cutaway at confidence 0.36, and beats 22 and 25
then swapped compressor families with each other. One weak substitution took an
asset a later beat wanted, and the two-uses-per-video continuity cap pushed the
displacement down the sequence.

The curation is not malfunctioning — it answers "what is the best remaining
match" when the honest answer is "we do not own this picture". A pick the system
itself scores below its own `LOW_CONFIDENCE` line should become a pending
capture, and `routeVisual` already accepts the `scoreFloor` that would do it.
**That is a change to how every video is curated, so I did not make it tonight.**
The verdict was applied without the cascade instead.

---

## Phase 0 — 9:16 derivatives

229 vertical variants at 1080×1920, one per asset. **No original was replaced.**

| method | count | when |
| --- | --- | --- |
| smart_crop | 65 | the subject is genuinely concentrated inside the 9:16 window |
| expanded_canvas | 164 | it is not, so the frame is extended rather than cut |
| portrait_regeneration | 0 | not needed — nothing failed both tests |

The crop test is **concentration** (saliency captured ÷ the window's share of
the frame), not raw capture: a 9:16 window is only 37.4% of a 3:2 source's
width, so a raw-capture threshold sent all 229 to padding. Floor 1.42, measured
against the real distribution.

Expanded canvas enlarges the source 1.30× and trims the sides so the photograph
holds 47% of the frame height — deliberately not a postcard floating in space.
Comparison shots are held at 1.0× so nothing clips.

Vertical QC: **227 KEEP, 0 REGENERATE, 2 QUESTIONABLE.** Portrait contact sheets
are beside the landscape ones in `_contact-sheets/`.

The catalog is aspect-ratio-aware: one asset, two variants. A 9:16 project gets
the portrait; a 16:9 project shows a phone badge where a portrait exists.

**Recommendation for future generation:** generate paired formats at source. 164
of 229 needed canvas extension, which means roughly seven in ten of these
subjects are not natively croppable to vertical.

---

## Tests

| suite | result |
| --- | --- |
| `verify:video-editor` | 47/47 |
| `verify:video-editor-ui` | 30/30 |
| `verify:edit-learning` | 32/32 |
| `verify:curated-draft` | 38/38 |
| `verify:curated-draft-ui` | 20/20 |
| `verify:agent-loop` | 39/39 |
| `verify:agent-loop-ui` | 13/13 |
| `verify:practice-episode` (new) | 13/13 |
| agent platform | 2975 passed, 5 skipped, 0 failed |
| `tsc --noEmit` | clean |
| `npm run lint` | 0 errors |
| `npm run build` | passes |

`verify:curated-draft-ui` was failing 18/20 when I found it — 18 old-library
thumbnails were missing from the gitignored preview directory. Re-exported with
`export-library-previews.mjs`; back to 20/20. Not caused by this work, but it
was broken and now is not.

---

## Commits

Nothing pushed. Nothing merged. No force anything.

**altair-os** (`feat/video-editor`, was at `5d6cbde6`)
```
2b20c12e  studio: the HVAC photo library, browsable inside the editor
12ce2155  studio: one complete practice film, curated from the new HVAC library
c5f1283e  library: the visual QC verdict, and what the system does with it
5d48d077  studio: prove the practice film in a browser, and photograph it
54e2ef2c  library: re-running the QC feedback corrects the score, never compounds it
```

**AltairDemoTool** (`feat/hvac-series`)
```
0886d7c  slide-system: the compressor practice episode may render
```

**Altair-agent-platform** — untouched, working tree clean. The new library is
read through a librarian index, so the existing curation stack works against it
with no code change.

`VIDEO-ENGINE-AUDIT.json` in AltairDemoTool was left alone — it is not mine.

### Not tracked, on purpose

The practice episode's 21 photograph frames, the 9:16 thumbnails and
`hvac-catalog.json` are gitignored, following the rule already written for the
library thumbnails: a catalog of a private library is still a description of a
private library, and committing full-size library imagery into a deployed
`public/` is a bigger step than solving the local staging problem it solves.
They are on disk and the editor uses them; a fresh clone restages with one
command. **Say the word and I will track them instead.**

---

## What is NOT done

- **Captions are editable, the 8 text cards are not.** They are rendered images
  on the graphics track. Editing their words means re-running the build. Making
  them live text would mean losing the card design, so I left the design.
- **The low-confidence → pending-capture rule** described above. Deliberate.
- **21 MISLABELED assets still carry wrong metadata.** Penalised, not corrected.
  Correcting tags is safe and mechanical whenever you want it.
- **37 REGENERATE assets are not regenerated.** Flagged and excluded; the
  reviewer's reason for each is in the QC report and in the index entry.
- **Beat 7 has no picture** and never did — the library has no shot of a
  compressor discharge stub with the line running to the condenser. It is a
  labelled placeholder in the cut.

---

## How to rebuild any of it

```bash
# the episode (re-curate → re-time → re-stage → snapshot)
node --import ./scripts/video-editor-register.mjs scripts/practice/build-practice-episode.mjs

# the MP4, through the real worker
node --import ./scripts/video-editor-register.mjs scripts/practice/render-practice-episode.mjs

# prove it in a browser and take the screenshots
npm run verify:practice-episode
```

Screenshots from the last passing run: `ui-audit/video-editor/practice-episode/`.
