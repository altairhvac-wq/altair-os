/**
 * Generated creative — the request ledger, and the gate an asset must pass
 * before anything may use it.
 *
 * ============== HIGGSFIELD IS A SOURCE, NOT A DESTINATION ==============
 * Every other integration in this system is somewhere content GOES. An asset
 * source is the opposite arrow: it produces creative and can never receive a
 * post. `IntegrationKind` already records that fact
 * (`./integration-provider`), and migration 181 stores it on the connection,
 * so this module does not restate it — it DERIVES from it. The list of
 * providers a generation request may be addressed to is filtered out of the
 * capability matrix, which means a provider can only become a creative source
 * by being declared `asset_source` there, and a publisher can never become one
 * by an editing slip here.
 *
 * There is deliberately no function in this file that hands an asset source a
 * piece of content. The absence is the mechanism: "publish to Higgsfield" is
 * not a disabled path, it is an unwritten one.
 *
 * ====================== WHY THIS FILE IS PURE ======================
 * Relative sibling imports only. Not `server-only`, no client, no clock, no
 * `process.env`. The promotion gate below is the decision that lets generated
 * creative into the approved library, and a gate that can only be exercised
 * with a database and a live provider behind it is a gate nobody tests.
 *
 * ================= WHAT THIS FILE DELIBERATELY DOES NOT DO =================
 * It does not learn. There is no threshold, no ranking, no "score above 0.8
 * is fine" anywhere below. The eventual quality loop — Director request,
 * prompt builder, candidates, review, an approved library that gets better
 * because it remembers what worked — needs the SHAPE of that data to exist
 * before it can be built, and this is that shape. The one rule encoded now is
 * the one that must never be relaxed later: an asset enters the library
 * because a person said so, never because a number said so.
 */
import { INTEGRATION_CAPABILITIES } from "./integration-capability";
import { INTEGRATION_PROVIDERS } from "./integration-provider";
import type { IntegrationProvider } from "./integration-provider";
import {
  DELIVERY_FAILURE_DETAIL_MAX,
  clampFailureDetail,
} from "./marketing-delivery";

/* ------------------------------------------------------ who may generate */

/**
 * Providers creative can be requested FROM.
 *
 * Derived, never hand-listed. Today this is exactly `["higgsfield"]`; the
 * point is that it is not spelled that way, so a second generator is one
 * `kind: "asset_source"` entry away and cannot be forgotten here.
 */
export const CREATIVE_ASSET_SOURCE_PROVIDERS: readonly IntegrationProvider[] =
  INTEGRATION_PROVIDERS.filter(
    (provider) => INTEGRATION_CAPABILITIES[provider].kind === "asset_source",
  );

export function isCreativeAssetSource(provider: IntegrationProvider): boolean {
  return INTEGRATION_CAPABILITIES[provider].kind === "asset_source";
}

/**
 * THE GATE on the request side, and the mirror image of `canAcceptContent`
 * in `./marketing-channel-connection`.
 *
 * A generation request may be addressed only to a provider whose declared
 * kind is `asset_source`. Asking a publisher to generate is as meaningless as
 * asking a generator to publish, and both are refused structurally rather
 * than by a call site remembering to check.
 */
export function mayRequestGenerationFrom(provider: IntegrationProvider): boolean {
  return isCreativeAssetSource(provider);
}

/* ------------------------------------------------------- what asked for it */

/**
 * An opaque JSON bag. `settings`, `approved_uses` and `performance_metadata`
 * are all typed this way on purpose: the learning loop that will read them
 * does not exist yet, and inventing its schema now would mean guessing, then
 * migrating away from the guess. An untyped object stores everything the
 * eventual reader needs and promises nothing about it in the meantime.
 */
export type CreativeJsonObject = Readonly<Record<string, unknown>>;

export const CREATIVE_SOURCE_KIND_MAX = 64;

/**
 * Mirrors the `source_kind` shape CHECK in migration 185.
 *
 * `source_kind` is a bounded machine token rather than an enum because the set
 * of things that can ask for creative is genuinely not known yet — a Director
 * brief today, a campaign or a bare operator request later. An enum would
 * require a migration for each new caller, and the predictable result of that
 * friction is a caller reusing a label that does not describe it, which
 * poisons exactly the attribution the quality loop will depend on. Bounding
 * the shape keeps it a token instead of prose; naming the set is left until
 * the set is known.
 */
export function isCreativeSourceKind(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= CREATIVE_SOURCE_KIND_MAX &&
    /^[a-z][a-z0-9_]*$/.test(value)
  );
}

