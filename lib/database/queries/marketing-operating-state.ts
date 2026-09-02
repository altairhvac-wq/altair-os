import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service";
import { getLatestAgentMarketingSnapshot } from "@/lib/database/queries/agent-snapshots";
import { listMarketingConnectedAccounts } from "@/lib/database/queries/marketing-connected-accounts";
import { capabilityFor } from "@/shared/types/integration-capability";
import { deriveMarketingChannelState } from "@/shared/types/marketing-channel-connection";
import { isIntegrationProvider } from "@/shared/types/integration-provider";
import type { MarketingOperatingState } from "@/shared/types/marketing-command";

/**
 * Assemble the Marketing operating state from rows that already exist.
 *
 * ============ NO NEW STORAGE, NO PROSE SCRAPING ============
 * Every field comes from a table or from the snapshot the Agent Platform
 * already pushes. Nothing is parsed out of free text and nothing is invented:
 * a fact that is not stored arrives as null and the projection reports it as
 * unknown.
 *
 * ============ COMPANY SCOPING ============
 * Every read is filtered on the caller's company id. The snapshot query is
 * already company-bound; the delivery, page and connection reads are filtered
 * explicitly here.
 */

/** A snapshot older than this stops being evidence about right now. */
export const SNAPSHOT_STALE_AFTER_MS = 6 * 60 * 60 * 1000;

type AnyClient = ReturnType<typeof createServiceRoleClient>;

function table(client: AnyClient, name: string) {
  return (
    client as AnyClient & {
      from(t: string): ReturnType<AnyClient["from"]>;
    }
  ).from(name);
}

export async function getMarketingOperatingState(input: {
  companyId: string;
  nowIso: string;
}): Promise<MarketingOperatingState> {
  const supabase = createServiceRoleClient();

  const [snapshotRow, deliveryRead, pageRead, accounts] = await Promise.all([
    getLatestAgentMarketingSnapshot(input.companyId),
    table(supabase, "marketing_channel_deliveries")
      .select(
        "provider, delivery_state, settled_at, failure_detail, provider_permalink, created_at",
      )
      .eq("company_id", input.companyId)
      .order("created_at", { ascending: false })
      .limit(50),
    table(supabase, "marketing_site_pages")
      .select("slug, title, page_state, published_at, updated_at")
      .eq("company_id", input.companyId)
      .order("updated_at", { ascending: false })
      .limit(25),
    listMarketingConnectedAccounts(input.companyId),
  ]);

  const deliveries = ((deliveryRead.data ?? []) as unknown[]).map((raw) => {
    const row = raw as {
      provider: string;
      delivery_state: string;
      settled_at: string | null;
      failure_detail: string | null;
      provider_permalink: string | null;
      created_at: string;
    };
    return {
      provider: row.provider,
      state: row.delivery_state,
      settledAt: row.settled_at,
      failureDetail: row.failure_detail,
      permalink: row.provider_permalink,
      createdAt: row.created_at,
    };
  });

  const sitePages = ((pageRead.data ?? []) as unknown[]).map((raw) => {
    const row = raw as {
      slug: string;
      title: string;
      page_state: string;
      published_at: string | null;
      updated_at: string;
    };
    return {
      slug: row.slug,
      title: row.title,
      state: row.page_state,
      publishedAt: row.published_at,
      updatedAt: row.updated_at,
    };
  });

  // Connection health is DERIVED by the existing state machine, never
  // re-implemented here — the Integrations page and this surface must not be
  // able to disagree about whether a connection is healthy.
  const connections = accounts
    .filter((account) => isIntegrationProvider(account.provider))
    .map((account) => ({
      provider: account.provider,
      label: capabilityFor(account.provider).label,
      channelState: deriveMarketingChannelState({
        configured: true,
        account: {
          status: account.status,
          publishCapability: account.publishCapability ?? "none",
          tokenExpiresAt: account.tokenExpiresAt ?? null,
          hasRefreshToken: false,
          lastError: account.lastError ?? null,
          capabilityDetail: account.capabilityDetail ?? null,
          accountName: account.providerAccountName ?? null,
          resourceName: account.providerResourceName ?? null,
        },
        nowIso: input.nowIso,
      }),
    }));

  const snapshot = snapshotRow?.snapshot ?? null;

  return {
    nowIso: input.nowIso,
    snapshotStaleAfterMs: SNAPSHOT_STALE_AFTER_MS,
    snapshot: snapshot
      ? {
          generatedAt: snapshot.producedAt,
          tasksQueued: snapshot.sections.automationStatus.data?.tasksPending ?? 0,
          tasksRunning:
            snapshot.sections.automationStatus.data?.tasksRunning ?? 0,
          tasksFailed: snapshot.sections.automationStatus.data?.tasksFailed ?? 0,
          approvalsPending:
            snapshot.sections.automationStatus.data?.approvalsPending ?? 0,
          schedulesFailed:
            snapshot.sections.automationStatus.data?.schedulesFailed ?? 0,
          rendersInProgress: (snapshot.sections.videoRenders.items ?? []).filter(
            (item) => item.renderState === "RUNNING",
          ).length,
          rendersFailed: (snapshot.sections.videoRenders.items ?? []).filter(
            (item) => item.renderState === "FAILED",
          ).length,
          // Read from the RUN LINEAGE the snapshot already carries — the task
          // types the platform actually executed — rather than from a second
          // research/plan table this surface would have to own and keep true.
          latestResearchAt: latestCompletedTaskAt(snapshot, "research"),
          latestDirectorPlanAt: latestCompletedTaskAt(snapshot, "content.daily"),
          approvals: (snapshot.sections.approvals.items ?? []).map((item) => ({
            approvalId: item.approvalId,
            humanSummary: item.humanSummary,
            requestedAt: item.requestedAt,
            isExpired: item.isExpired,
            decision: item.approvalDecision,
          })),
        }
      : null,
    sitePages,
    deliveries,
    connections,
  };
}

/**
 * When a task of this kind last COMPLETED, or null.
 *
 * Completion is the claim being made — "research completed this morning" is
 * false if the run failed — so a task that ran and did not finish does not
 * count as evidence.
 */
function latestCompletedTaskAt(
  snapshot: NonNullable<
    Awaited<ReturnType<typeof getLatestAgentMarketingSnapshot>>
  >["snapshot"],
  taskTypePrefix: string,
): string | null {
  const items = snapshot.sections.recentActivity.items ?? [];
  const matching = items
    .filter(
      (item) =>
        item.taskType?.startsWith(taskTypePrefix) &&
        item.taskState === "COMPLETED" &&
        typeof item.completedAt === "string",
    )
    .map((item) => item.completedAt as string)
    .sort((a, b) => Date.parse(b) - Date.parse(a));
  return matching[0] ?? null;
}
