/**
 * The rotary (rolling-piston) compressor.
 *
 * A roller sits on an eccentric shaft and rolls around the inside of the
 * cylinder, touching the wall at one point. A spring-loaded vane slides in a
 * slot and stays pressed against the roller, cutting the crescent between
 * roller and cylinder into TWO chambers that change size at the same time:
 *
 *   behind the vane   the suction chamber, growing, open to the suction port
 *   ahead of the vane the compression chamber, shrinking, sealed until its
 *                     pressure beats the discharge line
 *
 * That simultaneity is the whole point of the mechanism and the hard part of
 * drawing it. Both chambers are reported every frame so the renderer can show
 * them together without either being invented.
 *
 * ==================== THE AREAS ARE INTEGRATED, NOT GUESSED ====================
 * A rolling piston's chamber volume has no tidy closed form, and the usual
 * "fraction of a turn" shortcut is wrong because the crescent is not a uniform
 * width. Along a ray at angle psi from the cylinder centre, the roller surface
 * sits at
 *
 *   d(psi) = e*cos(psi - theta) + sqrt(r^2 - e^2*sin^2(psi - theta))
 *
 * so the enclosed area between two angles is the integral of
 * (R^2 - d^2)/2 dpsi. That is evaluated numerically below. It costs nothing at
 * these frame counts and it means the pressure curve is the machine's, not a
 * curve that looked about right.
 */
import { clamp } from "../engine/style.mjs";

const TAU = Math.PI * 2;

export const GEO = {
  /** Cylinder bore radius. */
  R: 300,
  /**
   * Roller radius; eccentricity follows as R - r.
   *
   * A real rolling piston runs a much thinner crescent than this. It is opened
   * up deliberately: at r=246 the gas gap was a few pixels on a phone and the
   * two chambers — the entire point of the mechanism — could not be told apart.
   * The PHYSICS is unchanged, since every area is integrated from whatever
   * these numbers are; only the readability is tuned.
   */
  r: 216,
  /** Where the vane slot is, in machine angle. Top of the cylinder. */
  vane: -Math.PI / 2,
};
GEO.e = GEO.R - GEO.r;

export const OP = {
  suctionPsig: 60,
  dischargePsig: 250,
  suctionTempC: 15,
  dischargeTempC: 85,
  n: 1.16,
};

/** Distance from cylinder centre to the roller surface along the ray `psi`. */
export function rollerRadiusAt(psi, theta) {
  const { e, r } = GEO;
  const a = psi - theta;
  const s = e * Math.sin(a);
  return e * Math.cos(a) + Math.sqrt(Math.max(r * r - s * s, 0));
}

/** Enclosed crescent area between two rays, integrated. */
export function chamberArea(from, to, theta, steps = 160) {
  const { R } = GEO;
  const h = (to - from) / steps;
  let sum = 0;
  for (let i = 0; i < steps; i++) {
    // Midpoint rule: accurate enough here and free of endpoint bias.
    const psi = from + (i + 0.5) * h;
    const d = rollerRadiusAt(psi, theta);
    sum += (R * R - d * d) / 2;
  }
  return Math.abs(sum * h);
}

/** Full crescent, for normalising. */
const FULL = Math.PI * (GEO.R * GEO.R - GEO.r * GEO.r);

const ATM = 14.7;
const Pa_s = OP.suctionPsig + ATM;
const Pa_d = OP.dischargePsig + ATM;

function stateFromVolume(vFrac) {
  const v = clamp(vFrac, 0.02, 1);
  const Pabs = Math.min(Pa_s * Math.pow(1 / v, OP.n), Pa_d);
  const ratio = Math.pow(Pabs / Pa_s, (OP.n - 1) / OP.n);
  const Ks = OP.suctionTempC + 273.15;
  const anchor =
    (OP.dischargeTempC - OP.suctionTempC) / (Ks * Math.pow(Pa_d / Pa_s, (OP.n - 1) / OP.n) - Ks);
  return { psig: Pabs - ATM, tempC: OP.suctionTempC + (Ks * ratio - Ks) * anchor };
}

/**
 * Full machine state at shaft angle theta.
 *
 * Shaped so the shared template can read it. `psig`/`tempC` report the
 * COMPRESSION chamber, because that is the one the Short is about; the suction
 * chamber is reported separately and sits at suction conditions throughout.
 */
export function rotaryState(theta) {
  const th = ((theta % TAU) + TAU) % TAU;
  const v0 = GEO.vane;
  const contact = v0 + th;

  // Behind the vane and growing; ahead of the vane and shrinking.
  const aSuction = chamberArea(v0, contact, th);
  const aCompression = chamberArea(contact, v0 + TAU, th);

  const suctionFrac = clamp(aSuction / FULL, 0, 1);
  const compressionFrac = clamp(aCompression / FULL, 0, 1);

  // The compression chamber sealed a full crescent ago at suction pressure.
  const comp = stateFromVolume(compressionFrac);
  const dischargeOpen = comp.psig >= OP.dischargePsig - 0.5;

  return {
    theta: th,
    phase: dischargeOpen ? "discharge" : "compression",
    /** Angles the renderer needs so it cannot disagree with the model. */
    vaneAngle: v0,
    contactAngle: contact,
    /** Vane tip distance from the cylinder centre — how far it has extended. */
    vaneTip: rollerRadiusAt(v0, th),
    suctionFrac,
    compressionFrac,
    volumeFrac: compressionFrac,
    psig: comp.psig,
    tempC: comp.tempC,
    suction: { psig: OP.suctionPsig, tempC: OP.suctionTempC },
    dischargeOpen,
    /** A rotary has no suction valve at all — the port is simply open. */
    suctionOpen: false,
    suctionLift: 0,
    dischargeLift: dischargeOpen ? clamp((comp.psig - OP.dischargePsig + 8) / 8, 0, 1) : 0,
    pistonFrac: 0,
  };
}

/** Shaft angle at which the discharge valve first lifts. */
export const DISCHARGE_START = (() => {
  for (let a = 0.02; a < TAU; a += 0.004) {
    if (rotaryState(a).dischargeOpen) return a;
  }
  return TAU * 0.85;
})();

export { FULL };
