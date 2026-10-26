import { NextResponse } from "next/server";
import { getCronSecret, isAuthorizedCronRequest } from "@/lib/automation/env";
import { recordAgentDecision } from "@/lib/database/queries/agent-decisions";
import {
  getMarketingConnectedAccountByIdAdmin,
  listConnectedAccountsForCompaniesAdmin,
  setConnectionPublishingPause,
} from "@/lib/database/queries/marketing-connected-accounts-admin";
import { listDeliveriesForPost } from "@/lib/database/queries/marketing-channel-deliveries";
import { getMediaAssetById } from "@/lib/database/queries/marketing-media-assets";
import {
  getMarketingPostByIdAdmin,
  createHqSocialDraftPostAdmin,
  listAutoApproveCandidatePosts,
  markMarketingPostPostedAdmin,
  scheduleDraftMarketingPostAdmin,
} from "@/lib/database/queries/marketing-posts";
import {
  leasePublishJob,
  listLeasablePublishJobs,
  recordScheduledPublishJob,
  settlePublishJob,
} from "@/lib/database/queries/marketing-publish-jobs";
import { getContentPackageBriefForPublish } from "@/lib/database/queries/marketing-site-pages";
import {
  recordPlatformAutomationRunFinished,
  recordPlatformAutomationRunStarted,
  sanitizeErrorSummary,
} from "@/lib/database/services/platform-automation-runs";
import { isAltairSiteConfigured } from "@/lib/integrations/altair-site/env";
import { isIntegrationEncryptionConfigured } from "@/lib/integrations/env";
import { isFacebookOAuthConfigured } from "@/lib/integrations/facebook/env";
import { isYouTubeOAuthConfigured } from "@/lib/integrations/youtube/env";
import { createMediaReadGrant } from "@/lib/media/marketing-media-storage";
import {
  createRequestId,
  requestIdFromHeaders,
  runOperation,
} from "@/lib/operations";
import { finishCronCheckIn, startCronCheckIn } from "@/lib/operations/cron-monitor";
import {
  AUTO_APPROVE_POLICY,
  AUTO_APPROVE_MAX_AGE_DAYS,
  decideAutoApprove,
  nextPublishSlot,
  parseAutoApproveChannels,
  parseAutoApproveDestinations,
  parseAutoApproveSources,
  parseAutoApproveTiming,
  parsePerChannelLimit,
} from "@/lib/publishing/auto-approve";
import {
  listCompaniesWithActiveMarketingHq,
  listMarketingItems,
  markMarketingItemConverted,
  reviewMarketingItem,
} from "@/lib/marketing/store";
import { dispatchPublish, type DispatchInput } from "@/lib/publishing/dispatch";
import { resolvePublishMode, MARKETING_PUBLISH_MODE_ENV } from "@/lib/publishing/gate";
import {
  checkMarketingPostBodyFits,
  checkMarketingPostTitleFits,
} from "@/shared/lib/marketing-post-body";
import {
  decideDestination,
  listDestinationCandidates,
  providerForChannelTarget,
  providerResourceIdFor,
} from "@/shared/lib/marketing-publish-destination";
import { capabilityFor } from "@/shared/types/integration-capability";
import type { IntegrationProvider } from "@/shared/types/integration-provider";
import { isIntegrationProvider } from "@/shared/types/integration-provider";
import {
  deriveMarketingChannelState,
  toMarketingChannelAccountFacts,
} from "@/shared/types/marketing-channel-connection";
import type { MarketingConnectedAccount } from "@/shared/types/marketing-connected-account";
import { decideMediaRead, describeMediaReadDecision } from "@/shared/types/marketing-media";
import type { MediaReadGrant } from "@/shared/types/marketing-media";
import { describeUnpublishableMarketingPostStatus } from "@/shared/types/marketing-post";
import {
  decideJobLease,
  decideJobOutcome,
  type JobAttemptOutcome,
  type PublishJobRecord,
} from "@/shared/types/publish-job";

