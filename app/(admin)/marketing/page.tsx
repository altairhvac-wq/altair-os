import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAiDraftingConfigured, isAiFeaturesEnabled } from "@/lib/ai/env";
import { getCurrentUser } from "@/lib/database/auth";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { canAccessAdminNavItem } from "@/lib/database/access-control";
import { canAccessPlatformAdmin } from "@/lib/database/platform-admin";
import { hasCompanyRole } from "@/lib/database/types/roles";
import { listMarketingConnectedAccounts } from "@/lib/database/queries/marketing-connected-accounts";
import { listMarketingPosts } from "@/lib/database/queries/marketing-posts";
import { getSitePublishingDetailsForPost } from "@/lib/database/queries/marketing-site-pages";
import { getMarketingOperatingState } from "@/lib/database/queries/marketing-operating-state";
import { listChiefMessages } from "@/lib/database/queries/agent-chief-messages";
import {
  buildTodayPlan,
  buildAttentionItems,
  buildRecentActivity,
  isSnapshotFresh,
} from "@/shared/types/marketing-command";
import { getLatestAgentMarketingSnapshot } from "@/lib/database/queries/agent-snapshots";
import { listAgentDecisionsSince } from "@/lib/database/queries/agent-decisions";
import { listStoredMediaAssets } from "@/lib/database/queries/marketing-media-assets";
import { listMarketingItems } from "@/lib/marketing/store";
import { isAgentBridgeConfigured } from "@/lib/agent-bridge/env";
import { UnauthorizedAccessView } from "@/shared/components/layout/UnauthorizedAccessView";
import { MarketingWorkspace } from "@/shared/components/marketing-hub/MarketingWorkspace";
import { deriveMarketingAutomationHealth } from "@/shared/types/marketing-workspace-state";
import { formatFacebookConnectFlashMessage } from "@/shared/types/marketing-connected-account";

type MarketingPageProps = {
  searchParams: Promise<{
    facebook?: string;
    facebook_error?: string;
    pages?: string;
  }>;
};

export const metadata: Metadata = {
  title: "Marketing",
};

