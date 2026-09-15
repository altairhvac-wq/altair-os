/**
 * DOMAIN_GAP proof for condenser_process + full_cycle_overview — NOT a
 * published Short.
 *
 * One shot per named phase, riding the presets verbatim, so the new scene
 * and the new orientation layer can be probed and visually reviewed before
 * any agent plans a Short on them. The proof IS the documentation of what
 * the stage can do.
 */
import { ease, lerp } from "../engine/style.mjs";
import { PHASE_PRESETS } from "../engine/presets.mjs";
import { condenser } from "./condenser-plug.mjs";

const P = PHASE_PRESETS.condenser;

export const spec = {
  id: "alt-hvac-proof-condenser-domain",
  title: "condenser_process — domain proof",
  topic: "condenser scene proof",
  hookType: "demonstration",
  takeaway: "The condenser stage exists, its topology attests, and the loop opens it.",
  takeawayType: "principle",
  mechanism: condenser,
  startTheta: 0,
  cover: { theta: P.cover.theta, cam: P.cover.cam, lines: [{ text: "WHERE DOES" }, { text: "THE HEAT GO?", accent: true }] },
  shots: P.order.map((name) => {
    const ph = P.phases[name];
    return { id: name, dur: 2400, theta: (k) => lerp(ph.theta[0], ph.theta[1], ease.inOut(k)), cam: ph.cam, camTo: ph.camTo };
  }),
  overlays: [{ kind: "caption", at: 400, dur: 1800, text: "domain proof — condenser" }],
  narration: [{ at: 200, text: "(silent domain proof)", visual: "phase sweep across the six condenser windows" }],
  generationNotes: ["DOMAIN_GAP proof for condenser_process; not for publication."],
};
