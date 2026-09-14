/**
 * The direct-publish guard for agent-managed Reels.
 *
 * ===================== THE INCIDENT THIS ENCODES =====================
 * 2026-09-14, 02:26 UTC: minutes after the HVAC Shorts reached the approval
 * queue, a per-card click published one to Facebook — from the INSTAGRAM
 * sibling card, through the legacy Server Action, with no approval-job row,
 * no readback verification, and no scheduling. Every safeguard the
 * distribution path enforces was one button away from irrelevant, because
 * the deployment-wide kill switch (`MARKETING_PUBLISH_MODE=live`) was the
 * only thing the click consulted.
 *
 * This module is the refusal that closes that. It is consulted by BOTH
 * legacy Meta reel actions before anything is claimed or sent:
 *
 *   1. An HVAC Short (its video's `source_job_id` starts `hvac-short-`)
 *      may NEVER publish through a direct click. Its one path is
 *      approval → hvac:distribute → dispatchPublish → adapter, which is
 *      where the approval row, the release slot, the identity/caption
 *      readback and the processing verification all live.
 *   2. A bridge-opened draft (`source_type = 'agent_daily_reel'`) may only
 *      be sent to the platform it was drafted FOR. The bridge opens one
 *      post per channel by construction, so a cross-platform click is
 *      always a mistake — the Instagram caption on Facebook, or worse.
 *   3. An agent-managed video that already has a posted delivery for the
 *      requested provider — on ANY sibling post of the same video — is
 *      refused. The per-(post, provider) claim cannot see siblings, and a
 *      second sibling click is a duplicate Reel on a real account.
 *
 * ===================== WHY THIS FILE IS PURE =====================
 * Same posture as `gate.ts`, for the same reasons: relative imports of
 * nothing, no `server-only`, no environment read — so
 * `scripts/verify-hvac-publish-guards.mjs` can drive every branch with no
 * database and no credential, and so the kill switch CANNOT be an input.
 * Rule 5 of the hardening brief is structural here: `MARKETING_PUBLISH_MODE`
 * does not appear in this module, so no value of it can change an answer.
 */

export const HVAC_SHORT_JOB_PREFIX = "hvac-short-";

export type DirectReelPublishInput = {
  readonly requestedProvider: "facebook" | "instagram";
  readonly post: {
    readonly sourceType: string;
    readonly channelTarget: string;
  };
  /** The video asset's `source_job_id`, or null when the post has no asset row. */
  readonly videoSourceJobId: string | null;
  /**
   * Providers with a POSTED delivery on any post sharing this video asset,
   * this post included. The caller reads it from the delivery ledger.
   */
  readonly postedSiblingProviders: readonly string[];
};

function isAgentManaged(input: DirectReelPublishInput): boolean {
  return (
    input.post.sourceType === "agent_daily_reel" ||
    (input.videoSourceJobId !== null &&
      input.videoSourceJobId.startsWith(HVAC_SHORT_JOB_PREFIX))
  );
}

/**
 * The refusal, or null when the direct click may proceed.
 *
 * Returned, never thrown — a refusal here is an ordinary, expected outcome
 * that the action shows the founder as typed copy, exactly like the gate's.
 * Legacy manual/founder content (`sourceType` manual, founder_*, other) is
 * untouched by every rule except the one that cannot be scoped away:
 * an HVAC video is HVAC whatever row points at it.
 */
export function refuseDirectReelPublish(
  input: DirectReelPublishInput,
): string | null {
  if (
    input.videoSourceJobId !== null &&
    input.videoSourceJobId.startsWith(HVAC_SHORT_JOB_PREFIX)
  ) {
    return (
      "HVAC Shorts publish only through the approved, scheduled distribution run — " +
      "approve this card under Publishing → Today, and the distributor sends it with the " +
      "approval row, the release slot, and full readback verification. Nothing was sent."
    );
  }

  if (
    input.post.sourceType === "agent_daily_reel" &&
    (input.post.channelTarget === "facebook" ||
      input.post.channelTarget === "instagram") &&
    input.post.channelTarget !== input.requestedProvider
  ) {
    return (
      `This draft was written for ${input.post.channelTarget}, not ` +
      `${input.requestedProvider} — its caption and its delivery record belong to that ` +
      "platform. Use the sibling card drafted for " +
      `${input.requestedProvider}, or distribution will route each caption itself. Nothing was sent.`
    );
  }

  if (
    isAgentManaged(input) &&
    input.postedSiblingProviders.includes(input.requestedProvider)
  ) {
    return (
      `This video is already live on ${input.requestedProvider} from a sibling card. ` +
      "Publishing it again would put a duplicate Reel on the real account. Nothing was sent."
    );
  }

  return null;
}
