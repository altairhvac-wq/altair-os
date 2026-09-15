/**
 * The superheat-measurement mechanism plug, in the standard plug shape,
 * carrying its measured topology attestation (embedded into scene.json by
 * metadata.mjs for agent-side Technical QA).
 */
import { superheatState } from "../mechanisms/superheat.mjs";
import { drawSuperheat, topologyAttestation } from "../engine/superheat-machine.mjs";

export const superheat = {
  id: "superheat",
  state: superheatState,
  draw: drawSuperheat,
  gas() {},
  topology: topologyAttestation(),
};
