/**
 * The condenser_process model — the coil where the heat actually leaves.
 *
 * ==================== WHAT THIS SCENE TEACHES ====================
 * Three things happen along one coil, in order, and conflating them is the
 * usual explanation error:
 *
 *   DESUPERHEAT   hot discharge vapor gives up sensible heat and falls to the
 *                 condensing temperature. Still vapor. Nothing condenses yet
 *                 — which is why this scene refuses to show droplets at the
 *                 inlet, however tempting a "condenser makes liquid" visual is.
 *   CONDENSE      at saturation, latent heat leaves and vapor becomes liquid
 *                 PROGRESSIVELY along the passes. The viewer watches the
 *                 vapor fraction fall; there is no instant at which it flips.
 *   SUBCOOL       once the last vapor is gone, more heat rejection drops the
 *                 liquid BELOW its saturation temperature. This is the part
 *                 most explanations omit, and the reason the liquid line can
 *                 be trusted to feed the metering device without flashing.
 *
 * ==================== TOPOLOGY IS THE MODEL ====================
 * Same discipline as `mechanisms/evaporator.mjs`, for the same reason: the
 * renderer derives ONE geometric path from the declared flow order and hangs
 * tubes, bends, particles, droplets and zone labels on it, so the drawn
 * plumbing and the narrated geography cannot disagree. The renderer is never
 * asked to guess which end is the inlet.
 *
 * Physically: hot vapor enters HIGH and liquid leaves LOW. That is not a
 * drawing convenience — condensate drains downward and the bottom passes are
 * where subcooling happens. `coil.inletAt: "top"` is a claim about real
 * hardware, and `engine/condenser-machine.mjs` measures its built geometry
 * against it at import time.
 *
 * ==================== THE THETA TIMELINE ====================
 * One TAU per narrative state, as the other scenes do. The first two windows
 * are the operator's new opening grammar — orientation before explanation:
 *
 *   window 0  [0,TAU)      system:    the whole loop, nothing emphasised
 *   window 1  [TAU,2TAU)   target:    the condenser lights, the rest dims
 *   window 2  [2TAU,3TAU)  desuperheat: hot vapor arrives, sheds sensible heat
 *   window 3  [3TAU,4TAU)  condense:  latent heat leaves, vapor becomes liquid
 *   window 4  [4TAU,5TAU)  subcool:   liquid drops below saturation, leaves
 *   window 5  [5TAU,∞)     payoff:    pull back to the loop, liquid line lit
 */
import { clamp } from "../engine/style.mjs";

const TAU = Math.PI * 2;

/**
 * ONE modeled operating point, for ONE example system on a warm day. Every
 * figure this scene can put on screen comes from here, and the renderer
 * etches "MODELED EXAMPLE" beside them — condensing temperature, head
 * pressure and subcooling targets are system- and condition-dependent, and
 * this series does not narrate them as universal.
 */
export const OP = {
  /**
   * Superheated vapor arriving from the discharge line.
   *
   * ============ THE SAME REFRIGERANT, ONE NUMBER ============
   * This was 88°C and Technical QA refused the render: the series anchors
   * compressor discharge at 85°C (mechanisms/reciprocating.mjs OP), and the
   * vapor entering this coil IS that discharge. Two scenes quoting two
   * temperatures for one stream is exactly the cross-scene disagreement the
   * topology work exists to prevent — so the condenser takes the series
   * anchor rather than the gate taking a wider envelope.
   */
  inletVaporC: 85,
  /** Saturation temperature at this condensing pressure. */
  condensingC: 46,
  /** Liquid leaving, below saturation: the subcooling this scene shows. */
  outletLiquidC: 40,
  /** Ambient air entering the coil, and leaving it warmer. */
  airInC: 35,
  airOutC: 45,
};

/** Subcooling in kelvin, DERIVED so the number can never drift from the pair. */
export const SUBCOOL_K = OP.condensingC - OP.outletLiquidC;

/**
 * Where the three zones begin and end, as fractions of the COIL portion of
 * the path. The renderer colours, labels and droplet-seeds from these — one
 * source, so a zone label can never sit over the wrong tubing.
 */
export const ZONES = {
  desuperheat: { from: 0, to: 0.15 },
  condense: { from: 0.15, to: 0.85 },
  subcool: { from: 0.85, to: 1 },
};

export const TOPOLOGY = {
  domain: "condenser_process",
  flowOrder: [
    "discharge-line",
    "condenser-inlet",
    "coil",
    "condenser-outlet",
    "liquid-line",
    "metering-device",
  ],
  stations: {
    "discharge-line": {
      role: "feed",
      from: "compressor (off-scene internals)",
      to: "condenser-inlet",
      refrigerant: "high-pressure superheated vapor, hot",
    },
    "condenser-inlet": {
      role: "hand-off",
      from: "discharge-line",
      to: "coil",
      refrigerant: "still fully vapor — nothing has condensed yet",
    },
    coil: {
      role: "heat-rejection",
      from: "condenser-inlet",
      to: "condenser-outlet",
      refrigerant:
        "desuperheats to saturation, condenses progressively to liquid, then subcools below saturation",
    },
    "condenser-outlet": {
      role: "hand-off",
      from: "coil",
      to: "liquid-line",
      refrigerant: "high-pressure liquid, subcooled",
    },
    "liquid-line": {
      role: "delivery",
      from: "condenser-outlet",
      to: "metering-device",
      refrigerant: "high-pressure subcooled liquid travelling to the metering device",
    },
    "metering-device": {
      role: "terminus",
      from: "liquid-line",
      to: "evaporator (off-scene)",
      refrigerant: "where the pressure drop happens — not modeled in this scene",
    },
  },
  /**
   * passCount must be ODD so a right-side inlet exits left, where the liquid
   * line leaves. The machine file asserts this parity rather than trusting
   * it. Vapor in at the TOP, liquid out at the BOTTOM: real condensers drain
   * downward and subcool in the lower passes.
   */
  coil: { passCount: 5, inletSide: "right", inletAt: "top", outletSide: "left", outletAt: "bottom" },
  /** Outdoor unit: the fan pulls ambient air through the fins and up out the top. */
  airflow: { direction: "up", driver: "condenser fan", condition: "normal" },
  /** Heat crosses OUT of the refrigerant and INTO the air. Direction is the lesson. */
  heatTransfer: { from: "refrigerant", to: "outdoor air", sign: "rejection" },
  zones: ZONES,
};

