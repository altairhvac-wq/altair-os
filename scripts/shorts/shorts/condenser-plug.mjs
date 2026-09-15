/**
 * The condenser mechanism plug, in the standard plug shape.
 *
 * Carries `topology`: the measured attestation of the scene's flow-path
 * geometry against the semantic topology declared in
 * `mechanisms/condenser.mjs`, PLUS the loop topology the opening shots
 * establish — metadata.mjs embeds both into scene.json, where agent-side
 * Technical QA verifies that the overview and the close-up describe the same
 * circuit.
 */
import { condenserState } from "../mechanisms/condenser.mjs";
import { drawCondenser, topologyAttestation } from "../engine/condenser-machine.mjs";
import { CYCLE_TOPOLOGY } from "../engine/cycle-overview.mjs";

export const condenser = {
  id: "condenser",
  state: condenserState,
  draw: drawCondenser,
  gas() {},
  topology: { ...topologyAttestation(), cycle: CYCLE_TOPOLOGY },
};
