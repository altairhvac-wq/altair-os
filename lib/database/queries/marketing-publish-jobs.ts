import "server-only";

import { mapDatabaseError } from "@/lib/database/errors";
import { createServiceRoleClient } from "@/lib/supabase/service";
import type { IntegrationProvider } from "@/shared/types/integration-provider";
import {
  leaseExpiryFor,
  type JobOutcomeDecision,
  type PublishJobRecord,
  type PublishJobState,
} from "@/shared/types/publish-job";

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

/* ====================================================================== *
 *            THE QUEUE AS THE PUBLISHER SEES IT (migration 184 + 204)
 * ====================================================================== */

type PublishJobRow = {
  id: string;
  company_id: string;
  marketing_post_id: string;
  content_package_id: string | null;
  provider: string;
  connected_account_id: string | null;
  job_state: string;
  attempt: number;
  max_attempts: number;
  run_after: string;
  lease_expires_at: string | null;
  leased_by: string | null;
  last_error: string | null;
  scheduled_for: string | null;
  requires_approval: boolean;
  approved_by: string | null;
  approved_by_policy: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
};

const JOB_SELECT =
  "id, company_id, marketing_post_id, content_package_id, provider, connected_account_id, job_state, attempt, max_attempts, run_after, lease_expires_at, leased_by, last_error, scheduled_for, requires_approval, approved_by, approved_by_policy, approved_at, created_at, updated_at";

