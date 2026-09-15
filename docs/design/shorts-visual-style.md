# ALT-HVAC-CUTAWAY-V1 — visual style specification

The visual language for Altair HVAC educational Shorts. Every Short produced
under this version records `visualStyleVersion: "ALT-HVAC-CUTAWAY-V1"`, so a
later change to the look can be compared against performance objectively rather
than argued about.

Implementation lives in `scripts/shorts/`. The tokens in this document are not
a description of that code — they are read from it
(`scripts/shorts/engine/style.mjs` is the single source of truth).

## Format

| Property | Value |
| --- | --- |
| Aspect | 9:16 |
| Resolution | 1080 × 1920 |
| Frame rate | 30 fps |
| Runtime | 12–30 s, one concept per Short |
| Codec | H.264 high, yuv420p, CRF 17, `+faststart` |

## The frame

A Short is divided into four horizontal zones and nothing crosses them.

| Zone | y | Contents |
| --- | --- | --- |
| Eyebrow | 130–180 | Phase name, letter-spaced small caps |
| Voice band | 190–300 | One caption line, or the hook (two lines max) |
| State rail | 310–450 | Live valve chips |
| Stage | 440–1400 | The machine. The hero. |
| Instruments | 1380–1700 | Gauges, payoff stats |
| Mark | 1740–1800 | `ALTAIR HVAC`, progress hairline |

Safe area is 64 px left/right, 150 px top, 300 px bottom. Nothing that must be
read goes below y = 1700 — that is where the platform puts its own furniture.

## Palette

| Role | Token | Value |
| --- | --- | --- |
| Background top | `C.bgTop` | `#071421` |
| Background bottom | `C.bgBottom` | `#0A1628` |
| Cool refrigerant | `C.cool` | `#2FA8FF` |
| Cool highlight | `C.coolBright` | `#79D2FF` |
| Transition (being worked on) | `C.warm` | `#8E6BE8` |
| Hot refrigerant | `C.hot` | `#FF7A2F` |
| Hot highlight | `C.hotBright` | `#FFC04D` |
| Copper | `C.copper` | `#C07A45` |
| HUD ink | `C.text` | `#EAF3FB` |
| HUD dim | `C.textDim` | `#93AEC6` |

**The one colour rule.** Refrigerant colour is never chosen. It is a function of
temperature — `refrigerantColor(tempC)`, a continuous cyan → violet → orange
ramp anchored at 10 °C and 90 °C. Particles, pipe interiors, chamber light,
gauge fills and needles all read from that single function. That is why frames
from different shots look like the same system.

## Typography

One family (Segoe UI / Inter / system sans), three weights.

| Use | Weight / size |
| --- | --- |
| Hook | 800 / 62–70 px |
| Caption, callout title | 650 / 36–40 px |
| Chip, eyebrow | 700 / 26–27 px |
| Readout numerals | 700 mono / 38–76 px |
| Sub-label | 450 / 27 px |

## The machine

Not an illustration and not a photograph: a sectioned engineering render.

- **Section convention.** The near half of the casting is removed. Every *inner*
  contour is a cut face and carries the warm sliced-metal band
  (`#8A3A1E → #2A0F08`, ~10 px, one thin `rgba(255,186,138,0.2)` machined edge).
  The outer silhouette is untouched material and never carries it. Reversing
  this is what makes a cutaway read as a red-outlined diagram.
- **Interior depth is mandatory.** The far half of every bore, pocket and case
  is drawn: a concave left-to-right shade, an elliptical lip at the opening, and
  faint honing marks. Without it the machine is a flat slot between two walls.
- **Rim light.** Cool `rgba(120,196,255,0.45)` on silhouettes, warm
  `rgba(255,168,110,0.2)` beneath it. This is the cheapest single thing that
  stops a dark machine reading as a dark blob.
- **Materials.** Cast iron is a five-stop horizontal gradient, not a flat fill.
  Steel gets a bright specular band, a terminator and a bounce highlight.
  Everything cast carries a deterministic speckle grain.
