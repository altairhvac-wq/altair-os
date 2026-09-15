# Altair HVAC Shorts — technical cutaway animation engine

Deterministic 9:16 technical animation for short-form HVAC explainers. Style
version **ALT-HVAC-CUTAWAY-V1** (see `docs/design/shorts-visual-style.md`).

This engine is deliberately independent of the Altair Studio video editor: the
style had to be provable without waiting on the editor. What it emits
(`scene.json`) is shaped so those scenes can later be represented as editable
clips — the contract lives in `shared/types/shorts.ts`.

## Reproduce the gold-standard Short

```bash
node scripts/shorts/render.mjs --short recip-what-happens --version v2
```

That is the whole workflow. It starts a local static server, drives a real
Chromium canvas frame by frame, writes a mechanical audit alongside the frames,
**refuses to encode if any frame has both valves open**, and hands the PNGs to
ffmpeg (H.264, CRF 17, `+faststart`). Roughly 8 minutes for a 22-second Short.

Then the metadata record:

```bash
node scripts/shorts/metadata.mjs --short recip-what-happens --version v2
```

## Other commands

Representative frames only, no encode — this is how visual review is done:

```bash
node scripts/shorts/render.mjs --short recip-what-happens --version review --frames 20,150,300,480,640
```

Keep the PNG sequence after encoding:

```bash
node scripts/shorts/render.mjs --short recip-what-happens --version v2 --keep-frames
```

Narration. The take is generated outside the repo (Higgsfield MCP `seed_audio`,
cloned voice `jeremiah-2.0`), then fitted and muxed:

```bash
node scripts/shorts/narrate.mjs --short recip-what-happens --version v2 --url <take.wav> --offset 260
node scripts/shorts/render.mjs --short recip-what-happens --version v2
```

`narrate.mjs` refuses to stretch a take more than 1.14×. If it refuses, the
script is too long — cut words, do not speed-read.

Open the engine in a browser to scrub a Short by hand:

```bash
npx http-server scripts/shorts -p 8099
```

then `http://localhost:8099/page.html?short=recip-what-happens` and call
`renderFrame(n)` from the console.

## The Shorts

| File | Short | Mechanism |
| --- | --- | --- |
| `shorts/recip-what-happens.mjs` | What actually happens inside a compressor? | reciprocating |
| `shorts/why-suction-line-cold.mjs` | Why is the suction line cold? | reciprocating |
| `shorts/why-discharge-line-hot.mjs` | Why is the discharge line hot? | reciprocating |
| `shorts/scroll-how-it-compresses.mjs` | How a scroll compressor actually compresses | scroll |

## Layout

```
engine/
  style.mjs       ALT-HVAC-CUTAWAY-V1 tokens; refrigerantColor() is the one
                  colour rule everything else reads from
  draw.mjs        primitives: steel, iron, cut faces, rim light, springs, grain
  background.mjs  three depth layers, vignette, film grain
  machine.mjs     the reciprocating cutaway
  scroll-machine.mjs  the scroll cutaway, plan view
  particles.mjs   refrigerant: procedural, normalised to the chamber
  hud.mjs         gauges, callouts, chips, hook type, captions
  template.mjs    technical_cutaway_short — camera, timing, overlay dispatch
mechanisms/
  reciprocating.mjs  slider-crank + polytropic cycle; valve state is DERIVED
  scroll.mjs         involute wraps, orbiting (not rotating), inward pockets
shorts/           one data file per Short
render.mjs        frames -> audit -> gate -> ffmpeg
metadata.mjs      scene.json + metadata.json, all structure measured
narrate.mjs       fetch, fit and mux a narration take
page.html         the browser harness the renderer drives
```

## Adding a Short

Write one file in `shorts/`. Declare `shots` (duration, `theta(k)`, camera) and
`overlays` (kind, `at`, `dur`). Nothing else. If you find yourself editing
`template.mjs` to make a Short work, that is a signal the template is missing a
capability — add the capability, not a special case.

## Adding a mechanism

Supply `{ id, state(theta), draw(ctx, state), gas(ctx, state, flows, t) }`.

Write its **own** state function. Scroll, rotary, screw and centrifugal do not
compress alike, and none of them may borrow the reciprocating model. The
reciprocating one exists to make one point: derive valve state from pressure,
and it becomes impossible to draw both valves open at once.

A mechanism that shows a **stage of the refrigerant circuit** (rather than a
compressor interior) follows the evaporator pattern instead of inventing its
own: declare the semantic topology in `mechanisms/<name>.mjs` (flow order,
inlet/outlet sides, airflow direction, fault segments, measurement points),
build ONE geometric path from it in `engine/<name>-machine.mjs`, hang tubes,
bends, particles and hardware on that path, and export a
`topologyAttestation()` that measures the built geometry — the module must
throw at import if a check fails, and the plug carries `topology` so
`metadata.mjs` embeds it into `scene.json` for the agent platform's Technical
QA. Add narrative-state audit fields via `state.auditExtra` and gate them in
`render.mjs` (the frost gates are the model). The renderer never guesses which
end of a coil is the inlet; it is told, and it proves it listened.

The mechanism↔visual-domain mapping the agent pipeline plans against lives in
`Altair-agent-platform/src/domain/hvac-system-knowledge.ts` — extend it in the
same change that adds a scene here.

## Output

`ui-audit/shorts/<short>/<version>/`

```
<short>-<version>.mp4   the deliverable
audit.json              per-frame theta, phase, piston, P, T, valve booleans
scene.json              editor-facing scene contract
metadata.json           the learning record (no invented platform numbers)
key-frames/             representative extracted frames
```
