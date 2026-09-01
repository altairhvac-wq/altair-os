import "server-only";

import { mapDatabaseError } from "@/lib/database/errors";
import { createServiceRoleClient } from "@/lib/supabase/service";
import {
  clampFailureDetail,
  decideDelivery,
  decideUnmatchedSettle,
  describeUnmatchedSettle,
  unmatchedSettleIsRecorded,
  type DeliveryDecision,
  type DeliverySettlement,
  type MarketingDeliveryRecord,
} from "@/shared/types/marketing-delivery";

/**
 * Delivery records for external publishing (migration 143).
 *
 * SERVICE-ROLE ONLY. Migration 143 revokes insert/update/delete from
 * `authenticated` and everything from `anon`; only `service_role` may write.
 * Dispatchers may SELECT, because "did this actually post?" is an operational
 * question they need answered.
 *
 * ==================== THE CLAIM IS THE GUARD ====================
 * `claimDelivery` INSERTs before the external call. The table's
 * `unique (company_id, marketing_post_id, provider)` means a second attempt
 * cannot insert — the unique violation IS the duplicate detection, enforced
 * by Postgres rather than by a read-then-write race in application code.
 *
 * That ordering matters. Checking for an existing row and then inserting
 * would leave a window in which two requests both see nothing and both
 * publish. Inserting first and interpreting the failure has no such window.
 */

const TABLE = "marketing_channel_deliveries";
/** Postgres unique_violation. The signal, not an error to swallow. */
const UNIQUE_VIOLATION = "23505";

type ServiceClient = ReturnType<typeof createServiceRoleClient>;

function deliveriesTable(client: ServiceClient) {
  // marketing_channel_deliveries: migration 143 — wire into Database types on
  // the next generated-types run, matching the agent-snapshots helper.
  return (
    client as ServiceClient & {
      from(table: "marketing_channel_deliveries"): ReturnType<ServiceClient["from"]>;
    }
  ).from(TABLE);
}

type DeliveryRow = {
  id: string;
  company_id: string;
  marketing_post_id: string;
  connected_account_id: string;
  provider: string;
  delivery_state: string;
  provider_post_id: string | null;
  provider_media_id: string | null;
  provider_permalink: string | null;
  failure_detail: string | null;
  created_at: string;
  settled_at: string | null;
};

function toRecord(row: DeliveryRow): MarketingDeliveryRecord {
  return {
    id: row.id,
    companyId: row.company_id,
    marketingPostId: row.marketing_post_id,
    // Projected so a reader can reach the account's token without a second
    // query. The column has always been there; the record simply never carried
    // it, which is why nothing could ask the provider anything about a post.
    connectedAccountId: row.connected_account_id,
    provider: row.provider,
    deliveryState: row.delivery_state as MarketingDeliveryRecord["deliveryState"],
    providerPostId: row.provider_post_id,
    // Absent on rows written before migration 145 added the column.
    providerMediaId: row.provider_media_id ?? null,
    providerPermalink: row.provider_permalink,
    failureDetail: row.failure_detail,
    createdAt: row.created_at,
    settledAt: row.settled_at,
  };
}

export type ClaimDeliveryInput = {
  companyId: string;
  marketingPostId: string;
  provider: string;
  connectedAccountId?: string | null;
  /** Injected so the staleness decision is not made from a hidden clock. */
  nowIso: string;
};

export type ClaimDeliveryResult = {
  /** PROCEED means the claim is held and the caller may publish. */
  decision: DeliveryDecision;
  /** The row that exists now — freshly claimed, or the pre-existing one. */
  delivery: MarketingDeliveryRecord | null;
  error?: string;
};

/**
 * Claim the right to publish this post to this provider.
 *
 * Returns PROCEED only when the caller now holds a fresh `in_flight` claim.
 * Every other decision means the caller must NOT contact the provider.
 */
