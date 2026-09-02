"use client";

import { useState } from "react";
import { MarketingTodayView } from "./MarketingTodayView";
import { MarketingSettingsView } from "./MarketingSettingsView";
import { MarketingAutomationSection } from "./MarketingAutomationSection";
import { MarketingHubPageView } from "./MarketingHubPageView";
import { MarketingCommandView } from "./MarketingCommandView";
import type {
  ActivityEntry,
  AttentionItem,
  ChiefMessage,
  CommandLane,
} from "@/shared/types/marketing-command";
import type { WorkRequest } from "@/shared/types/agent-work-request";
import { MarketingWebsiteView, type SitePageRow } from "./MarketingWebsiteView";
import type { SitePublishingDetails } from "@/shared/types/site-publishing-details";
import type { StoredAgentSnapshot } from "@/lib/database/queries/agent-snapshots";
import type { AgentDecisionRecord } from "@/lib/database/queries/agent-decisions";
import type {
  MarketingAutomationHealth,
  TodayStateInput,
} from "@/shared/types/marketing-workspace-state";
import type { MarketingConnectedAccount } from "@/shared/types/marketing-connected-account";
import type { MarketingPost } from "@/shared/types/marketing-post";
import type { ReelVideoOption } from "@/shared/types/marketing-reel";

/**
 * `/marketing` — the one canonical founder-facing Marketing workspace.
 *
 * ==================== THREE TABS, IN THE ORDER THE FOUNDER NEEDS THEM ====================
 * Today is first and is the default, because the daily job is a decision
 * about one video and everything else is support for it. Settings is the
 * short list of things a founder actually sets. Advanced is where the
 * control room went.
 *
 * ==================== WHAT MOVED, AND WHY NOTHING WAS DELETED ====================
 * Every section that used to be on this page is still reachable. What changed
 * is which of them the page opens on. Runs, schedules, agent permissions,
 * artifact and job ids, codecs, byte sizes, attempt counts, contract-drift
 * notices, campaign telemetry, the empty AI-recommendations list, the video
 * production ledger and historical render ids are diagnostics: real, worth
 * keeping, and incapable of changing a marketing decision. They are one click
 * away under Advanced instead of ahead of the video.
 *
 * ==================== ONE HOME PER CAPABILITY ====================
 * Connected accounts and the Marketing HQ entry point each used to render
 * TWICE inside this page — once from Settings and again from the manual-posts
 * view below. Both now live in Settings only. `MarketingHubPageView` also
 * stopped declaring a page title, subtitle and canvas of its own: `/marketing`
 * is the route, and a route does not need a second one nested in a tab.
 *
 * ==================== PERFORMANCE IS ABSENT ON PURPOSE ====================
 * There is no post or Reel analytics anywhere in any of the three repos — no
 * Page-post insights read, no Instagram media insights, and no table linking
 * a published post to a number. A Performance tab built today could only show
 * paid ad-campaign figures that have nothing to do with the Reel that was
 * posted, which is worse than an honest absence. The tab arrives when the
 * data does.
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
  };
  /**
   * The company's site pages, projected from the same operating state the
   * Command surface reads. Read-only here: a page is written by the publish
   * path, and its SEO details are edited on the post under Content.
   */
  sitePages: readonly SitePageRow[];
  /**
   * Publishing details per website post id, projected server-side from rows
   * that already exist. Absent for every non-website post, which is why the
   * SEO panel cannot appear on one.
   */
  sitePublishingDetails?: Record<string, SitePublishingDetails>;
  connectedAccounts: MarketingConnectedAccount[];
  videoOptions: ReelVideoOption[];
  rationaleByPostId?: Record<string, string | undefined>;
  /** Derived server-side by `deriveMarketingAutomationHealth`. */
  automationHealth: MarketingAutomationHealth;
  /** The platform's video-render section, or null when it never reported. */
  renders: TodayStateInput["renders"];
  snapshot: StoredAgentSnapshot | null;
  decisions: AgentDecisionRecord[];
  bridgeConfigured: boolean;
  storedMediaJobIds: string[];
  nowIso: string;
  companyName: string;
  showFounderMarketing: boolean;
  showFounderScreenshotCapture: boolean;
  aiFeaturesEnabled: boolean;
  aiDraftingConfigured: boolean;
  canManageConnectedAccounts: boolean;
  connectedAccountsFlash: { tone: "success" | "error"; message: string } | null;
};

