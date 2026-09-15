/**
 * The reciprocating compressor as a machine, not as a drawing.
 *
 * Everything the viewer sees — piston height, valve state, gauge needles,
 * particle colour, particle packing — is derived from ONE number: crank angle.
 * That is deliberate. A hand-keyed animation can show both valves open at once
 * because a keyframe said so; a derived one cannot, because the pressure that
 * opens a valve is the same pressure that closed the other.
 *
 * Cycle, measured from top dead centre (theta = 0):
 *   RE-EXPANSION  clearance gas expands, Pcyl falls Pd -> Ps, both valves shut
 *   SUCTION       Pcyl = Ps, suction valve OPEN, discharge SHUT, mass enters
 *   COMPRESSION   both valves SHUT, Pcyl rises Ps -> Pd
 *   DISCHARGE     Pcyl = Pd, discharge valve OPEN, suction SHUT, mass leaves
 */
import { clamp, inv } from "../engine/style.mjs";

/** Geometry in arbitrary consistent units; only ratios matter. */
export const GEO = {
  stroke: 1.0,
  rod: 2.1, // rod / crank-radius ratio, gives the asymmetric real motion
  clearance: 0.055, // clearance volume as a fraction of swept volume
};

/** Operating envelope, matched to the reference plates (R-410A-ish, psig). */
export const OP = {
  suctionPsig: 60,
  dischargePsig: 250,
  suctionTempC: 15,
  dischargeTempC: 85,
  n: 1.16, // polytropic exponent
};

const TAU = Math.PI * 2;
export const norm = (th) => ((th % TAU) + TAU) % TAU;

/**
 * Slider-crank displacement. 0 at top dead centre, 1 at bottom dead centre.
 * The rod term is what makes the piston linger at the top and hurry at the
 * bottom — take it out and the motion reads as a sine wave, which is the
 * tell-tale of an animation that was drawn rather than simulated.
 */
export function pistonFraction(theta) {
  const th = norm(theta);
  const l = GEO.rod;
  const d = 1 - Math.cos(th) + l - Math.sqrt(Math.max(l * l - Math.sin(th) ** 2, 1e-6));
  return clamp(d / 2, 0, 1);
}

/** Cylinder volume as a fraction of (swept + clearance). */
export function volumeFraction(theta) {
  const c = GEO.clearance;
  return (c + pistonFraction(theta)) / (c + 1);
}

/** Absolute pressures, because polytropic maths does not work on gauge pressure. */
const ATM = 14.7;
const Pa_s = OP.suctionPsig + ATM;
const Pa_d = OP.dischargePsig + ATM;

/** Volume at which compression from suction pressure reaches discharge pressure. */
const V_s = volumeFraction(Math.PI); // BDC, cylinder full
const V_switch = V_s * Math.pow(Pa_s / Pa_d, 1 / OP.n);
/** Volume at which the clearance gas has re-expanded back down to suction. */
const V_c = volumeFraction(0);
const V_reopen = V_c * Math.pow(Pa_d / Pa_s, 1 / OP.n);

/**
 * Full cylinder state at a crank angle.
 * Returns gauge pressures and degrees C so the HUD can print them directly.
 */
export function cylinderState(theta) {
  const th = norm(theta);
  const V = volumeFraction(th);
  const descending = th > 0 && th < Math.PI; // piston moving down
  let phase;
  let Pabs;

  if (descending) {
    if (V < V_reopen) {
      phase = "reexpansion"; // trapped clearance gas expanding, both shut
      Pabs = Pa_d * Math.pow(V_c / V, OP.n);
    } else {
      phase = "suction"; // suction valve open, cylinder filling
      Pabs = Pa_s;
    }
  } else {
    if (V > V_switch) {
      phase = "compression"; // both shut, vapour trapped and squeezed
      Pabs = Pa_s * Math.pow(V_s / V, OP.n);
    } else {
      phase = "discharge"; // discharge valve open, vapour leaving
      Pabs = Pa_d;
    }
  }

  const psig = Pabs - ATM;
  // Polytropic temperature rise, anchored so suction reads 15C and discharge 85C.
  const ratio = Math.pow(Pabs / Pa_s, (OP.n - 1) / OP.n);
  const Ks = OP.suctionTempC + 273.15;
  const K = Ks * ratio;
  const anchor =
    (OP.dischargeTempC - OP.suctionTempC) /
    (Ks * Math.pow(Pa_d / Pa_s, (OP.n - 1) / OP.n) - Ks);
  const tempC = OP.suctionTempC + (K - Ks) * anchor;

  return {
    theta: th,
    phase,
    /** 0 = piston at top, 1 = piston at bottom. */
    pistonFrac: pistonFraction(th),
    volumeFrac: V,
    descending,
    psig,
    tempC,
    /** Mutually exclusive by construction — never both true. */
    suctionOpen: phase === "suction",
    dischargeOpen: phase === "discharge",
    /** How far each reed has lifted, 0..1, with a soft edge for believability. */
    suctionLift: phase === "suction" ? liftEnvelope(V, V_reopen, V_s) : 0,
    dischargeLift: phase === "discharge" ? liftEnvelope(V_switch - V, 0, V_switch - V_c) : 0,
  };
}

/** Reeds snap open and feather shut; they do not pop between two states. */
function liftEnvelope(v, lo, hi) {
  const t = inv(lo, hi, v);
  return clamp(Math.min(1, t * 8) * Math.min(1, (1 - t) * 6 + 0.35), 0, 1);
}

/** Crank angles that put the machine mid-phase, for choreography. */
export const CUE = {
  tdc: 0,
  suctionMid: Math.PI * 0.55,
  bdc: Math.PI,
  compressionMid: Math.PI * 1.45,
  dischargeStart: (() => {
    // Solve for the angle on the upstroke where V crosses V_switch.
    let best = Math.PI * 1.6;
    for (let a = Math.PI; a < TAU; a += 0.002) {
      if (volumeFraction(a) <= V_switch) {
        best = a;
        break;
      }
    }
    return best;
  })(),
};
export const V_SWITCH = V_switch;