export async function claimDelivery(
  input: ClaimDeliveryInput,
): Promise<ClaimDeliveryResult> {
  const client = createServiceRoleClient();

  const insert = await deliveriesTable(client)
    .insert({
      company_id: input.companyId,
      marketing_post_id: input.marketingPostId,
      provider: input.provider,
      connected_account_id: input.connectedAccountId ?? null,
      delivery_state: "in_flight",
    })
    .select("*")
    .single();

  if (!insert.error) {
    return { decision: "PROCEED", delivery: toRecord(insert.data as DeliveryRow) };
  }

  // Anything other than a unique violation is a real database failure and
  // must NOT be read as "someone else is publishing".
  if ((insert.error as { code?: string }).code !== UNIQUE_VIOLATION) {
    console.error("[claimDelivery] insert failed:", insert.error);
    return {
      decision: "IN_PROGRESS",
      delivery: null,
      error: mapDatabaseError(insert.error),
    };
  }

  // A row already exists. What it says decides whether this attempt proceeds.
  const existing = await deliveriesTable(client)
    .select("*")
    .eq("company_id", input.companyId)
    .eq("marketing_post_id", input.marketingPostId)
    .eq("provider", input.provider)
    .maybeSingle();

  if (existing.error || !existing.data) {
    // The row vanished between the violation and this read, or is unreadable.
    // Fail SAFE: refusing costs a retry, guessing costs a duplicate post.
    console.error("[claimDelivery] existing row unreadable:", existing.error);
    return {
      decision: "NEEDS_RECONCILIATION",
      delivery: null,
      error: "A previous publish attempt exists but could not be read.",
    };
  }

  const record = toRecord(existing.data as DeliveryRow);
  const decision = decideDelivery(record, input.nowIso);

  // A stale claim is NOT silently taken over. `NEEDS_RECONCILIATION` reaches
  // the operator, because the previous attempt may have published and only
  // the provider knows.
  if (decision === "PROCEED") {
    // Reached only from `failed`, where no external object was created.
    const retake = await deliveriesTable(client)
      .update({
        delivery_state: "in_flight",
        failure_detail: null,
        settled_at: null,
        connected_account_id: input.connectedAccountId ?? null,
      })
      .eq("id", record.id)
      .eq("delivery_state", "failed") // guard: only a still-failed row
      .select("*")
      .maybeSingle();

    if (retake.error || !retake.data) {
      return {
        decision: "IN_PROGRESS",
        delivery: record,
        error: "Another publish attempt started first.",
      };
    }
    return { decision: "PROCEED", delivery: toRecord(retake.data as DeliveryRow) };
  }

  return { decision, delivery: record };
}

/**
 * Record the provider-side object created before publishing.
 *
 * ==================== WHY THIS IS ITS OWN WRITE ====================
 * The Reel flows create an object at Meta — a video id, a container id — some
 * seconds to minutes before anything is published. Waiting for the settle to
 * record it means that if the process dies in that window, the durable record
 * says only "an attempt started", and the operator is asked to reconcile
 * against a provider with no identifier in hand.
 *
 * ONLY TOUCHES `in_flight`, like `settleDelivery`, so a late write from a
 * superseded attempt cannot stamp its media id onto a settled row.
 *
 * ================== WHY A FAILURE HERE STOPS THE PUBLISH ==================
 * An earlier version logged the failure and carried on, reasoning that losing
 * a breadcrumb was better than abandoning a publish about to succeed. That
 * reasoning is backwards, and the independent audit was right to call it an
 * operational gap.
 *
 * This write is the safety net for the risky window. Failing to place it and
 * then entering that window anyway is the one combination that produces the
 * unrecoverable case: a Reel that may or may not be public, with no identifier
 * to look it up by. THROWING instead gives up a publish that had not started —
 * Facebook has reserved a video id but no bytes have moved, Instagram has a
 * container it will discard — and the caller's existing catch settles the
 * delivery `failed`, so a retry is permitted immediately.
 *
 * And if this deployment cannot write one column to its own database, the
 * settle that follows the publish was about to fail too. Stopping here trades
 * a clean retryable failure for a mess.
 *
 * ================== A ZERO-ROW UPDATE IS ALSO A FAILURE ==================
 * The row was inserted `in_flight` by this caller's own claim moments ago.
 * Matching nothing means the claim has been settled or taken over by someone
 * else — which is precisely a state in which this attempt must NOT go on to
 * publish. It is detected rather than passed over silently.
 */
