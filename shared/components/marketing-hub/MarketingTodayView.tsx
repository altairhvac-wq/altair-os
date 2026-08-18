"use client";

import { useMemo, useState } from "react";
import { Button } from "@/shared/design-system/components";
import { useCompanyTimezone } from "@/shared/lib/company-timezone";
import { formatDateTimeInTimeZone } from "@/shared/lib/datetime";
import { MarketingMediaPreview } from "./MarketingMediaPreview";
import { MarketingReelPublishControls } from "./MarketingReelPublishControls";
import { MarketingAutomationStatusStrip } from "./MarketingAutomationStatusStrip";
import { archiveMarketingPostAction } from "@/app/actions/marketing-posts";
import {
  deriveMarketingTodayState,
  selectTodayCandidates,
  type MarketingAutomationHealth,
  type TodayStateInput,
} from "@/shared/types/marketing-workspace-state";
import type { MarketingConnectedAccount } from "@/shared/types/marketing-connected-account";
import type { MarketingPost } from "@/shared/types/marketing-post";
import type { ReelVideoOption } from "@/shared/types/marketing-reel";

/**
 * The morning workflow, and nothing else.
 *
 * ==================== WHY THIS EXISTS ====================
 * The daily job is six steps — see today's video, watch it, understand why it
 * was made, read the Facebook copy, read the Instagram copy, approve or
 * reject — and doing it used to require two pages and a tolerance for eleven
 * sections of runtime telemetry. Schedule counts, task types, run states,
 * artifact ids, codecs, byte sizes, attempt numbers and contract-drift
 * warnings are all real and all worth keeping; none of them changes a
 * marketing decision, so none of them is here. They live under Advanced.
 *
 * ==================== ONE QUEUE, AND IT IS THIS ONE ====================
 * Three things called themselves an approval queue: the snapshot's
 * `approvals` section, the HQ `marketing_items` list, and marketing posts.
 * Only the last has a publish action behind it — `publishMarketingReelTo*`
 * takes a `MarketingPost` — so approving anywhere else recorded a decision
 * that published nothing and fed nothing back. This card is built on posts
 * because that is where Approve can honestly mean "and publish".
 *
 * Which posts qualify is decided by `selectTodayCandidates`, in a pure module
 * with its own proof script — including why an SEO approval can never reach
 * this list.
 *
 * ==================== AND WHEN THERE IS NOTHING TO DECIDE ====================
 * "Nothing waiting" was true and useless: it covered a render in progress, a
 * render that failed, and a day where nothing was ever started. Those are
 * three different mornings. `deriveMarketingTodayState` tells them apart and
 * this view prints the answer.
 */

type MarketingTodayViewProps = {
  posts: MarketingPost[];
  connectedAccounts: MarketingConnectedAccount[];
  videoOptions: ReelVideoOption[];
  /** Prose the pilot recorded for today's candidate, keyed by post id. */
  rationaleByPostId?: Record<string, string | undefined>;
  /** Already reduced to the three claims this page may make. */
  automationHealth: MarketingAutomationHealth;
  /** The platform's video-render section, or null if it never reported. */
  renders: TodayStateInput["renders"];
  nowIso: string;
  onChanged: () => void;
};

function channelLabel(channel: string): string {
  if (channel === "facebook") return "Facebook";
  if (channel === "instagram") return "Instagram";
  return channel.charAt(0).toUpperCase() + channel.slice(1);
}

