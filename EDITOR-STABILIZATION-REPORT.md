# Editor stabilization — what was broken, what was measured, what changed

**2026-09-11.** The operator reported that playback in `/studio/editor/compressor-01`
was glitchy, that the current-time readout moved forwards and backwards, that the
narration skipped, that adding a photograph could break the editor, and that
there were no camera effects. Every automated suite was green at the time.

The operator was right, and the suites were measuring the wrong thing.

---

## 1. Root causes

### 1.1 Why playback jittered

The playhead was **reducer state advanced by accumulating frame deltas onto a
React ref**:

```ts
// VideoEditorShell.tsx, before
const next = playheadRef.current + delta;   // ref synced in a passive effect
dispatch({ type: "seek", ms: next });
```

`playheadRef` was updated in a `useEffect`. Passive effects flush **after paint**,
so whenever a commit landed late in a frame, the next animation frame read the
ref *before* the effect had written to it and added its own delta to a value one
frame old. The playhead stepped **backwards by one frame delta, every other
frame**, and lost that time permanently.

Two consequences followed:

* **Time ran at half speed.** Measured: `clockRate 0.51` against wall time.
* **The narration was dragged back.** Audio plays at wall speed; the editor's
  clock did not. Drift passed the 140ms tolerance roughly every 300ms and the
  audio engine reseeked the element — 1083 reseeks in 40 seconds. That is the
  skipping.

After a long frame the same bug produced the large visible jumps the operator
described: one frame forwards by 450ms, the next backwards by 434ms.

Measured on `compressor-01`, 40s windows, headed Chromium, no profiling hook:

| | clock rate | fps | backward steps | worst step | audio reseeks |
|---|---|---|---|---|---|
| untouched playback | 0.508 | 49.8 | 988 | −380ms | 1083 |
| after adding a photo | 0.496 | 27.2 | 428 | −150ms | 114 |

### 1.2 Why it started after adding a photograph

It did not start there — it got worse there, and that is measurable. Adding a
photograph requires selecting a clip and opening the photo library, and **both
of those made every frame's render roughly twice as expensive**, because the
playhead was React state: every frame re-rendered the shell, the 108-clip
timeline, the inspector and the 160-tile library grid.

A control experiment separates the two. Selecting a clip and opening the library
**without applying anything** reproduces the frame-rate collapse exactly:

| scenario (40s after the action) | fps | long animation frames |
|---|---|---|
| baseline, no edit | 49.6 | 11 |
| select a clip + open Library only | **27.1** | 45 |
| replace a photograph | **26.7** | 51 |
| add a photograph to a placeholder | **27.2** | 55 |

So the trigger was the *workflow*, not the asset change. On a faster machine the
clock is wrong only occasionally; once each frame costs twice as much, it is
wrong constantly. The timeline model itself was never corrupted — every
invariant (durations, starts, ends, ids, overlaps, captions, project length)
held in all four scenarios, before and after the edit.

`TimelineClip` is memoised, but the memo never held: the timeline's pointer
handler depended on the playhead, so its identity changed every frame and all
108 clips re-rendered with it. Measured over one 80s session: **322,380**
`TimelineClip` renders.

### 1.3 Why images could break the editor

Applying an asset was a direct `updateClip` patch with no validation. An asset id
that the catalog did not contain, or that had no exported preview, produced a
clip pointing at a picture that does not exist — which survives the autosave, the
reload and the render job, and fails on the laptop an hour later. There was also
no way to add a photograph as a *new* clip at all.

Two further defects surfaced while proving this:

* **Splitting a clip carried the transition onto the second half**, so a split
  dissolved a shot into itself. `splitClipAt` cleared the legacy
  `transitionInMs` but not the newer `transitionIn`.
* A failed image could not be seen: layers were CSS backgrounds, which have no
  error event, so a missing photograph rendered as a black frame indistinguishable
  from one the edit intended.

---

## 2. Playback architecture — what owns time now

```
PlaybackClock  (shared/lib/video-editor/playback-clock.ts)
   time = anchorMedia + (now() − anchorWall) × rate
   │
   ├── its own requestAnimationFrame loop, one time value per frame
   │
   ├── LiveTimecode        (writes its own text node)
   ├── Timeline playhead   (writes one transform)
   ├── CanvasRenderer      (re-renders only when the visible SET changes)
   └── useAudioEngine      (schedules narration; never sets time)
```

