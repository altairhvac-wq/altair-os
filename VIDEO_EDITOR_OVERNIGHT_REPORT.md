# Altair Video Editor — build report

Built 2026-09-09, extended 2026-09-10 (Phase 2.5). A nonlinear video editor
inside altair-os, compiling down to the existing AltairDemoTool render pipeline.

**Phase 2.5 added:** real narration playback, direct canvas manipulation, the
layered-composition bridge, placeholder removal, and the human-edit learning
foundation — see `HUMAN_EDIT_LEARNING_REPORT.md` for that last one.

**Read this first:** this was one working session, not an unattended overnight
run. Everything below is what actually exists and was actually verified. The
"Not built" section is as important as the rest.

---

## Open it in the morning

The dev server on port 3100 may still be running. If not:

```bash
cd C:/Users/User/Desktop/altair-os && npm run dev
```

Then: **http://localhost:3000/studio/editor/hvac-01**

Or navigate: `/marketing` → **Studio** tab → EP01 → **Open editor**.

Requires a platform-operator session (`PLATFORM_ADMIN_EMAILS` in `.env.local`,
already set).

Re-run every check (the dev server is on **3000** now, not 3100):

```bash
npm run verify:video-editor && npm run verify:edit-learning && node scripts/verify-video-editor-ui.mjs http://localhost:3000 && npx tsc --noEmit && npm run lint && npm run build
```

---

## What the audit found

Seven parallel readers across both repos. The three findings that shaped
everything:

**1. The renderer is strictly single-track and sequential.**
`buildFilterGraph` (`AltairDemoTool/src/compose/buildFilterGraph.ts:466`)
consumes `Timeline = {videoTitle, totalDurationMs, entries[]}` where each entry
is ONE still or ONE video occupying `[startMs, endMs)`. There is no second
video layer, no per-clip transform, no per-clip audio gain, no per-cut
transition. The only overlay is a fixed-position logo; text can only ride an
entry that already carries narration.

**2. Pacing lives in the caller, not the renderer.**
`render-episode.mjs:72-80` — `tail = 700ms`, `+500` if wpm > 200, `+900` if
wpm > 230, `+400` for `-title` beats, `+2400` for the final beat; a 700ms
lead-in on `hook-1` only; 260ms crossfades. Output length is
`raw − (n−1) × 260`, so timeline time and master time are never equal.

**3. Multi-slide beats split by a specific rule.**
`share = floor((total − lead) / n)`, first slide carries the lead, last absorbs
the rounding remainder. Audio attaches to the FIRST entry of a beat only — a
per-slide voice clip would restart the line at every cut.

Full audit results: `.claude/projects/.../subagents/workflows/wf_b037688f-bb9/journal.jsonl`

---

## Architecture

```
EditorProject (8 tracks, superset)
        │
        │  shared/lib/video-editor/compile.ts
        ▼
Timeline (single-track, sequential)  +  CompileDrop[]  +  errors[]
        │
        ▼
buildFilterGraph → renderVideo → conformLoudness   (unchanged, on the laptop)
```

**The editor is deliberately a superset of the renderer**, and the compiler's
real job is the **drop report**: every property the renderer cannot carry
produces a named `CompileDrop` (clip id, property, reason). A compiler that
silently discarded a scale or an overlay layer would produce a master that does
not match the timeline the operator approved.

**Time is the state; pixels are a view.** Every clip carries `startMs` /
`durationMs`. Nothing in the model knows what a pixel is — the timeline renders
at `startMs × pxPerSec` and reads drags back through the inverse. Zoom and
window size cannot alter the edit.

**One reducer owns everything timed.** `shared/lib/video-editor/store.ts`.
Timeline, preview and compiler are all views of the same project. `playheadMs`,
`pxPerSec` and `selection` live in state but NOT in the project, so undo cannot
scroll you away from the edit it just undid.

**Undo is whole-project snapshots with gesture coalescing.** Consecutive
commits sharing a `coalesceKey` replace the top entry, so a 200-pointermove
drag is one undo step. Inverse commands were rejected: they mean writing every
edit twice, backwards, which is where undo bugs live.

---

## Files added

**altair-os**