/**
 * THE PUBLISHER — the scheduled-post cron (safety spine, items 6 and 7).
 *
 * ==================== WHAT ONE RUN DOES ====================
 *   1. (policy, default OFF) promote eligible agent drafts into scheduled
 *      jobs for the NEXT slot — see lib/publishing/auto-approve.ts;
 *   2. if, and only if, `MARKETING_PUBLISH_MODE` is `live`, lease the due
 *      `marketing_publish_jobs` rows (`scheduled`, `run_after` passed, or a
 *      `publishing` row whose lease expired) through the state machine in
 *      shared/types/publish-job.ts, build the same `DispatchInput` the
 *      YouTube action builds, call `dispatchPublish`, and settle the job
 *      with `decideJobOutcome`;
 *   3. mark the post `posted` when the provider reported a live post, and
 *      PAUSE the channel after a credential failure or once a channel-level
 *      failure has exhausted the job's attempts.
 *
 * ==================== WHAT IT NEVER DOES ====================
 *   - publish when the mode is not `live` (it does not even lease; dispatch
 *     would refuse anyway — the gate is not bypassed, it is reached);
 *   - publish a job that names no `connected_account_id`, or whose account
 *     is another company's, another provider's, or paused;
 *   - infer a destination. The approval named it or there is no job.
 *
 * Budget: Vercel gives this route 60 s (vercel.json); the loop stops leasing
 * new work at 50 s and reports what it deferred. The Hobby plan runs crons
 * once a day, so "the next slot" is tomorrow's run.
 */

export const runtime = "nodejs";

const ROUTE_NAME = "marketing-publish";
const OPERATION_NAME = "cron.marketing_publish.run";
const AUTOMATION_KEY = "marketing_publish";
const RUN_BUDGET_MS = 50_000;
const MAX_JOBS_PER_RUN = 25;
const MAX_AUTO_APPROVALS_PER_RUN = 20;

type JobAttemptResult = {
  readonly outcome: JobAttemptOutcome;
  /** What the operator reads in `last_error`. Null on success. */
  readonly detail: string | null;
  /**
   * Whose problem this was. A `channel` failure is the connection's (token,
   * provider, readiness) and may pause it; a `post` failure is this post's
   * (missing media, already delivered, body too long) and never pauses the
   * channel that would have carried it.
   */
  readonly scope: "channel" | "post" | null;
  /** The credential is dead (expired / reauth required). Pause now. */
  readonly credentialFailure: boolean;
  /** The provider reported a LIVE post (not a draft). */
  readonly postedLive: boolean;
};

function configuredFor(provider: IntegrationProvider): boolean {
  switch (provider) {
    case "youtube":
      return isIntegrationEncryptionConfigured() && isYouTubeOAuthConfigured();
    case "facebook":
    case "instagram":
      return isIntegrationEncryptionConfigured() && isFacebookOAuthConfigured();
    case "altair_site":
      return isAltairSiteConfigured();
    default:
      // No adapter is registered for these yet; the gate reports
      // NOT_CONFIGURED and dispatch refuses. Honest, and nothing is sent.
      return false;
  }
}

function fail(
  detail: string,
  scope: "channel" | "post",
  credentialFailure = false,
): JobAttemptResult {
  return { outcome: "failed", detail, scope, credentialFailure, postedLive: false };
}

/** Is this account a legal destination for this job's provider? */
function accountServesProvider(
  account: MarketingConnectedAccount,
  provider: IntegrationProvider,
): boolean {
  return listDestinationCandidates([account], provider).length === 1;
}

