/**
 * Canonical phase presets — the bridge between an agent's PLAN and the engine.
 *
 * ==================== WHY THIS FILE EXISTS ====================
 * Phase 1 of the agent integration proved the contracts but left one manual
 * step: a human translating a TechnicalShortPlan into a `shorts/*.mjs` data
 * file. This table removes that step WITHOUT giving agents frame-level
 * control: an agent may only pick a mechanism, an ordered subset of that
 * mechanism's named phases, and the words on screen. Every theta range and
 * camera framing below was lifted verbatim from the six operator-tuned,
 * shipped Shorts — an agent cannot invent an angle, only reuse a proven one.
 *
 * The mechanical constraints the shipped Shorts learned the hard way are
 * ENCODED here rather than remembered:
 *   - recip shot boundaries start inside their own phase (suction starts at
 *     0.5 rad so a "SUCTION" title never sits over a shut valve for long);
 *   - scroll/screw/centrifugal instrument phases sit inside a single
 *     un-wrapped tracked-parcel journey so gauges never reset mid-shot;
 *   - lengthening a shot only slows motion (theta is lerped over the shot),
 *     so voice-derived durations can never move a valve event.
 */
import { CUE } from "../mechanisms/reciprocating.mjs";

const TAU = Math.PI * 2;

/**
 * Each phase: theta [from, to], cam/camTo framing, and whether the series'
 * gauge cluster may run during it. Phases must be USED IN ORDER (subsets
 * allowed): the generator refuses out-of-order phases rather than stitching
 * a machine that runs backwards.
 */