| Path | What |
|---|---|
| `shared/types/video-editor.ts` | Project/track/clip model, timeline math, snapping, split/trim |
| `shared/lib/video-editor/history.ts` | Undo/redo with gesture coalescing |
| `shared/lib/video-editor/store.ts` | The reducer — one source of truth |
| `shared/lib/video-editor/compile.ts` | EditorProject → renderer Timeline + drop report |
| `shared/lib/video-editor/persistence.ts` | localStorage autosave |
| `shared/lib/video-editor/demo-project.ts` | Snapshot → EditorProject loader |
| `shared/lib/video-editor/demo-project-hvac-01.ts` | **Generated** — real EP01 timings + waveform peaks (78 KB) |
| `shared/components/video-editor/VideoEditorShell.tsx` | Layout, clock, keyboard |
| `shared/components/video-editor/EditorHeader.tsx` | Top bar, save state, undo/redo, export |
| `shared/components/video-editor/ToolRail.tsx` | Nine-tool vertical rail |
| `shared/components/video-editor/AssetBrowser.tsx` | Media browser |
| `shared/components/video-editor/PreviewMonitor.tsx` | Scaled stage |
| `shared/components/video-editor/CanvasRenderer.tsx` | DOM-layer canvas at one instant |
| `shared/components/video-editor/PlaybackControls.tsx` | Transport |
| `shared/components/video-editor/Inspector.tsx` | Context-sensitive properties |
| `shared/components/video-editor/Timeline.tsx` | Ruler, tracks, playhead, toolbar |
| `shared/components/video-editor/TimelineClip.tsx` | One clip |
| `shared/components/video-editor/AudioWaveform.tsx` | SVG waveform from real peaks |
| `shared/components/video-editor/useClipGesture.ts` | Pointer-capture move/trim |
| `shared/components/video-editor/editor-theme.ts` | Scoped dark palette |
| `app/(studio)/layout.tsx` | Chrome-less route group |
| `app/(studio)/studio/editor/[projectId]/page.tsx` | The route + gate |
| `scripts/verify-video-editor.mjs` | 43 logic checks |
| `scripts/verify-video-editor-ui.mjs` | 20 live browser checks |
| `scripts/build-editor-demo-project.mjs` | Render artifacts → demo project |
| `scripts/video-editor-alias-hooks.mjs` + `-register.mjs` | `@/` resolver for Node's TS loader |
| `public/studio/hvac-01/*.jpg` | 25 real frames, 440 KB |
| `ui-audit/video-editor/*.png` | Screenshots |

**AltairDemoTool**

| Path | What |
|---|---|
| `production/slide-system/episode-hvac-01.json` | EP01 script, 19 beats |
| `production/slide-system/visual-plan-hvac-01.mjs` | EP01 visual plan — first plan to use the `circuit` layout |

## Files modified

- `shared/components/marketing-hub/MarketingStudioView.tsx` — "Open editor" link on EP01
- `package.json` — three scripts: `verify:video-editor`, `verify:video-editor-ui`, `build:editor-demo`

---

## The demo project is real, not fabricated

EP01 was **written, rendered with Piper, and measured** during this session:

- 19 narration clips generated, 25 slides, **2:43 raw → 2:37 after crossfades**
- Master: `AltairDemoTool/production/slide-system/out/hvac-01-master.mp4`
- SHA-256 `05bbc97ecbb484f65d7c74e0c9bd0ad2b2b37eb9ceddad2918415fca99562802`

Every duration in the editor comes from `render-report-hvac-01.json` — measured
word counts, measured speech lengths, the tail the pacing rule actually
applied. The per-slide split reproduces the compositor's own arithmetic, so a
clip edge in the editor **is** a cut point in the render. Waveforms are
normalised peaks decoded from the narration WAVs at 240 buckets per clip.

EP04 ("The package unit") was also rendered earlier: `out/hvac-04-master.mp4`,
2:18.

---

## Verified

| Check | Result |
|---|---|
| `npx tsc --noEmit` | clean |
| `npm run lint` | **0 errors**, 137 warnings (133 pre-existing; 4 mine, all the deliberately-downgraded `set-state-in-effect`) |
| `npm run build` | ✓ Compiled successfully, 85/85 static pages |
| `npm run verify:video-editor` | **47/47** |
| `npm run verify:edit-learning` | **32/32** |
| `npm run verify:video-editor-ui` | **30/30** |

The 20 live checks drive a real browser and assert on the DOM — editor opens,
EP01 loads, assets display, all eight tracks render, **clips are positioned by
time** (first clip 10802ms → 648px at 60px/s), Space plays, playhead advances,
preview changes, arrow steps exactly one frame, select, drag, trim, Ctrl+B
split, Ctrl+Z undo, Ctrl+Shift+Z redo, Delete, inspector writes back,
**state survives reload**, no uncaught errors, track toggles wired.

### Bugs found and fixed during testing

1. **Inspector title clipped** — the sticky panel title had no `shrink-0`, so
   the flex column squeezed it to half glyph height and ran the divider through
   the text. Caught by cropping a screenshot, not by any assertion.
