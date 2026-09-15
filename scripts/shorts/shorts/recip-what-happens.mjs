/**
 * SHORT: "How a reciprocating compressor actually works"
 *
 * The gold standard for ALT-HVAC-CUTAWAY-V1.
 *
 * ==================== CUT TO THE VOICE ====================
 * Every shot length in this file was measured, not chosen. The narration was
 * recorded first; `scripts/shorts/beats.mjs` found the real pauses in the take
 * and reported where the sentence boundaries fall; those boundaries are the
 * cuts. One sentence, one shot. Reproduce with:
 *
 *   node scripts/shorts/beats.mjs --audio <take>.wav \
 *     --shots 6 --min-gap 0.5 --pick 2,6,9,10,13
 *
 * Lengthening a shot does NOT move a valve. Each shot maps normalised progress
 * to a fixed crank-angle RANGE, so a longer shot plays the same mechanical
 * events more slowly. That is what makes cutting to the voice safe.
 */
import { ease, lerp } from "../engine/style.mjs";
import { cylinderState, CUE } from "../mechanisms/reciprocating.mjs";
import { drawMachine, M, crownY } from "../engine/machine.mjs";
import { drawChamberGas, drawSuctionStream, drawDischargeStream } from "../engine/particles.mjs";

const TAU = Math.PI * 2;

/** The mechanism plug. Scroll/rotary/screw/centrifugal will each supply one. */
export const reciprocating = {
  id: "reciprocating",
  state: cylinderState,
  draw: drawMachine,
  gas(ctx, st, flows, t) {
    drawSuctionStream(ctx, st, flows.suction, t);
    drawChamberGas(ctx, st, t);
    drawDischargeStream(ctx, st, flows.discharge, t);
  },
};

/* ----------------------------------------------------------------- timing */
/** Measured from the narration take. See the header. */
const T = {
  hook: 10451,
  suction: 13119,
  compression: 10262,
  heat: 5099,
  discharge: 10956,
  payoff: 7824,
};
const START = {
  hook: 0,
  suction: T.hook,
  compression: T.hook + T.suction,
  heat: T.hook + T.suction + T.compression,
  discharge: T.hook + T.suction + T.compression + T.heat,
  payoff: T.hook + T.suction + T.compression + T.heat + T.discharge,
};

/** Angles that frame each stroke. Read off the cycle model, not guessed. */
const A = {
  // Start where the suction valve is about to lift. The short lead-in where it
  // is still shut is deliberate, and the narration now explains it: cylinder
  // pressure has to fall BELOW suction pressure before the valve can open.
  suctionIn: 0.5,
  bdc: Math.PI * 0.995,
  compressStart: Math.PI * 1.015,
  compressMid: 4.56,
  compressEnd: CUE.dischargeStart - 0.07,
  dischargeEnd: TAU - 0.09,
};

