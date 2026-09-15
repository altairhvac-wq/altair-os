/**
 * The evaporator mechanism plug, in the standard plug shape. Lives beside the
 * Shorts (like every other plug) so generated data files import it the same
 * way they import `reciprocating` or `scroll`.
 *
 * Carries `topology`: the measured attestation of the scene's flow-path
 * geometry against the semantic topology declared in
 * `mechanisms/evaporator.mjs`. metadata.mjs embeds it into scene.json, where
 * agent-side Technical QA verifies it — the same travel-with-the-render
 * pattern as audit.json.
 */
import { evaporatorState } from "../mechanisms/evaporator.mjs";
import { drawEvaporator, topologyAttestation } from "../engine/evaporator-machine.mjs";

export const evaporator = {
  id: "evaporator",
  state: evaporatorState,
  draw: drawEvaporator,
  gas() {},
  topology: topologyAttestation(),
};
