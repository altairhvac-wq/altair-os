# Altair HVAC Shorts — style development run

**Objective:** establish a repeatable visual style for 9:16 HVAC educational
Shorts, proved by one gold-standard Short and a small evaluation batch.

**Style version established:** `ALT-HVAC-CUTAWAY-V1`
**Winner:** `recip-what-happens` **v2** — 22.3 s, 1080×1920, 30 fps, narrated.

---

## What was built

A deterministic animation engine under `scripts/shorts/`. No generative video
model was used for the picture. Frames are drawn on a real browser canvas,
captured by Playwright, and encoded with ffmpeg.

The decision that shaped everything: **the mechanism is simulated, not
keyframed.** One number — crank angle — runs through a slider-crank
displacement and a polytropic cycle, and from it fall out the piston position,
both valve states, the cylinder pressure and temperature, the particle count,
and the particle colour. There is no path by which the gauge can disagree with
the picture, or a valve label with the valve it points at.

The cycle-accuracy requirement is enforced mechanically rather than trusted:
`render.mjs` writes a per-frame audit and **exits with status 2 rather than
encode** if any frame has both valves open. Every render in this run passed
with zero violations.

## Versions

| | V1 | V2 |
| --- | --- | --- |
| Technical accuracy | 8 | 9 |
| Visual quality | 6 | 7 |
| Motion clarity | 7 | 8 |
| Educational clarity | 7 | 8 |
| Phone readability | 5 | 8 |
| Retention potential | 6 | 7 |
| Scene continuity | 7 | 8 |
| Premium feel | 6 | 7 |

Before V1 there were four discarded probe passes; they are worth recording
because each failure was a lesson the style spec now encodes.

- **Probe 1** — the cut faces were a thin neon-red outline traced around
  *everything*, including the outer silhouette. It read as a red-bordered
  diagram. **Rule learned:** in a section, only *inner* contours are cut faces.
- **Probe 2** — the crankcase was a black cavern occupying a third of the
  frame, and the head was a hole with springs floating in it. **Rule learned:**
  bored pockets need a back wall.
- **Probe 3** — with the material fixed, the whole machine still read as a flat
  vector illustration. The missing thing was the **far half of the bore**. Adding
  a concave interior wall, an elliptical deck lip and honing marks did more for
  believability than every material tweak before it combined.
- **Probe 4** — the machine floated in the middle of an empty frame. Filling the
  phone and *cropping* the sump was what made it read as a machine larger than
  the screen rather than a diagram placed on a slide.

### V1 → V2 (the three things the first full render got wrong)

1. **Titles that contradicted the mechanism.** The audit — not the eye — caught
   it: the suction shot spent 1.07 s under a "SUCTION STROKE" title with the
   suction valve still shut (it was showing clearance re-expansion), and the
   compression shot spent 0.77 s under "Both valves shut" with the suction valve
   still open. Both were shot-boundary crank angles, fixed by starting each shot
   inside its own phase. The remaining 0.87 s of suction lead-in is deliberate:
   the valve now visibly snaps open on camera as the caption arrives.
2. **A payoff nobody could read.** The IN/OUT numbers were set straight onto the
   machinery with only a text shadow. They are now panelled.
3. **A piston that read as a box.** The skirt's lower half was dropped into
   shadow; it is now a step with a lit edge.

## What worked

- **Deriving everything from one angle.** Correctness stopped being a thing to
  check and became a thing that could not be otherwise. The both-valves-open
  gate has never fired, because the model cannot produce that state.
- **The single colour rule.** Refrigerant colour is a function of temperature,
  and particles, chamber light, pipe interiors, gauge fills and needles all read
  from it. Mid-compression the gas is genuinely violet — nobody chose that; it
  is where 57 °C lands on the ramp. It is the main reason frames from different
  shots look like one system.
- **Normalised chamber space for particles.** The packing during compression is
  a consequence of the chamber rectangle shrinking, not a separate animation.
  This is the single most convincing behaviour in the finished Short.
- **Camera pushing in as volume falls.** The squeeze is felt twice.
- **State-bound labels.** `SUCTION VALVE — OPEN/CLOSED` is generated from the
  same boolean that lifts the valve.
- **Pure frames.** Every frame is a function of its index, so review frames are
  the frames that shipped, and narration could be muxed without re-rendering.

## What did not work

- **Canvas 2D will not reach the reference images.** The references are
  raytraced 3D with real reflections and depth of field. What this engine
  produces is a high-end 2.5D sectioned illustration: convincing, consistent,
  premium-ish, and clearly not a render. Closing that gap means a real 3D
  pipeline, not more gradients.
- **Four probe passes were spent on the machine before the diagnosis was right.**
  The problem was always interior depth; it was misread as material and colour
  twice before that.
- **Narration length.** The first take came back 33.2 s against a 22.6 s
  picture. The cloned voice reads at ~132 wpm with long sentence gaps, so word
  count alone was the wrong budget. The fix that worked was capping internal
  silences at 280 ms (30.9 s → 23.3 s), then a 1.06× stretch. `narrate.mjs` now
  refuses anything over 1.14× and tells you to cut words instead.
- **The crankcase remains the weakest region.** It is partly covered by the
  instrument cluster in most shots, which hides the problem rather than solving
  it.

