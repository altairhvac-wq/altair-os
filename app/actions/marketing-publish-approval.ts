"use server";

import { revalidatePath } from "next/cache";
import { updateMarketingPostAction } from "@/app/actions/marketing-posts";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import { recordAgentDecision } from "@/lib/database/queries/agent-decisions";
import { listMarketingConnectedAccounts } from "@/lib/database/queries/marketing-connected-accounts";
import { getMarketingPostById } from "@/lib/database/queries/marketing-posts";
import { recordScheduledPublishJob } from "@/lib/database/queries/marketing-publish-jobs";
import { hasCompanyRole } from "@/lib/database/types/roles";
import {
  decideDestination,
  listDestinationCandidates,
  providerForChannelTarget,
} from "@/shared/lib/marketing-publish-destination";
import { capabilityFor } from "@/shared/types/integration-capability";
import type { MarketingPost } from "@/shared/types/marketing-post";
import { describeUnpublishableMarketingPostStatus } from "@/shared/types/marketing-post";

/**
 * APPROVE FOR SCHEDULED DISTRIBUTION — the approval that carries its
 * destination (safety spine, item 5).
 *
 * ==================== WHAT ONE CLICK NOW MEANS ====================
 * Before this action, "approve" set `marketing_posts.status` and nothing
 * else: no queue row, no destination, no record of who. The publisher cron
 * cannot act on that, and must not guess. This action does three things, in
 * this order, and the first failure stops the rest:
 *
 *   1. resolves the DESTINATION — the one connected account this post
 *      publishes through — and refuses to infer it when ambiguous;
 *   2. does exactly what the old approve did to the post (through the same
 *      update action, so the schedule/status coupling stays in one place);
 *   3. writes the `marketing_publish_jobs` row: `scheduled` with the slot, or
 *      `approved` when no slot was given, `approved_by` = the clicker,
 *      `connected_account_id` = the destination — and records an APPROVED
 *      decision on the agent decision channel.
 *
 * Nothing publishes here. The cron publishes `scheduled` jobs whose
 * `run_after` has passed, and only when `MARKETING_PUBLISH_MODE` is `live`.
 *
 * ==================== WHO MAY APPROVE ====================
 * Company owner/admin, not merely `dispatchJobs`. Approval is what arms a
 * real post on a real brand account; the role that may connect the account
 * is the role that may commit content to it.
 */

export type ApproveForDistributionInput = {
  /** ISO instant, or null for "approved, slot pending". */
  scheduledAt: string | null;
  /**
   * The destination account for THIS post's channel. Required when the
   * company has more than one eligible account for that provider; otherwise
   * the single eligible account is used.
   */
  connectedAccountId?: string | null;
};

export type ApproveForDistributionResult = {
  error?: string;
  post?: MarketingPost;
  /** The queue row's state after this approval: scheduled or approved. */
  jobState?: "scheduled" | "approved";
  connectedAccountId?: string;
};

export async function approveMarketingPostForDistributionAction(
  postId: string,
  input: ApproveForDistributionInput,
): Promise<ApproveForDistributionResult> {
  const context = await getActiveCompanyContext();
  if (!context) {
    return { error: NO_ACTIVE_COMPANY_MESSAGE };
  }
  if (!hasCompanyRole(context.role, ["owner", "admin"])) {
    return {
      error:
        "Only company owners and admins can approve posts for scheduled distribution.",
    };
  }
  if (!context.permissions.dispatchJobs) {
    return { error: "You do not have permission to manage marketing posts." };
  }

  const normalizedPostId = typeof postId === "string" ? postId.trim() : "";
  if (!normalizedPostId) {
    return { error: "A valid marketing post is required." };
  }

  // Server actions receive whatever JSON the client sends.
  const scheduledAt =
    typeof input?.scheduledAt === "string" && input.scheduledAt.trim()
      ? input.scheduledAt.trim()
      : null;
  if (scheduledAt !== null && Number.isNaN(Date.parse(scheduledAt))) {
    return { error: "The release slot is not a valid date and time." };
  }
  const explicitAccountId =
    typeof input?.connectedAccountId === "string" && input.connectedAccountId.trim()
      ? input.connectedAccountId.trim()
      : null;

  const companyId = context.company.id;

  const post = await getMarketingPostById(companyId, normalizedPostId);
  if (!post) {
    return { error: "Marketing post not found." };
  }
  const statusError = describeUnpublishableMarketingPostStatus(post.status);
  if (statusError) {
    return { error: statusError };
  }

  // ---- 1. the destination ------------------------------------------------
  const provider = providerForChannelTarget(post.channelTarget);
  if (!provider) {
    return {
      error:
        "This post targets no specific channel, so it cannot be approved for distribution. Set its channel first.",
    };
  }
  const accounts = await listMarketingConnectedAccounts(companyId);
  const destination = decideDestination({
    provider,
    candidates: listDestinationCandidates(accounts, provider),
    explicitAccountId,
  });
  if (!destination.ok) {
    return { error: destination.error };
  }

  // ---- 2. the post, exactly as the old approve did it ---------------------
  const updated = await updateMarketingPostAction(
    normalizedPostId,
    scheduledAt ? { scheduledAt } : { status: "ready" },
  );
  if (updated.error || !updated.post) {
    return { error: updated.error ?? "Could not update the post." };
  }

  // ---- 3. the queue row that the publisher acts on ------------------------
  const nowIso = new Date().toISOString();
  const job = await recordScheduledPublishJob({
    companyId,
    marketingPostId: normalizedPostId,
    contentPackageId: post.contentPackageId ?? null,
    provider,
    connectedAccountId: destination.account.id,
    approver: { kind: "user", userId: context.user.id },
    scheduledFor: scheduledAt,
    nowIso,
    maxAttempts: capabilityFor(provider).maxAttempts,
  });
  if (job.error || !job.job) {
    return {
      error:
        `${job.error ?? "Failed to record the approval."} The post was marked ` +
        `${updated.post.status}, but no publish job exists, so nothing will be published.`,
      post: updated.post,
    };
  }

  const decision = await recordAgentDecision({
    companyId,
    subjectKind: "marketing_post",
    subjectId: normalizedPostId,
    decision: "APPROVED",
    note: `destination=${provider}:${destination.account.id}${scheduledAt ? ` slot=${scheduledAt}` : ""}`,
    decidedByUserId: context.user.id ?? null,
    decidedByEmail: context.user.email ?? null,
  });
  if (!decision.ok) {
    // The job stands; only the decision label failed. Say so where an
    // operator will look, as the reject path does.
    console.error("[approveMarketingPostForDistributionAction] APPROVED decision not recorded", {
      postId: normalizedPostId,
      provider,
    });
  }

  revalidatePath("/marketing");

  return {
    post: updated.post,
    jobState: job.job.jobState === "scheduled" ? "scheduled" : "approved",
    connectedAccountId: destination.account.id,
  };
}
