"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MarketingTodayView } from "./MarketingTodayView";
import { MarketingQueueExtras } from "./MarketingQueueExtras";
import { MarketingPublishedReview, type PublishedItem } from "./MarketingPublishedReview";
import { MarketingSettingsView } from "./MarketingSettingsView";
import { MarketingCommandView } from "./MarketingCommandView";
import { MarketingLibraryView, type SitePageRow } from "./MarketingLibraryView";
import type {
  ActivityEntry,
  AttentionItem,
  ChiefMessage,
  CommandLane,
} from "@/shared/types/marketing-command";
import type { WorkRequest } from "@/shared/types/agent-work-request";
import type { SitePublishingDetails } from "@/shared/types/site-publishing-details";
import type { AgentDecisionRecord } from "@/lib/database/queries/agent-decisions";
import type {
  MarketingAutomationHealth,
  TodayStateInput,
} from "@/shared/types/marketing-workspace-state";
import type { MarketingConnectedAccount } from "@/shared/types/marketing-connected-account";
import type { MarketingPost } from "@/shared/types/marketing-post";
import type { ReelVideoOption } from "@/shared/types/marketing-reel";
import type { AgentPlatformStatusReport } from "@/shared/types/agent-heartbeat";
import type {
  MarketingBrandKit,
  MarketingHqConfig,
  MarketingItem,
} from "@/shared/types/marketing-ai-hq";

export type { SitePageRow };

/**
 * `/marketing` — operate the marketing agents and the publishing workflow.
 *
 * ==================== THREE TABS (2026-10-25) ====================
 * The page had grown into seven tabs over four generations of marketing
 * tooling: a hand-posting editor, a separate Marketing AI HQ page, the agent
 * platform's dashboards and the publishing queue. Four lists called
 * themselves approval queues, five buttons could publish, and connections
 * lived in three places. The owner asked for one place to run the agents.
 *
 *   Today     — the one approval queue (videos, website articles, Facebook
 *               posts, the weekly marketing AI's ideas) above the Chief of
 *               Staff, what needs attention, and recent activity.
 *   Library   — everything made, one list with Drafts / Approved / Published /
 *               Archived filters, live website pages included, and a small
 *               editor for fixing wording before approval.
 *   Settings  — automation status, every connection, brand & goals.
 *
 * ==================== WHAT WAS REMOVED ====================
 * Every direct publish button (YouTube upload, Facebook/Instagram Reel and feed
 * publish, HQ publish-to-Facebook): Approve is the only way out, so every
 * publish passes the destination-bound job, the kill switch and the
 * scheduled run. The Performance tab (paid-ad telemetry unrelated to posts),
 * the History tab (duplicate health readouts and activity), the manual post
 * tools (templates, recurring copies, mark-posted-manually, founder
 * screenshots) and the Marketing HQ page. No data was deleted.
 */

type MarketingWorkspaceProps = {
  posts: MarketingPost[];
  /** Projected server-side from stored rows. Never assembled in the browser. */
  command: {
    lanes: readonly CommandLane[];
    attention: readonly AttentionItem[];
    activity: readonly ActivityEntry[];
    messages: readonly ChiefMessage[];
    awaitingReply: boolean;
    platformUnavailableReason: string | null;
    canAsk: boolean;
    workRequests: readonly WorkRequest[];
    /** The platform's own liveness signal — see shared/types/agent-heartbeat.ts. */
    platformStatus: AgentPlatformStatusReport;
  };
  sitePages: readonly SitePageRow[];
  sitePublishingDetails?: Record<string, SitePublishingDetails>;
  connectedAccounts: MarketingConnectedAccount[];
  videoOptions: ReelVideoOption[];
  rationaleByPostId?: Record<string, string | undefined>;
  /** Derived server-side by `deriveMarketingAutomationHealth`. */
  automationHealth: MarketingAutomationHealth;
  /** The platform's video-render section, or null when it never reported. */
  renders: TodayStateInput["renders"];
  decisions: AgentDecisionRecord[];
  /** Marketing HQ's weekly ideas still waiting for a decision. */
  hqIdeas: MarketingItem[];
  /** Everything that went live in the last day, for the end-of-day check. */
  publishedRecently: readonly PublishedItem[];
  brandGoals: { config: MarketingHqConfig; brandKit: MarketingBrandKit } | null;
  nowIso: string;
  canManageConnectedAccounts: boolean;
  connectedAccountsFlash: { tone: "success" | "error"; message: string } | null;
};

const TABS = [
  { id: "today", label: "Today" },
  { id: "library", label: "Library" },
  { id: "settings", label: "Settings" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function MarketingWorkspace(props: MarketingWorkspaceProps) {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("today");
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => {
    setRefreshKey((value) => value + 1);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1 overflow-x-auto border-b border-[var(--north-star-plate-border)]">
        {TABS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => setTab(entry.id)}
            className={
              tab === entry.id
                ? "min-h-11 shrink-0 whitespace-nowrap px-4 py-2 text-sm font-medium text-altair-ink border-b-2 border-altair-accent md:min-h-0"
                : "min-h-11 shrink-0 whitespace-nowrap px-4 py-2 text-sm text-altair-ink-muted hover:text-altair-ink md:min-h-0"
            }
          >
            {entry.label}
          </button>
        ))}
      </div>

      {tab === "today" ? (
        <div className="space-y-6">
          <MarketingPublishedReview items={props.publishedRecently} />
          <MarketingTodayView
            key={refreshKey}
            posts={props.posts}
            connectedAccounts={props.connectedAccounts}
            videoOptions={props.videoOptions}
            rationaleByPostId={props.rationaleByPostId}
            automationHealth={props.automationHealth}
            renders={props.renders}
            nowIso={props.nowIso}
            onChanged={refresh}
          />
          <MarketingQueueExtras
            posts={props.posts}
            hqIdeas={props.hqIdeas}
            onChanged={refresh}
          />
          <MarketingCommandView
            lanes={props.command.lanes}
            attention={props.command.attention}
            activity={props.command.activity}
            messages={props.command.messages}
            awaitingReply={props.command.awaitingReply}
            platformUnavailableReason={props.command.platformUnavailableReason}
            canAsk={props.command.canAsk}
            decisions={props.decisions}
            workRequests={props.command.workRequests}
            platformStatus={props.command.platformStatus}
          />
        </div>
      ) : null}

      {tab === "library" ? (
        <MarketingLibraryView
          posts={props.posts}
          sitePages={props.sitePages}
          sitePublishingDetails={props.sitePublishingDetails}
          onChanged={refresh}
        />
      ) : null}

      {tab === "settings" ? (
        <MarketingSettingsView
          automationHealth={props.automationHealth}
          connectedAccounts={props.connectedAccounts}
          canManageConnectedAccounts={props.canManageConnectedAccounts}
          connectedAccountsFlash={props.connectedAccountsFlash}
          brandGoals={props.brandGoals}
        />
      ) : null}
    </div>
  );
}
