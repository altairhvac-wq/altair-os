/**
 * Delivery records — what makes external publishing replay-safe.
 *
 * ===================== THE PROBLEM THIS SOLVES =====================
 * Publishing used to be two non-atomic awaits:
 *
 *     await publishToProvider(...)      // the external write happens HERE
 *     await markMarketingPostPosted()   // and is remembered HERE
 *
 * Anything between them — a crash, a timeout, a dropped connection, a user
 * closing the tab — leaves a post that IS published but reads as unpublished.
 * The provider's own id for it was returned and thrown away, so afterwards
 * nothing in the system can answer "did that actually go out?". The only
 * available recovery was to try again, which double-posts.
 *
 * A delivery row is claimed BEFORE the external call and settled after, so
 * the durable record of "we started an external write" exists even when we
 * never learn the outcome. `unique (company_id, marketing_post_id, provider)`
 * in migration 143 makes the claim itself the duplicate guard: a second
 * attempt cannot insert, so it cannot silently double-post.
 *
 * ======================= WHY THIS FILE IS PURE =======================
 * No imports. The decision — may this publish proceed, and if not, why — is a
 * total function of the existing row, so every branch including the nasty
 * ones (unknown outcome, concurrent attempt) is testable without a database,
 * a provider, or a crash.
 */

/** Mirrors the `delivery_state` CHECK in migration 143. */
export const MARKETING_DELIVERY_STATES = [
  /** Claimed; the external call may be in progress or may have died. */
  "in_flight",
  /** Published. The provider id is recorded. */
  "posted",
  /** Delivered as an unpublished draft for a human to finish. */
  "draft",
  /** The attempt failed and no external object was created. */
  "failed",
] as const;
export type MarketingDeliveryState = (typeof MARKETING_DELIVERY_STATES)[number];

export type MarketingDeliveryRecord = {
  readonly id: string;
  readonly companyId: string;
  readonly marketingPostId: string;
  readonly provider: string;
  readonly deliveryState: MarketingDeliveryState;
  readonly providerPostId: string | null;
  /**
   * The provider-side object created BEFORE publishing — a Facebook Reel video
   * id, an Instagram container id (migration 145).
   *
   * Distinct from `providerPostId`, which names something that was actually
   * published. A Reel flow reserves an object at Meta, uploads to it, waits,
   * and only then publishes; a process that dies in the middle leaves
   * `providerPostId` correctly null and this set. Without it the operator
   * would be told to go reconcile with nothing to reconcile against.
   */
  readonly providerMediaId: string | null;
  readonly providerPermalink: string | null;
  readonly failureDetail: string | null;
  readonly createdAt: string;
  readonly settledAt: string | null;
};

export const DELIVERY_DECISIONS = [
  /** No prior attempt, or a clean failure. Claim and publish. */
  "PROCEED",
  /** Already published. Never publish again. */
  "ALREADY_POSTED",
  /** Already delivered as a draft awaiting the human. */
  "ALREADY_DRAFTED",
  /** Another attempt is running right now. */
  "IN_PROGRESS",
  /**
   * A claim was made and never settled, long enough ago that the process is
   * gone. The external write MAY have succeeded. This is the state that must
   * never be auto-retried.
   */
  "NEEDS_RECONCILIATION",
] as const;
export type DeliveryDecision = (typeof DELIVERY_DECISIONS)[number];

/**
 * How long an unsettled claim is treated as a live attempt rather than a
 * casualty. Generous on purpose: a slow image upload to Meta can legitimately
 * take a while, and calling a live attempt dead is how you get the duplicate
 * this whole mechanism exists to prevent.
 */
export const DELIVERY_IN_FLIGHT_GRACE_MS = 5 * 60_000;

