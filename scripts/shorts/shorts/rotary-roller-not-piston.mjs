/**
 * SHORT: "This compressor uses a roller instead of a piston"
 *
 * Third in the compressor series. End view, looking down the shaft.
 *
 * ==================== CUT TO THE VOICE ====================
 *   node scripts/shorts/beats.mjs --audio <take>.wav --shots 5 --min-gap 0.5
 *
 * The take gave exactly four pauses for five shots, so no --pick was needed.
 *
 * ==================== THE HARD PART ====================
 * Both chambers change size at the same moment, and a frame that shows only one
 * of them teaches the mechanism wrong. So both are drawn every frame, and the
 * colour carries the difference: the growing side stays cyan because it is open
 * to the suction port, and only the sealed side climbs the temperature ramp.
 */
import { ease, lerp } from "../engine/style.mjs";
import { rotaryState, DISCHARGE_START, GEO } from "../mechanisms/rotary.mjs";
import { drawRotary } from "../engine/rotary-machine.mjs";

const TAU = Math.PI * 2;

export const rotary = {
  id: "rotary",
  state: rotaryState,
  draw: drawRotary,
  gas() {},
};

/* ----------------------------------------------------------------- timing */
/** Measured from the narration take. */
const T = { hook: 5567, naming: 6486, twoSides: 8522, rise: 4211, discharge: 6374 };
const START = {
  hook: 0,
  naming: T.hook,
  twoSides: T.hook + T.naming,
  rise: T.hook + T.naming + T.twoSides,
  discharge: T.hook + T.naming + T.twoSides + T.rise,
};

/**
 * Shaft angles. The rotary cycle is ONE revolution, and the model says the
 * discharge reed lifts at turn 0.409 — read from it rather than guessed, so
 * the shot that says "pressure rises" ends exactly where the valve gives.
 */
const OPEN = DISCHARGE_START / TAU; // ≈ 0.409 of a turn
const A = {
  hookEnd: TAU * 1.2,
  namingEnd: TAU * 2.0, // clean cycle boundary: a fresh charge seals
  twoSidesEnd: TAU * (2 + OPEN * 0.6), // both chambers clearly mid-change
  riseEnd: TAU * (2 + OPEN), // right at the moment the reed lifts
  dischargeEnd: TAU * 2.95,
};

