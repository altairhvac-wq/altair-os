/**
 * The TXV mechanism plug, in the standard plug shape, carrying its measured
 * topology attestation the same way evap-plug does (metadata.mjs embeds it
 * into scene.json for agent-side Technical QA).
 */
import { txvState } from "../mechanisms/txv.mjs";
import { drawTxv, topologyAttestation } from "../engine/txv-machine.mjs";

export const txv = {
  id: "txv",
  state: txvState,
  draw: drawTxv,
  gas() {},
  topology: topologyAttestation(),
};
