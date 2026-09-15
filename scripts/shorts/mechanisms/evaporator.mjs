/**
 * The evaporator_process model — coil, suction line, and the frost story.
 *
 * ==================== WHY THIS SCENE EXISTS ====================
 * The first cut of the suction-line-frost Short staged its narration over the
 * reciprocating compressor's internals, and the operator's review named the
 * error precisely: the phenomenon happens at the EVAPORATOR OUTLET and the
 * suction line, not inside a cylinder. This scene puts the coil and the line
 * at the centre and keeps the compressor as a small downstream silhouette.
 *
 * ==================== TOPOLOGY IS THE MODEL ====================
 * The first evaporator scene drew its plumbing as independent coordinates and
 * paid for it: every return bend landed on the opposite side from the one the
 * particle path actually used, the liquid feed teed into the middle of a bend,
 * and the suction line read as a separate pipe butted against a capped tube.
 * The lesson is the same one the compressor Shorts already encode — derive
 * everything from one source so disagreement is impossible. For a compressor
 * that source is the crank angle; for a heat exchanger it is the FLOW PATH.
 *
 * TOPOLOGY below is that source: the semantic statement of what connects to
 * what, in flow order, with refrigerant state at each hand-off. The renderer
 * (`engine/evaporator-machine.mjs`) builds ONE geometric path from it and
 * hangs tubes, bends, particles, frost and measurement hardware on that same
 * path — so the drawn plumbing, the particle motion, and the narration's
 * geography cannot contradict each other. The renderer never decides which
 * end of the coil is the inlet; it is told.
 *
 * ==================== NOT A COMPRESSOR, AND HONEST ABOUT IT ====================
 * No valves, no trapped volume, no discharge state. What it models:
 *
 *   boiling completion — in the LOW-SUPERHEAT condition this Short teaches,
 *     liquid droplets persist all the way to the coil outlet and slightly
 *     beyond, so "refrigerant is still boiling as it leaves the coil" is
 *     something the viewer literally watches;
 *   frost level — a per-window driver for the suction line's ice accumulation;
 *   line chill — surface temperature language for the pipe metal.
 *
 * ==================== THE THETA TIMELINE ====================
 * The shared template's only channel into a mechanism is theta. This scene
 * assigns MEANING to whole revolutions: each TAU-wide window is one narrative
 * state, and presets point each shot at its window. Inside a window, k (the
 * window-local fraction) drives any transition. Deterministic, resumable,
 * and no second animation channel bolted onto the template.
 *
 *   window 0  [0,TAU)      hook: the symptom — line already fully frosted
 *   window 1  [TAU,2TAU)   coil: no frost; boiling visibly unfinished at exit
 *   window 2  [2TAU,3TAU)  freezing: line chills below 0C, frost grows 0 -> 1
 *   window 3  [3TAU,4TAU)  caution: frost holds at 1
 *   window 4  [4TAU,∞)     payoff: frost holds; superheat point highlighted
 */
import { clamp } from "../engine/style.mjs";

const TAU = Math.PI * 2;

export const OP = {
  suctionPsig: 60,
  suctionTempC: 15,
  /** Liquid line upstream of the metering device: warm subcooled liquid. */
  liquidLineTempC: 42,
  /** Saturated two-phase temperature after the metering device / in the coil. */
  coilTempC: 11,
};

/**
 * The semantic topology of the modeled system — flow order, connections and
 * refrigerant state at each station. The renderer derives its geometry FROM
 * this and attests the result into `scene.json` (see `topologyAttestation` in
 * the machine file), which agent-side Technical QA verifies. Coordinates are
 * deliberately absent: where things sit on screen is the renderer's business;
 * what connects to what is not.
 */