/* -------------------------------------------------------- request lifecycle */

/** Mirrors the `request_state` CHECK in migration 185. */
export const CREATIVE_REQUEST_STATES = [
  /** Accepted locally; the provider has not been called yet. */
  "queued",
  /** The provider owns it. `provider_job_id` is the handle to ask about it. */
  "generating",
  /** The provider finished. Candidates may or may not be worth anything. */
  "complete",
  /** The provider gave up or errored. `error_detail` says what it said. */
  "failed",
  /** Abandoned by a human before the provider finished. */
  "cancelled",
] as const;
export type CreativeRequestState = (typeof CREATIVE_REQUEST_STATES)[number];

/** The states in which a request is no longer moving on its own. */
export const CREATIVE_TERMINAL_REQUEST_STATES: readonly CreativeRequestState[] =
  ["complete", "failed", "cancelled"];

export function isTerminalRequestState(state: CreativeRequestState): boolean {
  return CREATIVE_TERMINAL_REQUEST_STATES.includes(state);
}

/**
 * What a provider actually told us a generation cost.
 *
 * Both halves are nullable and neither defaults to zero. A generator that
 * reports credits but not dollars, or reports nothing at all, is ordinary —
 * and a zero written where nothing was reported is not a missing value, it is
 * a FALSE value that would roll up into a spend figure someone makes budget
 * decisions from. Unknown must stay distinguishable from free.
 */
export type ReportedGenerationCost = {
  readonly credits: number | null;
  readonly usd: number | null;
};

export function hasReportedCost(cost: ReportedGenerationCost): boolean {
  return cost.credits !== null || cost.usd !== null;
}

/**
 * Operator-facing cost line. Says "not reported" rather than "0" when the
 * provider said nothing, because those are different claims and only one of
 * them is true.
 */
export function describeGenerationCost(cost: ReportedGenerationCost): string {
  const parts: string[] = [];
  if (cost.credits !== null) parts.push(`${cost.credits} credits`);
  if (cost.usd !== null) parts.push(`$${cost.usd}`);
  return parts.length > 0
    ? parts.join(" / ")
    : "Cost not reported by the provider.";
}

export type CreativeGenerationRequestRecord = {
  readonly id: string;
  readonly companyId: string;
  /** Always an asset source. `mayRequestGenerationFrom` is the gate. */
  readonly provider: IntegrationProvider;
  /** What asked for this, as a bounded token — see `isCreativeSourceKind`. */
  readonly sourceKind: string;
  /** The asking thing's own id. Not a foreign key; see migration 185. */
  readonly sourceId: string | null;
  readonly prompt: string;
  readonly negativePrompt: string | null;
  readonly model: string | null;
  readonly settings: CreativeJsonObject;
  readonly requestedBy: string | null;
  readonly requestState: CreativeRequestState;
  /** The provider's own handle for the job. Null until it gives us one. */
  readonly providerJobId: string | null;
  readonly cost: ReportedGenerationCost;
  readonly errorDetail: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly settledAt: string | null;
};

/**
 * Error text is written to a length-bounded column and rendered to an
 * operator. Reuses the delivery ledger's clamp rather than growing a second
 * one: the concern is identical — an upstream error body must degrade to a
 * truncated message instead of failing the write that records the failure —
 * and the column bound in migration 185 is the same number for that reason.
 */
export const CREATIVE_DETAIL_MAX = DELIVERY_FAILURE_DETAIL_MAX;
export { clampFailureDetail as clampCreativeDetail };

/* ------------------------------------------------------ candidate quality */

/** Mirrors the `quality_state` CHECK in migration 185. */
export const CREATIVE_QUALITY_STATES = [
  /** Nobody has looked at it. The default, and the only unscored state. */
  "pending_review",
  /** A person looked and said yes. The only state that grants use. */
  "approved",
  /** Looked at and refused. `rejection_reason` is required alongside it. */
  "rejected",
] as const;
export type CreativeQualityState = (typeof CREATIVE_QUALITY_STATES)[number];

export const CREATIVE_QUALITY_SCORE_MIN = 0;
export const CREATIVE_QUALITY_SCORE_MAX = 1;

export function isQualityScoreInRange(score: number): boolean {
  return (
    Number.isFinite(score) &&
    score >= CREATIVE_QUALITY_SCORE_MIN &&
    score <= CREATIVE_QUALITY_SCORE_MAX
  );
}

