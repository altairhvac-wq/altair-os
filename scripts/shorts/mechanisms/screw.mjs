/**
 * The twin-screw compressor.
 *
 * Two intermeshing helical rotors — a male rotor with lobes running in a female
 * rotor with flutes. Vapor is drawn in at the SUCTION END, sealed into a V
 * between the lobes and the housing, and then carried ALONG the rotors while
 * the meshing point advances and squeezes it. At the far end the pocket uncovers
 * the discharge port.
 *
 * This is the only compressor in the series whose gas travels the LENGTH of the
 * machine rather than around or across it, which is why its Short tracks with
 * the flow instead of holding a fixed frame.
 *
 * ==================== THE PART THAT IS NOT LIKE THE OTHERS ====================
 * A screw has a FIXED built-in volume ratio set by the geometry of the rotors
 * and the position of the discharge port. It does not open a valve when its
 * pressure beats the line — it simply discharges when the pocket reaches the
 * port, at whatever pressure the geometry produced. That is a real and
 * frequently misunderstood property of the machine, so the model expresses it:
 * pressure follows axial position alone, and the port position is a constant.
 */
import { clamp } from "../engine/style.mjs";

const TAU = Math.PI * 2;

export const GEO = {
  /** Male lobes and female flutes. 4:6 is the common industrial pair. */
  maleLobes: 4,
  femaleFlutes: 6,
  /** How many pockets are in flight down the rotor at once. */
  pockets: 4,
  /**
   * Volume left in the groove at the very end of the rotor, as a fraction of
   * the sealed volume. The groove closes almost completely.
   */
  vEnd: 0.12,
};

/**
 * Built-in volume ratio, MATCHED to the series operating point.
 *
 * A real screw's Vi is fixed by its rotor geometry and port position, so it
 * over-compresses when the system ratio is lower and under-compresses when it
 * is higher — a genuine and frequently misunderstood property of the machine.
 * Here Vi is set to exactly the ratio this series runs at, so the pocket
 * arrives at the port at 250 psig rather than overshooting to 315 and
 * contradicting every other Short's instruments.
 */
GEO.Vi = Math.pow((250 + 14.7) / (60 + 14.7), 1 / 1.16);
/** Where that volume ratio is reached, and therefore where the port sits. */
GEO.portAt = (1 - 1 / GEO.Vi) / (1 - GEO.vEnd);

export const OP = {
  suctionPsig: 60,
  dischargePsig: 250,
  suctionTempC: 15,
  dischargeTempC: 85,
  n: 1.16,
};

const ATM = 14.7;
const Pa_s = OP.suctionPsig + ATM;
const Pa_d = OP.dischargePsig + ATM;

/**
 * Pocket volume by axial position. Falls from 1 at sealing to 1/Vi at the port.
 * Linear in axial position, which is how a screw's groove volume actually
 * behaves closely enough for this purpose.
 */
export function pocketVolume(axial) {
  const a = clamp(axial, 0, 1);
  // Linear in axial position, all the way to the end of the rotor. The earlier
  // version multiplied by a clamped ratio and came out quadratic by accident.
  return 1 - a * (1 - GEO.vEnd);
}

function stateFromVolume(vFrac) {
  const v = clamp(vFrac, 0.02, 1);
  // Capped at the discharge line: past the port the pocket keeps shrinking but
  // is pushing gas out, so its pressure stops climbing — exactly as the
  // reciprocating cylinder behaves during its discharge stroke.
  const Pabs = Math.min(Pa_s * Math.pow(1 / v, OP.n), Pa_d);
  const ratio = Math.pow(Pabs / Pa_s, (OP.n - 1) / OP.n);
  const Ks = OP.suctionTempC + 273.15;
  const anchor =
    (OP.dischargeTempC - OP.suctionTempC) / (Ks * Math.pow(Pa_d / Pa_s, (OP.n - 1) / OP.n) - Ks);
  return { psig: Pabs - ATM, tempC: OP.suctionTempC + (Ks * ratio - Ks) * anchor };
}

/** One pocket at an axial fraction. */
export function pocketState(axial) {
  const a = clamp(axial, 0, 1);
  const v = pocketVolume(a);
  const { psig, tempC } = stateFromVolume(v);
  return {
    axial: a,
    volumeFrac: v,
    psig,
    tempC,
    /** True once it has uncovered the discharge port. */
    discharging: a >= GEO.portAt,
  };
}

/**
 * Full machine state at shaft angle theta.
 *
 * `psig`/`tempC` follow ONE pocket down the whole rotor rather than reporting
 * whichever pocket happens to be innermost. Same reasoning as the scroll: an
 * instrument that reads a different parcel every frame never moves its needle
 * in a way a viewer can follow.
 */
export function screwState(theta) {
  const revs = theta / TAU;
  const pockets = [];
  for (let k = 0; k < GEO.pockets; k++) {
    const a = ((revs + k / GEO.pockets) % 1 + 1) % 1;
    pockets.push(pocketState(a));
  }
  // The tracked pocket runs 0 -> 1 once per revolution, un-wrapped within it.
  const tracked = pocketState(((revs % 1) + 1) % 1);

  return {
    theta,
    revs,
    phase: tracked.discharging ? "discharge" : "compression",
    pockets,
    tracked,
    axial: tracked.axial,
    volumeFrac: tracked.volumeFrac,
    psig: tracked.psig,
    tempC: tracked.tempC,
    discharging: tracked.discharging,
    /** A screw has no suction or discharge valve; both are simply ports. */
    suctionOpen: false,
    dischargeOpen: false,
    suctionLift: 0,
    dischargeLift: 0,
    pistonFrac: 0,
  };
}