2. **`react-hooks/refs` error** — a ref written during render in the playback
   clock. This repo keeps that rule at error on purpose; fixed by syncing in an
   effect, and save state was rederived rather than stored.
3. **Series prefix mislabel** (earlier, AltairDemoTool) — `render-episode.mjs`
   hardcoded `contracting-ep`, so the first HVAC render came out as
   `contracting-ephvac-04-master.mp4`.

Five test failures turned out to be **harness** bugs worth recording, because
they are the ones that make a working feature look broken: `innerText` returns
CSS-uppercased section titles (`Timing` → `TIMING`); a body-wide timecode regex
matches the header's total duration, which never moves; and `boundingBox()`
returns coordinates past the right edge of the window for a horizontally
scrolled timeline, so clicks silently no-op.

---

## Built and working

- Full-viewport dark workspace, escaping `AdminShell` via its own route group
- Media browser with 25 real frame thumbnails + search
- Large preview monitor, project canvas scaled by one transform (9:16-ready)
- Context-sensitive inspector — **every control writes back through the reducer**
- Eight-track horizontal timeline: ruler with zoom-aware tick ladder, draggable
  playhead crossing all tracks, per-track hide/mute, lock hatching
- Clip select / drag / trim both edges / split / delete / duplicate / copy /
  paste, with snapping (Alt bypasses) and 2px–400px/s zoom
- Real waveforms that rescale with zoom
- Captions as real timed clips, editable, rendering in the preview at the right
  time
- Text insertion at the playhead
- Playback on a rAF clock; Space, arrows, Shift+arrows, Home/End, Delete,
  Ctrl+Z/Y/B/C/V/D, Escape
- Autosave to localStorage with a restore notice
- Export compiles to the renderer Timeline and downloads it with the drop report
- Resizable timeline

## Partially built

- **Multi-select** — the model and reducer support it (`toggleSelect`,
  batch delete/split/duplicate); only shift-click on a clip is wired, no
  marquee.
- **Transitions** — per-clip `transitionInMs` is editable and compiles to a
  drop, because the renderer only has one global crossfade. Cut and dissolve
  exist; there is no transition picker UI.
- ~~Direct canvas manipulation~~ — **built in Phase 2.5.** A selected visual
  clip gets a selection frame with four corner handles and a rotate handle.
  Drag moves, corners scale, the round handle rotates. Screen deltas are divided
  by the stage scale, so a drag means the same thing at every window size. Every
  gesture writes through the same `updateClip` action the inspector uses, so
  canvas edits are undoable, inspectable and persistent for free. Crop is not
  built.
- **Code animations** — `codeAnimation` is a valid clip kind and tracks accept
  it; nothing generates one yet.

## Not built

- **No render trigger.** Export downloads the compiled Timeline; it does not
  start a job. The renderer needs local ffmpeg and the asset library on the
  laptop, so a button claiming to render would be a promise the web app cannot
  keep.
- ~~No audio playback.~~ **Built in Phase 2.5.** 19 narration clips are served
  as AAC from `/studio/hvac-01/audio/`, pooled as real `<audio>` elements, and
  scheduled against the playhead with drift correction. Play, pause, seek,
  per-track mute, per-clip volume and a master mute (M) all work; the browser's
  autoplay block is surfaced with an "Enable audio" control rather than
  swallowed.
- **No Altair library browsing.** The library is a librarian-indexed tree under
  `ALTAIR_ASSET_LIBRARY_ROOT` on the laptop; nothing in this app can read it and
  no route serves it. That panel says so rather than showing invented assets.
- **Server-side persistence.** localStorage only — survives refresh, crash and
  restart; does not survive a different browser or machine.
- **Only one project exists.** `/studio/editor/<anything-else>` 404s.
- **Images / Effects / Animations panels** are named placeholders, labelled as
  not implemented.

## Known issues

- `connect.facebook.net` fails on localhost (Meta Pixel, pre-existing,
  unrelated).
- Clips narrower than ~34px show no label; below ~22px no trim handles. Zoom in.
- The preview hard-cuts where the renderer will dissolve, and timeline time runs
  ~6s longer than master time on EP01 (23 cuts × 260ms). The transport is
  labelled "preview" for this reason.

---

## Screenshots

- `ui-audit/video-editor/editor-1920x1080-overview.png`
- `ui-audit/video-editor/editor-1920x1080-selected.png` — clip selected, inspector populated, caption in preview
- `ui-audit/video-editor/editor-1600x1000-overview.png`
- `ui-audit/video-editor/editor-1600x1000-selected.png`

## Test renders