function toJobRecord(row: PublishJobRow): PublishJobRecord {
  return {
    id: row.id,
    companyId: row.company_id,
    marketingPostId: row.marketing_post_id,
    contentPackageId: row.content_package_id,
    provider: row.provider,
    connectedAccountId: row.connected_account_id,
    jobState: row.job_state as PublishJobState,
    attempt: row.attempt,
    maxAttempts: row.max_attempts,
    runAfter: row.run_after,
    leaseExpiresAt: row.lease_expires_at,
    leasedBy: row.leased_by,
    lastError: row.last_error,
    scheduledFor: row.scheduled_for,
    requiresApproval: row.requires_approval,
    approvedBy: row.approved_by,
    approvedByPolicy: row.approved_by_policy ?? null,
    approvedAt: row.approved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getPublishJobForPost(input: {
  companyId: string;
  marketingPostId: string;
  provider: IntegrationProvider;
}): Promise<{ job: PublishJobRecord | null; error?: string }> {
  const supabase = createServiceRoleClient();
  const { data, error } = await publishJobsTable(supabase)
    .select(JOB_SELECT)
    .eq("company_id", input.companyId)
    .eq("marketing_post_id", input.marketingPostId)
    .eq("provider", input.provider)
    .maybeSingle();

  if (error) {
    console.error("[getPublishJobForPost] query failed:", {
      companyId: input.companyId,
      marketingPostId: input.marketingPostId,
      provider: input.provider,
      code: error.code,
      message: error.message,
    });
    return { job: null, error: mapDatabaseError(error) ?? "Could not read the publish job." };
  }
  return { job: data ? toJobRecord(data as PublishJobRow) : null };
}

/** Who approved: a person (profile id) or a named policy. Never both. */
export type PublishJobApprover =
  | { readonly kind: "user"; readonly userId: string }
  | { readonly kind: "policy"; readonly policy: `policy:${string}` };

/**
 * The approval that carries its destination (the safety spine, item 5).
 *
 * Writes ONE queue row per (company, post, provider) with the explicit
 * `connected_account_id`, the approver, and the slot:
 *
 *   scheduledFor set   -> job_state 'scheduled', run_after = scheduledFor
 *   scheduledFor null  -> job_state 'approved'  (a slot is still owed)
 *
 * Refuses when the existing row is already `publishing`, `published` or
 * `cancelled`: an approval must never reopen work a worker holds or has
 * finished, and `cancelled` is terminal by the state machine. A `failed`,
 * `draft`, `ready_for_approval`, `approved` or `scheduled` row is rewritten
 * with attempt reset to 0 — re-approving IS the human's "try again".
 */
export async function recordScheduledPublishJob(input: {
  companyId: string;
  marketingPostId: string;
  contentPackageId: string | null;
  provider: IntegrationProvider;
  connectedAccountId: string;
  approver: PublishJobApprover;
  scheduledFor: string | null;
  nowIso: string;
  maxAttempts: number;
}): Promise<{ job?: PublishJobRecord; error?: string }> {
  const existing = await getPublishJobForPost(input);
  if (existing.error) return { error: existing.error };

  const held = existing.job;
  if (held) {
    if (held.jobState === "publishing") {
      return {
        error:
          "A publish for this post and channel is running right now. Wait for it to finish before approving again.",
      };
    }
    if (held.jobState === "published") {
      return {
        error:
          "This post has already been through the publish queue for this channel. Duplicate it to publish again.",
      };
    }
    if (held.jobState === "cancelled") {
      return {
        error:
          "This post's publish to this channel was cancelled, which is permanent. Duplicate the post to publish it.",
      };
    }
  }

  if (!input.connectedAccountId.trim()) {
    return { error: "An approval must name the destination account." };
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await publishJobsTable(supabase)
    .upsert(
      {
        company_id: input.companyId,
        marketing_post_id: input.marketingPostId,
        content_package_id: input.contentPackageId,
        provider: input.provider,
        connected_account_id: input.connectedAccountId,
        job_state: input.scheduledFor ? "scheduled" : "approved",
        attempt: 0,
        max_attempts: input.maxAttempts,
        run_after: input.scheduledFor ?? input.nowIso,
        lease_expires_at: null,
        leased_by: null,
        last_error: null,
        scheduled_for: input.scheduledFor,
        requires_approval: true,
        approved_by: input.approver.kind === "user" ? input.approver.userId : null,
        approved_by_policy:
          input.approver.kind === "policy" ? input.approver.policy : null,
        approved_at: input.nowIso,
      },
      { onConflict: "company_id,marketing_post_id,provider" },
    )
    .select(JOB_SELECT)
    .single();

  if (error || !data) {
    console.error("[recordScheduledPublishJob] upsert failed:", {
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

  return { job: toJobRecord(data as PublishJobRow) };
}

/**
 * The rows a publisher run should LOOK AT. Not the rows it may take: that is
 * `decideJobLease`'s call, per row, against the injected clock. `publishing`
 * rows are included so an expired lease can be reclaimed.
 */
export async function listLeasablePublishJobs(input: {
  nowIso: string;
  limit: number;
}): Promise<PublishJobRecord[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await publishJobsTable(supabase)
    .select(JOB_SELECT)
    .in("job_state", ["scheduled", "publishing"])
    .lte("run_after", input.nowIso)
    .order("run_after", { ascending: true })
    .limit(Math.max(1, Math.min(200, Math.trunc(input.limit))));

  if (error) {
    console.error("[listLeasablePublishJobs] query failed:", {
      code: error.code,
      message: error.message,
    });
    return [];
  }
  return ((data ?? []) as PublishJobRow[]).map(toJobRecord);
}

/**
 * Take a lease: compare-and-set on (state, attempt, lease holder), so two
 * runners that saw the same row cannot both win. Returns the leased row, or
 * null when something else moved it first — which is not an error.
 */
export async function leasePublishJob(input: {
  job: PublishJobRecord;
  leasedBy: string;
  nowIso: string;
}): Promise<{ job: PublishJobRecord | null; error?: string }> {
  const supabase = createServiceRoleClient();
  const { job } = input;

  let query = publishJobsTable(supabase)
    .update({
      job_state: "publishing",
      attempt: job.attempt + 1,
      leased_by: input.leasedBy,
      lease_expires_at: leaseExpiryFor(input.nowIso),
    })
    .eq("id", job.id)
    .eq("job_state", job.jobState)
    .eq("attempt", job.attempt);
  query =
    job.leasedBy === null
      ? query.is("leased_by", null)
      : query.eq("leased_by", job.leasedBy);

  const { data, error } = await query.select(JOB_SELECT).maybeSingle();

  if (error) {
    console.error("[leasePublishJob] update failed:", {
      jobId: job.id,
      code: error.code,
      message: error.message,
    });
    return { job: null, error: mapDatabaseError(error) ?? "Could not lease the job." };
  }
  return { job: data ? toJobRecord(data as PublishJobRow) : null };
}

/**
 * Write the outcome `decideJobOutcome` chose. Guarded on the lease holder:
 * a settle from a runner that no longer owns the row writes nothing and says
 * so, rather than overwriting a reclaimer's state.
 */
export async function settlePublishJob(input: {
  jobId: string;
  leasedBy: string;
  decision: JobOutcomeDecision;
  nowIso: string;
}): Promise<{ matched: boolean; error?: string }> {
  const supabase = createServiceRoleClient();
  const { decision } = input;

  const { data, error } = await publishJobsTable(supabase)
    .update({
      job_state: decision.jobState,
      attempt: decision.attempt,
      last_error: decision.lastError,
      lease_expires_at: null,
      leased_by: null,
      ...(decision.jobState === "scheduled" ? { run_after: decision.runAfter } : {}),
    })
    .eq("id", input.jobId)
    .eq("job_state", "publishing")
    .eq("leased_by", input.leasedBy)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[settlePublishJob] update failed:", {
      jobId: input.jobId,
      jobState: decision.jobState,
      code: error.code,
      message: error.message,
    });
    return { matched: false, error: mapDatabaseError(error) ?? "Could not settle the job." };
  }
  return { matched: Boolean(data) };
}
