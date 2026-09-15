/**
 * SHORT: "This is how a screw compressor raises refrigerant pressure"
 *
 * Fourth in the compressor series, and the only one whose gas travels the
 * LENGTH of the machine. Side view, suction end on the left, discharge on the
 * right, and the camera tracks left to right with the flow rather than holding.
 *
 * ==================== CUT TO THE VOICE ====================
 *   node scripts/shorts/beats.mjs --audio <take>.wav \
 *     --shots 5 --min-gap 0.5 --pick 1,3,4,5
 *
 * The take offered five pauses for four cuts; gap 2 falls after the five-word
 * "This is a screw compressor." and would have made a 2.2s shot, so the naming
 * sentences share one.
 */
import { ease, lerp } from "../engine/style.mjs";
import { screwState, GEO } from "../mechanisms/screw.mjs";
import { drawScrew, L } from "../engine/screw-machine.mjs";

const TAU = Math.PI * 2;

export const screw = {
  id: "screw",
  state: screwState,
  draw: drawScrew,
  gas() {},
};

/* ----------------------------------------------------------------- timing */
/** Measured from the narration take. */
const T = { hook: 4687, naming: 7451, trap: 5406, travel: 6203, rise: 6603 };
const START = {
  hook: 0,
  naming: T.hook,
  trap: T.hook + T.naming,
  travel: T.hook + T.naming + T.trap,
  rise: T.hook + T.naming + T.trap + T.travel,
};

/**
 * Shaft angles. One revolution walks the tracked pocket from the suction end to
 * the end of the rotor, so the shots that show the instruments sit inside a
 * single un-wrapped revolution — the same discipline the scroll needed.
 */
const A = {
  hookEnd: TAU * 1.35,
  namingEnd: TAU * 2.0, // clean boundary: the tracked pocket reseals at the inlet
  trapEnd: TAU * 2.22,
  travelEnd: TAU * 2.62,
  riseEnd: TAU * 2.97, // past the port at 0.755, well into discharge
};

/** Where the camera sits to follow a pocket at a given axial fraction. */
const followX = (axial) => lerp(L.x0, L.x1, axial) * 0.55;