export const TOPOLOGY = {
  domain: "evaporator_process",
  /** One-directional flow, cooling mode. Reversal is a heat-pump story this scene does not tell. */
  flowOrder: [
    "liquid-line",
    "metering-device",
    "coil",
    "evaporator-outlet",
    "suction-line",
    "compressor-inlet",
  ],
  stations: {
    "liquid-line": {
      role: "feed",
      from: "condenser (off-scene)",
      to: "metering-device",
      refrigerant: "high-pressure subcooled liquid, warm",
    },
    "metering-device": {
      role: "expansion",
      from: "liquid-line",
      to: "coil",
      refrigerant: "pressure and temperature drop; leaves as cold two-phase (mostly liquid + flash gas)",
      note: "Drawn as a closed TXV body — internals belong to metering_device_process, not modeled here.",
    },
    coil: {
      role: "heat-absorption",
      from: "metering-device",
      to: "evaporator-outlet",
      refrigerant: "boils at saturation as it absorbs heat from the airflow; liquid fraction falls along the path",
    },
    "evaporator-outlet": {
      role: "hand-off",
      from: "coil",
      to: "suction-line",
      refrigerant: "should be slightly superheated vapor; in this fault, still carrying droplets",
    },
    "suction-line": {
      role: "return",
      from: "evaporator-outlet",
      to: "compressor-inlet",
      refrigerant: "low-pressure cold vapor; the frost-capable segment",
    },
    "compressor-inlet": {
      role: "terminus",
      from: "suction-line",
      to: "compressor (off-scene internals)",
      refrigerant: "cold vapor entering the machine",
    },
  },
  /**
   * Coil construction facts the renderer must honor. passCount must be ODD so
   * a left-side inlet exits on the right, where the suction line leaves —
   * the machine file asserts this parity rather than trusting it.
   */
  coil: { passCount: 5, inletSide: "left", inletAt: "bottom", outletSide: "right", outletAt: "top" },
  /** Air crosses the finned coil upward (upflow); the modeled fault is weak airflow. */
  airflow: { direction: "up", condition: "low-airflow" },
  /** Frost belongs to the suction line, growing from the outlet toward the compressor. */
  frost: { on: "suction-line", growsFrom: "evaporator-outlet", toward: "compressor-inlet" },
  /**
   * Where superheat is established: line temperature near the evaporator
   * outlet, read against saturation temperature from suction pressure. The
   * drawn temperature clamp on the line is this point.
   */
  superheatMeasurement: {
    lineTempOn: "suction-line",
    near: "evaporator-outlet",
    pairedWith: "suction pressure",
  },
};

/**
 * Where along the flow path boiling completes, as a fraction of the COIL
 * portion. > 1 means droplets survive past the evaporator outlet into the
 * suction line — the low-superheat condition this Short teaches, made
 * literally watchable.
 */
export const BOIL_COMPLETE_AT = 1.03;

/**
 * Where boiling completes on a HEALTHY coil, as a fraction of the coil
 * portion: comfortably inside the passes, leaving a short dry stretch before
 * the outlet. That dry stretch IS superheat, and it is the difference
 * between this state and the frost story's 1.03 fault.
 */
export const HEALTHY_BOIL_COMPLETE_AT = 0.86;

/**
 * The SECOND story this scene can tell: what the evaporator is FOR.
 *
 * ==================== WHY A SECOND STATE, NOT A SECOND SCENE ====================
 * The frost Short's timeline opens on a fully-frosted line — the symptom
 * first, because that Short is a diagnosis. A Short explaining what the
 * component does must not open on a fault, and must not open on a close-up
 * at all: the operator's hook experiment says establish the system, point at
 * the component, then travel in. Same hardware, same renderer, same proven
 * geometry; different narrative windows. So this is a state function beside
 * the other, not a copy of the scene.
 *
 *   window 0  [0,TAU)      system:  the whole loop, nothing emphasised
 *   window 1  [TAU,2TAU)   target:  the evaporator lights, the rest dims
 *   window 2  [2TAU,3TAU)  absorb:  warm return air crosses the coil
 *   window 3  [3TAU,4TAU)  boil:    the liquid boils away along the passes
 *   window 4  [4TAU,5TAU)  outlet:  vapor leaves into the suction line
 *   window 5  [5TAU,∞)     payoff:  pull back to the loop, heat now moving
 */