export const PHASE_PRESETS = {
  reciprocating: {
    order: ["running", "suction", "compression", "heat", "discharge", "wide"],
    phases: {
      running: {
        theta: [CUE.dischargeStart - 0.5, CUE.dischargeStart - 0.5 + TAU * 1.6],
        cam: { fx: 26, fy: 132, z: 1.18 },
        camTo: { fx: 20, fy: 112, z: 1.28 },
        gaugesAllowed: true,
      },
      suction: {
        theta: [0.5, Math.PI * 0.995],
        cam: { fx: -48, fy: 40, z: 1.2 },
        camTo: { fx: -30, fy: 110, z: 1.16 },
        gaugesAllowed: true,
      },
      compression: {
        theta: [Math.PI * 1.015, 4.56],
        cam: { fx: 0, fy: 104, z: 1.18 },
        camTo: { fx: 0, fy: 40, z: 1.3 },
        gaugesAllowed: true,
      },
      heat: {
        theta: [4.56, CUE.dischargeStart - 0.07],
        cam: { fx: 0, fy: 34, z: 1.3 },
        camTo: { fx: 0, fy: 18, z: 1.4 },
        gaugesAllowed: true,
      },
      discharge: {
        theta: [CUE.dischargeStart - 0.07, TAU - 0.09],
        cam: { fx: 92, fy: -10, z: 1.24 },
        camTo: { fx: 216, fy: -96, z: 1.06 },
        gaugesAllowed: true,
      },
      wide: {
        theta: [TAU - 0.09, TAU - 0.09 + TAU * 1.5],
        cam: { fx: 46, fy: 104, z: 1.3 },
        camTo: { fx: 52, fy: 118, z: 1.18 },
        gaugesAllowed: true,
      },
      /** The suction-line framings proven by the frost/cold-line Shorts. */
      pipeline: {
        theta: [CUE.dischargeStart - 0.5, CUE.dischargeStart - 0.5 + TAU * 1.2],
        cam: { fx: -300, fy: -140, z: 1.18 },
        camTo: { fx: -230, fy: -120, z: 1.26 },
        gaugesAllowed: false,
      },
      pipeClose: {
        theta: [Math.PI * 1.015, 4.2],
        cam: { fx: -280, fy: -55, z: 1.3 },
        camTo: { fx: -300, fy: -70, z: 1.4 },
        gaugesAllowed: false,
      },
    },
    /** Live valve chips exist only where valves do. */
    liveValveChips: true,
    /**
     * pipeline/pipeClose sit OUTSIDE the strict order (they revisit angles);
     * the generator allows them anywhere because their subject is the pipe,
     * not the cycle — the machine behind is legitimate at any angle.
     */
    orderExempt: ["pipeline", "pipeClose"],
  },

  scroll: {
    order: ["running", "naming", "trap", "inward", "discharge"],
    phases: {
      running: { theta: [0, TAU * 0.6], cam: { fx: 0, fy: 0, z: 0.9 }, camTo: { fx: 0, fy: 0, z: 0.98 }, gaugesAllowed: false },
      naming: { theta: [TAU * 0.6, TAU * 2.0], cam: { fx: 0, fy: 0, z: 0.98 }, camTo: { fx: 0, fy: 0, z: 1.08 }, gaugesAllowed: false },
      trap: { theta: [TAU * 2.0, TAU * 2.35], cam: { fx: 0, fy: 0, z: 1.08 }, camTo: { fx: 0, fy: 0, z: 1.16 }, gaugesAllowed: true },
      inward: { theta: [TAU * 2.35, TAU * 3.5], cam: { fx: 0, fy: 0, z: 1.16 }, camTo: { fx: 0, fy: 0, z: 1.42 }, gaugesAllowed: true },
      discharge: { theta: [TAU * 3.5, TAU * 3.95], cam: { fx: 0, fy: 0, z: 1.42 }, camTo: { fx: 0, fy: 0, z: 0.94 }, gaugesAllowed: true },
    },
    liveValveChips: false,
    orderExempt: [],
  },

  rotary: {
    order: ["running", "naming", "twoSides", "rise", "discharge"],
    phases: {
      running: { theta: [0, TAU * 1.2], cam: { fx: 0, fy: 0, z: 0.9 }, camTo: { fx: 0, fy: 0, z: 0.98 }, gaugesAllowed: false },
      naming: { theta: [TAU * 1.2, TAU * 2.0], cam: { fx: 0, fy: 0, z: 0.98 }, camTo: { fx: 0, fy: 0, z: 1.08 }, gaugesAllowed: false },
      twoSides: { theta: [TAU * 2.0, TAU * 2.2454], cam: { fx: 0, fy: 0, z: 1.08 }, camTo: { fx: 0, fy: 0, z: 1.18 }, gaugesAllowed: true },
      rise: { theta: [TAU * 2.2454, TAU * 2.409], cam: { fx: 0, fy: 0, z: 1.18 }, camTo: { fx: 0, fy: 0, z: 1.34 }, gaugesAllowed: true },
      discharge: { theta: [TAU * 2.409, TAU * 2.95], cam: { fx: 0, fy: 0, z: 1.34 }, camTo: { fx: 0, fy: 0, z: 0.94 }, gaugesAllowed: true },
    },
    liveValveChips: false,
    orderExempt: [],
  },

  screw: {
    order: ["running", "naming", "trap", "travel", "rise"],
    phases: {
      running: { theta: [0, TAU * 1.35], cam: { fx: 0, fy: 20, z: 0.92 }, camTo: { fx: 0, fy: 20, z: 0.98 }, gaugesAllowed: false },
      naming: { theta: [TAU * 1.35, TAU * 2.0], cam: { fx: 0, fy: 20, z: 0.98 }, camTo: { fx: -60, fy: 10, z: 1.04 }, gaugesAllowed: false },
      trap: { theta: [TAU * 2.0, TAU * 2.22], cam: { fx: -253, fy: 10, z: 1.1 }, camTo: { fx: -141, fy: 10, z: 1.16 }, gaugesAllowed: true },
      travel: { theta: [TAU * 2.22, TAU * 2.62], cam: { fx: -141, fy: 10, z: 1.16 }, camTo: { fx: 61, fy: 10, z: 1.16 }, gaugesAllowed: true },
      rise: { theta: [TAU * 2.62, TAU * 2.97], cam: { fx: 61, fy: 10, z: 1.16 }, camTo: { fx: 0, fy: 20, z: 0.94 }, gaugesAllowed: true },
    },
    liveValveChips: false,
    orderExempt: [],
  },

  centrifugal: {
    order: ["running", "naming", "eye", "impeller", "diffuser", "result"],
    phases: {
      running: { theta: [0, TAU * 1.4], cam: { fx: 0, fy: 0, z: 0.9 }, camTo: { fx: 0, fy: 0, z: 0.98 }, gaugesAllowed: false },
      naming: { theta: [TAU * 1.4, TAU * 2.0], cam: { fx: 0, fy: 0, z: 0.98 }, camTo: { fx: 0, fy: 0, z: 1.06 }, gaugesAllowed: false },
      eye: { theta: [TAU * 2.0, TAU * 2.2037], cam: { fx: 0, fy: 0, z: 1.06 }, camTo: { fx: 0, fy: 0, z: 1.34 }, gaugesAllowed: true },
      impeller: { theta: [TAU * 2.2037, TAU * 2.485], cam: { fx: 0, fy: 0, z: 1.34 }, camTo: { fx: 0, fy: 0, z: 1.16 }, gaugesAllowed: true },
      diffuser: { theta: [TAU * 2.485, TAU * 2.93], cam: { fx: 0, fy: 0, z: 1.16 }, camTo: { fx: 0, fy: 0, z: 1.0 }, gaugesAllowed: true },
      result: { theta: [TAU * 2.93, TAU * 3.5], cam: { fx: 0, fy: 0, z: 1.0 }, camTo: { fx: 0, fy: 0, z: 0.88 }, gaugesAllowed: true },
    },
    liveValveChips: false,
    /** The centrifugal's right-hand instrument is VELOCITY, never temperature. */
    gaugeRight: "velocity",
    orderExempt: [],
  },

  evaporator: {
    order: ["frostedLine", "coil", "freezing", "caution", "wide"],
    phases: {
      // Window layout is defined by mechanisms/evaporator.mjs: one TAU per
      // narrative state. Presets aim each phase at its window; window-local k
      // drives the transition (frost growth) inside it. Framings are tuned to
      // the path-derived geometry in engine/evaporator-machine.mjs (see its
      // ANCHORS): outlet at (110,-240), clamp at x=300, TXV at (-600,320),
      // compressor 700..1040.
      frostedLine: { theta: [0, TAU * 0.96], cam: { fx: 390, fy: -255, z: 1.34 }, camTo: { fx: 368, fy: -248, z: 1.46 }, gaugesAllowed: false },
      // The coil phase TRAVELS the flow: opens on the metering device feeding
      // the bottom-left pass, lands on the outlet corner where the line leaves.
      coil: { theta: [TAU * 1.0, TAU * 1.96], cam: { fx: -395, fy: 215, z: 1.05 }, camTo: { fx: 30, fy: -135, z: 1.14 }, gaugesAllowed: false },
      freezing: { theta: [TAU * 2.0, TAU * 2.96], cam: { fx: 295, fy: -235, z: 1.3 }, camTo: { fx: 318, fy: -242, z: 1.46 }, gaugesAllowed: false },
      caution: { theta: [TAU * 3.0, TAU * 3.96], cam: { fx: 175, fy: -70, z: 0.98 }, camTo: { fx: 150, fy: -35, z: 0.9 }, gaugesAllowed: false },
      // Payoff: open ON the superheat clamp (the highlight ring lives there),
      // then pull until the whole system — TXV to compressor — is in frame.
      // The generator gives the last shot ease.out, which spends most of the
      // pull in the first second — so the start must be TIGHT for the clamp
      // beat to hold at all.
      wide: { theta: [TAU * 4.0, TAU * 4.96], cam: { fx: 292, fy: -240, z: 1.36 }, camTo: { fx: 95, fy: 25, z: 0.6 }, gaugesAllowed: false },
    },
    liveValveChips: false,
    orderExempt: [],
    /** Cover: the symptom itself — the frosted line leaving the coil. */
    cover: { theta: TAU * 0.5, cam: { fx: 380, fy: -248, z: 1.42 } },
  },

  txv: {
    order: ["system", "inside", "opens", "closes", "holds"],
    phases: {
      // Window layout defined by mechanisms/txv.mjs: one TAU per narrative
      // state. Framings tuned to engine/txv-machine.mjs ANCHORS: body at
      // (-250, 85), dome top -112, bulb at (30, -185), coil 300..780.
      system: { theta: [0, TAU * 0.96], cam: { fx: 80, fy: -18, z: 0.69 }, camTo: { fx: 62, fy: -24, z: 0.74 }, gaugesAllowed: false },
      inside: { theta: [TAU * 1.0, TAU * 1.96], cam: { fx: -250, fy: 55, z: 1.85 }, camTo: { fx: -250, fy: 42, z: 2.1 }, gaugesAllowed: false },
      opens: { theta: [TAU * 2.0, TAU * 2.96], cam: { fx: -90, fy: -45, z: 1.14 }, camTo: { fx: -150, fy: -15, z: 1.3 }, gaugesAllowed: false },
      closes: { theta: [TAU * 3.0, TAU * 3.96], cam: { fx: -120, fy: -30, z: 1.3 }, camTo: { fx: -185, fy: 15, z: 1.44 }, gaugesAllowed: false },
      holds: { theta: [TAU * 4.0, TAU * 4.96], cam: { fx: -70, fy: 5, z: 1.05 }, camTo: { fx: 74, fy: -20, z: 0.68 }, gaugesAllowed: false },
    },
    liveValveChips: false,
    orderExempt: [],
    /** Cover: the whole control loop — valve, capillary, bulb, coil. */
    cover: { theta: TAU * 0.5, cam: { fx: -50, fy: -35, z: 0.94 } },
  },

  superheat: {
    order: ["scene", "pressure", "temperature", "subtract", "meaning"],
    phases: {
      // Window layout defined by mechanisms/superheat.mjs. Framings tuned to
      // engine/superheat-machine.mjs ANCHORS: clamp (-80,-160), port (120),
      // gauge (300,210), readout plate 360..706.
      scene: { theta: [0, TAU * 0.96], cam: { fx: 145, fy: -35, z: 0.63 }, camTo: { fx: 140, fy: -38, z: 0.68 }, gaugesAllowed: false },
      pressure: { theta: [TAU * 1.0, TAU * 1.96], cam: { fx: 250, fy: 25, z: 1.1 }, camTo: { fx: 292, fy: 35, z: 1.24 }, gaugesAllowed: false },
      temperature: { theta: [TAU * 2.0, TAU * 2.96], cam: { fx: -55, fy: -105, z: 1.32 }, camTo: { fx: -80, fy: -118, z: 1.48 }, gaugesAllowed: false },
      subtract: { theta: [TAU * 3.0, TAU * 3.96], cam: { fx: 470, fy: -28, z: 1.42 }, camTo: { fx: 515, fy: -30, z: 1.6 }, gaugesAllowed: false },
      meaning: { theta: [TAU * 4.0, TAU * 4.96], cam: { fx: 320, fy: -25, z: 0.98 }, camTo: { fx: 145, fy: -35, z: 0.64 }, gaugesAllowed: false },
    },
    liveValveChips: false,
    orderExempt: [],
    /** Cover: clamp + port + readout in one diagnostic tableau. */
    cover: { theta: TAU * 4.35, cam: { fx: 185, fy: -48, z: 0.9 } },
  },
};

