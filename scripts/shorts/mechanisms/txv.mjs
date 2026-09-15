/**
 * The metering_device_process model — inside a thermostatic expansion valve.
 *
 * ==================== WHY THIS SCENE EXISTS ====================
 * The lane-A TXV Short of batch 2026-09-13 taught valve internals over the
 * evaporator scene, where the valve is a closed copper body — the approval
 * gate flagged it, and the visual-domain registry has carried
 * `metering_device_process: unmodeled` since. This scene closes that
 * DOMAIN_GAP: the valve itself in section, with the one thing a TXV story
 * cannot live without — the control loop. The bulb at the evaporator outlet
 * is the valve's only sense organ; the capillary carries its pressure to the
 * diaphragm; the spring pushes back. What the balance holds constant is
 * SUPERHEAT — not pressure, not temperature, not capacity.
 *
 * ==================== TOPOLOGY IS THE MODEL ====================
 * Same rule as the evaporator scene: the renderer derives its geometry from
 * the declared TOPOLOGY and attests the result. Two circuits are declared —
 * the REFRIGERANT path (liquid line → inlet chamber → seat orifice → outlet
 * chamber → evaporator feed) and the CONTROL loop (suction line at the coil
 * outlet → bulb → capillary → diaphragm → pushrod → needle carriage ← spring).
 * The needle sits between the two: refrigerant passes it, the loop positions
 * it. A bend, a bulb or a pushrod cannot land in the wrong place because
 * nothing is placed twice.
 *
 * Mechanical configuration modeled: charge on top of the diaphragm, needle
 * closing INTO the seat from below, superheat spring under the carriage —
 * the common internally-equalized arrangement. External equalizers are a
 * system-dependent variant this scene deliberately omits.
 *
 * ==================== THE THETA TIMELINE ====================
 * One TAU per narrative state, exactly like the evaporator scene:
 *
 *   window 0  [0,TAU)      system: the whole loop at steady feed
 *   window 1  [TAU,2TAU)   inside: the section — diaphragm, pin, spring, seat
 *   window 2  [2TAU,3TAU)  opens: bulb warms (superheat rising) -> pin opens
 *   window 3  [3TAU,4TAU)  closes: bulb cools (flooding) -> pin throttles
 *   window 4  [4TAU,∞)     holds: the balance settles — superheat held
 */
import { clamp, lerp, ease } from "../engine/style.mjs";

const TAU = Math.PI * 2;

export const OP = {
  suctionPsig: 60,
  /** Liquid line upstream: warm subcooled liquid. */
  liquidLineTempC: 42,
  /** Saturated coil temperature after the pressure drop. */
  coilTempC: 11,
  /** Bulb temperature band the story sweeps (modeled example). */
  bulbCoolC: 7,
  bulbSteadyC: 11.5,
  bulbWarmC: 16,
};

/**
 * Semantic topology: what connects to what, on both circuits. The renderer
 * (`engine/txv-machine.mjs`) builds its geometry FROM this and measures the
 * result into scene.json (`topologyAttestation`).
 */
export const TOPOLOGY = {
  domain: "metering_device_process",
  refrigerantPath: [
    "liquid-line",
    "inlet-chamber",
    "seat-orifice",
    "outlet-chamber",
    "evaporator-feed",
    "coil (context)",
  ],
  controlLoop: [
    "suction-line at the evaporator outlet",
    "sensing-bulb",
    "capillary",
    "diaphragm",
    "pushrod",
    "needle-carriage",
  ],
  stations: {
    "liquid-line": { role: "feed", refrigerant: "high-pressure subcooled liquid, warm" },
    "seat-orifice": {
      role: "metering point",
      note: "needle closes into the seat from below; spring closes, diaphragm opens",
    },
    "evaporator-feed": { role: "delivery", refrigerant: "cold two-phase spray at coil saturation" },
    "sensing-bulb": {
      role: "sense",
      on: "suction-line",
      near: "evaporator-outlet",
      note: "the valve's only input: bulb pressure follows suction-line temperature",
    },
  },
  /** What the balance regulates. The whole Short exists for this line. */
  controls: "evaporator superheat",
  doesNotControl: ["capacity directly", "suction pressure directly", "air temperature"],
};

/** Needle lift positions per narrative window (0 shut … 1 wide open). */
const PIN = { steady: 0.52, open: 0.85, throttled: 0.2 };

export function txvState(theta) {
  const win = Math.max(0, Math.floor(theta / TAU));
  const k = clamp((theta - win * TAU) / TAU, 0, 1);

  // Bulb temperature drives everything: pin follows bulb, monotonically
  // within each teaching window (render.mjs gates this from the audit rows).
  let bulbTempC;
  let pinLift;
  if (win === 0 || win === 1) {
    bulbTempC = OP.bulbSteadyC;
    pinLift = PIN.steady;
  } else if (win === 2) {
    const e = ease.inOut(k);
    bulbTempC = lerp(OP.bulbSteadyC, OP.bulbWarmC, e);
    pinLift = lerp(PIN.steady, PIN.open, e);
  } else if (win === 3) {
    const e = ease.inOut(k);
    bulbTempC = lerp(OP.bulbWarmC, OP.bulbCoolC, e);
    pinLift = lerp(PIN.open, PIN.throttled, e);
  } else {
    // Settle back to the held balance and stay there.
    const e = ease.out(clamp(k * 1.6, 0, 1));
    bulbTempC = lerp(OP.bulbCoolC, OP.bulbSteadyC, e);
    pinLift = lerp(PIN.throttled, PIN.steady, e);
  }

  return {
    theta,
    window: win,
    windowK: k,
    phase: ["system", "inside", "opens", "closes", "holds"][Math.min(win, 4)],
    bulbTempC,
    pinLift,
    /** Feed intensity downstream of the seat follows the needle. */
    feedRate: pinLift,
    /** Continuous driver for particles. */
    flow: theta * 0.55,
    auditExtra: {
      win,
      pin: +pinLift.toFixed(3),
      bulbC: +bulbTempC.toFixed(1),
    },
    // Template compatibility: no suction/discharge valves, no trapped volume,
    // instruments off (the series gauges model the compressor's operating
    // point, not a valve's).
    psig: OP.suctionPsig,
    tempC: OP.coilTempC,
    volumeFrac: 1,
    suctionOpen: false,
    dischargeOpen: false,
    suctionLift: 0,
    dischargeLift: 0,
    pistonFrac: 0,
  };
}