**Time is derived, never accumulated.** `performance.now()` is monotonic, so
during uninterrupted playback the clock is monotonic *by construction* — there is
no stale value to read because there is no running total. The anchors move only
on an explicit transport action: play, pause, seek, rate change. Those are the
only ways time can go backwards.

**Project state and playback state are now separate.** The reducer holds the edit
(tracks, clips, selection, zoom, history) and changes when the operator edits.
`seek` and `setPlaying` no longer exist as actions; `splitSelected` and `paste`
take an explicit `atMs`, so the reducer stays pure and a test states the instant
rather than simulating a seek.

**Audio follows and never leads.** The engine reads the clock and corrects only
drift beyond 180ms, never inside a 500ms grace window after a start or a
correction, and compensates the measured `play()` latency on the next start.
Nudges while an element is still opening are counted as *settles*; mid-line
reseeks are counted as *corrections*, because only the second kind is audible.

---

## 3. Performance, before and after

Same machine, same 40s windows, same project (108 clips, 8 tracks, 5:50).

| | before | after |
|---|---|---|
| clock rate (untouched / after photo) | 0.51 / 0.50 | **0.9988 / 0.999** |
| frames per second | 49.8 / 27.2 | **54.6 / 60.0** |
| backward steps, displayed timecode | 988 / 428 | **0 / 0** |
| backward steps, timeline playhead | 988 / 428 | **0 / 0** |
| timecode vs playhead disagreement | — | **≤ 9ms** (centisecond rounding) |
| narration reseeks | 1083 / 114 | **0 corrections** |
| React commits per second while playing | 46 | **0.2–0.3** |
| fibers rendered per commit | 217 / 399 | 22 / 4.7 |
| long animation frames | 13 / 55 | 1 / 0 |
| `TimelineClip` renders in a session | 322,380 | 649 |

The editor no longer re-renders to move the playhead. Upcoming frames are decoded
ahead of the cut, which is what removed the remaining ~120ms stalls.

---

## 4. Camera effects

A preset does not select a code path; it fills in numbers. The model is generic,
so a custom move is later UI work rather than a new feature everywhere:

```ts
motion: { preset, startScale, endScale, startX, startY, endX, endY, easing }
```

`scale` is a multiplier on a frame-filling picture and never goes below 1.
`x`/`y` are the picture's centre offset as a **fraction of the frame**, so the
same numbers mean the same move at 1920×1080, at 1080×1920, and in the editor's
scaled-down monitor. `clampMotion` keeps `|x| ≤ (scale−1)/2`, which is the
condition for the picture to cover the frame — a move cannot silently letterbox a
shot.

**Presets:** None · Push in · Pull out · Pan left · Pan right · Pan up ·
Pan down · Slow zoom · Ken Burns. **Adjustable:** intensity (0.25–2×, scales the
distance travelled, not the time) and easing (Linear, Ease in, Ease out, Smooth).

Easings are deliberately algebraic and comma-free — `p`, `p*p`,
`1-(1-p)*(1-p)`, `p*p*(3-2*p)` — because FFmpeg has to evaluate the identical
formula per frame. A CSS cubic-bezier would look right in the browser and be
unreproducible in the master.

`shared/lib/video-editor/motion.ts` is the single evaluator. The browser calls it
every frame; the compiler calls it to write the numbers into the render job.

---

## 5. Transitions, and the clock they fixed

**Cut · Crossfade · Fade through black · Slide left / right / up / down**, each
with its own duration, per clip.

The old renderer applied one global 260ms crossfade that **overlapped
neighbouring entries**, so the master came out `(n−1) × 260ms` shorter than the
timeline — 9.1 seconds on this episode — and no clock in the editor could agree
with the file. A transition now happens **inside the incoming clip's own first
moments**, with the outgoing frame held underneath:

```
... clip A ...][=== d ===|          clip B          ]
                ^ B.startMs
```

Nothing is moved and nothing is shortened. Timeline time and master time are the
same number, which is the only version an operator can trust while editing.