export async function recordDeliveryProviderMedia(input: {
  deliveryId: string;
  providerMediaId: string;
}): Promise<void> {
  const mediaId = input.providerMediaId.trim();
  if (!mediaId) {
    throw new Error(
      "The provider returned an empty media id, so nothing could be recorded before publishing.",
    );
  }

  const client = createServiceRoleClient();

  // Two attempts. A single UPDATE against our own database that fails once is
  // most likely transient, and the cost of retrying is a few milliseconds
  // against the cost of abandoning a publish for a blip.
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const result = await deliveriesTable(client)
      .update({ provider_media_id: mediaId })
      .eq("id", input.deliveryId)
      .eq("delivery_state", "in_flight")
      .select("id")
      .maybeSingle();

    if (!result.error && result.data) return;

    lastError = result.error ?? "no in_flight delivery matched";
    console.error("[recordDeliveryProviderMedia] write failed:", {
      deliveryId: input.deliveryId,
      attempt: attempt + 1,
      error: lastError,
    });
  }

  // Deliberately thrown. The caller is mid-flow with a provider object that
  // exists and nothing published yet — the only moment at which stopping is
  // still free.
  throw new Error(
    "Could not record the provider media reference, so publishing was stopped before anything went out. Nothing was published — try again.",
  );
}

/**
 * Settle a claimed delivery. THIS is where the provider's own id is finally
 * persisted — the gap the audit identified.
 *
 * Only ever moves a row out of `in_flight`, so a late settle from a
 * superseded attempt cannot overwrite a newer outcome.
 *
 * ============= A ZERO-ROW UPDATE IS A FAILURE, NOT A SUCCESS =============
 * That `in_flight` guard is the whole point, and it means the UPDATE can
 * legitimately match nothing. This function used to inspect only
 * `result.error`, so that case returned success and the caller went on to mark
 * the post `posted` on the strength of a write that never happened — the
 * precise contradiction the previous round of remediation was supposed to
 * eliminate, one layer further down.
 *
 * A miss is not automatically a failure, though: `settlePublishedDelivery`
 * retries, and a first attempt that committed but returned an error makes the
 * second attempt miss BECAUSE the first worked. So the row is re-read and
 * `decideUnmatchedSettle` compares it against what this settle intended.
 * Identical means already recorded; anything else is reported.
 */