- **Scale cues.** Bolt heads, head-gasket parting line, compression rings,
  cooling-fin slots, sump oil. They are small; they are what makes it a machine.

## Refrigerant

Particles are procedural: position is a pure function of index, flow phase and
the chamber rectangle. Nothing is integrated frame to frame, so frame *N*
renders identically however it is reached.

- Chamber particles live in **normalised chamber space**. When the piston rises,
  the rectangle shrinks and the same particles are carried into a smaller
  space — the packing is a consequence of the geometry, not a separate
  animation. This is the single most important behaviour in the system.
- Particle count tracks cylinder **mass**: it grows through suction, holds
  through compression, and falls through discharge.
- Agitation rises as volume falls.
- Flow phases integrate only while their valve is open, so a stream stalls when
  its valve shuts instead of drifting on.

## Instruments

Round gauges with a cool→hot track, a needle with a real pivot and
counterweight tail, a digital readout plate and a one-word state
(`LOW / RISING / HIGH`, `COLD / RISING / HOT`).

They read straight off the cycle model. They cannot disagree with the picture.

No full-width scrim band behind them — a hard horizontal edge across the frame
reads as a broadcast lower-third and flattens everything above it. Each
instrument lights its own ground with a radial pool instead.

## Camera

Slow, motivated, one move per shot: push, pull, drift or track. Cuts are
softened with a 380 ms camera blend, never a wipe or a spin. The camera pushes
in as cylinder volume falls, so the squeeze is felt twice.

Overlays are drawn in **screen space** and never ride the camera.

## Text discipline

This is a video, not an infographic. The still references carry far more
explanatory text than a finished Short may.

- One caption line at a time.
- Sequenced reveals — `VOLUME ↓`, then `PRESSURE ↑`, then `TEMPERATURE ↑`.
- Caption density is measured automatically into `metadata.json` as the
  **average number of words visible at any instant**. The four Shorts of this
  style version land between 12 and 16. Treat 18 as the ceiling: past that the
  frame is competing with itself.
- Valve chips are **bound to live state**: the label is generated from the same
  boolean that lifts the valve, so a label can never contradict the mechanism
  it points at.
- The voice band holds ONE text at a time across kinds, not just captions: on
  a payoff shot, captions end before the payoff hook arrives (the generator
  sequences them at 48%/52% of the shot, and Render QA refuses any
  hook/caption time overlap). Two stacked texts shipped once and read as
  neither.

## Mechanical authority

The style never overrides the machine. For the reciprocating cycle the rule is
absolute and enforced in code: the render refuses to encode if any frame has
both valves open (`render.mjs` exits with status 2 and names the frame).

Future mechanisms get their **own** state model — scroll, rotary, screw and
centrifugal do not compress alike, and none of them may borrow the
reciprocating one.

## The second visual domain: evaporator_process

The compressor scenes derive everything from one crank angle. The evaporator
scene (`engine/evaporator-machine.mjs`) derives everything from one **flow
path**, built from the semantic topology declared in
`mechanisms/evaporator.mjs`: liquid line → TXV → coil passes (return bends
*generated* between consecutive passes, never placed) → outlet coupling →
suction line → compressor inlet. Tubes, particles, frost and the superheat
clamp all ride that same parametrized path, so the drawn plumbing and the flow
cannot disagree — the heat-exchanger equivalent of the one-crank-angle rule.

- The scene attests its measured geometry into `scene.json` (`topology`
  block) and refuses to load if any check fails; agent-side Technical QA
  re-verifies it.
- Narrative-state gates mirror the valve gate: no frost during the pre-frost
  window, monotonic growth while freezing (`render.mjs`, exit 2).
- Frost carries its own icy whites, never refrigerant colour; it grows along
  the line from the outlet toward the compressor.
- Air chevrons cross the fins in the declared direction (up); sparse and slow
  IS the low-airflow fault, not a rendering economy.
- The TXV is a closed body — metering-device internals belong to a future
  `metering_device_process` scene, not to this one.
