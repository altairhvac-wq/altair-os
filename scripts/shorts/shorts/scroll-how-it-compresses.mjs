/**
 * SHORT: "Here's how a scroll compressor actually squeezes refrigerant"
 *
 * Second in the compressor series, and the first with a swapped mechanism plug:
 * different geometry, different state model, plan view instead of section. The
 * palette, typography, instruments, chips, captions and mark are unchanged,
 * which is where the family resemblance comes from.
 *
 * ==================== CUT TO THE VOICE ====================
 * Shot lengths measured from the recorded take. Reproduce with:
 *
 *   node scripts/shorts/beats.mjs --audio <take>.wav \
 *     --shots 5 --min-gap 0.5 --pick 1,4,5,6
 *
 * "This is a scroll compressor." is five words, so it shares a shot with the
 * sentence that names the parts rather than becoming a one-second cut.
 */
import { ease, lerp } from "../engine/style.mjs";
import { scrollState, GEO } from "../mechanisms/scroll.mjs";
import { drawScroll } from "../engine/scroll-machine.mjs";

const TAU = Math.PI * 2;

/** The mechanism plug. Gas is drawn inside drawScroll so wraps can occlude it. */
export const scroll = {
  id: "scroll",
  state: scrollState,
  draw: drawScroll,
  gas() {},
};

/* ----------------------------------------------------------------- timing */
/** Measured from the narration take. See the header. */
const T = { hook: 4763, naming: 10506, trap: 5876, inward: 9450, discharge: 8415 };
const START = {
  hook: 0,
  naming: T.hook,
  trap: T.hook + T.naming,
  inward: T.hook + T.naming + T.trap,
  discharge: T.hook + T.naming + T.trap + T.inward,
};

/**
 * Shaft angles, aligned to the tracked pocket's journey.
 *
 * The instruments follow one pocket from sealing to the discharge port, which
 * takes exactly two revolutions — the model wraps the journey at 2*TAU. So the
 * shots that SHOW the gauges must sit inside a single un-wrapped journey, or
 * the needles reset from high to low mid-shot while the caption says the
 * pressure is rising. That is exactly what the first cut did.
 *
 * Everything from `trap` onward therefore starts at a clean multiple of 2*TAU
 * and runs monotonically to just short of the next one.
 */
const A = {
  hookEnd: TAU * 0.6,
  namingEnd: TAU * 2.0, // journey resets here: a fresh pocket seals
  trapEnd: TAU * 2.35, // journey 0.35 rev — low pressure
  inwardEnd: TAU * 3.5, // journey 1.50 rev — pressure at the ceiling
  dischargeEnd: TAU * 3.95, // journey 1.95 rev — at the port
};