---

## 6. Editing controls now available

| | |
|---|---|
| Transport | Play/pause (Space, K, L), jump to start/end (Home/End), frame step (←/→), 1s step (Shift+←/→), back 5s (J), speed 0.5× / 1× / 1.5× / 2× |
| Clips | select, drag, trim both edges, split at playhead (**S** or Ctrl+B), duplicate (Ctrl+D), delete, copy/paste, hide from the film, multi-select |
| Tracks | hide, mute, **lock** (new toggle in the track header) |
| Timeline | zoom in/out, **Fit** the whole film, snapping (Alt bypasses), playhead follows playback and turns the page |
| Pictures | replace from the library, **add as a new clip at the playhead**, scale, position X/Y, rotation, opacity, fit (cover/contain), **Reset framing** |
| Camera | nine presets, intensity, easing |
| Transitions | seven kinds with per-clip duration |
| Text / captions | content, font size, alignment, timing |
| Audio | per-clip volume, mute, fades, timing |
| Safety | undo/redo with gesture coalescing, autosave, per-panel error boundaries, asset-failure card with Retry / Replace / Remove |

---

## 7. Known problems

Stated rather than smoothed over.

* **The master is 50ms (≈1.5 frames) shorter than the timeline** on the proof
  render: 51933ms against 51983ms. Entry durations are quantised to whole frames
  and the timeline length is not a multiple of 33.3ms. This is against 9.1
  seconds of divergence before the change, but it is not zero, and a long run of
  hard cuts can accumulate about a frame per cut.
* **`fit: cover` is still ignored for a still with no camera move.** That path
  keeps the renderer's historical letterbox behaviour. Every frame in this
  episode is already 16:9, so nothing differs today; a non-16:9 still without
  motion would letterbox in the master while the browser covers.
* **A video clip carrying a camera move is refused by the renderer**, not
  implemented. No video clips exist in this project.
* **Motion on a composited layer is dropped, and says so.** Where several layers
  or a rotation/opacity force a bake, the entry becomes one still and a still
  cannot move. The compiler names the clip.
* **Rotation and opacity still require a bake** (a Playwright screenshot pass).
* **Per-clip audio gain and fades still do not reach the master** — the renderer
  applies one global narration gain. Editable, and reported as dropped.
* **Captions are not burned into the editor-job master.** The preview draws them;
  the render job passes no font path. Pre-existing, now written down.
* Autosave is still `localStorage`: it survives refresh, crash and restart, not a
  different browser or machine.
* The proof suites run against a dev server on this machine. Frame-rate numbers
  are specific to it.

---

## 8. Proof

**Video:** `AltairDemoTool/production/slide-system/out/editor-compressor-01-job-editor-motion-proof.mp4`
— 51.9s, 1920×1080, 1558 frames, six shots carrying Push in, Pan left,
Ken Burns, Pull out and Slow zoom, joined by crossfade, fade through black,
slide left and a hard cut. Rendered through the ordinary compile → job → worker
path, with **0 bake scenes and 0 drops**: framing and motion are now carried
natively by the filter graph.

Extracted frames are in `ui-audit/video-editor/stabilization/proof-frames/`.
Looked at, not just asserted: the push-in crops progressively tighter across
start/mid/end; fade-through-black genuinely reaches black at its midpoint; slide
left is a clean vertical split with the outgoing card on one side and the
incoming photograph on the other; the crossfade is a true double exposure.

Renderer-side measurements (independent verification, AltairDemoTool):

* pan: expected −1.4222 px/frame, measured **−1.4101**, 0 wrong-way steps,
  0.38px peak-to-peak jitter (a 4× upscale before `zoompan`; at 1× it was 2.22px)
* zoom geometry vs the formula: **32.9–43.5 dB** PSNR against the computed
  window, **17.3–18.2 dB** against a control window shifted 8px
* in-place transition timing: timeline 20500ms → rendered **20.500000s**, 615
  frames, **0ms delta**
* the legacy 36-entry filter graph is **byte-identical** before and after, so
  existing renders are untouched

---

## 9. Tests

