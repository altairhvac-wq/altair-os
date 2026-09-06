import "server-only";

import { mapDatabaseError } from "@/lib/database/errors";
import { createServiceRoleClient } from "@/lib/supabase/service";
import type { IntegrationProvider } from "@/shared/types/integration-provider";

/**
 * The publish-job approval record (migration 184's `marketing_publish_jobs`).
 *
 * ============ WHAT AN APPROVAL ROW IS ============
 * The gate refuses any publish without a RECORDED human approval — an
 * `approved_by` naming a real profile and an `approved_at` instant, on this
 * post, for this provider. The supervised canary scripts write this row with
 * the service client directly; this module is the same write for the
 * authenticated founder path, so an approval always looks the same in the
 * table no matter which door it came through.
 *
 * `unique (company_id, marketing_post_id, provider)` makes the record
 * idempotent: clicking publish twice re-stamps the same row rather than
 * minting a second approval, and the delivery ledger's own duplicate guard
 * is what stops a second send.
 */

type PublishJobsClient = ReturnType<typeof createServiceRoleClient>;

function publishJobsTable(client: PublishJobsClient) {
  // marketing_publish_jobs: migration 184 — wire into Database types on next
  // gen types run, as the sibling query modules do.
  return (
    client as PublishJobsClient & {
      from(table: "marketing_publish_jobs"): ReturnType<
        PublishJobsClient["from"]
      >;
    }
  ).from("marketing_publish_jobs");
}

export async function recordApprovedPublishJob(input: {
  companyId: string;
  marketingPostId: string;
  provider: IntegrationProvider;
  connectedAccountId: string;
  /** The profile id of the human whose click IS the approval. */
  approvedBy: string;
  nowIso: string;
  maxAttempts: number;
}): Promise<{ approvedAt?: string; error?: string }> {
  const supabase = createServiceRoleClient();

  const { data, error } = await publishJobsTable(supabase)
    .upsert(
      {
        company_id: input.companyId,
        marketing_post_id: input.marketingPostId,
        provider: input.provider,
        connected_account_id: input.connectedAccountId,
        job_state: "approved",
        requires_approval: true,
        approved_by: input.approvedBy,
        approved_at: input.nowIso,
        max_attempts: input.maxAttempts,
      },
      { onConflict: "company_id,marketing_post_id,provider" },
    )
    .select("approved_at")
    .single();

  if (error || !data) {
    console.error("[recordApprovedPublishJob] upsert failed:", {
      companyId: input.companyId,
      marketingPostId: input.marketingPostId,
      provider: input.provider,
      code: error?.code,
      message: error?.message,
    });
    return {
      error: mapDatabaseError(error) ?? "Failed to record the approval.",
    };
  }

  // Read back from the row, not echoed from the input: what the gate judges
  // must be what the database holds.
  const approvedAt = (data as { approved_at?: string | null }).approved_at;
  if (!approvedAt) {
    return { error: "The approval was recorded without a timestamp." };
  }

  return { approvedAt };
}
