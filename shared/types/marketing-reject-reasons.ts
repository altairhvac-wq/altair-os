/**
 * The reject-reason vocabulary — versioned in CODE, deliberately not in a
 * database CHECK.
 *
 * ==================== WHY A VERSION ON A WORD LIST ====================
 * Labels, once collected under a taxonomy, are the one acknowledged
 * irreversibility in the whole learning design: a reason recorded under v1
 * means what v1 meant, forever. So the taxonomy carries a version, every
 * consumer joins on it, and revising the list is a NEW version — never an
 * edit that silently changes what old rows meant. The database column
 * (`marketing_posts.archived_reason`, migration 196) stays a free string
 * for exactly this reason.
 *
 * ==================== THE INITIAL SET, AND A KNOWN TENSION ====================
 * This is the planning package's initial set (Altair-agent-platform
 * docs/quality-learning/06-HUMAN-FEEDBACK-STRATEGY.md). The same package's
 * safety analysis caps a healthy taxonomy at ~8 codes; this set has 12.
 * Ship the documented set, watch the tag-entropy the design already calls
 * for, and let the owner retire codes into v2 — a smaller v1 invented here
 * would be this file overriding the design review.
 *
 * `SUPERSEDED` is load-bearing: the queue holds stale drafts whose archive
 * must be distinguishable from an active rejection, or every cleanup
 * evening poisons the label stream.
 */

export const REJECT_REASON_TAXONOMY_VERSION = "reject-reasons-v1";

export const REJECT_REASONS = [
  "MISPRONOUNCED",
  "ROBOTIC",
  "PACING",
  "SCRIPT_WEAK",
  "HOOK_WEAK",
  "VISUALS_WRONG",
  "CAPTIONS_BAD",
  "AUDIO_LEVEL",
  "FACTUAL_BRAND",
  "TOPIC_WRONG",
  "SUPERSEDED",
  "OTHER",
] as const;

export type RejectReason = (typeof REJECT_REASONS)[number];

export function isRejectReason(value: string): value is RejectReason {
  return (REJECT_REASONS as readonly string[]).includes(value);
}

/** Human labels for the picker — the codes stay the stored vocabulary. */
export const REJECT_REASON_LABELS: Record<RejectReason, string> = {
  MISPRONOUNCED: "Mispronounced something",
  ROBOTIC: "Voice sounds robotic",
  PACING: "Pacing is off",
  SCRIPT_WEAK: "Script is weak",
  HOOK_WEAK: "Hook is weak",
  VISUALS_WRONG: "Wrong visuals",
  CAPTIONS_BAD: "Caption problems",
  AUDIO_LEVEL: "Audio level problems",
  FACTUAL_BRAND: "Factual or brand problem",
  TOPIC_WRONG: "Wrong topic",
  SUPERSEDED: "Superseded (not a rejection)",
  OTHER: "Other",
};