/** Vapor fraction at path fraction p (0 inlet, 1 outlet) along the coil. */
export function vaporFractionAt(p) {
  const f = clamp(p, 0, 1);
  if (f <= ZONES.condense.from) return 1;
  if (f >= ZONES.condense.to) return 0;
  return 1 - (f - ZONES.condense.from) / (ZONES.condense.to - ZONES.condense.from);
}

/** Refrigerant temperature at path fraction p — the three-zone curve. */
export function tempAt(p) {
  const f = clamp(p, 0, 1);
  if (f <= ZONES.desuperheat.to) {
    const k = f / ZONES.desuperheat.to;
    return OP.inletVaporC + (OP.condensingC - OP.inletVaporC) * k;
  }
  if (f < ZONES.subcool.from) return OP.condensingC;
  const k = (f - ZONES.subcool.from) / (1 - ZONES.subcool.from);
  return OP.condensingC + (OP.outletLiquidC - OP.condensingC) * k;
}

export function condenserState(theta) {
  const win = Math.max(0, Math.floor(theta / TAU));
  const k = clamp((theta - win * TAU) / TAU, 0, 1);

  // ---- the opening grammar: orient, then point, then travel -------------
  // window 0 shows the loop flat and unemphasised; window 1 lights the
  // condenser and dims the rest, which is what makes the camera move that
  // follows read as "we are going THERE" rather than a cut.
  const cycleFocusStrength = win === 0 ? 0 : win === 1 ? clamp(k * 1.8, 0, 1) : 1;
  // The loop stays drawn behind the cutaway (spatial context is the point of
  // the whole experiment) but recedes once we are inside the component.
  const cycleAlpha = win <= 1 ? 1 : win >= 5 ? lerpIn(k, 0.45, 1) : 0.45;
  const cycleDivideAlpha = win === 0 ? clamp((k - 0.25) * 2.2, 0, 1) : win === 1 ? 1 - k : 0;

  // ---- which zone the explanation is on ---------------------------------
  // 0 none, 1 desuperheat, 2 condensing, 3 subcooling. The renderer reveals
  // one zone label at a time — the brief's "do not leave all labels on
  // screen simultaneously".
  const zoneFocus = win === 2 ? 1 : win === 3 ? 2 : win === 4 ? 3 : 0;
  // Within an explanation window, the emphasis ramps in and holds.
  const zoneFocusK = win >= 2 && win <= 4 ? clamp(k * 2.4, 0, 1) : 0;

  // Air warms as it crosses the coil; the payoff keeps it running so "the
  // heat left with the air" stays true on screen at the end.
  const airHeat = win <= 1 ? clamp(k * 0.6, 0, 0.6) : 1;

  // Heat-departure arrows pulse strongest while the latent story is told.
  const heatOut = win === 2 ? 0.55 : win === 3 ? 1 : win === 4 ? 0.6 : win >= 5 ? 0.5 : 0.25;

  return {
    theta,
    window: win,
    windowK: k,
    phase: ["system", "target", "desuperheat", "condense", "subcool", "payoff"][Math.min(win, 5)],

    cycleFocus: win === 0 ? null : "condenser",
    cycleFocusStrength,
    cycleAlpha,
    cycleDivideAlpha,

    zoneFocus,
    zoneFocusK,
    airHeat,
    heatOut,
    /** Fan blade angle — its own rate, so it never looks locked to the parcels. */
    fanAngle: theta * 1.9,
    /** Continuous flow driver for in-tube and in-line particles. */
    flow: theta * 0.55,

    auditExtra: {
      win,
      zone: zoneFocus,
      air: +airHeat.toFixed(3),
      cyc: +cycleFocusStrength.toFixed(3),
      // Boundary facts QA re-verifies: the physics the scene claims must hold
      // frame to frame, not merely be drawn once.
      vapIn: +vaporFractionAt(0).toFixed(3),
      vapOut: +vaporFractionAt(1).toFixed(3),
      tIn: +tempAt(0).toFixed(1),
      tOut: +tempAt(1).toFixed(1),
      subK: +SUBCOOL_K.toFixed(1),
    },

    // Template compatibility. No valves, no cylinder: this is a heat
    // exchanger, and the series gauge cluster stays off for it.
    psig: 0,
    tempC: tempAt(clamp((theta % TAU) / TAU, 0, 1)),
    volumeFrac: 1,
    suctionOpen: false,
    dischargeOpen: false,
    suctionLift: 0,
    dischargeLift: 0,
    pistonFrac: 0,
  };
}

/** Local helper: ramp from `a` to 1 across k. Kept tiny and local on purpose. */
function lerpIn(k, a, b) {
  return a + (b - a) * clamp(k * 1.6, 0, 1);
}