export function MarketingTodayView({
  posts,
  connectedAccounts,
  videoOptions,
  rationaleByPostId = {},
  automationHealth,
  renders,
  nowIso,
  onChanged,
}: MarketingTodayViewProps) {
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timeZone = useCompanyTimezone();

  const candidates = useMemo(() => selectTodayCandidates(posts), [posts]);

  const todayState = useMemo(
    () => deriveMarketingTodayState({ posts, renders, nowIso }),
    [posts, renders, nowIso],
  );

  const videoById = useMemo(
    () => new Map(videoOptions.map((option) => [option.id, option])),
    [videoOptions],
  );

  // Formatted here rather than in the strip, because the company's time zone
  // is the reader's frame and the strip is a pure presentational component.
  const nextRunLabel = automationHealth.nextRunAtIso
    ? formatDateTimeInTimeZone(automationHealth.nextRunAtIso, timeZone, {
        weekday: "short",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  async function reject(post: MarketingPost) {
    setError(null);
    setRejecting(post.id);
    try {
      const result = await archiveMarketingPostAction(post.id);
      if (result?.error) setError(result.error);
      else onChanged();
    } finally {
      setRejecting(null);
    }
  }

  return (
    <div className="space-y-6">
      <MarketingAutomationStatusStrip
        health={automationHealth}
        nextRunLabel={nextRunLabel}
      />

      {candidates.length === 0 ? (
        <section className="rounded-lg border border-[var(--north-star-plate-border)] bg-[var(--north-star-plate)] p-6">
          <h2 className="text-lg font-semibold text-altair-ink">
            {todayState.headline}
          </h2>
          <p className="mt-1 text-sm text-altair-ink-muted">
            {todayState.detail}
          </p>
        </section>
      ) : (
        candidates.map((post) => {
          const video = post.videoMediaAssetId
            ? videoById.get(post.videoMediaAssetId)
            : undefined;
          const rationale = rationaleByPostId[post.id];
          return (
            <section
              key={post.id}
              className="rounded-lg border border-[var(--north-star-plate-border)] bg-[var(--north-star-plate)] p-6 space-y-5"
            >
              <header className="space-y-1">
                <p className="text-[11px] uppercase tracking-wide text-altair-ink-muted">
                  Today&apos;s video
                </p>
                {/* The HOOK is the headline, because that is the thing being
                    judged. The render job id used to be the title here, which
                    told the reader nothing they could act on. */}
                <h2 className="text-xl font-semibold text-altair-ink">
                  {post.title}
                </h2>
              </header>

              {video ? (
                <MarketingMediaPreview sourceJobId={video.sourceJobId} />
              ) : (
                <p className="text-sm text-altair-ink-muted">
                  This post names a video that is not stored on this deployment
                  yet.
                </p>
              )}

              <div>
                <h3 className="text-sm font-medium text-altair-ink">
                  Why this one
                </h3>
                {rationale ? (
                  <p className="mt-1 text-sm text-altair-ink-muted whitespace-pre-line">
                    {rationale}
                  </p>
                ) : (
                  // Stated, not hidden. A missing heading would let the reader
                  // assume nobody had a reason; this says the reason was not
                  // recorded, which is the true and more useful claim — and
                  // inventing one here would be exactly the kind of plausible
                  // filler this page was rebuilt to remove.
                  <p className="mt-1 text-sm text-altair-ink-muted italic">
                    No rationale was recorded for this post.
                  </p>
                )}
              </div>

              <div>
                <h3 className="text-sm font-medium text-altair-ink">
                  {channelLabel(post.channelTarget)} copy
                </h3>
                <p className="mt-1 whitespace-pre-line rounded-md border border-[var(--north-star-plate-border)] p-3 text-sm text-altair-ink">
                  {post.postText}
                </p>
                {post.suggestedHashtags.length > 0 ? (
                  <p className="mt-1 text-[11px] text-altair-ink-muted">
                    {post.suggestedHashtags.map((tag) => `#${tag}`).join(" ")}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-3 border-t border-[var(--north-star-plate-border)] pt-4">
                {/* Approve IS publish. The button that recorded a decision and
                    did nothing else lived on this page and was the single most
                    misleading control in the product. */}
                <MarketingReelPublishControls
                  post={post}
                  connectedAccounts={connectedAccounts}
                  videoOptions={videoOptions}
                  onPublished={onChanged}
                />
                <Button
                  size="sm"
                  variant="secondary"
                  loading={rejecting === post.id}
                  onClick={() => void reject(post)}
                >
                  Reject
                </Button>
              </div>
              {error ? (
                <p className="text-[11px] text-altair-danger">{error}</p>
              ) : null}
            </section>
          );
        })
      )}
    </div>
  );
}
