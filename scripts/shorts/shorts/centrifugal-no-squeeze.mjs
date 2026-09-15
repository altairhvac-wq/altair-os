/**
 * SHORT: "This compressor doesn't trap and squeeze refrigerant at all"
 *
 * Fifth and last in the compressor series, and the one that deliberately breaks
 * the series' own instrument language.
 *
 * ==================== WHY THIS ONE IS DIFFERENT ====================
 * Every other Short in the set can tell its whole story with a pressure gauge,
 * because pressure rises as volume falls. A centrifugal machine adds energy as
 * VELOCITY in the impeller, and pressure only appears afterwards in the
 * diffuser when that velocity is slowed. So this Short carries a VELOCITY
 * readout alongside the pressure gauge, and the two peak in different places.
 *
 * Showing pressure climbing inside the impeller would be the single biggest
 * accuracy error available in this series. The model refuses to make it
 * possible: it does not expose a trapped volume at all.
 *
 * ==================== CUT TO THE VOICE ====================
 *   node scripts/shorts/beats.mjs --audio <take>.wav \
 *     --shots 6 --min-gap 0.5 --pick 1,3,4,6,8
 */
import { ease, lerp } from "../engine/style.mjs";
import { centrifugalState, tipProgress, GEO } from "../mechanisms/centrifugal.mjs";
import { drawCentrifugal } from "../engine/centrifugal-machine.mjs";

const TAU = Math.PI * 2;

export const centrifugal = {
  id: "centrifugal",
  state: centrifugalState,
  draw: drawCentrifugal,
  gas() {},
};

/* ----------------------------------------------------------------- timing */
/** Measured from the narration take. */
const T = { hook: 4352, naming: 5856, eye: 5567, impeller: 6106, diffuser: 9547, result: 7162 };
const START = {
  hook: 0,
  naming: T.hook,
  eye: T.hook + T.naming,
  impeller: T.hook + T.naming + T.eye,
  diffuser: T.hook + T.naming + T.eye + T.impeller,
  result: T.hook + T.naming + T.eye + T.impeller + T.diffuser,
};

/**
 * Shaft angles. One revolution carries the tracked parcel from the eye to the
 * outlet, so the shots that show the instruments sit inside a single
 * un-wrapped revolution — same discipline as the scroll and the screw.
 *
 * The parcel reaches the impeller tip at `tipProgress` (≈0.485 of a
 * revolution), which is exactly where the impeller shot ends and the diffuser
 * shot begins. Read from the model, not chosen.
 */
const A = {
  hookEnd: TAU * 1.4,
  namingEnd: TAU * 2.0, // clean boundary: the tracked parcel re-enters the eye
  eyeEnd: TAU * (2 + tipProgress * 0.42),
  impellerEnd: TAU * (2 + tipProgress), // the tip: peak velocity, low pressure
  diffuserEnd: TAU * 2.93,
  resultEnd: TAU * 3.5,
};