export async function settleDelivery(input: {
  deliveryId: string;
  settlement: DeliverySettlement;
  nowIso: string;
}): Promise<{ error?: string }> {
  const client = createServiceRoleClient();
  const s = input.settlement;

  const patch: Record<string, unknown> = {
    delivery_state: s.outcome,
    settled_at: input.nowIso,
  };

  if (s.outcome === "posted") {
    patch.provider_post_id = s.providerPostId;
    patch.provider_permalink = s.providerPermalink ?? null;
    patch.failure_detail = null;
    // Migration 186. Omitted rather than defaulted to `{}` when the adapter
    // reported nothing, so an empty object means "the adapter had nothing to
    // say" and a missing key means "this settle predates the column" —
    // distinguishable by anything reconciling later.
    if (s.providerResult) {
      patch.provider_result = s.providerResult;
    }
  } else if (s.outcome === "draft") {
    patch.provider_post_id = s.providerPostId ?? null;
    patch.failure_detail = null;
  } else {
    patch.failure_detail = clampFailureDetail(s.failureDetail);
  }

  const result = await deliveriesTable(client)
    .update(patch)
    .eq("id", input.deliveryId)
    .eq("delivery_state", "in_flight")
    .select("id")
    .maybeSingle();

  if (result.error) {
    // The external write already happened. Losing this record is bad, so it
    // is logged loudly — the row stays `in_flight` and surfaces as a
    // reconciliation case rather than silently reverting to publishable.
    console.error("[settleDelivery] settle failed:", {
      deliveryId: input.deliveryId,
      outcome: s.outcome,
      error: result.error,
    });
    return { error: mapDatabaseError(result.error) };
  }

  if (!result.data) {
    // No row matched the `in_flight` guard. Find out why before deciding
    // whether that matters.
    const current = await deliveriesTable(client)
      .select("*")
      .eq("id", input.deliveryId)
      .maybeSingle();

    if (current.error) {
      console.error("[settleDelivery] settle matched no row and the row could not be re-read:", {
        deliveryId: input.deliveryId,
        outcome: s.outcome,
        error: current.error,
      });
      return { error: mapDatabaseError(current.error) };
    }

    const record = current.data ? toRecord(current.data as DeliveryRow) : null;
    const outcome = decideUnmatchedSettle(record, s);

    if (unmatchedSettleIsRecorded(outcome)) {
      // An earlier attempt of this same settle already landed. Nothing to do,
      // and nothing to alarm anyone about.
      return {};
    }

    console.error("[settleDelivery] settle matched no in_flight row:", {
      deliveryId: input.deliveryId,
      intendedOutcome: s.outcome,
      actualState: record?.deliveryState ?? "(no row)",
      unmatched: outcome,
    });
    return { error: describeUnmatchedSettle(outcome, record?.provider ?? "the provider", s) };
  }

  return {};
}

/** Read-only lookup for the UI and for reconciliation. */
export async function listDeliveriesForPost(
  companyId: string,
  marketingPostId: string,
): Promise<MarketingDeliveryRecord[]> {
  const client = createServiceRoleClient();
  const result = await deliveriesTable(client)
    .select("*")
    .eq("company_id", companyId)
    .eq("marketing_post_id", marketingPostId);

  if (result.error || !result.data) {
    console.error("[listDeliveriesForPost] lookup failed:", result.error);
    return [];
  }
  return (result.data as DeliveryRow[]).map(toRecord);
}

/**
 * Deliveries that actually reached the provider and carry an id to ask about.
 *
 * This is the insights collector's work list. `provider_post_id not is null` is
 * the load-bearing filter: a row can be `posted` with a null id only if a
 * settle raced, and asking Meta about nothing would be a request per run that
 * can never succeed.
 */
export async function listPostedDeliveries(
  companyId: string,
): Promise<MarketingDeliveryRecord[]> {
  const client = createServiceRoleClient();
  const result = await deliveriesTable(client)
    .select("*")
    .eq("company_id", companyId)
    .eq("delivery_state", "posted")
    .not("provider_post_id", "is", null);

  if (result.error || !result.data) {
    console.error("[listPostedDeliveries] lookup failed:", result.error);
    return [];
  }
  return (result.data as DeliveryRow[]).map(toRecord);
}

/**
 * Claims that were never settled and are past the grace period. This is the
 * operator's reconciliation queue: each one is a post that may or may not
 * exist at the provider.
 */
export async function listUnsettledDeliveries(
  companyId: string,
  olderThanIso: string,
): Promise<MarketingDeliveryRecord[]> {
  const client = createServiceRoleClient();
  const result = await deliveriesTable(client)
    .select("*")
    .eq("company_id", companyId)
    .eq("delivery_state", "in_flight")
    .lt("created_at", olderThanIso);

  if (result.error || !result.data) {
    console.error("[listUnsettledDeliveries] lookup failed:", result.error);
    return [];
  }
  return (result.data as DeliveryRow[]).map(toRecord);
}
