# The agent edit-learning loop

Built 2026-09-10 (Phase 3). An Altair video agent generates an editable Studio
draft; a human edits and approves it; those corrections become evidence; and a
later agent run consumes the eligible ones when planning the next draft.

**The loop is closed and proved end to end.** No model was trained, and no agent
rewrites itself.

---

## Run the proof

```bash
cd C:/Users/User/Desktop/altair-os && npm run proof:agent-loop
```

It builds a preference set from fixture sessions, runs the **real**
`content.draft_video_plan` handler twice (once with the file, once without),
asserts on what each was shown and recorded, turns both plans into Studio
projects, applies a human edit, and writes
`ui-audit/video-editor/learning-loop-proof/`.

---

## The actual pipeline, as discovered

Searched across `altair-agent-platform`, `altair-os` and `AltairDemoTool`.

| Stage | Where it really lives |
|---|---|
| Chief schedules content | `src/agents/chief/content-schedule-advance.ts` |
| Format decision | `src/agents/content/format-decision.ts` |
| **Editing decisions are generated** | **`src/agents/content/video-plan.ts` → `content.video_plan`** |
| Plan → assets | `src/agents/content/video-plan-to-assets.ts` |
| Long-form / diagram variants | `youtube-draft.ts`, `diagram-plan.ts` |
| Render | AltairDemoTool `render-episode.mjs` → `buildFilterGraph` |

**The integration point is the user-message assembly in `video-plan.ts`**, where
`# TOPIC`, `# FORMAT`, `# TARGET DURATION`, `# ANGLE`, `# DIRECTOR'S RATIONALE`
and `# RESEARCH FINDINGS` are concatenated. Guidance is appended **last**.

### The finding that shaped the design

**A plan beat carries no duration.** `beatSchema` is
`{narration, visualDirection, caption, kind}`; only a plan-level
`targetDurationSeconds` exists. Duration is not the Director's to choose — it
falls out of how long a line takes to say plus the production tail rule
(`render-episode.mjs:72-80`).

So a preference like "prefer 3.2–4.1 second stills" cannot be applied to a beat
directly. The Director influences it **indirectly, through narration length and
beat count**, and `buildDraftFromPlan` applies the real pacing rule so the
draft's shape is the shape the renderer will produce. `shared/lib/video-editor/pacing.ts`
mirrors those constants, and `verify:agent-loop` **reads `render-episode.mjs`
and fails if they drift**.

---

## Preference contract

`shared/types/editing-preferences.ts`

```ts
EditingPreferenceSet {
  version: number            // frozen envelope; unknown versions are refused
  generatedAt: string
  scope: { format?, series?, topic? }
  preferences: AgentEditingPreference[]
}

AgentEditingPreference {
  key: string
  evidenceSessions: number   // SESSIONS, never events
  confidence: number         // 0..1
  recommendation: string
  metrics?: Record<string, number>
}
```

Versioned separately from the internal `EditingPreference` because the two move
at different speeds: adding a statistic must not require redeploying the agent
platform, and an agent that recorded "I used set v1" must be able to say what v1
meant later.

### Strength bands, not raw numbers

| Confidence | Band | The agent is told |
|---|---|---|
| ≥ 0.80 | **strong** | Follow normally; depart only with a specific reason |
| ≥ 0.70 | **guidance** | Evidence, not instruction |
| < 0.70 | weak | **Never shown to an agent** |

A model handed `{"confidence":0.81}` has to decide for itself what 0.81
licenses, and different runs decide differently. Prose with an explicit
instruction per band is reproducible.

---

## Scope precedence

```
topic  →  series  →  format  →  global
```

**Most specific wins, applied PER KEY.** A series that has learned something
about captions and nothing about pacing inherits the format's pacing rule rather
than losing it. Broader tiers fill gaps; they never overwrite a narrower tier's
answer — even when the broader tier has *higher* confidence.

`topic` folds into the series tier when present: a topic is a subdivision of a
series, not a peer, and giving it its own tier would create two orderings for
the same pair of facts.

**The failure this prevents**, asserted directly in
`verify-agent-learning-loop.mjs`: a 2.5-second still learned from Shorts must
not shorten every visual in a six-minute explainer. Shorts evidence can only
ever reach a long-form request through the **global** tier, never attributed to
that series or format. An unknown scope returns an empty tier rather than
silently borrowing another series' evidence.