export default async function MarketingPage({
  searchParams,
}: MarketingPageProps) {
  const [companyContext, user, params] = await Promise.all([
    getActiveCompanyContext(),
    getCurrentUser(),
    searchParams,
  ]);

  if (!companyContext) {
    redirect("/setup");
  }

  if (!canAccessAdminNavItem(companyContext, "/marketing")) {
    return (
      <UnauthorizedAccessView description="Marketing posts are limited to company owners, admins, and dispatchers." />
    );
  }

  const [
    posts,
    connectedAccounts,
    agentSnapshot,
    agentDecisions,
    storedMedia,
  ] = await Promise.all([
    listMarketingPosts(companyContext.company.id),
    listMarketingConnectedAccounts(companyContext.company.id),
    // Read-only projection pushed by the Agent Platform. Null means it has
    // never reported in. That is a diagnostic fact, so it is rendered under
    // Advanced rather than as the first thing on the page.
    getLatestAgentMarketingSnapshot(companyContext.company.id),
    // Recorded decisions, so a subject already decided is never offered again.
    listAgentDecisionsSince(companyContext.company.id, 0, 200),
    // Which renders this deployment actually holds bytes for. Identities only
    // — no URL is created here. A playable link is minted per request by
    // `requestMarketingMediaPreviewAction` and expires on its own.
    listStoredMediaAssets(companyContext.company.id),
  ]);

  // ============ WHY THIS ONE IS FETCHED SEPARATELY ============
  // The rationale on the Today card is not new text and is not inferred. It is
  // the `rationale` the queue item was written with, carried across the one
  // real link between the two: converting an item to a Hub post stamps
  // `convertedPostId` on the item and `sourceId` on the post, in the same
  // write. Anything a post cannot be traced back to has no rationale, and the
  // card says so rather than filling the space.
  const queueItems = await listMarketingItems(companyContext.company.id);
  const rationaleByPostId: Record<string, string> = {};
  for (const item of queueItems) {
    const rationale = item.content?.["rationale"];
    if (typeof rationale !== "string" || rationale.trim() === "") continue;
    const postId =
      item.convertedPostId ??
      posts.find((post) => post.sourceId === item.id)?.id ??
      null;
    if (postId) rationaleByPostId[postId] = rationale.trim();
  }

  const canManageConnectedAccounts = hasCompanyRole(companyContext.role, [
    "owner",
    "admin",
  ]);

  const connectedAccountsFlash = formatFacebookConnectFlashMessage({
    facebook: params.facebook,
    facebookError: params.facebook_error,
    pages: params.pages,
  });

  // Request time is resolved once, here, and threaded down as a prop so the
  // presentation component stays a pure function of its inputs.
  const renderedAt = new Date().toISOString();

  const isPlatformAdmin = canAccessPlatformAdmin(user);
  const showFounderScreenshotCapture =
    process.env.NODE_ENV === "development" && isPlatformAdmin;

  // ============ THE THREE CLAIMS THE FRONT PAGE MAY MAKE ============
  // Reduced HERE, on the server, from the projection that was already
  // fetched — no extra query, and the rules live in a pure module with its
  // own proof script rather than in JSX. "Daily content: On" is a statement
  // about another machine in another repository, so it is the one thing on
  // this page that is not allowed to be a hand-written conditional.
  const automationHealth = deriveMarketingAutomationHealth({
    snapshot: agentSnapshot,
    nowIso: renderedAt,
  });

  // ============ WEBSITE POSTS ONLY ============
  // Resolved server-side for the website posts alone, so a Facebook draft
  // costs nothing and no SEO shape reaches the client for a post that has
  // none. Company-scoped by construction: the package id is only ever taken
  // from a post this company owns.
  const sitePublishingDetails = Object.fromEntries(
    await Promise.all(
      posts
        .filter((post) => post.channelTarget === "website")
        .map(async (post) => [
          post.id,
          await getSitePublishingDetailsForPost({
            companyId: companyContext.company.id,
            marketingPostId: post.id,
            contentPackageId: post.contentPackageId ?? null,
          }),
        ]),
    ),
  );

  // ============ THE COMMAND SURFACE, FROM REAL STATE ============
  // Everything here is projected server-side from stored rows. Nothing is
  // fetched from the Agent Platform at render time — it is behind NAT and
  // cannot be called — so a platform that has stopped reporting shows as
  // exactly that rather than as a quiet day.
  const nowIso = new Date().toISOString();
  const [operatingState, chiefMessages] = await Promise.all([
    getMarketingOperatingState({
      companyId: companyContext.company.id,
      nowIso,
    }),
    listChiefMessages({ companyId: companyContext.company.id, limit: 50 }),
  ]);

  const awaitingReply = chiefMessages.some(
    (message) => message.role === "user" && message.status === "queued",
  );

  const command = {
    lanes: buildTodayPlan(operatingState),
    attention: buildAttentionItems(operatingState),
    activity: buildRecentActivity(operatingState),
    messages: chiefMessages,
    awaitingReply,
    // Fail closed and say so: a stale or absent snapshot means the platform
    // is not reporting, and the Chief answers on ITS cycle, so a question
    // asked now may sit for a while. The operator is told, not guessed at.
    platformUnavailableReason: isSnapshotFresh(operatingState)
      ? null
      : "The Agent Platform has not reported recently. Questions will queue until it next runs.",
    canAsk: true,
  };

  return (
    <MarketingWorkspace
      posts={posts}
      command={command}
      sitePublishingDetails={sitePublishingDetails}
      automationHealth={automationHealth}
      // The same section Advanced renders in full. Today reads it only to
      // tell "being prepared" from "could not be prepared" from "nothing
      // was started", which used to be one indistinguishable empty state.
      renders={
        agentSnapshot
          ? {
              support: agentSnapshot.snapshot.sections.videoRenders.support,
              items: agentSnapshot.snapshot.sections.videoRenders.items,
            }
          : null
      }
      connectedAccounts={connectedAccounts}
      // Identity and shape only. No object key, no URL, no path crosses into
      // the client bundle — reaching the bytes is a separate authorized
      // request that mints its own short-lived grant.
      videoOptions={storedMedia.map((asset) => ({
        id: asset.id,
        sourceJobId: asset.sourceJobId,
        widthPx: asset.widthPx,
        heightPx: asset.heightPx,
        durationMs: asset.durationMs,
        storedAt: asset.storedAt,
      }))}
      rationaleByPostId={rationaleByPostId}
      snapshot={agentSnapshot}
      decisions={agentDecisions}
      bridgeConfigured={isAgentBridgeConfigured()}
      storedMediaJobIds={storedMedia.map((asset) => asset.sourceJobId)}
      nowIso={renderedAt}
      companyName={companyContext.company.name}
      showFounderMarketing={isPlatformAdmin}
      showFounderScreenshotCapture={showFounderScreenshotCapture}
      aiFeaturesEnabled={isAiFeaturesEnabled()}
      aiDraftingConfigured={isAiDraftingConfigured()}
      canManageConnectedAccounts={canManageConnectedAccounts}
      connectedAccountsFlash={connectedAccountsFlash}
    />
  );
}
