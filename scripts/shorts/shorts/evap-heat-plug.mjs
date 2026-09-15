/**
 * The evaporator plug for the HEAT-ABSORPTION story.
 *
 * Same renderer and same attested geometry as `evap-plug.mjs` — this is the
 * proven evaporator scene, not a second one. What differs is the theta
 * timeline: it opens on the whole refrigeration loop and travels in, and it
 * models a HEALTHY coil (no frost, boiling completing before the outlet)
 * because the subject is what the component does, not what it looks like
 * when it is misbehaving.
 */
import { evaporatorHeatState } from "../mechanisms/evaporator.mjs";
import { drawEvaporator, topologyAttestation } from "../engine/evaporator-machine.mjs";
import { CYCLE_TOPOLOGY } from "../engine/cycle-overview.mjs";

export const evaporatorHeat = {
  id: "evaporatorHeat",
  state: evaporatorHeatState,
  draw: drawEvaporator,
  gas() {},
  topology: { ...topologyAttestation(), cycle: CYCLE_TOPOLOGY },
};