---

## Evidence and confidence rules

`confidence = consistency × volume`

- **consistency** — share of sessions agreeing, rescaled so a coin flip is 0
- **volume** — saturates at 2× the minimum session count, so the fifteenth
  session adds less than the fifth

Defaults: **5 sessions, 0.70 confidence**, both configurable.

| Situation | Result |
|---|---|
| 1 session, unanimous | set is **empty** — the agent sees nothing |
| 9 sessions, unanimous | 4 preferences, up to 90% confidence |
| 5 shorten vs 5 lengthen | confidence 0, never actionable |
| 6 sessions × 50 events | `evidenceSessions` = **6** |

---

## Not a self-modifying agent

Nothing rewrites a prompt, a source file or an agent's instructions. The
preference set is **runtime input**: read at task time, injected as one labelled
section, recorded on the artifact, discarded. Core agent behaviour stays in
version control, reviewable and revertible.

`ALTAIR_EDITING_PREFERENCES` is **optional**. Missing, stale, malformed, or a
future version — every one resolves to "plan exactly as before" with a stated
reason. Learning is an improvement, never a dependency.

---

## What the Director actually saw (verbatim, from the proof)

```
# HUMAN-LEARNED EDITING PREFERENCES

Derived from edits a human made to previous generated drafts for series
"How HVAC Actually Works", format "short_narrated_video". Preference set v1,
generated 2026-09-10T12:00:00.000Z.

- Humans consistently shorten static visuals. Prefer 2.9–3.9 second stills.
  Evidence: 9 approved editing sessions.
  Confidence: 90% (strong).
- The opening visual is replaced in 100% of approvals. Treat the first shot as
  the weakest first-pass decision and generate alternatives.
  Evidence: 9 approved editing sessions.
  Confidence: 90% (strong).
...
How to weigh these:
- STRONG preferences should normally be followed...
- These describe what humans CHANGED about earlier drafts. They are not a
  brief, and they never outrank the topic, the research findings, or the
  Director's rationale.
```

---

## Draft A vs Draft B

Both produced by the **real** task handler on `FakeModelProvider` (no paid API).

| | Draft A | Draft B |
|---|---|---|
| Preference file | none | generated from 9 fixture sessions |
| Saw guidance | **false** | **true** |
| `preferenceSetVersion` | `null` | `1` |
| `preferenceKeysSupplied` | `[]` | 4 keys |
| Beats → Studio project | 5 beats, 20.8s | 5 beats, 20.8s |

Both drafts record their metadata — that is what makes "generated without
preferences" a comparable cohort rather than an absence.

Then a human edit on Draft B, measured deterministically:

```
67% of the generated cut was kept; 5 clips changed across 6 edits.
  Clips retained: 67%   Clips shortened: 5   Assets replaced: 1
  Opening visual: replaced
  - clip-beat-01 shortened by 1598ms (3995 → 2397)
  - clip-beat-01 asset none → operator-chosen-open
```

### Fixtures are not operator history

The 9 sessions are constructed inside the proof script and **never written to
the browser store real approvals live in**. Manufacturing evidence to clear a
threshold would corrupt the one dataset the system depends on.

---

## Files added

**altair-os**

| Path | What |
|---|---|
| `shared/types/editing-preferences.ts` | The versioned agent contract, strength bands, precedence |
| `shared/lib/video-editor/preference-set.ts` | Builds sets, resolves precedence, operator states, export file |
| `shared/lib/video-editor/pacing.ts` | The production pacing rule, mirrored + drift-checked |
| `shared/lib/video-editor/draft-from-plan.ts` | `content.video_plan` → `EditorProject` |
| `shared/lib/video-editor/draft-store.ts` | Generated drafts, per browser |
| `shared/lib/video-editor/scorecard.ts` | Bot draft → human approved, from the diff |
| `shared/lib/video-editor/render-job.ts` | The job contract and state machine |
| `AltairDemoTool/.../run-editor-render-job.mjs` | The laptop worker |
| `shared/components/video-editor/StudioProjectLoader.tsx` | Resolves demo episode vs generated draft |
| `shared/components/marketing-hub/StudioDraftIntake.tsx` | Plan in, preference file out |
| `scripts/verify-agent-learning-loop.mjs` | 28 checks |
| `scripts/verify-agent-loop-ui.mjs` | 13 live browser checks on the loop |
| `scripts/proof-agent-learning-loop.mjs` | The end-to-end proof |