- `AltairDemoTool/production/slide-system/out/hvac-01-master.mp4` (2:37)
- `AltairDemoTool/production/slide-system/out/hvac-04-master.mp4` (2:18)

Neither was published anywhere.

---

## Recommended next steps

1. **Audio playback** — schedule the narration WAVs against the playhead. The
   peaks already exist; the files need serving.
2. **Bake overlapping layers to PNG on export** — the audit named the exact
   recipe (`build-slides.mjs:108-131`, Playwright → 1920×1080 screenshot). This
   turns the biggest category of drop into a supported feature.
3. **Serve the asset library** — a media route plus generated thumbnails is what
   stands between the Library panel and being real.
4. **Move persistence server-side** when a second person needs to open a project.
   The localStorage module is what that replaces, and it is 80 lines.
5. **Pacing knobs** — surface the tail rule (base, two WPM thresholds,
   section-card and final-beat bonuses) as editable and recompute clip lengths
   live. The rule is quoted in `compile.ts` and the audit.
6. **`describeOutputPlacement`** from the renderer gives per-entry output-clock
   positions; feeding the transport from it would make the editor's clock the
   render's clock by construction.

---

# Phase 2.5 — 2026-09-10

## Placeholders removed

| Was | Now |
|---|---|
| Images / Effects / Animations panels explaining they were placeholders | The three tool-rail tabs are **`disabled`**, greyed and titled "not built yet". A control that looks live and does nothing is the placeholder problem; a greyed-out one is an honest statement. |
| Waveforms with no audio behind them | 19 real narration files, served and audible |
| Rotation tracked by the model and diff but absent from the inspector | Rotation field added |
| Export produced the project JSON | Export compiles, bakes, and emits the render package |

The library panel still shows an honest empty state rather than a grid — the
asset root genuinely is not reachable from the web app, and the instruction was
to say so rather than invent assets.

## Audio

`shared/components/video-editor/useAudioEngine.ts`

The **timeline is the master clock** and audio follows it. The alternative —
one audio element as the clock — is right for a single continuous file and
wrong here: there are 19 separate clips an operator can move, trim and delete,
so the element you picked as the clock would stop existing.

Following costs drift, so drift is corrected: any element more than **140ms**
from where the timeline says it should be gets its `currentTime` reset. Wide
enough that decode jitter does not cause constant reseeking (audible as
stutter), tight enough to be imperceptible.

Elements are appended to a hidden `[data-testid="ve-audio-pool"]` container
rather than left detached, so what is sounding is inspectable and testable.

`audioOffsetMs` per clip is the beat's lead-in — audio starting at clip offset 0
would speak early by exactly that lead.

Verified live: `vo-hook-1` sounds at t=0; seeking to 60s switches to `vo-s2-1`;
pause and mute both silence everything.

## Canvas manipulation

`shared/components/video-editor/CanvasSelection.tsx`

Drag to move, four corner handles to scale, a round handle to rotate. Screen
deltas are **divided by the stage scale**, so a drag means the same thing at
every window size — measured: an 80px screen drag at 0.42 scale wrote 190
project px, and the inspector agreed.

One real bug found by measurement, not by looking: handles centred on the frame
corner had their outer half clipped by the canvas's `overflow: hidden`, and
`elementFromPoint` at the corner returned the panel behind. They are now inset
inside the frame.

## The composition bridge

`shared/lib/video-editor/bake.ts` + `AltairDemoTool/production/slide-system/bake-editor-scenes.mjs`

The renderer takes one still per entry. The slide system already manufactures
its stills by pointing Playwright at HTML and screenshotting at 1920×1080 — so
anything the editor's preview can express in DOM can be flattened into a PNG the
renderer accepts as an ordinary entry. **The renderer is untouched.**

The compiler now emits a `BakePlan`, and **bakeable properties stop being
drops**, because they now survive to the master. The invariant is asserted in
tests: *every non-default property appears in exactly one of `drops` or
`bakedProperties` — never neither.* `compileProjectToTimeline(project, { bake: false })`
returns the old honest drop list for a caller that cannot composite.

Proved end to end: an edit that scales the opening shot 1.25× and adds a red
text overlay compiles to **3 scenes, 0 drops, 0 errors**, and the baker
composited them — `ui-audit/video-editor/bake-composited-scene.png`.

Two real problems found while proving it:
- Captions were forcing a bake on nearly every interval (29 scenes for an
  episode with one overlay) and would have been **rendered twice** — once baked
  into the picture, once by the renderer's own caption channel. Captions are now
  excluded from the composite and from video cut points. 29 scenes → 3;
  27 entries instead of 29.
- The baker's progress line printed `[object Object]` instead of a layer count.

## Render / export

