"use client";

import { useMemo, useState } from "react";
import { Button } from "@/shared/design-system/components";
import { MarketingMediaPreview } from "./MarketingMediaPreview";
import { MarketingReelPublishControls } from "./MarketingReelPublishControls";
import { archiveMarketingPostAction } from "@/app/actions/marketing-posts";
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
 * A post qualifies for Today when it is a draft AND carries a video. A draft
 * with no video is a half-written idea, not a candidate awaiting a decision,
 * and putting it here would rebuild the pile this page exists to remove.
 */

type MarketingTodayViewProps = {
  posts: MarketingPost[];
  connectedAccounts: MarketingConnectedAccount[];
  videoOptions: ReelVideoOption[];
  /** Prose the pilot recorded for today's candidate, keyed by post id. */
  rationaleByPostId?: Record<string, string | undefined>;
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
  onChanged,
}: MarketingTodayViewProps) {
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const candidates = useMemo(
    () =>
      posts
        .filter((post) => post.status === "draft" && Boolean(post.videoMediaAssetId))
        .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "")),
    [posts],
  );

  const videoById = useMemo(
    () => new Map(videoOptions.map((option) => [option.id, option])),
    [videoOptions],
  );

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

  if (candidates.length === 0) {
    return (
      <section className="rounded-lg border border-[var(--north-star-plate-border)] bg-[var(--north-star-plate)] p-6">
        <h2 className="text-lg font-semibold text-altair-ink">Nothing waiting</h2>
        <p className="mt-1 text-sm text-altair-ink-muted">
          {/* Says what is true, not what a bridge reported. "Automation has not
              reported in yet" told the founder about a connection; this tells
              them about their day. */}
          No video is waiting for a decision right now.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      {candidates.map((post) => {
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
              <h2 className="text-xl font-semibold text-altair-ink">{post.title}</h2>
            </header>

            {video ? (
              <MarketingMediaPreview sourceJobId={video.sourceJobId} />
            ) : (
              <p className="text-sm text-altair-ink-muted">
                This post names a video that is not stored on this deployment yet.
              </p>
            )}

            {rationale ? (
              <div>
                <h3 className="text-sm font-medium text-altair-ink">Why this one</h3>
                <p className="mt-1 text-sm text-altair-ink-muted whitespace-pre-line">
                  {rationale}
                </p>
              </div>
            ) : null}

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
            {error ? <p className="text-[11px] text-altair-danger">{error}</p> : null}
          </section>
        );
      })}
    </div>
  );
}