export const spec = {
  id: "alt-hvac-s005-scroll-cycle",
  title: "How a scroll compressor actually squeezes refrigerant",
  topic: "Scroll compression mechanism",
  hookType: "demonstration",
  takeaway: "No valves and no strokes — a pocket that shrinks the whole way to the centre.",
  takeawayType: "principle",
  mechanism: scroll,
  startTheta: 0,

  shots: [
    /* 1 — HOOK. Whole scroll, running, from directly above. */
    {
      id: "hook",
      dur: T.hook,
      theta: (k) => lerp(0, A.hookEnd, ease.inOut(k)),
      cam: { fx: 0, fy: 0, z: 0.9 },
      camTo: { fx: 0, fy: 0, z: 0.98 },
      camEase: ease.out,
    },

    /* 2 — NAMING. Both scrolls labelled; the drive pin traces its circle so
       "one fixed and one orbiting" is visible rather than asserted. */
    {
      id: "naming",
      dur: T.naming,
      theta: (k) => lerp(A.hookEnd, A.namingEnd, ease.inOut(k)),
      cam: { fx: 0, fy: 0, z: 0.98 },
      camTo: { fx: 0, fy: 0, z: 1.08 },
    },

    /* 3 — TRAPPING. Cool vapour around the outside, sealing into crescents. */
    {
      id: "trap",
      dur: T.trap,
      theta: (k) => lerp(A.namingEnd, A.trapEnd, ease.inOut(k)),
      cam: { fx: 0, fy: 0, z: 1.08 },
      camTo: { fx: 0, fy: 0, z: 1.16 },
    },

    /* 4 — INWARD AND SHRINKING. The whole argument of the Short. The camera
       pushes as the pockets migrate, so the squeeze is felt twice. */
    {
      id: "inward",
      dur: T.inward,
      theta: (k) => lerp(A.trapEnd, A.inwardEnd, ease.inOut(k)),
      cam: { fx: 0, fy: 0, z: 1.16 },
      camTo: { fx: 0, fy: 0, z: 1.42 },
      camEase: ease.inOut,
    },

    /* 5 — DISCHARGE. Centre port, hot vapour out; then pull back. */
    {
      id: "discharge",
      dur: T.discharge,
      theta: (k) => lerp(A.inwardEnd, A.dischargeEnd, ease.out(k)),
      cam: { fx: 0, fy: 0, z: 1.42 },
      camTo: { fx: 0, fy: 0, z: 0.94 },
      camEase: ease.inOut,
    },
  ],

  overlays: [
    /* ---------------------------------------------------------- shot 1 */
    {
      kind: "hook",
      at: 120,
      dur: T.hook - 320,
      reveal: 700,
      lines: [{ text: "How a scroll compressor" }, { text: "actually squeezes refrigerant", accent: true }],
      y: 250,
      size: 54,
    },

    /* ---------------------------------------------------------- shot 2 */
    { kind: "eyebrow", at: START.naming + 140, dur: T.naming - 340, text: "TWO INTERLEAVED SCROLLS" },
    { kind: "caption", at: START.naming + 200, dur: 4200, text: "Two spiral scrolls, interleaved" },
    { kind: "caption", at: START.naming + 4900, dur: 5300, text: "One fixed — one orbiting" },
    // The moving scroll is the lighter one with the longer shadow; say so.
    { kind: "chip", at: START.naming + 5200, dur: 4900, x: 64, y: 330, text: "ORBITING SCROLL", tone: "cool" },
    { kind: "chip", at: START.naming + 5900, dur: 4200, x: 64, y: 396, text: "FIXED SCROLL", tone: "off" },

    /* ---------------------------------------------------------- shot 3 */
    { kind: "eyebrow", at: START.trap + 120, dur: T.trap - 300, text: "VAPOR ENTERS THE OUTSIDE" },
    { kind: "caption", at: START.trap + 180, dur: 5300, text: "Low-pressure vapor is trapped in crescent pockets" },
    { kind: "gauges", at: START.trap + 400, dur: T.trap + T.inward + T.discharge - 900, fadeOut: 500 },

    /* ---------------------------------------------------------- shot 4 */
    { kind: "eyebrow", at: START.inward + 140, dur: T.inward - 340, text: "POCKETS TRAVEL INWARD" },
    { kind: "caption", at: START.inward + 200, dur: 4300, text: "Each pocket is carried one turn inward" },
    { kind: "caption", at: START.inward + 4800, dur: 4400, text: "and gets progressively smaller" },
    { kind: "chip", at: START.inward + 2200, dur: 6900, align: "right", x: 1024, y: 1000, text: "VOLUME  ↓", tone: "cool" },
    { kind: "chip", at: START.inward + 4600, dur: 4500, align: "right", x: 1024, y: 1072, text: "PRESSURE  ↑", tone: "hot" },
    { kind: "chip", at: START.inward + 6000, dur: 3100, align: "right", x: 1024, y: 1144, text: "TEMPERATURE  ↑", tone: "hot" },

    /* ---------------------------------------------------------- shot 5 */
    { kind: "eyebrow", at: START.discharge + 140, dur: T.discharge - 340, text: "DISCHARGE PORT", tone: "hot" },
    { kind: "caption", at: START.discharge + 200, dur: 4200, text: "At the center, hot vapor exits" },
    {
      kind: "callout", at: START.discharge + 1000, dur: 3600, x: 64, y: 1044,
      title: "DISCHARGE PORT", sub: "to the condenser", tone: "hot", anchor: [0, 0],
    },
    {
      kind: "hook",
      at: START.discharge + 4700,
      dur: T.discharge - 4900,
      reveal: 600,
      lines: [{ text: "No valves. No strokes." }, { text: "Compression is continuous.", accent: true }],
      y: 258,
      size: 50,
    },
  ],

  /** Narration, as recorded. Written by the operator. */
  narration: [
    { at: 260, text: "Here's how a scroll compressor actually squeezes refrigerant.", visual: "whole scroll running, seen from above" },
    { at: START.naming + 200, text: "This is a scroll compressor. It uses two interleaved spiral scrolls — one fixed and one orbiting — to compress refrigerant vapor.", visual: "both wraps labelled; the drive pin traces its orbit circle" },
    { at: START.trap + 180, text: "Low-pressure vapor enters around the outside and gets trapped in crescent-shaped pockets.", visual: "cool crescents seal at the periphery" },
    { at: START.inward + 200, text: "As the orbiting scroll moves, those pockets travel inward and get progressively smaller, which raises the refrigerant's pressure and temperature.", visual: "crescents migrate inward and shrink; gauges sweep, colour runs cyan to orange" },
    { at: START.discharge + 200, text: "At the center, the hot, high-pressure vapor exits through the discharge port and heads toward the condenser.", visual: "centre port glows, then pull back to the whole scroll" },
  ],

  generationNotes: [
    "Second Short under ALT-HVAC-CUTAWAY-V1 and the first with a swapped mechanism plug.",
    "Plan view, not a section: a scroll's story is only legible from above.",
    "Valve chips are deliberately absent — a scroll has none, and the state model reports suctionOpen/dischargeOpen as false so none can light up.",
    "Instruments follow ONE pocket across its full two-revolution journey rather than the innermost pocket, which sits pinned at discharge pressure and would never move a needle.",
    "Pocket rendering rebuilt from dotted chains to filled crescents; the conjugate pocket is placed half a turn around, not radially beside its pair.",
  ],
};

export { GEO };