/**
 * The subset of a candidate row the promotion gate reads.
 *
 * `qualityScore` is `number | null` and the column behind it is nullable with
 * NO DEFAULT. That is the single most important detail in this file. A score
 * defaulted to 0 is indistinguishable from a reviewer scoring something zero:
 * an unreviewed candidate would read as reviewed and worthless, it would be
 * filtered out of every future ranking, and the loop that is supposed to learn
 * from human judgement would be learning from a column default instead. Null
 * means "no one has judged this", which is a true statement about a candidate
 * nobody has opened. Zero is a judgement, and judgements have authors.
 */
export type CreativeGenerationCandidateFacts = {
  readonly qualityState: CreativeQualityState;
  readonly qualityScore: number | null;
  /** Null until the bytes land in our own storage. */
  readonly mediaAssetId: string | null;
  /** The person who decided. Required for `approved`; see migration 185. */
  readonly reviewedBy: string | null;
  readonly reviewedAt: string | null;
  readonly rejectionReason: string | null;
};

export type CreativeGenerationCandidateRecord =
  CreativeGenerationCandidateFacts & {
    readonly id: string;
    readonly companyId: string;
    readonly requestId: string;
    /** The provider's own id for this candidate, before we store anything. */
    readonly providerAssetId: string | null;
    /** Where an approved asset is cleared for use. Opaque until the loop exists. */
    readonly approvedUses: CreativeJsonObject;
    /** How it performed once used. Opaque until the loop exists. */
    readonly performanceMetadata: CreativeJsonObject;
    readonly createdAt: string;
    readonly updatedAt: string;
  };

/* ------------------------------------------------------- the promotion gate */

export const CANDIDATE_PROMOTION_DECISIONS = [
  /** Reviewed by a person, scored, stored. The only usable outcome. */
  "PROMOTE",
  /** The generation has not finished, so there is nothing settled to promote. */
  "REQUEST_UNFINISHED",
  /** The bytes never reached our storage. */
  "MEDIA_MISSING",
  /** Nobody has looked at it yet. */
  "AWAITING_REVIEW",
  /** A person looked and said no. */
  "REJECTED",
  /** The row says approved but names no reviewer. Approval without an author. */
  "REVIEW_INCOMPLETE",
  /** Approved by a person who recorded no score. */
  "UNSCORED",
  /**
   * The row carries a `quality_state` this build has never heard of.
   *
   * Not a hypothetical: these facts come off a database row, and a row can
   * outlive the code that reads it — an older deployment reading a table a
   * newer migration widened, a hand-edited row, a backfill. The gate cannot
   * know what such a state means, and "I do not know" must resolve to a
   * refusal rather than to a fall-through.
   */
  "UNRECOGNISED_STATE",
] as const;
export type CandidatePromotionDecision =
  (typeof CANDIDATE_PROMOTION_DECISIONS)[number];

/**
 * The fail-safe floor under an exhaustive switch, and both halves earn their
 * keep.
 *
 * COMPILE TIME: `unreachable` is typed `never`, so a call only type-checks
 * while the switch above it has covered every member of its union. Adding a
 * fourth `CreativeQualityState`, or a fourth `CandidatePromotionDecision`,
 * breaks the build at the exact switch that forgot it. A plain `default:`
 * would do the opposite — it would swallow the new member silently — which is
 * why the default branches below route through here instead of returning a
 * constant directly.
 *
 * RUN TIME: TypeScript cannot narrow a database row. A label outside the union
 * reaches the switch as a real value, matches no case, and falls out the
 * bottom. In a gate whose entire purpose is that nothing enters the approved
 * library without a human, falling out the bottom is failing OPEN. The caller
 * hands in the refusal it wants and gets it back, so the unknown state stops
 * here.
 */
function refuseUnrecognised<T>(unreachable: never, refusal: T): T {
  // Read only by the type checker; the runtime contract is the refusal.
  void unreachable;
  return refusal;
}