/**
 * Marketing, named by what you are trying to do.
 *
 * ============ WHY THIS REPLACED "TODAY / SETTINGS / ADVANCED" ============
 * "Advanced" had become the place everything went that was not the daily
 * decision — runs, schedules, agent status, campaign telemetry, render
 * diagnostics and the whole post editor, in one scroll. A tab named after how
 * hard it is rather than what it holds cannot tell you whether what you want
 * is in it. Each destination below is named after the question it answers.
 *
 * NOTHING WAS REBUILT TO DO THIS. Every screen is the one that already
 * existed: Content is the post editor and its Website/SEO panel unchanged,
 * Publishing is the daily go-out view, and Performance and History ask the
 * same automation dashboard for the sections they are about. Integrations
 * stay in Settings, where they were.
 *
 * Command is first and default: the Chief of Staff is the way in, and the
 * other tabs are where you go when you already know what you want.
 */
const TABS = [
  { id: "command", label: "Command" },
  { id: "content", label: "Content" },
  { id: "publishing", label: "Publishing" },
  { id: "performance", label: "Performance" },
  { id: "website", label: "Website" },
  { id: "history", label: "History" },
  { id: "settings", label: "Settings" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function MarketingWorkspace(props: MarketingWorkspaceProps) {
  const [tab, setTab] = useState<TabId>("command");
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1 border-b border-[var(--north-star-plate-border)]">
        {TABS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => setTab(entry.id)}
            className={
              tab === entry.id
                ? "px-4 py-2 text-sm font-medium text-altair-ink border-b-2 border-altair-accent"
                : "px-4 py-2 text-sm text-altair-ink-muted hover:text-altair-ink"
            }
          >
            {entry.label}
          </button>
        ))}
      </div>

      {tab === "command" ? (
        <MarketingCommandView
          lanes={props.command.lanes}
          attention={props.command.attention}
          activity={props.command.activity}
          messages={props.command.messages}
          awaitingReply={props.command.awaitingReply}
          platformUnavailableReason={props.command.platformUnavailableReason}
          canAsk={props.command.canAsk}
          // The same decision records Performance reads. One queue.
          decisions={props.decisions}
          workRequests={props.command.workRequests}
        />
      ) : null}

      {tab === "content" ? (
        <MarketingHubPageView
          initialPosts={props.posts}
          sitePublishingDetails={props.sitePublishingDetails}
          connectedAccounts={props.connectedAccounts}
          videoOptions={props.videoOptions}
          companyName={props.companyName}
          showFounderMarketing={props.showFounderMarketing}
          showFounderScreenshotCapture={props.showFounderScreenshotCapture}
          aiFeaturesEnabled={props.aiFeaturesEnabled}
          aiDraftingConfigured={props.aiDraftingConfigured}
        />
      ) : null}

      {tab === "publishing" ? (
        <div className="space-y-6">
          <MarketingTodayView
            key={refreshKey}
            posts={props.posts}
            connectedAccounts={props.connectedAccounts}
            videoOptions={props.videoOptions}
            rationaleByPostId={props.rationaleByPostId}
            automationHealth={props.automationHealth}
            renders={props.renders}
            nowIso={props.nowIso}
            onChanged={() => setRefreshKey((value) => value + 1)}
          />
          {/* The same dashboard, asked only for what going-out work looks
              like. Decision controls, support levels and empty states are
              unchanged — this is a subset, not a second component. */}
          <MarketingAutomationSection
            stored={props.snapshot}
            only={["approvals", "videoRenders"]}
            decisions={props.decisions}
            bridgeConfigured={props.bridgeConfigured}
            storedMediaJobIds={props.storedMediaJobIds}
            nowIso={props.nowIso}
          />
        </div>
      ) : null}

      {tab === "performance" ? (
        <MarketingAutomationSection
          stored={props.snapshot}
          only={["campaign", "recommendations", "agentStatus"]}
          decisions={props.decisions}
          bridgeConfigured={props.bridgeConfigured}
          storedMediaJobIds={props.storedMediaJobIds}
          nowIso={props.nowIso}
        />
      ) : null}

      {tab === "website" ? (
        <MarketingWebsiteView pages={props.sitePages} />
      ) : null}

      {tab === "history" ? (
        <MarketingAutomationSection
          stored={props.snapshot}
          only={["summary", "recentActivity", "upcomingWork"]}
          decisions={props.decisions}
          bridgeConfigured={props.bridgeConfigured}
          storedMediaJobIds={props.storedMediaJobIds}
          nowIso={props.nowIso}
        />
      ) : null}

      {tab === "settings" ? (
        <MarketingSettingsView
          automationHealth={props.automationHealth}
          connectedAccounts={props.connectedAccounts}
          canManageConnectedAccounts={props.canManageConnectedAccounts}
          connectedAccountsFlash={props.connectedAccountsFlash}
          canOpenMarketingHq={props.showFounderMarketing}
        />
      ) : null}
    </div>
  );
}
