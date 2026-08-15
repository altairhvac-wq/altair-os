import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service";
import {
  parseAgentMarketingSnapshot,
  type AgentMarketingSnapshot,
} from "@/shared/types/agent-snapshot";

/**
 * Storage for the marketing read model the Agent Platform pushes.
 *
 * SERVICE-ROLE ONLY, by table grant (migration 141) and by module posture:
 * `server-only`, and every caller must already have authorized the request —
 * the ingest route by bearer secret, the Marketing page by the existing
 * company-context permission check.
 *
 * ONE ROW PER COMPANY. The upsert is the idempotency mechanism: a snapshot is
 * a full state projection, so the newest simply replaces the last. A push
 * carrying a `producedAt` no newer than the stored one is refused as
 * SUPERSEDED rather than written, which makes a duplicate or out-of-order
 * delivery a no-op instead of a rollback.
 */

const TABLE = "agent_marketing_snapshots";

type ServiceClient = ReturnType<typeof createServiceRoleClient>;

function snapshotsTable(client: ServiceClient) {
  // agent_marketing_snapshots: migration 141 — wire into Database types on
  // the next generated-types run, matching marketing_posts' own helper.
  return (
    client as ServiceClient & {
      from(table: "agent_marketing_snapshots"): ReturnType<ServiceClient["from"]>;
    }
  ).from(TABLE);
}

export type StoreSnapshotInput = {
  companyId: string;
  platformCompanyId: string;
  snapshot: AgentMarketingSnapshot;
  droppedItems: number;
  payloadBytes: number;
};

export type StoreSnapshotResult =
  | { stored: true; superseded: false; error: null }
  | { stored: false; superseded: true; error: null; storedProducedAt: string }
  | { stored: false; superseded: false; error: string };

export async function storeAgentMarketingSnapshot(
  input: StoreSnapshotInput,
): Promise<StoreSnapshotResult> {
  const supabase = createServiceRoleClient();

  const { data: existing, error: readError } = await snapshotsTable(supabase)
    .select("produced_at")
    .eq("company_id", input.companyId)
    .maybeSingle();

  if (readError) {
    console.error("[storeAgentMarketingSnapshot] read failed", {
      companyId: input.companyId,
      code: readError.code,
      message: readError.message,
    });
    return { stored: false, superseded: false, error: "Snapshot read failed" };
  }

  const storedProducedAt = (existing as { produced_at?: string } | null)
    ?.produced_at;
  if (storedProducedAt) {
    const incoming = Date.parse(input.snapshot.producedAt);
    const current = Date.parse(storedProducedAt);
    // Equal counts as superseded: re-sending the same snapshot must be a
    // no-op, not a rewrite that churns received_at.
    if (Number.isFinite(current) && incoming <= current) {
      return {
        stored: false,
        superseded: true,
        error: null,
        storedProducedAt,
      };
    }
  }

  const { error: writeError } = await snapshotsTable(supabase).upsert(
    {
      company_id: input.companyId,
      platform_company_id: input.platformCompanyId,
      contract_version: input.snapshot.contractVersion,
      produced_at: input.snapshot.producedAt,
      received_at: new Date().toISOString(),
      dropped_items: input.droppedItems,
      payload_bytes: input.payloadBytes,
      snapshot: input.snapshot,
    },
    { onConflict: "company_id" },
  );

  if (writeError) {
    console.error("[storeAgentMarketingSnapshot] write failed", {
      companyId: input.companyId,
      code: writeError.code,
      message: writeError.message,
    });
    return { stored: false, superseded: false, error: "Snapshot write failed" };
  }

  return { stored: true, superseded: false, error: null };
}

export type StoredAgentSnapshot = {
  snapshot: AgentMarketingSnapshot;
  producedAt: string;
  receivedAt: string;
  droppedItems: number;
  platformCompanyId: string;
};

/**
 * Reads the latest snapshot for a company.
 *
 * Returns null for "none has ever arrived", which the Marketing page must
 * render as "not connected" — NOT as an empty dashboard. The difference
 * between "the platform has never pushed" and "the platform pushed and there
 * is nothing to show" is the whole point of the contract's support levels,
 * and it survives only if this layer keeps it.
 *
 * The stored payload is re-parsed rather than cast: it was validated when it
 * arrived, but a row can be older than the current code, and trusting a
 * database blob to still match a TypeScript type is how a page crashes on
 * data it wrote itself.
 */
export async function getLatestAgentMarketingSnapshot(
  companyId: string,
): Promise<StoredAgentSnapshot | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await snapshotsTable(supabase)
    .select(
      "snapshot, produced_at, received_at, dropped_items, platform_company_id",
    )
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) {
    console.error("[getLatestAgentMarketingSnapshot] read failed", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return null;
  }
  if (!data) return null;

  const row = data as {
    snapshot: unknown;
    produced_at: string;
    received_at: string;
    dropped_items: number | null;
    platform_company_id: string | null;
  };

  const parsed = parseAgentMarketingSnapshot(row.snapshot);
  if (!parsed.ok) {
    console.error("[getLatestAgentMarketingSnapshot] stored payload no longer parses", {
      companyId,
      reason: parsed.error,
    });
    return null;
  }

  return {
    snapshot: parsed.snapshot,
    producedAt: row.produced_at,
    receivedAt: row.received_at,
    droppedItems: row.dropped_items ?? 0,
    platformCompanyId: row.platform_company_id ?? "",
  };
}