/**
 * May this candidate enter the approved asset library?
 *
 * ===================== WHAT THIS REFUSES =====================
 * Everything that is not an explicit human approval. There is no threshold
 * branch, no "the provider rated it highly", no auto-promote for a request
 * that finished cleanly. A generator that produces ninety candidates an hour
 * against a library that promotes on a number is a machine writing its own
 * report card, and the first bad batch propagates into every downstream use
 * before anyone sees it. Promotion costs one human decision, on purpose.
 *
 * ===================== WHY THE ORDER IS THIS ORDER =====================
 * Whether the generation finished is asked first, because a request still
 * running is not a review problem at all.
 *
 * After that the quality state is the spine, and each state decides for itself
 * whether a missing file outranks it. That distinction is the whole point: a
 * missing file means "wait for the transfer" in two of the three states and
 * means nothing at all in the third.
 *
 *   - `rejected` answers first, ahead of the media check. A rejection is a
 *     finished human decision and no transfer is coming, so reporting a
 *     missing file would tell an operator to wait for bytes that will never
 *     arrive — and would discard `rejection_reason`, which is the whole
 *     product of a rejection and what the next prompt gets written against.
 *   - `pending_review` is the opposite. The bytes ARE still expected, and
 *     "awaiting review" for an asset that does not exist yet sends the
 *     reviewer to look at nothing, so the missing transfer is reported first.
 *   - `approved` reports the missing transfer too, rather than being made
 *     impossible by a database constraint, because approving from the
 *     provider's own preview before the bytes are copied into our bucket is a
 *     legitimate order of operations. The asset is approved and simply not
 *     transferable yet; the operator needs to be told the transfer is missing,
 *     not the review.
 *
 * The switch is closed by a `never`-typed default — see `refuseUnrecognised`.
 * A state this build does not recognise must never reach the checks below it,
 * because every one of those checks is a reason to say no and running past
 * them is how a gate fails OPEN.
 *
 * A score of 0 on an approved candidate PROMOTES. The reviewer said yes, and
 * the score is evidence for a system that does not exist yet — it is not a
 * gate. Nothing here is decided by a number.
 */
export function decideCandidatePromotion(
  candidate: CreativeGenerationCandidateFacts,
  requestState: CreativeRequestState,
): CandidatePromotionDecision {
  if (requestState !== "complete") return "REQUEST_UNFINISHED";

  switch (candidate.qualityState) {
    case "rejected":
      return "REJECTED";

    case "pending_review":
      return candidate.mediaAssetId ? "AWAITING_REVIEW" : "MEDIA_MISSING";

    case "approved": {
      if (!candidate.mediaAssetId) return "MEDIA_MISSING";

      // An `approved` row that names no reviewer and no review time is
      // contradictory, and contradictory must fail SAFE. The database refuses
      // to write that combination (migration 185); this refuses to trust it if
      // some path ever does.
      if (!candidate.reviewedBy || !candidate.reviewedAt) {
        return "REVIEW_INCOMPLETE";
      }

      if (
        candidate.qualityScore === null ||
        !isQualityScoreInRange(candidate.qualityScore)
      ) {
        return "UNSCORED";
      }

      return "PROMOTE";
    }

    default:
      return refuseUnrecognised(candidate.qualityState, "UNRECOGNISED_STATE");
  }
}

/** True only for the one decision that puts an asset in the library. */
export function mayPromoteCandidate(
  decision: CandidatePromotionDecision,
): boolean {
  return decision === "PROMOTE";
}

/**
 * Operator-facing explanation, exhaustive over the union so a new decision
 * cannot be added without someone deciding what the human is told. The
 * `default` branch does not relax that: it routes through `refuseUnrecognised`,
 * whose `never` parameter still breaks the build on an uncovered decision. It
 * exists only so a decision that arrives from outside the union gets a real
 * sentence instead of the `undefined` that a switch with no default returns —
 * a declared `string` return that hands back `undefined` renders as an empty
 * card, and an empty card reads as "nothing is wrong here".
 *
 * `REJECTED` quotes the reviewer's own reason where there is one, because the
 * reason is the whole product of a rejection — it is what the next prompt is
 * supposed to be written against.
 */
export function describeCandidatePromotion(
  decision: CandidatePromotionDecision,
  candidate: CreativeGenerationCandidateFacts,
): string {
  switch (decision) {
    case "PROMOTE":
      return "";
    case "REQUEST_UNFINISHED":
      return "The generation that produced this has not finished. Wait for it to settle.";
    case "MEDIA_MISSING":
      return "The generated file has not been stored yet, so there is nothing to use. Wait for the transfer to finish.";
    case "AWAITING_REVIEW":
      return "Nobody has reviewed this yet. Generated creative is never approved automatically.";
    case "REJECTED":
      return candidate.rejectionReason
        ? `Rejected in review: ${candidate.rejectionReason}`
        : "Rejected in review.";
    case "REVIEW_INCOMPLETE":
      return "This is marked approved but records no reviewer, so the approval has no author. Review it again before using it.";
    case "UNSCORED":
      return "This was approved without a quality score. Score it before it enters the library.";
    case "UNRECOGNISED_STATE":
      return "This candidate's review state is not one this system recognises, so it cannot be used. Report it rather than approving around it.";
    default:
      return refuseUnrecognised(
        decision,
        "This candidate cannot be used, and this system cannot explain why. Report it.",
      );
  }
}