export const spec = {
  id: "alt-hvac-s006-rotary-cycle",
  title: "This compressor uses a roller instead of a piston",
  topic: "Rotary (rolling piston) compression mechanism",
  hookType: "misconception",
  takeaway: "One roller, one vane, two chambers changing size at once — no pistons and no suction valve.",
  takeawayType: "principle",
  mechanism: rotary,
  startTheta: 0,

  shots: [
    /* 1 — HOOK. The roller already rolling, so the claim is visible at once. */
    {
      id: "hook",
      dur: T.hook,
      theta: (k) => lerp(0, A.hookEnd, ease.inOut(k)),
      cam: { fx: 0, fy: 0, z: 0.9 },
      camTo: { fx: 0, fy: 0, z: 0.98 },
      camEase: ease.out,
    },

    /* 2 — NAMING. Eccentric roller and sliding vane, each labelled. */
    {
      id: "naming",
      dur: T.naming,
      theta: (k) => lerp(A.hookEnd, A.namingEnd, ease.inOut(k)),
      cam: { fx: 0, fy: 0, z: 0.98 },
      camTo: { fx: 0, fy: 0, z: 1.08 },
    },

    /* 3 — TWO SIDES AT ONCE. The sentence this whole mechanism turns on. */
    {
      id: "twoSides",
      dur: T.twoSides,
      theta: (k) => lerp(A.namingEnd, A.twoSidesEnd, ease.inOut(k)),
      cam: { fx: 0, fy: 0, z: 1.08 },
      camTo: { fx: 0, fy: 0, z: 1.18 },
    },

    /* 4 — WHAT THAT COSTS. Ends exactly where the reed lifts. */
    {
      id: "rise",
      dur: T.rise,
      theta: (k) => lerp(A.twoSidesEnd, A.riseEnd, ease.inOut(k)),
      cam: { fx: 0, fy: 0, z: 1.18 },
      camTo: { fx: 0, fy: 0, z: 1.34 },
      camEase: ease.inOut,
    },

    /* 5 — DISCHARGE, then pull back. */
    {
      id: "discharge",
      dur: T.discharge,
      theta: (k) => lerp(A.riseEnd, A.dischargeEnd, ease.out(k)),
      cam: { fx: 0, fy: 0, z: 1.34 },
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
      lines: [{ text: "A roller." }, { text: "Not a piston.", accent: true }],
      y: 250,
      size: 66,
    },

    /* ---------------------------------------------------------- shot 2 */
    { kind: "eyebrow", at: START.naming + 140, dur: T.naming - 340, text: "ROLLER AND VANE" },
    { kind: "caption", at: START.naming + 200, dur: 5900, text: "An eccentric roller and a sliding vane" },
    {
      kind: "callout", at: START.naming + 900, dur: 5200, x: 64, y: 1160,
      title: "ECCENTRIC ROLLER", sub: "rolls around the bore", tone: "cool", anchor: [0, 150],
    },
    {
      kind: "callout", at: START.naming + 2600, dur: 3500, align: "right", x: 1016, y: 470,
      title: "SLIDING VANE", sub: "always touching the roller", tone: "cool", anchor: [0, -(GEO.R + 30)],
    },

    /* ---------------------------------------------------------- shot 3 */
    { kind: "eyebrow", at: START.twoSides + 140, dur: T.twoSides - 340, text: "TWO CHAMBERS AT ONCE" },
    { kind: "caption", at: START.twoSides + 200, dur: 4200, text: "One side is filling with low-pressure vapor" },
    { kind: "caption", at: START.twoSides + 4700, dur: 3600, text: "the other is being squeezed smaller" },
    { kind: "gauges", at: START.twoSides + 500, dur: T.twoSides + T.rise + T.discharge - 1200, fadeOut: 500 },
    { kind: "chip", at: START.twoSides + 1200, dur: 6900, x: 64, y: 330, text: "EXPANDING · SUCTION", tone: "cool" },
    { kind: "chip", at: START.twoSides + 2400, dur: 5700, x: 64, y: 396, text: "SHRINKING · COMPRESSION", tone: "hot" },

    /* ---------------------------------------------------------- shot 4 */
    { kind: "eyebrow", at: START.rise + 100, dur: T.rise - 260, text: "PRESSURE AND TEMPERATURE RISE", tone: "hot" },
    { kind: "caption", at: START.rise + 150, dur: 3800, text: "As that volume drops, pressure and temperature climb" },
    { kind: "chip", at: START.rise + 600, dur: 3400, align: "right", x: 1024, y: 1000, text: "VOLUME  ↓", tone: "cool" },
    { kind: "chip", at: START.rise + 1400, dur: 2600, align: "right", x: 1024, y: 1072, text: "PRESSURE  ↑", tone: "hot" },
    { kind: "chip", at: START.rise + 2100, dur: 1900, align: "right", x: 1024, y: 1144, text: "TEMPERATURE  ↑", tone: "hot" },

    /* ---------------------------------------------------------- shot 5 */
    { kind: "eyebrow", at: START.discharge + 140, dur: T.discharge - 340, text: "DISCHARGE PORT", tone: "hot" },
    { kind: "caption", at: START.discharge + 200, dur: 3600, text: "The reed lifts and hot vapor is forced out" },
    {
      kind: "callout", at: START.discharge + 900, dur: 3200, x: 64, y: 470,
      title: "TO CONDENSER", tone: "hot", anchor: [-120, -(GEO.R + 40)],
    },
    {
      kind: "hook",
      at: START.discharge + 4200,
      dur: T.discharge - 4400,
      reveal: 600,
      lines: [{ text: "No piston. No suction valve." }, { text: "Just a roller and a vane.", accent: true }],
      y: 258,
      size: 46,
    },
  ],

  /** Narration, as recorded. Written by the operator. */
  narration: [
    { at: 260, text: "This compressor uses a roller instead of a piston.", visual: "roller already rolling around the bore" },
    { at: START.naming + 200, text: "This is a rotary compressor. Inside the cylinder, an eccentric roller and sliding vane create chambers that constantly change size.", visual: "roller and vane labelled; the eccentricity marker shows the offset" },
    { at: START.twoSides + 200, text: "Low-pressure refrigerant vapor enters the expanding side, while vapor trapped on the other side is squeezed into a smaller volume.", visual: "both chambers drawn at once — cyan growing, warming shrinking" },
    { at: START.rise + 150, text: "As that volume decreases, pressure and temperature rise.", visual: "gauges sweep; shrinking chamber runs violet toward orange" },
    { at: START.discharge + 200, text: "The hot, high-pressure vapor then exits through the discharge port and moves toward the condenser.", visual: "reed lifts at the discharge port, then pull back" },
  ],

  generationNotes: [
    "Third Short under ALT-HVAC-CUTAWAY-V1; second swapped mechanism plug.",
    "Chamber areas are numerically integrated from the real rolling-piston geometry rather than approximated as a fraction of a turn; the two chamber fractions sum to 1.000, which is how the integration checks itself.",
    "The shot that says 'pressure rises' ends exactly at the crank angle where the model says the discharge reed lifts (turn 0.409), rather than at a guessed angle.",
    "The vane tip position is read from the model, so it can never float off the roller or dig into it.",
    "No suction valve is drawn or labelled, because a rolling-piston rotary does not have one.",
  ],
};
