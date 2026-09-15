/**
 * DOMAIN_GAP proof for the evaporator HEAT story on the shared orientation
 * layer — NOT a published Short. Same renderer as the shipped frost Short;
 * what is being proved here is the new opening grammar over it.
 */
import { ease, lerp } from "../engine/style.mjs";
import { PHASE_PRESETS } from "../engine/presets.mjs";
import { evaporatorHeat } from "./evap-heat-plug.mjs";

const P = PHASE_PRESETS.evaporatorHeat;

export const spec = {
  id: "alt-hvac-proof-evap-heat",
  title: "evaporator_process (heat story) — domain proof",
  topic: "evaporator heat scene proof",
  hookType: "demonstration",
  takeaway: "The evaporator heat story rides the proven coil with the loop behind it.",
  takeawayType: "principle",
  mechanism: evaporatorHeat,
  startTheta: 0,
  cover: { theta: P.cover.theta, cam: P.cover.cam, lines: [{ text: "THIS DOESN'T" }, { text: "MAKE COLD", accent: true }] },
  shots: P.order.map((name) => {
    const ph = P.phases[name];
    return { id: name, dur: 2400, theta: (k) => lerp(ph.theta[0], ph.theta[1], ease.inOut(k)), cam: ph.cam, camTo: ph.camTo };
  }),
  overlays: [{ kind: "caption", at: 400, dur: 1800, text: "domain proof — evaporator heat" }],
  narration: [{ at: 200, text: "(silent domain proof)", visual: "phase sweep across the six evaporator-heat windows" }],
  generationNotes: ["DOMAIN_GAP proof for the evaporator heat story; not for publication."],
};