| suite | result | what it proves |
|---|---|---|
| `verify:video-editor` | **84/84** | timeline arithmetic, reducer, history, the new clock, motion, composition, media insertion, compiler |
| `verify:image-edit-playback` **(new)** | **12/12** | the operator's exact regression: play → replace a picture → play → add a picture → play → save → reload → play |
| `verify:editor-playback-quality` **(new)** | **9/9** | playback quality as measurement: monotonicity, wall-clock rate, commits/sec, long frames, seek/resume, 2×, scrub, narration sync |
| `verify:media-stress` **(new)** | **8/8** | 20 replacements, 3 additions, 10 undos, 10 redos, save, reload, play |
| `verify:acceptance` **(new)** | **14/14** | the 24-step acceptance sequence, end to end, with a screenshot per step |
| `verify:video-editor-ui` | 30/30 | the pre-existing interaction suite, unchanged |
| `verify:practice-episode` | 13/13 | the practice film still opens, edits and saves |
| `verify:edit-learning` | 32/32 | edit capture and preferences |
| `verify:curated-draft` | 38/38 | curated drafts |
| `verify:agent-loop` | 39/39 | the agent learning loop |
| renderer (`AltairDemoTool`) | 1303/1309 | motion and transition arithmetic; the 6 failures are pre-existing and in `dist/motion/`, untouched by this work |
| `npx tsc --noEmit` | clean | |
| `npm run lint` | **0 errors** | 151 warnings, against 149 before this work. The two new ones are the deliberate `<img>` layers: a decode failure has to be observable, and `next/image` cannot report one |
| `npm run build` | passes | |

The three new suites are permanent and registered in `package.json`.

**The invariant they all share**, in one function (`assertSmooth`), so it cannot
drift between suites: during uninterrupted playback the displayed timecode and
the timeline playhead must both be non-decreasing, the clock must run at wall
speed, the frame rate must hold, and the narration must not be dragged back
mid-line.

### Why the old suites missed this

They asserted that the timecode had **changed**. A clock running at half speed
and stepping backwards every other frame changes. These sample it every frame
and assert on the shape of the whole sequence.

---

## 10. The manual session

Driven in a real headed browser, in one continuous session, with a screenshot at
each step (`ui-audit/video-editor/stabilization/acceptance/`):

open · play a full minute uninterrupted · scrub to 1:35 and resume · select a
photograph · replace it from the library · add another as its own clip · undo ·
redo · trim a clip by dragging its edge · split at the playhead with **S** ·
clear the camera move and confirm the shot is locked off · apply **Push In** and
measure the canvas layer's scale at two instants inside the clip · switch to
**Pan Right** and measure the translation · change scale on the slider and watch
the canvas follow · add a **crossfade** · save · reload · confirm the camera
move, the transition and both photographs survived · play again.

Two real bugs were found this way, after the automated suites were already green:

1. **Splitting a dissolved clip dissolved it into itself** — `splitClipAt`
   cleared the old `transitionInMs` but not the new `transitionIn`. Fixed, with
   a test.
2. My own first acceptance run passed a camera check it should have failed,
   because it measured a clip the practice film had *already* given a push-in to.
   The check now clears the move first and proves the shot is static before
   applying one. A test that cannot fail is not evidence.

### Screenshots

`ui-audit/video-editor/stabilization/acceptance/01-opened.png` through
`14-final-playback.png` — the editor at every step, including the camera panel
with Push In active and its `1.00 → 1.12` readout, the transition panel with
Crossfade at 400ms, and the timeline after a split with both halves selected.

Playback traces: `image-edit-playback-{A,B,C,D}.json`, `playback-quality.json`,
`media-stress-playback.json`, and the before/after evidence in
`traces/before-fix/` and `traces/after-fix/`.

---

## 11. State of the tree

Nothing is committed and nothing is pushed.

* **altair-os** — the editor, the compiler, the practice film's motion and
  transitions, four new QA scripts, one new report.
* **AltairDemoTool** — per-entry camera motion and per-cut transitions in the
  filter graph, the worker pass-through, one new test module, and `dist/` rebuilt
  so the worker runs the new code. Two proof jobs and their masters are in
  `production/slide-system/`.

Say the word and I will commit them.