## Why V2 won

It is the only version where nothing on screen contradicts anything else on
screen, and where every element is readable at phone size. V1 looked similar
and was wrong twice — and both errors were the kind a viewer who knows the
trade would catch immediately, which is exactly the audience.

## Remaining technical weaknesses

1. **No true 3D.** Ceiling on realism, as above.
2. **Render cost.** ~1.3 fps of capture; a 22 s Short takes ~8.5 minutes. Fine
   for a handful of Shorts, not for a library. Batching frames through
   `toDataURL` instead of per-frame screenshots is the obvious next win.
3. **The scroll mechanism proves the plug, not the style.** The involute
   geometry, the non-rotating orbit and the inward pocket migration are right,
   and the tracked pocket sweeps 60→250 psig over its two-revolution journey.
   But looking at the frames honestly: the wraps are flatly shaded compared with
   the reciprocating castings, and the gas reads as thin dotted chains rather
   than filled crescent pockets, because the parcels are strung along an
   involute instead of filling a solved pocket polygon. It is legible and it is
   mechanically correct; it is not yet as good-looking as the piston Short.
   Two bugs were caught and fixed on the way there, both worth remembering:
   pocket position must use the WRAPPED shaft angle (the running total marched
   every pocket off the outside of the machine after one turn), and the
   instruments must follow ONE pocket's journey rather than the innermost
   pocket, which sits pinned at discharge pressure and never moves a needle.
4. **No scroll equivalent of the valve gate.** Reciprocating accuracy is
   enforced in code; scroll accuracy currently rests on the model being right.
5. **Rotary, screw and centrifugal are specified but not implemented.**
6. **Backgrounds repeat.** The blurred plant plate is one image; across many
   Shorts it will start to be recognisable as the same image.

## How reusable the system is

Reusable at the level it was meant to be. Three of the four Shorts are pure
data files — shots and overlay times — with no engine changes. The fourth swaps
the mechanism plug entirely for a different geometry in a different projection,
and still inherits the palette, typography, gauges, chips, captions, caption
band, watermark, progress hairline and camera system unchanged.

The seam that held: `{ id, state(theta), draw(ctx, state), gas(...) }`. The seam
that leaked slightly: the template's valve chips are reciprocating-specific.
The scroll model reports `suctionOpen: false` so nothing can light up wrongly,
but a cleaner design would let a mechanism declare which chip vocabulary it
owns.

## The evaluation batch

| Short | Runtime | Mechanism | Hook type | Caption density | Valve violations |
| --- | --- | --- | --- | --- | --- |
| What actually happens inside a compressor? (v2) | 22.3 s | reciprocating | question | 16.2 | 0 |
| Why is the suction line cold? | 18.2 s | reciprocating | question | 12.4 | 0 |
| Why is the discharge line hot? | 18.8 s | reciprocating | question | 14.0 | 0 |
| How a scroll compressor actually compresses | 19.8 s | scroll | demonstration | 12.0 | 0 |

Three of the four hooks are questions. That is a gap worth closing deliberately
in the next batch — a channel whose every video opens with a question starts to
feel like a format rather than a voice.

Only the winner is narrated. The other three are picture-locked and silent;
adding voice to them is a `narrate.mjs` run each, not a re-render.

## Deliverables

```
ui-audit/shorts/recip-what-happens/v1/     first full render (silent), audit.json
ui-audit/shorts/recip-what-happens/v2/     WINNER — mp4 with narration,
                                           audit.json, scene.json, metadata.json,
                                           key-frames/ (12 representative frames)
ui-audit/shorts/why-suction-line-cold/v1/
ui-audit/shorts/why-discharge-line-hot/v1/
ui-audit/shorts/scroll-how-it-compresses/v1/
scripts/shorts/                            the engine, README with the workflow
shared/types/shorts.ts                     editor contract + metadata schema
docs/design/shorts-visual-style.md         the style specification
```

Reproduce the winner:

```bash
node scripts/shorts/render.mjs --short recip-what-happens --version v2
node scripts/shorts/metadata.mjs --short recip-what-happens --version v2
```

## Metadata and learning

Every Short writes a `metadata.json` whose structural fields are **measured**
from the spec, not typed: scene count, cut count, average shot length, caption
density in words per second, camera motion types, visual modes used.

There is **no `performance` block** on any record. The schema is ready for
platform numbers (`shared/types/shorts.ts`), and an absent block means *not
measured*, which is deliberately a different claim from measured-as-zero.
Nothing in this run invented a view count.

## What the next Short should be

**"Why your suction line is frosting over."**

Reasons: it is the natural third beat after the cold-line and hot-line pair,
which the batch already establishes; it is a fault rather than normal operation,
which is a different and probably stickier hook type than the three questions
shipped here; and it exercises a part of the system that has not been tested —
a state the machine should *not* be in. Everything so far animates a healthy
compressor. Being able to show an unhealthy one is where this becomes a
diagnostic channel rather than a theory channel.

Before that, two engineering tasks worth doing first:

1. Batch the frame capture. 8.5 minutes per Short is the main brake on iteration.
2. Give the scroll wraps proper shading and give the scroll an accuracy gate of
   its own, so it is as hard to draw wrongly as the reciprocating one is.