export function decideDelivery(
  existing: MarketingDeliveryRecord | null,
  nowIso: string,
): DeliveryDecision {
  if (!existing) return "PROCEED";

  switch (existing.deliveryState) {
    case "posted":
      return "ALREADY_POSTED";
    case "draft":
      return "ALREADY_DRAFTED";
    case "failed":
      // A recorded failure means the external write did NOT create anything.
      // Retrying is the entire reason we distinguish `failed` from
      // `in_flight`.
      return "PROCEED";
    case "in_flight": {
      const claimedAt = Date.parse(existing.createdAt);
      const now = Date.parse(nowIso);
      if (Number.isNaN(claimedAt) || Number.isNaN(now)) {
        // An unreadable timestamp must fail SAFE. Treating it as stale would
        // authorize a retry against an unknown outcome.
        return "NEEDS_RECONCILIATION";
      }
      return now - claimedAt <= DELIVERY_IN_FLIGHT_GRACE_MS
        ? "IN_PROGRESS"
        : "NEEDS_RECONCILIATION";
    }
  }
}

/** True only for the one decision that may reach a provider. */
export function mayPublish(decision: DeliveryDecision): boolean {
  return decision === "PROCEED";
}

/**
 * Operator-facing explanation. Exhaustive over the union, so a new decision
 * cannot be added without someone deciding what the human is told.
 *
 * NEEDS_RECONCILIATION deliberately does not offer a retry button in its
 * wording: the correct next action is to look at the provider, not to press
 * publish again.
 */
export function describeDeliveryDecision(
  decision: DeliveryDecision,
  providerLabel: string,
  existing: MarketingDeliveryRecord | null,
): string {
  switch (decision) {
    case "PROCEED":
      return "";
    case "ALREADY_POSTED":
      return existing?.providerPermalink
        ? `Already published to ${providerLabel}. View it at ${existing.providerPermalink}`
        : `Already published to ${providerLabel}. Duplicate it to publish again.`;
    case "ALREADY_DRAFTED":
      return `Already uploaded to ${providerLabel} as a draft. Finish it in the ${providerLabel} app.`;
    case "IN_PROGRESS":
      return `A publish to ${providerLabel} is already in progress. Wait for it to finish.`;
    case "NEEDS_RECONCILIATION": {
      // The media id is named when there is one, because "go check Meta" is
      // not actionable advice without something to look for. This is the whole
      // reason migration 145 records it before publishing rather than after.
      const handle = existing?.providerMediaId
        ? ` The ${providerLabel} object to look for is ${existing.providerMediaId}.`
        : "";
      return (
        `A previous publish to ${providerLabel} started but never reported back, ` +
        `so it may or may not have gone out. Check ${providerLabel} before trying again — ` +
        `retrying now could post twice.${handle}`
      );
    }
  }
}

/** What a settled attempt records. */
export type DeliverySettlement =
  | {
      readonly outcome: "posted";
      readonly providerPostId: string;
      readonly providerPermalink?: string | null;
    }
  | {
      readonly outcome: "draft";
      readonly providerPostId?: string | null;
    }
  | { readonly outcome: "failed"; readonly failureDetail: string };

/**
 * A settlement that records a LIVE publish.
 *
 * Named here rather than re-derived at each call site so the `"posted"`
 * literal exists in exactly one place per file. `verify-marketing-delivery.mjs`
 * counts that literal in the actions to assert every claim is matched by a
 * settle, and a second copy in a type alias would have made a correct change
 * look like a miscount.
 */
export type PostedDeliverySettlement = Extract<
  DeliverySettlement,
  { outcome: "posted" }
>;

/* ------------------------------------------------- a settle that hit nothing */

export const UNMATCHED_SETTLE_OUTCOMES = [
  /**
   * The row already says exactly what this settle was trying to say. The write
   * landed on an earlier attempt whose response was lost. Nothing to do.
   */
  "ALREADY_RECORDED",
  /** The row says something else. Another attempt owns it now. */
  "SUPERSEDED",
  /** There is no row at all. */
  "VANISHED",
] as const;
export type UnmatchedSettleOutcome = (typeof UNMATCHED_SETTLE_OUTCOMES)[number];