**altair-agent-platform**

| Path | What |
|---|---|
| `src/agents/content/editing-preferences.ts` | Loads and validates the preference file |
| `src/agents/content/editing-preferences.test.ts` | 12 checks |
| `src/agents/content/video-plan-preferences.test.ts` | 8 checks — injection, metadata, long-form scope |
| `src/agents/content/learning-loop.proof.test.ts` | Draft A vs Draft B, skips unless driven |

## Files modified

- `video-plan.ts` — preference load step, guidance injection, `generatedWith`
- `youtube-draft.ts` — the same three, asking for `long_form_youtube`
- `config/env.ts` — `ALTAIR_EDITING_PREFERENCES`
- `config/platform-config.ts` — `editingPreferencesFile` (so tests can supply one)
- `VideoEditorShell.tsx` — draft banner, scorecard strip
- `StudioLearningPanel.tsx` — Collecting / Candidate / Active states, scope shown
- `MarketingStudioView.tsx` — intake panel
- `app/(studio)/studio/editor/[projectId]/page.tsx` — resolves drafts client-side
- Two platform test fixtures — `generatedWith: null`

---

## Tests

| Suite | Result |
|---|---|
| `npm run verify:video-editor` | **47/47** |
| `npm run verify:edit-learning` | **32/32** |
| `npm run verify:agent-loop` | **39/39** |
| `node scripts/verify-video-editor-ui.mjs` | **30/30** |
| `npm run verify:agent-loop-ui` | **13/13** |
| platform `vitest run --dir src` | **2897 passed, 0 failed** |
| `npx tsc --noEmit` (both repos) | clean |
| `npm run lint` | **0 errors** |
| `npm run build` | ✓ |

New coverage: scope resolution, confidence thresholds, session counting, agent
serialization, generated-draft snapshots, draft metadata, Studio handoff,
preference consumption, ignored low-confidence preferences, pacing-rule drift.

### A silent mismatch caught late

**Studio exported `format: "long-form-educational"` while the Director asks for
`"long_form_youtube"`.** Scope matching is a string comparison, so the two would
never have matched: the evidence would have been exported, loaded, validated,
and then silently never applied — no error, no warning, a loop that appears to
work and does not.

Fixed by `AGENT_FORMATS` in `shared/types/editing-preferences.ts`, a mirror of
the platform's own identifiers, and a drift check in `verify:agent-loop` that
reads `video-plan.ts` and `youtube-draft.ts` and fails if either spelling moves.
Mirrors are only useful while they are checked.

### Bugs found and fixed

1. **A "skip" written as a failing assertion.** The proof test reddened the
   whole platform suite whenever it was not being driven — which teaches
   everyone to ignore a red suite. Now `it.skipIf`.
2. **`platform.config.env` did not exist.** Reading `getEnv()` directly made the
   feature untestable; it now travels on `PlatformConfig` so a test can supply
   a file.
3. **The proof's own edit miscounted.** `i === 0` ran per track, so two "first"
   clips were replaced and the scorecard reported 2 assets replaced when 1 was
   intended — exactly the quiet miscount this system exists to prevent,
   including in its own proof.

---

## Screenshots

- `ui-audit/video-editor/studio-draft-intake.png` — plan in, preferences out
- `ui-audit/video-editor/editor-generated-draft.png` — a real Director plan open
  in the editor, banner reading *"Generated by content.draft_video_plan.plan@v1
  with preference set v1 (4 preferences)"*
- `ui-audit/video-editor/editor-scorecard.png` — bot draft → human approved,
  after approving a generated draft
- `ui-audit/video-editor/learning-loop-proof/` — `proof.json`,
  `editing-preferences.json`, `platform-drafts.json`

---

## Blockers and limitations

- **Sessions, drafts and the preference file are per browser / on disk.** The
  cross-repo handoff is a FILE, not an endpoint, because there is no
  server-side session store for an endpoint to read. This is the single
  blocking item for multi-operator learning.
- **A generated draft has no assets.** `visualDirection` is a description, not
  an asset id, so the preview shows named placeholders. Curation
  (`video-plan-to-assets.ts`) is the existing stage that resolves this and is
  not yet wired into the draft path.
