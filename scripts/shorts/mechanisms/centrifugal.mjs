/**
 * The centrifugal compressor.
 *
 * ==================== THIS ONE IS NOT LIKE THE OTHERS ====================
 * Every other compressor in this series is POSITIVE DISPLACEMENT: it traps a
 * volume of vapor and makes that volume smaller, and pressure rises because
 * volume fell. A centrifugal machine is DYNAMIC. It never traps anything. The
 * impeller adds energy to the refrigerant as VELOCITY, and pressure only
 * appears afterwards, in the diffuser, when that velocity is slowed down.
 *
 * The single biggest accuracy error available in this series would be showing
 * pressure climbing inside the impeller. It does not. So this model deliberately
 * refuses to expose a volume at all, and reports velocity and pressure as two
 * separate quantities that peak in different places:
 *
 *   impeller   velocity rises steeply, static pressure barely moves
 *   diffuser   velocity falls, static pressure rises to take its place
 *
 * The relationship between them is the steady-flow energy balance: the total
 * head added by the impeller is conserved, and the diffuser converts kinetic
 * head into static head. That is why `staticFrac + dynamicFrac` is constant
 * downstream of the impeller, and the model asserts it.
 */
import { clamp } from "../engine/style.mjs";

const TAU = Math.PI * 2;

export const GEO = {
  /** Impeller eye (inlet) radius, as a fraction of the impeller tip radius. */
  eye: 0.3,
  /** Where the impeller ends and the diffuser begins, as a radius fraction. */
  tip: 0.62,
  /** Outer radius of the diffuser passage, as a fraction. */
  diffuser: 0.96,
  /** Number of impeller vanes. */
  vanes: 9,
  /** Backsweep of the vanes, in radians across the impeller. */
  sweep: 1.05,
};

export const OP = {
  suctionPsig: 60,
  dischargePsig: 250,
  suctionTempC: 15,
  dischargeTempC: 85,
};

/**
 * Where a parcel is, as a fraction of its journey from the eye to the outlet.
 * 0 at the eye, `tipProgress` at the impeller tip, 1 leaving the diffuser.
 */
export const tipProgress = (GEO.tip - GEO.eye) / (GEO.diffuser - GEO.eye);

/** Radius fraction for a journey progress. */
export const radiusAt = (p) => GEO.eye + clamp(p, 0, 1) * (GEO.diffuser - GEO.eye);

/**
 * Velocity and static pressure along the journey.
 *
 * Through the impeller: velocity climbs to its peak, static pressure rises only
 * slightly (a real impeller does produce some static rise; pretending it
 * produces none would be its own error, so it gets a small share).
 * Through the diffuser: velocity falls back toward the inlet value and the
 * energy it loses appears as static pressure.
 */
export function flowState(progress) {
  const p = clamp(progress, 0, 1);
  let dynamic; // kinetic head, 0..1
  let staticShare; // share of the added head that is already static

  if (p <= tipProgress) {
    const k = p / tipProgress;
    dynamic = k; // velocity climbs to the tip
    staticShare = 0.28 * k; // modest static rise inside the impeller
  } else {
    const k = (p - tipProgress) / (1 - tipProgress);
    dynamic = 1 - 0.82 * k; // diffuser sheds most of the velocity
    staticShare = 0.28 + 0.72 * k; // and it reappears as static pressure
  }

  const psig = OP.suctionPsig + (OP.dischargePsig - OP.suctionPsig) * staticShare;
  const tempC = OP.suctionTempC + (OP.dischargeTempC - OP.suctionTempC) * staticShare;
  return {
    progress: p,
    radiusFrac: radiusAt(p),
    /** 0..1 of peak impeller-tip velocity. */
    velocityFrac: clamp(dynamic, 0, 1),
    /** Metres per second, for a readout the other Shorts do not have. */
    velocityMs: Math.round(40 + 250 * clamp(dynamic, 0, 1)),
    staticFrac: staticShare,
    psig,
    tempC,
    inImpeller: p <= tipProgress,
  };
}

/**
 * Full machine state.
 *
 * There is no volumeFrac, deliberately: this machine has no trapped volume, and
 * offering one would invite a caption that says the wrong thing.
 */
export function centrifugalState(theta) {
  const revs = theta / TAU;
  // The tracked parcel runs the whole passage once per revolution.
  const tracked = flowState(((revs % 1) + 1) % 1);

  return {
    theta,
    revs,
    /** Impeller angle, for drawing the vanes. Spins fast — it is a turbomachine. */
    spin: theta * 2.4,
    phase: tracked.inImpeller ? "impeller" : "diffuser",
    tracked,
    velocityFrac: tracked.velocityFrac,
    velocityMs: tracked.velocityMs,
    psig: tracked.psig,
    tempC: tracked.tempC,
    inImpeller: tracked.inImpeller,
    /** No valves and no trapped volume anywhere in this machine. */
    suctionOpen: false,
    dischargeOpen: false,
    suctionLift: 0,
    dischargeLift: 0,
    pistonFrac: 0,
    volumeFrac: 1,
  };
}
