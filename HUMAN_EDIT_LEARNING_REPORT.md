# Human-edit learning — the data foundation

Built 2026-09-10 (Phase 2.5). The editor now records how a human changed a
bot's cut, so that record can eventually make the bot's next cut better.

**No model was trained, and nothing modifies agent behaviour yet.** This is the
evidence layer, plus the guard that stops one afternoon's opinion becoming
policy.

---

## The flow, as built

```
bot draft  ──►  Studio editor  ──►  human edits  ──►  Approve
                                          │                │
                                    HumanEditEvent[]   EditSession
                                    (the trail)        (both snapshots)
                                                            │
                                              diffEditorProjects(draft, approved)
                                                            │
                                                   aggregate over sessions
                                                            │
                                                   EditingPreference[]
                                                    │              │
                                        below threshold      cleared threshold
                                        (operator sees)      (agents may read)
```

## The three ideas it rests on

**1. The draft is never overwritten.** An `EditSession` holds
`generatedProjectSnapshot` and `approvedProjectSnapshot` side by side.
`approveSession` returns a new object and never mutates, so there is no code
path on which the control condition can be lost. Without the draft there is
nothing to diff against and the whole proposition collapses into "here is a
video someone made".

**2. Diffs are computed, never inferred.** Every difference is arithmetic a
computer does exactly — 6200ms became 3400ms, an asset id changed, a caption's
text differs. Nothing here calls a model. What a model might eventually be good
for is naming a *pattern* across hundreds of these; it has no business
calculating a subtraction.

**3. Evidence is counted in SESSIONS, not events.** One operator shortening
forty clips in one sitting is one opinion, not forty. This is asserted in the
tests, because it is the single easiest way to accidentally build a system that
is confidently wrong.

## Schema

`shared/types/edit-learning.ts`

```ts
HumanEditEvent  { id, projectId, clipId?, trackId?, action, before?, after?,
                  timestampMs, source: 'human' }

EditSession     { id, projectId, generatedBy?, generatedProjectSnapshot,
                  approvedProjectSnapshot?, events[], startedAt, approvedAt?,
                  scope: { series?, format?, topic? } }

DiffEntry       13 variants — clip_duration_changed, clip_moved, clip_added,
                clip_removed, clip_moved_track, asset_replaced, text_changed,
                caption_changed, transform_changed, audio_changed,
                transition_changed, track_toggled, project_duration_changed

EditingPreference { key, evidenceCount, confidence, scope, scopeValue?,
                    recommendation, evidence }
```

### Diff examples, from the real tests

```json
{ "type": "clip_duration_changed", "clipId": "compressor-01",
  "trackId": "t-video", "beforeMs": 6200, "afterMs": 3400, "deltaMs": -2800 }

{ "type": "asset_replaced", "clipId": "compressor-01",
  "before": "slide-a", "after": "slide-z" }

{ "type": "caption_changed", "clipId": "cap-1",
  "before": "Start at the compresser.", "after": "Start at the compressor." }

{ "type": "transform_changed", "clipId": "clip-hook-1",
  "property": "scale", "before": 1, "after": 1.25 }
```

### Preference example

```json
{ "key": "static_visual_duration", "evidenceCount": 10, "confidence": 0.9,
  "scope": "series", "scopeValue": "How HVAC Actually Works",
  "recommendation": "Humans consistently shorten static visuals. Prefer 2.9–3.9 second stills.",
  "evidence": { "botMedianMs": 6200, "humanMedianMs": 3400,
                "sessionsShorter": 10, "sessionsLonger": 0 } }
```

## Capture: derived from actions, not from the UI

`deriveEditEvent(previousState, action, nextState, ctx)` is a pure function
that runs where dispatch runs. Consequences, all tested:

- An edit the reducer **rejected** (a move onto a locked track) produces no
  event — the log records what reached the project, not what the mouse did.
- Selection, seeking and zoom produce no events; they are not edits.
- **Undo and redo produce no events.** Recording them would double-count the
  work they reverse.
- A drag's ~200 commits collapse to one event, mirroring the history's gesture
  coalescing.
- `updateClip` is classified by inspecting the patch, so a caption fix and a
  scale change do not both land as "property_change".

The reducer itself was **not modified** — it is the tested core, and derivation
sits beside it so it stays pure.

## The overfitting guard

`confidence = consistency × volume`, where consistency is the share of sessions
agreeing rescaled so a coin flip scores zero, and volume saturates at twice the
minimum session count. Defaults: **5 sessions, 0.7 confidence**, both
configurable via `LearningThresholds`.

