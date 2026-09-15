/**
 * DOMAIN_GAP proof for diagnostic_measurement — NOT a published Short.
 *
 * One shot per named phase, riding the presets verbatim. See
 * txv-domain-proof.mjs for the rationale.
 */
import { ease, lerp } from "../engine/style.mjs";
import { PHASE_PRESETS } from "../engine/presets.mjs";
import { superheat } from "./superheat-plug.mjs";

const P = PHASE_PRESETS.superheat;

export const spec = {
  id: "alt-hvac-proof-superheat-domain",
  title: "diagnostic_measurement — domain proof",
  topic: "Superheat measurement scene proof",
  hookType: "demonstration",
  takeaway: "The measurement stage exists and its readout subtracts.",
  takeawayType: "principle",
  mechanism: superheat,
  startTheta: 0,
  cover: { theta: P.cover.theta, cam: P.cover.cam, lines: [{ text: "CHECK" }, { text: "SUPERHEAT", accent: true }] },

  shots: P.order.map((name) => {
    const ph = P.phases[name];
    return {
      id: name,
      dur: 2400,
      theta: (k) => lerp(ph.theta[0], ph.theta[1], ease.inOut(k)),
      cam: ph.cam,
      camTo: ph.camTo,
    };
  }),

  overlays: [
    { kind: "caption", at: 400, dur: 1800, text: "domain proof — superheat" },
  ],

  narration: [
    { at: 200, text: "(silent domain proof)", visual: "phase sweep across the five measurement windows" },
  ],

  generationNotes: ["DOMAIN_GAP proof for diagnostic_measurement; not for publication."],
};
