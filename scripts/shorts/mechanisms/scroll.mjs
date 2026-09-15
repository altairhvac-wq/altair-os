/**
 * The scroll compressor.
 *
 * A scroll does not compress like a piston and must not be animated as though
 * it does. Two interleaved involute spirals mesh; the orbiting scroll TRANSLATES
 * in a small circle without rotating about its own axis. Gas is caught in
 * crescent pockets at the outer periphery, each pocket migrates one full turn
 * inward per shaft revolution, its volume falls the whole way, and it is
 * released at the centre port.
 *
 * The two facts an animation most often gets wrong, both enforced here:
 *   1. The orbiting scroll does not spin. Every point on it traces a circle of
 *      radius r_o; the wrap's orientation is constant.
 *   2. Pockets move INWARD, not outward, and there is always a pair of them,
 *      symmetric about the centre, because the wraps touch in two places.
 */
import { clamp, inv } from "../engine/style.mjs";

const TAU = Math.PI * 2;

export const GEO = {
  rb: 21, // base circle radius
  alpha: 1.0, // wall thickness parameter; wall = rb * alpha
  phiStart: Math.PI * 0.8,
  phiEnd: Math.PI * 5.4,
};
GEO.orbit = GEO.rb * (Math.PI - GEO.alpha);
GEO.wall = GEO.rb * GEO.alpha;

export const OP = {
  suctionPsig: 60,
  dischargePsig: 250,
  suctionTempC: 15,
  dischargeTempC: 85,
  n: 1.16,
};

/** Involute of a circle, the curve every scroll wrap is built from. */
export function involute(phi, phi0, rb = GEO.rb) {
  const d = phi - phi0;
  return { x: rb * (Math.cos(phi) + d * Math.sin(phi)), y: rb * (Math.sin(phi) - d * Math.cos(phi)) };
}

/** Where the orbiting scroll sits at shaft angle theta. It never rotates. */
export const orbitOffset = (theta) => ({
  x: GEO.orbit * Math.cos(theta),
  y: GEO.orbit * Math.sin(theta),
});

/**
 * A pocket's angular position. `k` indexes pockets outward from the centre:
 * k = 0 is the one about to discharge. One full turn inward per revolution.
 */
export function pocketPhi(theta, k) {
  // WRAPPED, not cumulative. A pocket's position depends on where the shaft is
  // in its revolution, not on how many revolutions have been run: using the
  // running total marched every pocket straight off the outside of the machine
  // after the first turn, which is how this bug announced itself.
  const th = ((theta % TAU) + TAU) % TAU;
  return GEO.phiEnd - 1.1 - th - k * TAU;
}

/**
 * Pocket volume as a fraction of its volume at sealing. A scroll pocket's
 * volume falls roughly with its angular position, so the ratio is taken
 * straight off phi rather than invented.
 */
export function pocketVolume(phi) {
  const sealed = GEO.phiEnd - 1.1;
  const centre = GEO.phiStart + 1.2;
  return clamp((phi - centre) / (sealed - centre), 0.06, 1);
}

const ATM = 14.7;
const Pa_s = OP.suctionPsig + ATM;
const Pa_d = OP.dischargePsig + ATM;

/** Pressure and temperature for a pocket, polytropic on its own volume ratio. */
export function pocketState(phi) {
  const v = pocketVolume(phi);
  const Pabs = Math.min(Pa_s * Math.pow(1 / v, OP.n), Pa_d);
  const ratio = Math.pow(Pabs / Pa_s, (OP.n - 1) / OP.n);
  const Ks = OP.suctionTempC + 273.15;
  const anchor =
    (OP.dischargeTempC - OP.suctionTempC) / (Ks * Math.pow(Pa_d / Pa_s, (OP.n - 1) / OP.n) - Ks);
  return {
    phi,
    volumeFrac: v,
    psig: Pabs - ATM,
    tempC: OP.suctionTempC + (Ks * ratio - Ks) * anchor,
    /** 0 at the periphery, 1 at the discharge port. */
    progress: 1 - inv(GEO.phiStart + 1.2, GEO.phiEnd - 1.1, phi),
  };
}

/**
 * Full machine state. Shaped so the shared template can read it: `psig` and
 * `tempC` report the innermost live pocket, which is what an instrument on the
 * discharge side would actually see.
 */
export function scrollState(theta) {
  const th = ((theta % TAU) + TAU) % TAU;
  const pockets = [];
  for (let k = 0; k < 4; k++) {
    const phi = pocketPhi(theta, k);
    if (phi < GEO.phiStart + 0.6) continue;
    if (phi > GEO.phiEnd) continue;
    pockets.push(pocketState(phi));
  }
  // Innermost live pocket = the smallest phi that still exists.
  const inner = pockets.length
    ? pockets.reduce((a, b) => (b.phi < a.phi ? b : a))
    : pocketState(GEO.phiStart + 1.3);
  const discharging = inner.progress > 0.92;

  /**
   * The pocket the instruments follow.
   *
   * Reading the innermost pocket makes the gauges useless: that one is pinned
   * at discharge pressure almost all the time, so the needles never move and a
   * viewer learns nothing. Following ONE pocket from the moment it seals to the
   * moment it reaches the port is both the honest journey and the readable one
   * — it takes two shaft revolutions, and the pressure sweeps the full range.
   */
  const sealed = GEO.phiEnd - 1.1;
  const centre = GEO.phiStart + 1.2;
  const journey = ((theta % (2 * TAU)) + 2 * TAU) % (2 * TAU);
  const tracked = pocketState(Math.max(centre, sealed - journey));
  return {
    theta,
    thetaWrapped: th,
    phase: discharging ? "discharge" : "compression",
    pockets,
    tracked,
    psig: tracked.psig,
    tempC: tracked.tempC,
    volumeFrac: tracked.volumeFrac,
    discharging,
    // The template's valve chips are meaningless for a scroll and must never
    // be shown for one; they are reported false so nothing can light up.
    suctionOpen: false,
    dischargeOpen: false,
    suctionLift: 0,
    dischargeLift: 0,
    pistonFrac: 0,
  };
}