export const spec = {
  id: "alt-hvac-s008-centrifugal-cycle",
  title: "This compressor doesn't trap and squeeze refrigerant at all",
  topic: "Centrifugal (dynamic) compression",
  hookType: "misconception",
  takeaway: "Velocity first, pressure second — the impeller adds speed and the diffuser turns it into pressure.",
  takeawayType: "principle",
  mechanism: centrifugal,
  startTheta: 0,

  shots: [
    /* 1 — HOOK. The impeller already spinning, so the claim has something to
       sit on before the viewer has been told what they are looking at. */
    {
      id: "hook",
      dur: T.hook,
      theta: (k) => lerp(0, A.hookEnd, ease.inOut(k)),
      cam: { fx: 0, fy: 0, z: 0.9 },
      camTo: { fx: 0, fy: 0, z: 0.98 },
      camEase: ease.out,
    },

    /* 2 — NAMING. Impeller, diffuser, volute. */
    {
      id: "naming",
      dur: T.naming,
      theta: (k) => lerp(A.hookEnd, A.namingEnd, ease.inOut(k)),
      cam: { fx: 0, fy: 0, z: 0.98 },
      camTo: { fx: 0, fy: 0, z: 1.06 },
    },

    /* 3 — THE EYE. Push into the centre where the vapor arrives. */
    {
      id: "eye",
      dur: T.eye,
      theta: (k) => lerp(A.namingEnd, A.eyeEnd, ease.inOut(k)),
      cam: { fx: 0, fy: 0, z: 1.06 },
      camTo: { fx: 0, fy: 0, z: 1.34 },
      camEase: ease.inOut,
    },

    /* 4 — ACCELERATION. Streaks lengthen; the gas stays cyan the whole way,
       because nothing has been compressed yet. */
    {
      id: "impeller",
      dur: T.impeller,
      theta: (k) => lerp(A.eyeEnd, A.impellerEnd, ease.inOut(k)),
      cam: { fx: 0, fy: 0, z: 1.34 },
      camTo: { fx: 0, fy: 0, z: 1.16 },
    },

    /* 5 — THE DIFFUSER. The conversion. Streaks shorten, colour warms. */
    {
      id: "diffuser",
      dur: T.diffuser,
      theta: (k) => lerp(A.impellerEnd, A.diffuserEnd, ease.inOut(k)),
      cam: { fx: 0, fy: 0, z: 1.16 },
      camTo: { fx: 0, fy: 0, z: 1.0 },
      camEase: ease.inOut,
    },

    /* 6 — RESULT. Pull back to the whole machine. */
    {
      id: "result",
      dur: T.result,
      theta: (k) => lerp(A.diffuserEnd, A.resultEnd, ease.out(k)),
      cam: { fx: 0, fy: 0, z: 1.0 },
      camTo: { fx: 0, fy: 0, z: 0.88 },
      camEase: ease.out,
    },
  ],

  overlays: [
    /* ---------------------------------------------------------- shot 1 */
    {
      kind: "hook",
      at: 120,
      dur: T.hook - 320,
      reveal: 700,
      lines: [{ text: "No trapping." }, { text: "No squeezing.", accent: true }],
      y: 250,
      size: 66,
    },

    /* ---------------------------------------------------------- shot 2 */
    { kind: "eyebrow", at: START.naming + 140, dur: T.naming - 340, text: "A DYNAMIC COMPRESSOR" },
    { kind: "caption", at: START.naming + 200, dur: 5200, text: "This one works completely differently" },
    {
      kind: "callout", at: START.naming + 1200, dur: 4200, x: 64, y: 1140,
      title: "IMPELLER", sub: "adds speed", tone: "cool", anchor: [0, 200],
    },
    {
      kind: "callout", at: START.naming + 2900, dur: 2500, align: "right", x: 1016, y: 520,
      title: "DIFFUSER", sub: "turns speed into pressure", tone: "hot", anchor: [250, -250],
    },

    /* ---------------------------------------------------------- shot 3 */
    { kind: "eyebrow", at: START.eye + 140, dur: T.eye - 340, text: "VAPOR ENTERS THE EYE" },
    { kind: "caption", at: START.eye + 200, dur: 5000, text: "Low-pressure vapor arrives at the center" },
    // Right-hand instrument is VELOCITY, not temperature — see the header.
    { kind: "gauges", right: "velocity", at: START.eye + 400, dur: T.eye + T.impeller + T.diffuser + T.result - 1000, fadeOut: 500 },

    /* ---------------------------------------------------------- shot 4 */
    { kind: "eyebrow", at: START.impeller + 140, dur: T.impeller - 340, text: "ENERGY ADDED AS SPEED" },
    { kind: "caption", at: START.impeller + 200, dur: 5600, text: "The vanes fling it outward — fast" },
    // The point of the whole Short: speed up, pressure NOT yet.
    { kind: "chip", at: START.impeller + 1200, dur: 4600, align: "right", x: 1024, y: 1000, text: "VELOCITY  ↑", tone: "cool" },
    // "NOT YET" would have been a small lie: a real impeller does produce some
    // static rise, and the model gives it 28% of the total. The gauge reads 112
    // psig here, so the chip has to say low, not nothing.
    { kind: "chip", at: START.impeller + 2600, dur: 3200, align: "right", x: 1024, y: 1072, text: "PRESSURE — STILL LOW", tone: "off" },

    /* ---------------------------------------------------------- shot 5 */
    { kind: "eyebrow", at: START.diffuser + 140, dur: T.diffuser - 340, text: "THE DIFFUSER", tone: "hot" },
    { kind: "caption", at: START.diffuser + 200, dur: 4400, text: "The passage widens and the flow slows down" },
    { kind: "caption", at: START.diffuser + 4900, dur: 4400, text: "That lost speed becomes static pressure" },
    { kind: "chip", at: START.diffuser + 1400, dur: 7600, align: "right", x: 1024, y: 1000, text: "VELOCITY  ↓", tone: "cool" },
    { kind: "chip", at: START.diffuser + 3000, dur: 6000, align: "right", x: 1024, y: 1072, text: "PRESSURE  ↑", tone: "hot" },

    /* ---------------------------------------------------------- shot 6 */
    { kind: "eyebrow", at: START.result + 140, dur: 3000, text: "TO THE CONDENSER", tone: "hot" },
    { kind: "caption", at: START.result + 200, dur: 3000, text: "High-pressure vapor leaves the volute" },
    {
      kind: "hook",
      at: START.result + 3700,
      dur: T.result - 3900,
      reveal: 600,
      lines: [{ text: "Speed first." }, { text: "Pressure second.", accent: true }],
      y: 258,
      size: 58,
    },
  ],

  /** Narration, as recorded. Written by the operator. */
  narration: [
    { at: 260, text: "This compressor doesn't trap and squeeze refrigerant at all.", visual: "impeller already spinning, streaks flying outward" },
    { at: START.naming + 200, text: "This is a centrifugal compressor, and it works differently from the others.", visual: "impeller and diffuser labelled" },
    { at: START.eye + 200, text: "Low-pressure refrigerant vapor enters the center of a high-speed impeller.", visual: "camera pushes into the eye; cool slow blobs arriving" },
    { at: START.impeller + 200, text: "The impeller accelerates the vapor outward, adding energy as velocity.", visual: "streaks lengthen toward the tip; colour stays cyan, pressure chip reads NOT YET" },
    { at: START.diffuser + 200, text: "That high-speed vapor then enters the diffuser, where velocity is reduced and converted into static pressure.", visual: "streaks shorten into blobs while the colour runs to orange; gauges climb" },
    { at: START.result + 200, text: "The result is high-pressure refrigerant vapor leaving the compressor and heading toward the condenser.", visual: "pull back to the whole machine, hot volute ring" },
  ],

  generationNotes: [
    "Fifth Short under ALT-HVAC-CUTAWAY-V1; fourth swapped mechanism plug, and the only DYNAMIC compressor in the set.",
    "The state model deliberately exposes no trapped volume, because this machine has none — offering one would invite a caption that says the wrong thing.",
    "Two visual channels instead of one: colour still carries temperature, while STREAK LENGTH carries velocity. They peak in different places, which is the entire lesson, and one channel could not have said it.",
    "The impeller shot ends exactly at the model's tipProgress (≈0.485 of a revolution) — peak velocity, pressure still only 113 psig.",
    "A pressure chip that reads 'NOT YET' during the impeller shot is the correction to the mistake most viewers arrive with.",
  ],
};

export { GEO };