- **Narration durations are estimated** for a generated draft (185 wpm,
  measured median across the two rendered episodes) and flagged as estimates
  until a Piper pass makes them measured.
- **`preferenceKeysApplied` is never populated.** The Director is not asked
  which preferences it acted on; verifying that would mean inferring intent
  from output. The supplied keys are a join key — the diffs measure the effect.
- ~~Render job API — not built.~~ **Built.** See below.
- **The diagram planner (`diagram-plan.ts`) is not wired.** Short-form
  (`video-plan.ts`) and long-form (`youtube-draft.ts`) both inject preferences
  and record `generatedWith`; the diagram planner is a third handler and would
  need the same three lines.

---

## The render job bridge (secondary priority, built)

`shared/lib/video-editor/render-job.ts` + `AltairDemoTool/production/slide-system/run-editor-render-job.mjs`

**The browser never names a command.** A job carries a project id, a compiled
timeline and a bake plan — no binary, no flag, no path. Every one of those is
chosen by the worker on the laptop, which can only run the pipeline it already
has. `projectId` is checked against an allowlist held on **both** sides: in the
editor so the control is disabled rather than offered and refused, in the worker
because the browser's opinion is not the security boundary. A drift check
asserts the two lists agree.

**`render-episode.mjs` is untouched.** The two-command render remains exactly
what it was; this is a second, narrower door onto the same compositor.

States, with legal transitions enforced: `Queued → Preparing scenes → Rendering
→ Audio conform → Complete`, `Failed` reachable from anywhere, and **no exit
from a terminal state** — a worker that crashed must create a new job rather
than reopening a finished one, so the record stays true. Status is persisted to
`<job>.status.json` at every transition.

### Proved with a real render

```
job job-proof02 — How the HVAC cycle works
  [preparing_scenes] 0 scenes
  [rendering] 25 entries, 19 narration clips
  [audio_conform]
  [complete] 6.7 MB
```

`editor-hvac-01-job-proof02.mp4` — 1920×1080 h264 + AAC, **157.699s**, which
matches the compiler's predicted `expectedOutputMs` of 157699ms **to the
millisecond**. That equality is the strongest correctness signal in this phase:
the editor's model of the render and the render agree exactly.

### Two real bugs this surfaced

1. **The compiler emitted no narration at all.** Timelines compiled silent.
   Fixed: voice clips whose start matches an entry boundary now attach as
   `audioClip: { ref, durationMs }` — a REFERENCE, not a path, because the
   browser has no idea where the masters live and a path there would be a path
   the browser chose. Narration that starts mid-entry is reported as a drop
   rather than silently shifted, since the renderer delays audio to its entry's
   start and the line would play early.

2. **A pre-existing bug in `buildFilterGraph`'s silent path.** With zero audio
   clips it builds an `anullsrc` input with its `-map` misordered, and ffmpeg
   refuses the entire command (exit −22). `render-episode.mjs` never hits it
   because every episode has narration. **Not fixed** — the brief says not to
   destabilise rendering, and this is the compositor with a proven master behind
   it. The worker refuses a narration-less job up front and names the real
   reason instead of surfacing an ffmpeg argument-parsing error from two layers
   down.

### Still true of it

- The job file moves by download-and-run, like every other handoff here.
- Only allowlisted, already-rendered projects (`hvac-01`, `hvac-04`) can render:
  a generated draft has no assets, so there is nothing to composite.
- Frames resolve masters first, previews second, and the run writes a
  `.resolution.json` saying which was used per entry — "the output looks soft"
  should never be a mystery.

---

## Exact next recommendation

**Move sessions to a table, then have the Chief write the preference file on a
schedule.** Everything else here is already the shape it should be; the file
handoff is the one piece that exists because there was no alternative rather
than because it is right.

Concretely: a `marketing_edit_sessions` migration with RLS, a typed query, and
a server action called by Approve. Then `/api/agent/editing-preferences`
(bearer-auth, like the existing agent bridge routes) replaces
`loadPreferenceSetFile`, and `ALTAIR_EDITING_PREFERENCES` becomes a URL.

After that, the metric worth watching is the one this phase makes computable:
**retention ratio per episode over time** — how much of each generated cut
survives approval. If the loop works, that number climbs.