async function runLeasedJob(
  job: PublishJobRecord,
  nowIso: string,
): Promise<JobAttemptResult> {
  if (!isIntegrationProvider(job.provider)) {
    return fail("This job names a provider this deployment does not know.", "post");
  }
  const provider: IntegrationProvider = job.provider;
  const label = capabilityFor(provider).label;

  // ---- the destination: named, this company's, this provider's ----------
  if (!job.connectedAccountId) {
    return fail(
      `This job names no destination account, so it cannot be published. Approve the post again and choose the ${label} account.`,
      "post",
    );
  }
  if (!job.approvedAt) {
    return fail("This job carries no approval, so nothing was sent.", "post");
  }
  const account = await getMarketingConnectedAccountByIdAdmin(job.connectedAccountId);
  if (!account || account.companyId !== job.companyId) {
    return fail(`The ${label} destination for this job no longer exists.`, "post");
  }
  if (!accountServesProvider(account, provider)) {
    return fail(
      `The destination account for this job cannot carry a ${label} publish (wrong provider, disconnected, or missing its ${capabilityFor(provider).identityLabel}).`,
      "channel",
    );
  }

  // ---- the post ----------------------------------------------------------
  const post = await getMarketingPostByIdAdmin(job.companyId, job.marketingPostId);
  if (!post) {
    return fail("The marketing post for this job no longer exists.", "post");
  }
  if (post.status === "posted") {
    // Done by another path. The queue is finished with this row.
    return { outcome: "published", detail: null, scope: null, credentialFailure: false, postedLive: false };
  }
  const statusError = describeUnpublishableMarketingPostStatus(post.status);
  if (statusError) {
    return fail(statusError, "post");
  }
  if (providerForChannelTarget(post.channelTarget) !== provider) {
    return fail(
      `This post targets ${post.channelTarget}, not ${label}. Nothing was sent.`,
      "post",
    );
  }

  // ---- the ledger: already delivered to this provider? -------------------
  const deliveries = await listDeliveriesForPost(job.companyId, job.marketingPostId);
  const prior = deliveries.find((delivery) => delivery.provider === provider);
  if (prior?.deliveryState === "posted") {
    return { outcome: "published", detail: null, scope: null, credentialFailure: false, postedLive: true };
  }
  if (prior?.deliveryState === "draft") {
    return { outcome: "drafted", detail: null, scope: null, credentialFailure: false, postedLive: false };
  }

  // ---- media: the stored video, read through a short-lived grant ---------
  const media: MediaReadGrant[] = [];
  const videoAssetId = post.videoMediaAssetId?.trim();
  if (videoAssetId) {
    const asset = await getMediaAssetById(job.companyId, videoAssetId);
    const mediaDecision = decideMediaRead(asset, job.companyId);
    if (mediaDecision !== "GRANT" || !asset) {
      return fail(describeMediaReadDecision(mediaDecision), "post");
    }
    if (!asset.contentType.startsWith("video/")) {
      return fail("The attached media is not a video.", "post");
    }
    if (!asset.byteSize || asset.byteSize <= 0) {
      return fail("The attached video has no recorded size, so it cannot be uploaded.", "post");
    }
    const grant = await createMediaReadGrant({
      companyId: job.companyId,
      objectKey: asset.objectKey,
      contentType: asset.contentType,
      byteSize: asset.byteSize,
      expectedSha256: asset.clientReportedSha256,
      nowMs: Date.parse(nowIso),
    });
    if (grant.error || !grant.grant) {
      return fail(grant.error ?? "Could not mint a read link for the video.", "post");
    }
    media.push(grant.grant);
  }

  // ---- copy: exactly what the UI action sends -----------------------------
  const bodyFit = checkMarketingPostBodyFits(post, provider);
  if (bodyFit.error) return fail(bodyFit.error, "post");
  const titleFit = checkMarketingPostTitleFits(post.title, provider);
  if (titleFit.error) return fail(titleFit.error, "post");

  // ---- the connection's current state, judged BEFORE dispatch -------------
  const configured = configuredFor(provider);
  const facts = toMarketingChannelAccountFacts(account, provider);
  const preState = deriveMarketingChannelState({ configured, account: facts, nowIso });

  const base: DispatchInput = {
    account: {
      connectedAccountId: account.id,
      companyId: job.companyId,
      provider,
      integrationKind: account.integrationKind,
      providerAccountId: account.providerAccountId ?? null,
      providerResourceId: providerResourceIdFor(account, provider),
      grantedScopes: account.grantedScopes,
      facts,
    },
    marketingPostId: job.marketingPostId,
    jobApprovedAt: job.approvedAt,
    title: post.title,
    body: bodyFit.body,
    hashtags: post.suggestedHashtags,
    link: null,
    media,
    nowIso,
    configured,
  };

  let input: DispatchInput = base;
  if (provider === "altair_site") {
    // First-party publish needs a PERSON on the page record (published_by
    // is a profile id). A policy approval has none, so the site waits for a
    // human; dispatchFirstParty refuses without publishedBy as well.
    if (!job.approvedBy) {
      return fail(
        "A website publish records the person who approved it, and this job was approved by a policy. Approve it in Publishing → Today to publish the page.",
        "post",
      );
    }
    const brief = job.contentPackageId
      ? await getContentPackageBriefForPublish(job.companyId, job.contentPackageId)
      : null;
    input = {
      ...base,
      // The article body is the post text itself, not the hashtag-joined
      // social assembly.
      body: post.postText,
      hashtags: [],
      link: brief?.ctaUrl ?? null,
      publishedBy: job.approvedBy,
      contentPackageId: job.contentPackageId,
      seo: brief?.seo ?? {
        slug: null,
        metaTitle: null,
        metaDescription: null,
        canonicalUrl: null,
        keywords: [],
      },
      internalLinks: brief?.internalLinks ?? [],
      changeNote: "Published by the scheduled distribution run.",
    };
  }

  const result = await dispatchPublish(input);

  if (!result.ok) {
    switch (result.refusal) {
      case "NO_CREDENTIAL":
        return fail(result.detail, "channel", true);
      case "REFUSED_BY_GATE": {
        // The gate's local half (mode, kind, approval) and its health half
        // (connection state, pause) share one refusal code; the state we
        // derived before dispatch tells them apart.
        const credentialDead = preState === "REAUTH_REQUIRED";
        const channelProblem =
          credentialDead ||
          preState === "ERROR" ||
          preState === "API_ACCESS_REQUIRED" ||
          preState === "NOT_CONFIGURED" ||
          preState === "NOT_CONNECTED" ||
          facts.publishingPaused === true;
        return fail(result.detail, channelProblem ? "channel" : "post", credentialDead);
      }
      case "PROVIDER_FAILED":
        return fail(result.detail, "channel");
      case "NO_ADAPTER":
      case "NOT_A_PUBLISHER":
        return fail(result.detail, "channel");
      case "MEDIA_UNAVAILABLE":
      case "NOT_CLAIMED":
        return fail(result.detail, "post");
    }
  }

  return {
    outcome: result.outcome.outcome === "draft" ? "drafted" : "published",
    detail: null,
    scope: null,
    credentialFailure: false,
    postedLive: result.outcome.outcome === "posted",
  };
}

