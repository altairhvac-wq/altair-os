/**
 * The diagnostic_measurement model — superheat, measured on screen.
 *
 * ==================== WHY THIS SCENE EXISTS ====================
 * Every diagnostic Short so far has POINTED at measurements; none has made
 * the measurement the subject. This scene closes the
 * `diagnostic_measurement` DOMAIN_GAP with the trade's bread-and-butter
 * reading: superheat at the evaporator outlet. Two instruments on one pipe —
 * a pressure port feeding a gauge (pressure → saturation temperature) and a
 * temperature clamp (line temperature) — and a readout that does the one
 * honest thing a readout can do: subtract.
 *
 * ==================== NUMBERS, HANDLED THE SERIES WAY ====================
 * The displayed figures are the series' MODELED EXAMPLE operating point,
 * never a universal claim (the readout hardware itself carries a
 * "modeled example" etch, and the plan must scope them modeled-example).
 * The superheat figure is COMPUTED from the other two every frame —
 * state.superheatK is line temperature minus saturation temperature by
 * construction, render.mjs re-checks the subtraction on every audit row,
 * and Technical QA re-checks it again from the shipped rows. The gauge
 * cannot disagree with the arithmetic because the arithmetic is the model.
 *
 * ==================== THE THETA TIMELINE ====================
 *   window 0  [0,TAU)      scene: line, port, clamp, blank readout
 *   window 1  [TAU,2TAU)   pressure: gauge live, saturation temp derived
 *   window 2  [2TAU,3TAU)  temperature: clamp live, line temp lands
 *   window 3  [3TAU,4TAU)  subtract: superheat computes on the readout
 *   window 4  [4TAU,∞)     meaning: the number holds; narration interprets
 */
import { clamp } from "../engine/style.mjs";

const TAU = Math.PI * 2;

export const OP = {
  /** Modeled example: the series' low side. */
  suctionPsig: 60,
  /** Saturation temperature at that pressure (modeled example refrigerant). */
  satTempC: 5,
  /** Line temperature at the clamp, a few degrees of healthy superheat. */
  lineTempC: 11,
};

export const TOPOLOGY = {
  domain: "diagnostic_measurement",
  flowOrder: ["evaporator-coil (context)", "evaporator-outlet", "suction-line", "compressor (context)"],
  instruments: {
    "pressure-port": {
      on: "suction-line",
      feeds: "gauge",
      yields: "suction pressure -> saturation temperature (P-T relationship)",
    },
    "temperature-clamp": {
      on: "suction-line",
      near: "evaporator-outlet",
      yields: "line temperature",
    },
    readout: {
      derives: "superheat = line temperature - saturation temperature",
      note: "computed from the two inputs every frame; never typed",
    },
  },
  meaning: {
    low: "refrigerant still boiling at the measurement point — the coil is overfed or airflow-starved",
    high: "vapor warmed far past saturation — the coil is being starved of refrigerant",
    caution: "target values are system-dependent; this scene shows ONE modeled example",
  },
};

/** Deterministic needle-life flutter: tiny, seeded by theta, never random. */
function flutter(theta, seed, amp) {
  return Math.sin(theta * 1.7 + seed) * amp + Math.sin(theta * 0.61 + seed * 2.3) * amp * 0.5;
}

export function superheatState(theta) {
  const win = Math.max(0, Math.floor(theta / TAU));
  const k = clamp((theta - win * TAU) / TAU, 0, 1);

  // Instrument reveal levels, one per teaching beat, monotonic per window.
  const pressureLive = win >= 2 ? 1 : win === 1 ? clamp(k * 1.6, 0, 1) : 0;
  const tempLive = win >= 3 ? 1 : win === 2 ? clamp(k * 1.6, 0, 1) : 0;
  const shLive = win >= 4 ? 1 : win === 3 ? clamp(k * 1.6, 0, 1) : 0;

  const psig = OP.suctionPsig + flutter(theta, 1.1, 0.35);
  const satTempC = OP.satTempC + flutter(theta, 2.2, 0.06);
  const lineTempC = OP.lineTempC + flutter(theta, 3.3, 0.08);
  // THE subtraction — the only place the displayed superheat may come from.
  const superheatK = lineTempC - satTempC;

  return {
    theta,
    window: win,
    windowK: k,
    phase: ["scene", "pressure", "temperature", "subtract", "meaning"][Math.min(win, 4)],
    pressureLive,
    tempLive,
    shLive,
    satTempC,
    lineTempC,
    superheatK,
    flow: theta * 0.55,
    auditExtra: {
      win,
      satC: +satTempC.toFixed(2),
      lineC: +lineTempC.toFixed(2),
      sh: +superheatK.toFixed(2),
    },
    // Template compatibility. The series gauge cluster stays OFF: this
    // scene draws its own instruments as hardware, which is the subject.
    psig,
    tempC: lineTempC,
    volumeFrac: 1,
    suctionOpen: false,
    dischargeOpen: false,
    suctionLift: 0,
    dischargeLift: 0,
    pistonFrac: 0,
  };
}