Export compiles, builds the bake plan, and downloads
`hvac-01-timeline.json` containing the timeline, the bake plan, the baked
properties, the drop report, blocking errors and the project. The confirmation
reads either *"Package ready — 27 entries, 152s after crossfades, 3 to
composite"* or *"Blocked — N issues must be fixed before rendering"*.

**It does not start a render.** A constrained job API was not built: the
renderer needs local ffmpeg and the asset library, so the states
`Rendering / Audio conform / Complete` are not observable from the browser and
showing them would be theatre. The two states that ARE real — Ready and
Blocked — are shown. Running the package is two commands on the laptop.

## New files (Phase 2.5)

| Path | What |
|---|---|
| `shared/types/edit-learning.ts` | Event, session, diff and preference schema |
| `shared/lib/video-editor/diff.ts` | `diffEditorProjects` — deterministic, 13 entry types |
| `shared/lib/video-editor/learning.ts` | Statistics, aggregation, preferences, confidence |
| `shared/lib/video-editor/session.ts` | Event derivation, session lifecycle, storage |
| `shared/lib/video-editor/bake.ts` | The composition bridge's plan |
| `shared/components/video-editor/useAudioEngine.ts` | Scheduled narration playback |
| `shared/components/video-editor/CanvasSelection.tsx` | Canvas handles |
| `shared/components/marketing-hub/StudioLearningPanel.tsx` | Operator learning view |
| `scripts/verify-edit-learning.mjs` | 32 checks |
| `AltairDemoTool/.../bake-editor-scenes.mjs` | Executes a bake plan |
| `public/studio/hvac-01/audio/*.m4a` | 19 narration clips, 1.25 MB |

## End-to-end proof

All twelve requested steps pass in `verify-video-editor-ui.mjs` (30/30) plus the
bake proof above. Screenshots:

- `ui-audit/video-editor/editor-canvas-manipulation.png`
- `ui-audit/video-editor/editor-approved.png`
- `ui-audit/video-editor/studio-learning-panel.png`
- `ui-audit/video-editor/bake-composited-scene.png`

## Test-hygiene bug worth recording

Test 20 hid the VIDEO track and never restored it, so every later canvas
assertion failed for a reason that had nothing to do with the canvas. Three
"canvas is broken" failures were one un-restored toggle. Tests that mutate
shared state now restore it.

## Still not built

- No render job API (above).
- No crop.
- Sessions are localStorage, per browser.
- Library browsing still needs a media endpoint plus generated thumbnails.
- No agent consumes preferences yet — the read interface exists and is tested.

---

# Phase 3 — 2026-09-10

The learning loop is closed: an agent generates an editable draft, a human
edits and approves it, and a later agent run consumes the eligible corrections.
Full detail in **`AGENT_EDIT_LEARNING_LOOP_REPORT.md`**.

What changed in the editor itself:

- **A generated draft opens with its provenance.** `/studio/editor/<draft-id>`
  resolves an agent draft client-side (they live in the browser; the server
  route cannot see them) and shows a `GENERATED DRAFT` banner naming the agent
  and preference set behind it.
- **A scorecard after approval.** Bot draft → human approved, as numbers, from
  the deterministic diff: clips retained, shortened, moved, assets replaced,
  opening replaced, visual changes/minute, runtime delta.
- **The learning panel has three states** — Collecting evidence / Candidate /
  Active guidance — and shows each preference's scope, so it never claims to
  have "learned" something after one session.
- **`shared/lib/video-editor/pacing.ts`** mirrors the renderer's pacing rule so
  a generated draft has the shape the renderer will produce.
  `verify:agent-loop` reads `render-episode.mjs` and fails if they drift.

Suites now: **47/47** editor logic, **32/32** learning, **28/28** agent loop,
**30/30** browser, **2895** platform tests, tsc clean, 0 lint errors, build ✓.

---

## Superseded in part by Phase 4

The gap this report left open — **a generated draft arrives with narration and
timing over an empty visual layer** — is closed. `buildDraftFromPlan` no longer
turns `visualDirection` into a clip label and stops; it reads a curated
`beat.visual`, puts a real library `assetId` on the clip, and returns a `frames`
map so the canvas and timeline show the actual picture.

Two statements in this report are now out of date:

- *"a generated draft has no rendered frames … empty maps are the truthful
  answer"* — true only for an **uncurated** plan. A curated one carries frames.
- The media browser's Library panel still states that this application cannot
  read the asset library. That remains true; what changed is that a draft now
  carries the assets it chose, with thumbnails exported for exactly those.

Suite counts here are also superseded — see `AUTONOMOUS_VISUAL_DRAFT_REPORT.md`.