/* ====================================================================== *
 *                         THE AUTO-APPROVAL STEP
 * ====================================================================== */

type AutoApproveSummary = {
  enabled: boolean;
  sources: readonly string[];
  rejectedSources: readonly string[];
  channels: readonly string[];
  rejectedChannels: readonly string[];
  considered: number;
  promoted: number;
  /** Marketing HQ social ideas turned into Facebook drafts this run. */
  hqConverted: number;
  timing: string;
  skipped: { postId: string; reason: string }[];
};

/**
 * Turn the freshest Marketing HQ social idea per company into a Facebook
 * draft, so it can flow through the policy below (owner decision
 * 2026-10-25). One per company per run, never older than the freshness
 * window, and only when the policy covers both that source and Facebook.
 */
async function convertFreshHqIdeas(sinceIso: string): Promise<number> {
  let converted = 0;
  for (const companyId of await listCompaniesWithActiveMarketingHq()) {
    const items = await listMarketingItems(companyId, { statuses: ["draft"], limit: 50 });
    const idea = items.find(
      (item) => item.kind === "social_post" && item.createdAt >= sinceIso,
    );
    if (!idea) continue;
    const content = idea.content as { postText?: unknown; hashtags?: unknown; callToAction?: unknown };
    const postText =
      typeof content.postText === "string" && content.postText.trim() ? content.postText : idea.bodyText;
    if (!postText.trim()) continue;
    const reviewed = await reviewMarketingItem(companyId, idea.id, "approved", AUTO_APPROVE_POLICY);
    if (reviewed.error) continue;
    const created = await createHqSocialDraftPostAdmin({
      companyId,
      itemId: idea.id,
      title: idea.title,
      postText,
      hashtags: Array.isArray(content.hashtags)
        ? content.hashtags.filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0)
        : [],
      callToAction:
        typeof content.callToAction === "string" && content.callToAction.trim() ? content.callToAction : null,
    });
    if (!created.post) continue;
    await markMarketingItemConverted(companyId, idea.id, created.post.id);
    converted += 1;
  }
  return converted;
}

