"use client";

import { useState } from "react";
import { MarketingTodayView } from "./MarketingTodayView";
import { MarketingAutomationSection } from "./MarketingAutomationSection";
import { MarketingHubPageView } from "./MarketingHubPageView";
import { MarketingConnectedAccountsCard } from "./MarketingConnectedAccountsCard";
import type { StoredAgentSnapshot } from "@/lib/database/queries/agent-snapshots";
import type { AgentDecisionRecord } from "@/lib/database/queries/agent-decisions";
import type { MarketingConnectedAccount } from "@/shared/types/marketing-connected-account";
import type { MarketingPost } from "@/shared/types/marketing-post";
import type { ReelVideoOption } from "@/shared/types/marketing-reel";

/**
 * Three tabs, in the order the founder needs them.
 *
 * ==================== WHAT MOVED, AND WHY NOTHING WAS DELETED ====================
 * Every section that used to be on this page is still reachable. What changed
 * is which of them the page opens on. Runs, schedules, agent permissions,
 * artifact and job ids, codecs, byte sizes, attempt counts, contract-drift
 * notices and stale-report warnings are diagnostics: real, worth keeping,
 * and incapable of changing a marketing decision. They are one click away
 * under Advanced instead of ahead of the video.
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
  connectedAccounts: MarketingConnectedAccount[];
  videoOptions: ReelVideoOption[];
  rationaleByPostId?: Record<string, string | undefined>;
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

const TABS = [
  { id: "today", label: "Today" },
  { id: "settings", label: "Settings" },
  { id: "advanced", label: "Advanced" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function MarketingWorkspace(props: MarketingWorkspaceProps) {
  const [tab, setTab] = useState<TabId>("today");
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

      {tab === "today" ? (
        <MarketingTodayView
          key={refreshKey}
          posts={props.posts}
          connectedAccounts={props.connectedAccounts}
          videoOptions={props.videoOptions}
          rationaleByPostId={props.rationaleByPostId}
          onChanged={() => setRefreshKey((value) => value + 1)}
        />
      ) : null}

      {tab === "settings" ? (
        <div className="space-y-6">
          <MarketingConnectedAccountsCard
            accounts={props.connectedAccounts}
            northStar
            canManageConnectedAccounts={props.canManageConnectedAccounts}
            flashMessage={props.connectedAccountsFlash}
          />
          <section className="rounded-lg border border-[var(--north-star-plate-border)] bg-[var(--north-star-plate)] p-6">
            <h2 className="text-lg font-semibold text-altair-ink">Automation</h2>
            <p className="mt-1 text-sm text-altair-ink-muted">
              {/* Stated rather than implied. The daily generator is off, and a
                  toggle that pretended otherwise would be the same class of
                  lie this page was rebuilt to remove. */}
              The daily video generator is not running on a schedule yet. Candidates
              are produced by running the pilot manually.
            </p>
            <p className="mt-3 text-sm text-altair-ink-muted">
              Brand, goals and industry profile live in{" "}
              <a className="underline" href="/marketing/hq">
                Marketing HQ
              </a>
              .
            </p>
          </section>
        </div>
      ) : null}

      {tab === "advanced" ? (
        <div className="space-y-6">
          <p className="text-sm text-altair-ink-muted">
            Runs, schedules, agent status, render diagnostics and post drafting.
            Nothing here is needed for the daily decision.
          </p>
          <MarketingAutomationSection
            stored={props.snapshot}
            decisions={props.decisions}
            bridgeConfigured={props.bridgeConfigured}
            storedMediaJobIds={props.storedMediaJobIds}
            nowIso={props.nowIso}
          />
          <MarketingHubPageView
            initialPosts={props.posts}
            connectedAccounts={props.connectedAccounts}
            videoOptions={props.videoOptions}
            companyName={props.companyName}
            showFounderMarketing={props.showFounderMarketing}
            showFounderScreenshotCapture={props.showFounderScreenshotCapture}
            aiFeaturesEnabled={props.aiFeaturesEnabled}
            aiDraftingConfigured={props.aiDraftingConfigured}
            canManageConnectedAccounts={props.canManageConnectedAccounts}
            connectedAccountsFlash={props.connectedAccountsFlash}
          />
        </div>
      ) : null}
    </div>
  );
}
