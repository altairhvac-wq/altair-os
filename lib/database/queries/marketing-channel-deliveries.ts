import "server-only";

import { mapDatabaseError } from "@/lib/database/errors";
import { createServiceRoleClient } from "@/lib/supabase/service";
import {
  clampFailureDetail,
  decideDelivery,
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
  provider: string;
  delivery_state: string;
  provider_post_id: string | null;
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
    provider: row.provider,
    deliveryState: row.delivery_state as MarketingDeliveryRecord["deliveryState"],
    providerPostId: row.provider_post_id,
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
 * Settle a claimed delivery. THIS is where the provider's own id is finally
 * persisted — the gap the audit identified.
 *
 * Only ever moves a row out of `in_flight`, so a late settle from a
 * superseded attempt cannot overwrite a newer outcome.
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