/**
 * What it means when settling a delivery updated NO row.
 *
 * ===================== THE DEFECT THIS CLOSES =====================
 * `settleDelivery` guards its UPDATE with `delivery_state = 'in_flight'` and
 * reads the result with `maybeSingle()`. It checked only `result.error`, so a
 * zero-row match — the guard rejecting the write — returned SUCCESS. The
 * caller then marked the post `posted` on the strength of a write that never
 * happened. (Independent audit, second round.)
 *
 * ============ WHY THIS IS NOT SIMPLY "ZERO ROWS MEANS FAILURE" ============
 * Because `settlePublishedDelivery` retries. Attempt one can commit at the
 * database and still return an error to us — a timeout after commit is the
 * textbook case. Attempt two then matches zero rows precisely BECAUSE attempt
 * one worked. Calling that a failure would tell the operator to go reconcile a
 * publish that is already correctly recorded, which is its own kind of wrong.
 *
 * So the row is re-read and compared. Same outcome and same provider id means
 * the record is already right; anything else means it is not.
 *
 * Pure, so all three branches are testable without contriving a lost response.
 */
export function decideUnmatchedSettle(
  existing: MarketingDeliveryRecord | null,
  settlement: DeliverySettlement,
): UnmatchedSettleOutcome {
  if (!existing) return "VANISHED";

  // Still `in_flight` while the guarded update matched nothing is
  // contradictory, and contradictory must not read as fine.
  if (existing.deliveryState !== settlement.outcome) return "SUPERSEDED";

  if (settlement.outcome === "posted") {
    return existing.providerPostId === settlement.providerPostId
      ? "ALREADY_RECORDED"
      : "SUPERSEDED";
  }

  if (settlement.outcome === "draft") {
    const intended = settlement.providerPostId ?? null;
    if (intended !== null && existing.providerPostId !== intended) {
      return "SUPERSEDED";
    }
    return "ALREADY_RECORDED";
  }

  return "ALREADY_RECORDED";
}

/** The only outcome that means the durable record is already correct. */
export function unmatchedSettleIsRecorded(
  outcome: UnmatchedSettleOutcome,
): boolean {
  return outcome === "ALREADY_RECORDED";
}

/**
 * Operator-facing explanation, exhaustive over the union.
 *
 * Both failing branches name the provider id, because the whole reason this
 * distinction exists is that someone has to go and reconcile by hand, and
 * "something went wrong" is not something anyone can act on.
 */
export function describeUnmatchedSettle(
  outcome: UnmatchedSettleOutcome,
  providerLabel: string,
  settlement: DeliverySettlement,
): string {
  const id =
    settlement.outcome === "posted"
      ? settlement.providerPostId
      : (settlement.outcome === "draft" ? settlement.providerPostId : null) ?? null;
  const named = id ? ` The ${providerLabel} id is ${id}.` : "";

  switch (outcome) {
    case "ALREADY_RECORDED":
      return "";
    case "SUPERSEDED":
      return (
        `The delivery record for this ${providerLabel} publish was changed by ` +
        `something else before the outcome could be written, so it no longer ` +
        `describes this attempt.${named} Check ${providerLabel} and reconcile ` +
        `the record by hand — do not publish again.`
      );
    case "VANISHED":
      return (
        `The delivery record for this ${providerLabel} publish no longer ` +
        `exists, so the outcome could not be written down.${named} ` +
        `Check ${providerLabel} before doing anything else.`
      );
  }
}

export const DELIVERY_FAILURE_DETAIL_MAX = 1000;

/**
 * Failure text is written to a column with a length CHECK and is rendered to
 * an operator. Clamping here rather than at the database boundary means an
 * over-long provider error body degrades to a truncated message instead of
 * failing the settle write — which would strand the row `in_flight` and turn
 * a clean failure into a reconciliation case.
 */
export function clampFailureDetail(detail: string): string {
  const trimmed = detail.trim().replace(/\s+/g, " ");
  return trimmed.length <= DELIVERY_FAILURE_DETAIL_MAX
    ? trimmed
    : `${trimmed.slice(0, DELIVERY_FAILURE_DETAIL_MAX - 1)}…`;
}