Tested explicitly:

| Situation | Result |
|---|---|
| 1 session, unanimous | candidate produced, **not actionable** |
| 10 sessions, unanimous | actionable, confidence ≥ 0.7 |
| 5 shorten vs 5 lengthen | confidence 0, never actionable |
| 6 sessions × 50 events each | `evidenceCount` = **6** |
| Series scope with two series present | only that series' sessions counted |

`derivePreferences` returns candidates including near-misses (the operator
panel shows them, so the system visibly accumulates evidence).
`actionablePreferences` is the agent-facing filter and never returns a
near-miss.

## Scope keeps formats apart

Preferences are computed per `global | series | format | topic`. A 30-second
short and a five-minute explainer do not share a pacing rule; an empty scope
returns nothing rather than silently falling back to global.

## What an agent reads

```ts
import { derivePreferences, actionablePreferences } from "@/shared/lib/video-editor/learning";

const usable = actionablePreferences(derivePreferences(sessions, {
  scope: "series", scopeValue: "How HVAC Actually Works",
}));
```

Raw events and raw diffs stay behind that. An agent reading raw events would
re-derive these statistics itself — differently, probably wrongly, and with no
threshold.

## Approval

`Approve` in the editor header. On press: the approved snapshot is written
alongside the draft, the session is stored, the diff is computed, and the
operator sees e.g. *"Approved — 3 changes captured for learning, 1 shortened"*.

**Approval does not publish and does not render.** They are separate actions,
and nothing leaves the machine.

## Operator view

Marketing → **Studio** → *Learned from edits*. Six numbers (bot vs approved
still duration, unchanged rate, opening replacement rate, caption correction
rate, runtime change) and the preference list with a
**Usable by agents** / **Needs more evidence** pill. Deliberately not a
dashboard: the sample size is currently in single digits and chrome would
imply otherwise.

Screenshot: `ui-audit/video-editor/studio-learning-panel.png`

## Tests

`npm run verify:edit-learning` — **32/32**

Diff (10), event capture (6), session lifecycle (3), statistics (4),
preferences and the overfitting guard (9).

One assertion failed during development and was a genuine finding, not a bug:
**trimming a mid-timeline clip does not change total runtime**, because runtime
is the furthest clip end and the editor does not ripple. That is now asserted
explicitly so a future ripple feature cannot change it silently.

## Known limitations

- **Sessions are localStorage, per browser.** Stated on the panel. Moving them
  server-side is what makes the evidence shared rather than personal, and is
  the first item in next steps.
- **One session per editor open.** Reopening the same project starts a new
  session against the same draft; there is no resume.
- **`scope.format` is hardcoded** to `long-form-educational` for EP01. It
  becomes meaningful when a second format exists.
- **No agent consumes preferences yet.** The read interface exists and is
  tested; nothing calls it.
- **Events are not deduplicated across undo/redo cycles.** An edit made, undone
  and remade appears once (the remake); the undo itself is not recorded. Good
  enough for the diff, lossy for studying hesitation.

## Next steps

1. **A table for sessions** — migration, RLS, typed query, server action. The
   localStorage module is what it replaces and is ~90 lines.
2. **Have the Director read `actionablePreferences`** at draft time and log
   which preferences it applied, so the loop closes and becomes measurable.
3. **Per-beat pacing evidence** — currently the median is over all visuals;
   splitting by section (`hook` vs body vs `close`) is where the interesting
   signal probably is.
4. **A second approved episode**, so scope actually has something to separate.

---

## Update — Phase 3 (2026-09-10)

The loop this report describes is now **closed**. See
`AGENT_EDIT_LEARNING_LOOP_REPORT.md`.

What that changes about this document:

- **"No agent consumes preferences yet"** is no longer true. The Director
  (`content.draft_video_plan`) reads them, and a draft records which set it was
  given.
- The agent-facing contract is now a versioned envelope,
  `EditingPreferenceSet` in `shared/types/editing-preferences.ts`, separate from
  the internal `EditingPreference` so the two can move at different speeds.
- Scope precedence is implemented and tested: `topic → series → format → global`,
  most specific wins, applied per key.
- Confidence is expressed to the agent as three bands — **strong / guidance /
  weak** — with an explicit instruction per band. Weak never reaches a prompt.
- Sessions are still localStorage. That remains the single blocking limitation,
  and the cross-repo handoff is a file for exactly that reason.