/**
 * Cover framing for mechanisms whose preset block predates covers: the
 * reciprocating machine shows cool suction in and hot discharge out at a
 * discharge-open moment.
 */
PHASE_PRESETS.reciprocating.cover = { theta: CUE.dischargeStart + 0.28, cam: { fx: 55, fy: 30, z: 1.0 } };

/* ========================================================================= *
 *        THE SYSTEM-CONTEXT OPENING GRAMMAR (hook experiment, 2026-09-14)
 * ========================================================================= *
 * Both blocks below open on the whole refrigeration loop and TRAVEL into
 * their component. Two properties make that work, and both are deliberate:
 *
 *   CONTINUITY. Each phase's `camTo` is the next phase's `cam`, exactly. The
 *   template blends 380ms across a cut; here there is nothing to blend,
 *   because the camera never jumps. The whole Short is one move — wide, in,
 *   along the flow, back out — so the viewer never loses where they are.
 *
 *   THE MOVE EXPLAINS THE GEOGRAPHY. The travel follows the refrigerant's
 *   own direction through the component (condenser: inlet top-right →
 *   outlet bottom-left; evaporator: feed bottom-left → outlet top-right),
 *   so the camera is teaching the circuit while the narration teaches the
 *   physics.
 *
 * Framings are tuned to the shared layout in engine/cycle-overview.mjs:
 * loop spans x -930..1300, y -1200..390; condenser 340..1180 / -1200..-820;
 * evaporator coil -440..110 / -300..390.
 */