export const spec = {
  id: "alt-hvac-s007-screw-cycle",
  title: "How a screw compressor raises refrigerant pressure",
  topic: "Twin-screw compression mechanism",
  hookType: "claim",
  takeaway: "The pocket shrinks as it travels the length of the rotors — the port position sets the pressure, not a valve.",
  takeawayType: "principle",
  mechanism: screw,
  startTheta: 0,

  shots: [
    /* 1 — HOOK. Whole machine, rotors turning, pockets already in flight. */
    {
      id: "hook",
      dur: T.hook,
      theta: (k) => lerp(0, A.hookEnd, ease.inOut(k)),
      cam: { fx: 0, fy: 20, z: 0.92 },
      camTo: { fx: 0, fy: 20, z: 0.98 },
      camEase: ease.out,
    },

    /* 2 — NAMING. Male and female rotors labelled. */
    {
      id: "naming",
      dur: T.naming,
      theta: (k) => lerp(A.hookEnd, A.namingEnd, ease.inOut(k)),
      cam: { fx: 0, fy: 20, z: 0.98 },
      camTo: { fx: -60, fy: 10, z: 1.04 },
    },

    /* 3 — TRAPPING at the suction end. Camera sits on the left. */
    {
      id: "trap",
      dur: T.trap,
      theta: (k) => lerp(A.namingEnd, A.trapEnd, ease.inOut(k)),
      cam: { fx: followX(0.0), fy: 10, z: 1.1 },
      camTo: { fx: followX(0.22), fy: 10, z: 1.16 },
    },

    /* 4 — TRAVEL. The camera tracks with the pocket, which is the only shot in
       the whole series that moves sideways rather than pushing in. */
    {
      id: "travel",
      dur: T.travel,
      theta: (k) => lerp(A.trapEnd, A.travelEnd, ease.inOut(k)),
      cam: { fx: followX(0.22), fy: 10, z: 1.16 },
      camTo: { fx: followX(0.62), fy: 10, z: 1.16 },
      camEase: ease.inOut,
    },

    /* 5 — PRESSURE, THEN THE PORT. Track to the discharge end and pull back. */
    {
      id: "rise",
      dur: T.rise,
      theta: (k) => lerp(A.travelEnd, A.riseEnd, ease.out(k)),
      cam: { fx: followX(0.62), fy: 10, z: 1.16 },
      camTo: { fx: 0, fy: 20, z: 0.94 },
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
      lines: [{ text: "How a screw compressor" }, { text: "raises pressure", accent: true }],
      y: 250,
      size: 58,
    },

    /* ---------------------------------------------------------- shot 2 */
    { kind: "eyebrow", at: START.naming + 140, dur: T.naming - 340, text: "TWO HELICAL ROTORS" },
    { kind: "caption", at: START.naming + 200, dur: 6800, text: "Two intermeshing helical rotors" },
    {
      kind: "callout", at: START.naming + 1400, dur: 5600, x: 64, y: 520,
      title: "MALE ROTOR", sub: "4 lobes", tone: "cool", anchor: [-200, L.maleY],
    },
    {
      kind: "callout", at: START.naming + 3200, dur: 3800, align: "right", x: 1016, y: 1240,
      title: "FEMALE ROTOR", sub: "6 flutes", tone: "cool", anchor: [200, L.femaleY],
    },

    /* ---------------------------------------------------------- shot 3 */
    { kind: "eyebrow", at: START.trap + 140, dur: T.trap - 340, text: "SUCTION END" },
    { kind: "caption", at: START.trap + 200, dur: 4900, text: "Vapor is trapped between the lobes and the housing" },
    { kind: "gauges", at: START.trap + 500, dur: T.trap + T.travel + T.rise - 1200, fadeOut: 500 },

    /* ---------------------------------------------------------- shot 4 */
    { kind: "eyebrow", at: START.travel + 140, dur: T.travel - 340, text: "IT TRAVELS THE LENGTH" },
    { kind: "caption", at: START.travel + 200, dur: 3000, text: "The pocket moves down the rotors" },
    { kind: "caption", at: START.travel + 3400, dur: 2600, text: "and its volume gets smaller" },
    { kind: "chip", at: START.travel + 1600, dur: 4400, align: "right", x: 1024, y: 1000, text: "VOLUME  ↓", tone: "cool" },

    /* ---------------------------------------------------------- shot 5 */
    { kind: "eyebrow", at: START.rise + 140, dur: T.rise - 340, text: "DISCHARGE PORT", tone: "hot" },
    { kind: "caption", at: START.rise + 200, dur: 3400, text: "Pressure and temperature climb" },
    { kind: "caption", at: START.rise + 3800, dur: 2600, text: "then the pocket reaches the port" },
    { kind: "chip", at: START.rise + 600, dur: 3000, align: "right", x: 1024, y: 1072, text: "PRESSURE  ↑", tone: "hot" },
    { kind: "chip", at: START.rise + 1300, dur: 2300, align: "right", x: 1024, y: 1144, text: "TEMPERATURE  ↑", tone: "hot" },
    {
      kind: "hook",
      at: START.rise + 4400,
      dur: T.rise - 4600,
      reveal: 600,
      lines: [{ text: "No valves." }, { text: "The port sets the pressure.", accent: true }],
      y: 258,
      size: 50,
    },
  ],

  /** Narration, as recorded. Written by the operator. */
  narration: [
    { at: 260, text: "This is how a screw compressor raises refrigerant pressure.", visual: "whole machine, rotors turning, four pockets in flight" },
    { at: START.naming + 200, text: "This is a screw compressor. It uses two intermeshing helical rotors to compress refrigerant vapor.", visual: "male and female rotors labelled with their lobe counts" },
    { at: START.trap + 200, text: "Low-pressure vapor enters at the suction end and becomes trapped between the rotor lobes and the housing.", visual: "camera at the left end; a cool pocket seals" },
    { at: START.travel + 200, text: "As the rotors turn, that trapped vapor moves down the length of the compressor while its volume gets smaller.", visual: "camera tracks right with the pocket as it narrows" },
    { at: START.rise + 200, text: "That raises the refrigerant's pressure and temperature before it exits through the discharge port toward the condenser.", visual: "gauges sweep to 250/85; the pocket crosses the fixed port line" },
  ],

  generationNotes: [
    "Fourth Short under ALT-HVAC-CUTAWAY-V1; third swapped mechanism plug.",
    "Side view and a tracking camera, because a screw is the only compressor in the series whose gas travels the length of the machine rather than around it.",
    "Helical rotors are drawn with a near/far depth test on each crest: far crests behind the gas, near crests in front, so the gas sits between the lobes rather than on top of them.",
    "Built-in volume ratio is MATCHED to the series operating point (Vi = 2.976) so the pocket arrives at the port at exactly 250 psig. A real screw's Vi is fixed and may over- or under-compress; the first pass over-compressed to 315 psig and contradicted every other Short's gauges.",
    "No valves are drawn, because a screw has none — the discharge port position is what ends compression, and it is drawn as a fixed dashed line.",
    "Four pockets are on screen at four different stages of compression at once, which is what a running screw actually looks like.",
  ],
};

export { GEO };