export function evaporatorHeatState(theta) {
  const win = Math.max(0, Math.floor(theta / TAU));
  const k = clamp((theta - win * TAU) / TAU, 0, 1);

  const cycleFocusStrength = win === 0 ? 0 : win === 1 ? clamp(k * 1.8, 0, 1) : 1;
  const cycleAlpha = win <= 1 ? 1 : win >= 5 ? clamp(0.45 + k * 0.9, 0, 1) : 0.45;
  const cycleDivideAlpha = win === 0 ? clamp((k - 0.25) * 2.2, 0, 1) : win === 1 ? 1 - k : 0;

  // The air is the point from window 2 on: warm in, cool out.
  const airHeat = win <= 1 ? clamp(k * 0.5, 0, 0.5) : 1;

  return {
    theta,
    window: win,
    windowK: k,
    phase: ["system", "target", "absorb", "boil", "outlet", "payoff"][Math.min(win, 5)],

    /** Opt in to the shared orientation layer and to this story's labels. */
    showCycle: true,
    heatStory: true,
    // 0 none, 1 heat in, 2 boiling, 3 vapor out. One at a time, revealed
    // when the narration is on it.
    zoneFocus: win === 2 ? 1 : win === 3 ? 2 : win === 4 ? 3 : 0,
    zoneFocusK: win >= 2 && win <= 4 ? clamp(k * 2.4, 0, 1) : 0,
    cycleFocus: win === 0 ? null : "evaporator",
    cycleFocusStrength,
    cycleAlpha,
    cycleDivideAlpha,
    airHeat,

    // A HEALTHY coil: no frost anywhere in this story, a cold-but-not-icy
    // line, and boiling that finishes before the outlet.
    frostLevel: 0,
    chill: 0.35,
    measureFocus: 0,
    boilCompleteAt: HEALTHY_BOIL_COMPLETE_AT,

    flow: theta * 0.55,

    auditExtra: {
      win,
      frost: 0,
      chill: 0.35,
      air: +airHeat.toFixed(3),
      cyc: +cycleFocusStrength.toFixed(3),
      boilAt: HEALTHY_BOIL_COMPLETE_AT,
    },

    psig: OP.suctionPsig,
    tempC: OP.suctionTempC,
    volumeFrac: 1,
    suctionOpen: false,
    dischargeOpen: false,
    suctionLift: 0,
    dischargeLift: 0,
    pistonFrac: 0,
  };
}

export function evaporatorState(theta) {
  const win = Math.max(0, Math.floor(theta / TAU));
  const k = clamp((theta - win * TAU) / TAU, 0, 1);

  let frostLevel;
  if (win === 0) frostLevel = 1; // the hook shows the symptom first
  else if (win === 1) frostLevel = 0; // rewind: the mechanism, pre-frost
  else if (win === 2) frostLevel = clamp(k * 1.15, 0, 1); // ice forms on screen
  else frostLevel = 1;

  // Line surface chill: drives the pipe tint toward icy pale. Leads the frost
  // slightly — the pipe must LOOK below freezing before ice can read as fair.
  const chill = win === 0 ? 1 : win === 1 ? 0.25 : win === 2 ? clamp(0.3 + k * 0.9, 0, 1) : 1;

  // The payoff window turns the viewer's eye to the measurement: a highlight
  // that exists only in window 4, ramping in over its first ~70%.
  const measureFocus = win >= 4 ? clamp(k * 1.4, 0, 1) : 0;

  return {
    theta,
    window: win,
    windowK: k,
    phase: ["symptom", "boiling", "freezing", "caution", "context"][Math.min(win, 4)],
    frostLevel,
    chill,
    measureFocus,
    /** Continuous flow driver for in-tube particles. */
    flow: theta * 0.55,
    /** Low-superheat condition is the whole story of this scene. */
    boilCompleteAt: BOIL_COMPLETE_AT,
    // Mechanism-specific audit facts; page.html spreads these into audit rows
    // so render.mjs can gate on narrative-state integrity (no frost during the
    // pre-frost window, monotonic growth while freezing).
    auditExtra: {
      win,
      frost: +frostLevel.toFixed(3),
      chill: +chill.toFixed(3),
    },
    // Template compatibility. No valves exist anywhere in this scene; the
    // instrument block is expected OFF for fault-condition Shorts (the series
    // gauges model a healthy operating point).
    psig: OP.suctionPsig,
    tempC: OP.suctionTempC,
    volumeFrac: 1,
    suctionOpen: false,
    dischargeOpen: false,
    suctionLift: 0,
    dischargeLift: 0,
    pistonFrac: 0,
  };
}