async function runAutoApprovePolicy(nowIso: string): Promise<AutoApproveSummary> {
  const parsed = parseAutoApproveSources();
  const channels = parseAutoApproveChannels();
  const summary: AutoApproveSummary = {
    enabled: parsed.sources.length > 0 && channels.channels.length > 0,
    sources: parsed.sources,
    rejectedSources: parsed.rejected,
    channels: channels.channels,
    rejectedChannels: channels.rejected,
    considered: 0,
    promoted: 0,
    hqConverted: 0,
    timing: parseAutoApproveTiming(),
    skipped: [],
  };
  if (!summary.enabled) return summary;

  const sinceIso = new Date(
    Date.parse(nowIso) - AUTO_APPROVE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  if (parsed.sources.includes("product_update") && channels.channels.includes("facebook")) {
    summary.hqConverted = await convertFreshHqIdeas(sinceIso);
  }

  const candidates = await listAutoApproveCandidatePosts({
    sourceTypes: parsed.sources,
    channels: channels.channels,
    limit: MAX_AUTO_APPROVALS_PER_RUN,
    createdSinceIso: sinceIso,
  });
  if (candidates.length === 0) return summary;

  // Destinations per company, read once and grouped, so every decision below
  // resolves against that post's company and no other.
  const connected = await listConnectedAccountsForCompaniesAdmin(
    candidates.map((post) => post.companyId),
  );
  const accountsByCompany = new Map<string, MarketingConnectedAccount[]>();
  for (const account of connected) {
    const bucket = accountsByCompany.get(account.companyId);
    if (bucket) bucket.push(account);
    else accountsByCompany.set(account.companyId, [account]);
  }

  // same_run: the publish step below leases it in THIS run (owner decision
  // 2026-10-25); next_run keeps the original one-day hold.
  const slot = summary.timing === "same_run" ? nowIso : nextPublishSlot(nowIso);
  const destinations = parseAutoApproveDestinations();
  const perChannelLimit = parsePerChannelLimit();
  const promotedPerChannel = new Map<string, number>();

  for (const post of candidates) {
    summary.considered += 1;
    const verdict = decideAutoApprove(post, parsed.sources, channels.channels);
    if (!verdict.eligible) {
      summary.skipped.push({ postId: post.id, reason: verdict.reason });
      continue;
    }
    const channelKey = `${post.companyId}:${post.channelTarget}`;
    if ((promotedPerChannel.get(channelKey) ?? 0) >= perChannelLimit) {
      summary.skipped.push({ postId: post.id, reason: `daily cap of ${String(perChannelLimit)} for ${post.channelTarget} reached` });
      continue;
    }
    // HVAC School Shorts share the agent source but belong to the School
    // channel and its own distribution path. Never auto-publish them here.
    if (post.videoMediaAssetId) {
      const asset = await getMediaAssetById(post.companyId, post.videoMediaAssetId);
      if (!asset || asset.sourceJobId.startsWith("hvac-")) {
        summary.skipped.push({
          postId: post.id,
          reason: asset ? "HVAC School content is never auto-published" : "video not found",
        });
        continue;
      }
    }
    const provider = providerForChannelTarget(post.channelTarget);
    if (!provider) {
      summary.skipped.push({ postId: post.id, reason: "post names no channel" });
      continue;
    }
    const providerCandidates = listDestinationCandidates(
      accountsByCompany.get(post.companyId) ?? [],
      provider,
    );
    // An exact destination from MARKETING_AUTO_APPROVE_DESTINATIONS (e.g. the
    // product YouTube channel). Named but not connected => skip, never guess.
    const pinned = destinations.get(provider);
    const pinnedAccount = pinned
      ? providerCandidates.find(
          (account) => account.providerResourceId === pinned || account.providerAccountId === pinned,
        )
      : undefined;
    if (pinned && !pinnedAccount) {
      summary.skipped.push({ postId: post.id, reason: `pinned ${provider} destination ${pinned} is not connected` });
      continue;
    }
    const destination = decideDestination({
      provider,
      candidates: providerCandidates,
      explicitAccountId: pinnedAccount?.id ?? null,
    });
    if (!destination.ok) {
      summary.skipped.push({ postId: post.id, reason: destination.error });
      continue;
    }

    const scheduled = await scheduleDraftMarketingPostAdmin(post.companyId, post.id, slot);
    if (scheduled.error || !scheduled.post) {
      summary.skipped.push({ postId: post.id, reason: scheduled.error ?? "could not schedule" });
      continue;
    }

    const job = await recordScheduledPublishJob({
      companyId: post.companyId,
      marketingPostId: post.id,
      contentPackageId: post.contentPackageId ?? null,
      provider,
      connectedAccountId: destination.account.id,
      approver: { kind: "policy", policy: AUTO_APPROVE_POLICY },
      scheduledFor: slot,
      nowIso,
      maxAttempts: capabilityFor(provider).maxAttempts,
    });
    if (job.error || !job.job) {
      summary.skipped.push({ postId: post.id, reason: job.error ?? "could not record the job" });
      continue;
    }

    const decision = await recordAgentDecision({
      companyId: post.companyId,
      subjectKind: "marketing_post",
      subjectId: post.id,
      decision: "APPROVED",
      note: `${AUTO_APPROVE_POLICY} destination=${provider}:${destination.account.id} slot=${slot}`,
      decidedByUserId: null,
      decidedByEmail: null,
    });
    if (!decision.ok) {
      console.error("[marketing-publish] auto-approve decision not recorded", {
        postId: post.id,
      });
    }
    summary.promoted += 1;
    promotedPerChannel.set(channelKey, (promotedPerChannel.get(channelKey) ?? 0) + 1);
  }

  return summary;
}

/* ====================================================================== *
 *                             THE ROUTE
 * ====================================================================== */

export async function GET(request: Request) {
  if (!getCronSecret()) {
    return NextResponse.json(
      { ok: false, route: ROUTE_NAME, error: "Cron secret is not configured" },
      { status: 503 },
    );
  }
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json(
      { ok: false, route: ROUTE_NAME, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const requestId = requestIdFromHeaders(request.headers) ?? createRequestId();
  const checkIn = startCronCheckIn(ROUTE_NAME);
  const startedMs = Date.now();

  const opResult = await runOperation({
    operationName: OPERATION_NAME,
    context: { requestId, route: "/api/cron/marketing-publish" },
    throwOnFailure: false,
    callback: async () => {
      const { runId, startedAt } = await recordPlatformAutomationRunStarted(AUTOMATION_KEY);
      try {
        const nowIso = new Date().toISOString();
        const mode = resolvePublishMode();
        const leasedBy = `cron:${ROUTE_NAME}:${requestId}`.slice(0, 200);

        const autoApprove = await runAutoApprovePolicy(nowIso);

        let considered = 0;
        let leased = 0;
        let published = 0;
        let drafted = 0;
        let requeued = 0;
        let failedTerminal = 0;
        let channelsPaused = 0;
        let skippedPaused = 0;
        let deferred = 0;
        let settleFaults = 0;
        const attempts: Record<string, unknown>[] = [];

        if (mode === "live") {
          const jobs = await listLeasablePublishJobs({ nowIso, limit: MAX_JOBS_PER_RUN });
          for (const job of jobs) {
            if (Date.now() - startedMs > RUN_BUDGET_MS) {
              deferred += 1;
              continue;
            }
            const clock = new Date().toISOString();
            const leaseDecision = decideJobLease(job, clock);
            if (leaseDecision === "SKIP") continue;
            considered += 1;

            // A paused channel is left SCHEDULED, not attempted: burning
            // attempts against an operator's pause would fail the job the
            // operator still wants to run once they resume.
            if (job.connectedAccountId && isIntegrationProvider(job.provider)) {
              const account = await getMarketingConnectedAccountByIdAdmin(job.connectedAccountId);
              if (account && toMarketingChannelAccountFacts(account, job.provider).publishingPaused) {
                skippedPaused += 1;
                attempts.push({ jobId: job.id, provider: job.provider, outcome: "skipped_paused" });
                continue;
              }
            }

            // A reclaimed lease with no attempts left cannot be leased again
            // (the attempt CHECK would refuse); settle it failed as its last
            // holder. No channel pause here: nothing is known about WHY the
            // holder died, and the ledger row is what the operator reads.
            if (job.jobState === "publishing" && job.attempt >= job.maxAttempts && job.leasedBy) {
              const decision = decideJobOutcome({
                outcome: "failed",
                attempt: job.attempt,
                maxAttempts: job.maxAttempts,
                nowIso: clock,
                errorDetail:
                  "The worker that held this job never reported back and no attempts remain. Check the channel's delivery record before re-approving.",
              });
              const settled = await settlePublishJob({ jobId: job.id, leasedBy: job.leasedBy, decision, nowIso: clock });
              if (settled.error || !settled.matched) settleFaults += 1;
              else failedTerminal += 1;
              attempts.push({ jobId: job.id, provider: job.provider, outcome: "lease_expired_exhausted" });
              continue;
            }

            const lease = await leasePublishJob({ job, leasedBy, nowIso: clock });
            if (lease.error || !lease.job) {
              attempts.push({ jobId: job.id, provider: job.provider, outcome: "not_leased" });
              continue;
            }
            leased += 1;
            const held = lease.job;

            let result: JobAttemptResult;
            try {
              result = await runLeasedJob(held, clock);
            } catch (error) {
              console.error("[marketing-publish] job attempt crashed:", {
                jobId: held.id,
                provider: held.provider,
                errorName: error instanceof Error ? error.name : "unknown",
              });
              result = fail(
                "The publish attempt crashed before it could report an outcome. Check the channel's delivery record before retrying.",
                "channel",
              );
            }

            const settleAt = new Date().toISOString();
            const decision = decideJobOutcome({
              outcome: result.outcome,
              attempt: held.attempt,
              maxAttempts: held.maxAttempts,
              nowIso: settleAt,
              errorDetail: result.detail,
            });
            const settled = await settlePublishJob({ jobId: held.id, leasedBy, decision, nowIso: settleAt });
            if (settled.error || !settled.matched) {
              settleFaults += 1;
              console.error("[marketing-publish] job outcome did not land:", {
                jobId: held.id,
                jobState: decision.jobState,
              });
            }

            if (result.outcome === "published") {
              published += 1;
              if (result.postedLive) {
                const marked = await markMarketingPostPostedAdmin(held.companyId, held.marketingPostId);
                if (marked.error) {
                  console.error("[marketing-publish] post not marked posted:", {
                    jobId: held.id,
                    postId: held.marketingPostId,
                  });
                }
              }
            } else if (result.outcome === "drafted") {
              drafted += 1;
            } else if (decision.jobState === "failed") {
              failedTerminal += 1;
            } else {
              requeued += 1;
            }

            // The channel rule: a dead credential pauses now; a channel-level
            // failure pauses once the job has no attempts left.
            const pauseNow =
              held.connectedAccountId !== null &&
              result.scope === "channel" &&
              (result.credentialFailure || decision.jobState === "failed");
            if (pauseNow && held.connectedAccountId) {
              const paused = await setConnectionPublishingPause({
                connectedAccountId: held.connectedAccountId,
                provider: held.provider,
                paused: true,
                reason:
                  `Paused automatically by the publisher on ${settleAt}: ` +
                  (result.credentialFailure
                    ? "the credential needs reauthorization."
                    : `publishing failed ${held.attempt} time(s) for post ${held.marketingPostId}.`),
              });
              if (paused.error) {
                console.error("[marketing-publish] channel pause did not land:", {
                  connectedAccountId: held.connectedAccountId,
                });
              } else {
                channelsPaused += 1;
              }
            }

            attempts.push({
              jobId: held.id,
              provider: held.provider,
              postId: held.marketingPostId,
              attempt: held.attempt,
              outcome: result.outcome,
              jobState: decision.jobState,
              scope: result.scope,
              paused: pauseNow,
              detail: result.detail,
            });
          }
        }

        const faults = settleFaults;
        await recordPlatformAutomationRunFinished(runId, {
          automationKey: AUTOMATION_KEY,
          startedAt,
          status: faults > 0 ? "failed" : "succeeded",
          totals: {
            completed: published + drafted,
            created: autoApprove.promoted,
            errorCount: failedTerminal + faults,
          },
          errorSummary:
            faults > 0
              ? sanitizeErrorSummary(`${faults} job outcome(s) could not be written`)
              : null,
        });

        return NextResponse.json({
          ok: faults === 0,
          route: ROUTE_NAME,
          publishMode: mode,
          ...(mode !== "live"
            ? {
                publishingSkipped: `${MARKETING_PUBLISH_MODE_ENV} is ${mode}; no job was leased and nothing was sent.`,
              }
            : {}),
          autoApprove,
          jobs: {
            considered,
            leased,
            published,
            drafted,
            requeued,
            failedTerminal,
            skippedPaused,
            deferred,
            channelsPaused,
            settleFaults,
          },
          attempts: attempts.slice(0, 50),
          ...(attempts.length > 50 ? { attemptsTruncated: attempts.length - 50 } : {}),
        });
      } catch (error) {
        await recordPlatformAutomationRunFinished(runId, {
          automationKey: AUTOMATION_KEY,
          startedAt,
          status: "failed",
          errorSummary: sanitizeErrorSummary(error),
        });
        return NextResponse.json(
          { ok: false, route: ROUTE_NAME, error: "Scheduled publishing run failed" },
          { status: 500 },
        );
      }
    },
  });

  if (!opResult.success || !opResult.value) {
    return finishCronCheckIn(
      checkIn,
      NextResponse.json(
        { ok: false, route: ROUTE_NAME, error: "Scheduled publishing run failed" },
        { status: 500 },
      ),
    );
  }
  return finishCronCheckIn(checkIn, opResult.value);
}
