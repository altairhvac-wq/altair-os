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