export const spec = {
  id: "alt-hvac-s001-recip-cycle",
  title: "How a reciprocating compressor actually works",
  topic: "Reciprocating compression cycle",
  hookType: "demonstration",
  takeaway:
    "Same refrigerant in and out — the compressor adds mechanical work, and that work is the pressure and the heat.",
  takeawayType: "principle",
  mechanism: reciprocating,
  startTheta: 0,

  shots: [
    /* 1 — NAME THE MACHINE. The hook says what this is and what the three
       parts are, and each part is labelled as the voice names it. */
    {
      id: "hook",
      dur: T.hook,
      theta: (k) =>
        lerp(CUE.dischargeStart - 0.5, CUE.dischargeStart - 0.5 + TAU * 2.2, ease.inOut(k)),
      cam: { fx: 26, fy: 132, z: 1.18 },
      camTo: { fx: 20, fy: 112, z: 1.28 },
      camEase: ease.out,
    },

    /* 2 — SUCTION. Pressure falls below suction pressure, the valve lifts,
       blue floods in. */
    {
      id: "suction",
      dur: T.suction,
      theta: (k) => lerp(A.suctionIn, A.bdc, ease.inOut(k)),
      cam: { fx: -48, fy: 40, z: 1.2 },
      camTo: { fx: -30, fy: 110, z: 1.16 },
    },

    /* 3 — COMPRESSION. Both valves shut, the trapped vapour loses volume. */
    {
      id: "compression",
      dur: T.compression,
      theta: (k) => lerp(A.compressStart, A.compressMid, ease.inOut(k)),
      cam: { fx: 0, fy: 104, z: 1.18 },
      camTo: { fx: 0, fy: 40, z: 1.3 },
      camEase: ease.inOut,
    },

    /* 4 — WHAT THAT COSTS. Its own shot because it is its own sentence: the
       consequence of the squeeze, not the squeeze. */
    {
      id: "heat",
      dur: T.heat,
      theta: (k) => lerp(A.compressMid, A.compressEnd, ease.inOut(k)),
      cam: { fx: 0, fy: 34, z: 1.3 },
      camTo: { fx: 0, fy: 18, z: 1.4 },
      camEase: ease.inOut,
    },

    /* 5 — DISCHARGE. Cylinder pressure wins, the valve lifts, orange leaves. */
    {
      id: "discharge",
      dur: T.discharge,
      theta: (k) => lerp(A.compressEnd, A.dischargeEnd, ease.out(k)),
      cam: { fx: 92, fy: -10, z: 1.24 },
      camTo: { fx: 216, fy: -96, z: 1.06 },
      camEase: ease.inOut,
    },

    /* 6 — PAYOFF. Pull back, run a full cycle, state what the work bought. */
    {
      id: "payoff",
      dur: T.payoff,
      theta: (k) => A.dischargeEnd + ease.inOut(k) * TAU * 1.5,
      cam: { fx: 46, fy: 104, z: 1.3 },
      camTo: { fx: 52, fy: 118, z: 1.18 },
      camEase: ease.out,
    },
  ],

  overlays: [
    /* ---------------------------------------------------------- shot 1 */
    {
      kind: "hook",
      at: 120,
      dur: 4000,
      reveal: 700,
      // NAME THE MACHINE. "What actually happens inside a compressor?" assumed
      // the viewer already knew what they were looking at. A scrolling viewer
      // does not, and a hook that withholds its subject reads as a riddle.
      lines: [{ text: "How a reciprocating" }, { text: "compressor actually works", accent: true }],
      y: 250,
      size: 60,
    },
    { kind: "arrow", at: 500, dur: 3400, from: [-560, -188], to: [-330, -188], tone: "cool" },
    { kind: "arrow", at: 500, dur: 3400, from: [664, -330], to: [664, -520], tone: "hot" },

    // The three parts, labelled as the narration names them.
    {
      kind: "callout",
      at: 4300,
      dur: 5600,
      x: 64,
      y: 1108,
      title: "PISTON",
      tone: "cool",
      anchor: [0, 232],
    },
    {
      kind: "callout",
      at: 5700,
      dur: 4200,
      x: 64,
      y: 548,
      title: "SUCTION VALVE",
      tone: "cool",
      anchor: [-M.valveX, 8],
    },
    {
      kind: "callout",
      at: 7500,
      dur: 2500,
      align: "right",
      x: 1016,
      y: 548,
      title: "DISCHARGE VALVE",
      tone: "hot",
      anchor: [M.valveX, -22],
    },

    /* ---------------------------------------------------------- shot 2 */
    { kind: "eyebrow", at: START.suction + 420, dur: T.suction - 620, text: "SUCTION STROKE" },
    {
      kind: "caption",
      at: START.suction + 300,
      dur: 5400,
      text: "Cylinder pressure drops below suction pressure",
    },
    {
      kind: "caption",
      at: START.suction + 6000,
      dur: 6500,
      text: "Low-pressure vapor is drawn into the cylinder",
    },
    // The live chips run from here to the end of discharge: one state rail.
    {
      kind: "chip",
      at: START.suction + 700,
      dur: START.payoff - START.suction - 900,
      live: "suction",
      x: 64,
      y: 330,
    },
    {
      kind: "chip",
      at: START.suction + 900,
      dur: START.payoff - START.suction - 1100,
      live: "discharge",
      x: 64,
      y: 396,
    },
    {
      kind: "gauges",
      at: START.suction + 400,
      dur: START.payoff - START.suction - 400,
      fadeOut: 500,
    },
    {
      kind: "callout",
      at: START.suction + 2200,
      dur: 4400,
      x: 64,
      y: 1044,
      title: "PISTON DOWN",
      sub: "volume increasing",
      tone: "cool",
      anchor: [0, 240],
    },

    /* ---------------------------------------------------------- shot 3 */
    {
      kind: "eyebrow",
      at: START.compression + 140,
      dur: T.compression - 340,
      text: "COMPRESSION STROKE",
    },
    { kind: "caption", at: START.compression + 200, dur: 4400, text: "Both valves close" },
    {
      kind: "caption",
      at: START.compression + 5000,
      dur: 5000,
      text: "The trapped vapor is squeezed into a smaller volume",
    },
    {
      kind: "chip",
      at: START.compression + 2200,
      dur: T.compression + T.heat - 2600,
      align: "right",
      x: 1024,
      y: 980,
      text: "VOLUME  ↓",
      tone: "cool",
    },

    /* ---------------------------------------------------------- shot 4 */
    {
      kind: "eyebrow",
      at: START.heat + 100,
      dur: T.heat - 260,
      text: "PRESSURE AND TEMPERATURE RISE",
      tone: "hot",
    },
    {
      kind: "caption",
      at: START.heat + 150,
      dur: 4700,
      text: "That raises the pressure — and the temperature",
    },
    {
      kind: "chip",
      at: START.heat + 700,
      dur: 4100,
      align: "right",
      x: 1024,
      y: 1052,
      text: "PRESSURE  ↑",
      tone: "hot",
    },
    {
      kind: "chip",
      at: START.heat + 1500,
      dur: 3300,
      align: "right",
      x: 1024,
      y: 1124,
      text: "TEMPERATURE  ↑",
      tone: "hot",
    },

    /* ---------------------------------------------------------- shot 5 */
    {
      kind: "eyebrow",
      at: START.discharge + 140,
      dur: T.discharge - 340,
      text: "DISCHARGE STROKE",
      tone: "hot",
    },
    {
      kind: "caption",
      at: START.discharge + 200,
      dur: 5000,
      text: "Cylinder pressure rises above discharge pressure",
    },
    {
      kind: "caption",
      at: START.discharge + 5600,
      dur: 5000,
      text: "Hot, high-pressure vapor is forced out",
    },
    {
      kind: "arrow",
      at: START.discharge + 1200,
      dur: 9000,
      from: [664, -300],
      to: [664, -560],
      tone: "hot",
    },
    {
      kind: "callout",
      at: START.discharge + 5200,
      dur: 5400,
      align: "right",
      x: 1024,
      y: 1010,
      title: "TO CONDENSER",
      sub: "where the heat gets dumped",
      tone: "hot",
    },

    /* ---------------------------------------------------------- shot 6 */
    {
      kind: "hook",
      at: START.payoff + 200,
      dur: T.payoff - 400,
      reveal: 700,
      lines: [{ text: "Same refrigerant." }, { text: "The compressor added the work.", accent: true }],
      y: 262,
      size: 52,
    },
    {
      kind: "stat",
      at: START.payoff + 1400,
      dur: T.payoff - 1600,
      x: 276,
      y: 1342,
      label: "IN  ·  FROM EVAPORATOR",
      value: "60 psig",
      sub: "15 °C  ·  cool, low pressure",
    },
    {
      kind: "stat",
      at: START.payoff + 2200,
      dur: T.payoff - 2400,
      x: 804,
      y: 1342,
      label: "OUT  ·  TO CONDENSER",
      value: "250 psig",
      sub: "85 °C  ·  hot, high pressure",
      tone: "hot",
    },
  ],

  /**
   * Narration, as recorded. One sentence per shot, which is why the shot list
   * has six entries rather than five.
   */
  narration: [
    {
      at: 260,
      text: "This is a reciprocating compressor — it uses a piston, a suction valve, and a discharge valve to compress refrigerant vapor.",
      visual: "running cutaway; piston, suction valve and discharge valve labelled as each is named",
    },
    {
      at: START.suction + 300,
      text: "As the piston moves down, cylinder pressure drops below suction pressure, opening the suction valve and drawing low-pressure, low-temperature refrigerant vapor into the cylinder.",
      visual: "pressure falls, suction valve lifts, blue floods the cylinder",
    },
    {
      at: START.compression + 200,
      text: "As the piston moves back up, both valves close and the trapped vapor is compressed into a smaller volume.",
      visual: "both valves seated, chamber shrinks, particles pack",
    },
    {
      at: START.heat + 150,
      text: "That raises both the pressure and the temperature of the refrigerant.",
      visual: "gauges sweep, particles run blue through violet toward orange",
    },
    {
      at: START.discharge + 200,
      text: "Once cylinder pressure rises above discharge pressure, the discharge valve opens and the hot, high-pressure vapor is forced out toward the condenser.",
      visual: "discharge valve lifts, orange streams up the copper elbow",
    },
    {
      at: START.payoff + 300,
      text: "It's the same refrigerant — the compressor has simply added mechanical work, increasing its pressure and temperature.",
      visual: "wide machine, in/out stat panels",
    },
  ],

  generationNotes: [
    "First Short under ALT-HVAC-CUTAWAY-V1 and the reference implementation of the technical_cutaway_short template.",
    "Valve state, gauge values and particle colour are all derived from one crank angle through a slider-crank plus polytropic model; none of them are keyframed.",
    "Script written by the operator. Shot lengths were then derived from the recorded take with beats.mjs — one sentence per shot — rather than the voice being stretched to fit a guessed edit.",
    "Runtime 57.7s, past the 12-30s target of the style run. The script was chosen first and the picture cut to it.",
    "The suction lead-in where the valve is still shut is clearance re-expansion, and the narration now explains it explicitly.",
  ],
};

/** Anchors the overlay list refers to, kept here so the geometry has one home. */
export const ANCHORS = {
  suctionValve: [-M.valveX, M.deck + 26],
  dischargeValve: [M.valveX, M.deck - 26],
  pistonCrown: (frac) => [0, crownY(frac)],
};