PHASE_PRESETS.condenser = {
  order: ["system", "target", "desuperheat", "condense", "subcool", "payoff"],
  phases: {
    // Orientation: the entire loop, nothing emphasised. z 0.42 clears the
    // 2230-unit width of the loop with margin on a 1080-wide canvas.
    system: {
      theta: [0, TAU * 0.96],
      cam: { fx: 185, fy: -405, z: 0.42 },
      camTo: { fx: 185, fy: -430, z: 0.46 },
      gaugesAllowed: false,
    },
    // "THIS is the condenser": the highlight lands and the travel begins.
    target: {
      theta: [TAU * 1.0, TAU * 1.96],
      cam: { fx: 185, fy: -430, z: 0.46 },
      camTo: { fx: 560, fy: -760, z: 0.6 },
      gaugesAllowed: false,
    },
    // Arrive at the inlet, top-right, where the hot vapor comes in.
    desuperheat: {
      theta: [TAU * 2.0, TAU * 2.96],
      cam: { fx: 560, fy: -760, z: 0.6 },
      camTo: { fx: 880, fy: -1090, z: 0.82 },
      gaugesAllowed: false,
    },
    // Travel the coil in the refrigerant's own direction: right to left.
    condense: {
      theta: [TAU * 3.0, TAU * 3.96],
      cam: { fx: 880, fy: -1090, z: 0.82 },
      camTo: { fx: 740, fy: -980, z: 0.86 },
      gaugesAllowed: false,
    },
    // Land on the outlet, bottom-left, where subcooled liquid leaves.
    subcool: {
      theta: [TAU * 4.0, TAU * 4.96],
      cam: { fx: 740, fy: -980, z: 0.86 },
      camTo: { fx: 520, fy: -880, z: 0.92 },
      gaugesAllowed: false,
    },
    // Pull all the way back to the loop, now understood.
    payoff: {
      theta: [TAU * 5.0, TAU * 5.96],
      cam: { fx: 520, fy: -880, z: 0.92 },
      camTo: { fx: 185, fy: -405, z: 0.42 },
      gaugesAllowed: false,
    },
  },
  liveValveChips: false,
  orderExempt: [],
  /** Cover: the outdoor unit whole — fan, cabinet, coil — so a non-expert
   *  can recognise the thing in their own back yard. */
  cover: { theta: TAU * 3.4, cam: { fx: 760, fy: -1040, z: 0.62 } },
};

