/**
 * DOMAIN_GAP proof for metering_device_process — NOT a published Short.
 *
 * One shot per named phase, riding the presets verbatim, so the scene can be
 * probed, visually reviewed and regression-checked before any agent plans a
 * Short on it. Kept beside the shipped Shorts the way the recip gold
 * standard is kept: the proof IS the documentation of what the stage can do.
 */
import { ease, lerp } from "../engine/style.mjs";
import { PHASE_PRESETS } from "../engine/presets.mjs";
import { txv } from "./txv-plug.mjs";

const P = PHASE_PRESETS.txv;

export const spec = {
  id: "alt-hvac-proof-txv-domain",
  title: "metering_device_process — domain proof",
  topic: "TXV scene proof",
  hookType: "demonstration",
  takeaway: "The TXV stage exists and its topology attests.",
  takeawayType: "principle",
  mechanism: txv,
  startTheta: 0,
  cover: { theta: P.cover.theta, cam: P.cover.cam, lines: [{ text: "WHAT DOES IT" }, { text: "CONTROL?", accent: true }] },

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
    { kind: "caption", at: 400, dur: 1800, text: "domain proof — txv" },
  ],

  narration: [
    { at: 200, text: "(silent domain proof)", visual: "phase sweep across the five txv windows" },
  ],

  generationNotes: ["DOMAIN_GAP proof for metering_device_process; not for publication."],
};