PHASE_PRESETS.evaporatorHeat = {
  order: ["system", "target", "absorb", "boil", "outlet", "payoff"],
  phases: {
    system: {
      theta: [0, TAU * 0.96],
      cam: { fx: 185, fy: -405, z: 0.42 },
      camTo: { fx: 120, fy: -330, z: 0.46 },
      gaugesAllowed: false,
    },
    target: {
      theta: [TAU * 1.0, TAU * 1.96],
      cam: { fx: 120, fy: -330, z: 0.46 },
      camTo: { fx: -80, fy: -60, z: 0.62 },
      gaugesAllowed: false,
    },
    // Arrive across the coil face, where the air actually crosses it.
    absorb: {
      theta: [TAU * 2.0, TAU * 2.96],
      cam: { fx: -80, fy: -60, z: 0.62 },
      camTo: { fx: -165, fy: 45, z: 0.82 },
      gaugesAllowed: false,
    },
    // Travel the coil the way the refrigerant runs: bottom-left upward.
    boil: {
      theta: [TAU * 3.0, TAU * 3.96],
      cam: { fx: -165, fy: 45, z: 0.82 },
      camTo: { fx: -110, fy: -70, z: 0.96 },
      gaugesAllowed: false,
    },
    // The outlet hand-off into the suction line.
    outlet: {
      theta: [TAU * 4.0, TAU * 4.96],
      cam: { fx: -110, fy: -70, z: 0.96 },
      camTo: { fx: 175, fy: -215, z: 1.06 },
      gaugesAllowed: false,
    },
    payoff: {
      theta: [TAU * 5.0, TAU * 5.96],
      cam: { fx: 175, fy: -215, z: 1.06 },
      camTo: { fx: 185, fy: -405, z: 0.42 },
      gaugesAllowed: false,
    },
  },
  liveValveChips: false,
  orderExempt: [],
  /** Cover: the coil with its air path, recognisable as the indoor coil. */
  cover: { theta: TAU * 2.5, cam: { fx: -150, fy: 20, z: 0.78 } },
};

/** Which mechanism plug module + export the generated file must import. */
export const MECHANISM_IMPORTS = {
  evaporator: { from: "./evap-plug.mjs", name: "evaporator" },
  condenser: { from: "./condenser-plug.mjs", name: "condenser" },
  evaporatorHeat: { from: "./evap-heat-plug.mjs", name: "evaporatorHeat" },
  txv: { from: "./txv-plug.mjs", name: "txv" },
  superheat: { from: "./superheat-plug.mjs", name: "superheat" },
  reciprocating: { from: "./recip-what-happens.mjs", name: "reciprocating" },
  scroll: { from: "./scroll-how-it-compresses.mjs", name: "scroll" },
  rotary: { from: "./rotary-roller-not-piston.mjs", name: "rotary" },
  screw: { from: "./screw-raises-pressure.mjs", name: "screw" },
  centrifugal: { from: "./centrifugal-no-squeeze.mjs", name: "centrifugal" },
};
