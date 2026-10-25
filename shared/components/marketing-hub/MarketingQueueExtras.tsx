"use client";

import { useMemo, useState } from "react";
import { Button } from "@/shared/design-system/components";
import { archiveMarketingPostAction } from "@/app/actions/marketing-posts";
import { approveMarketingPostForDistributionAction } from "@/app/actions/marketing-publish-approval";
import {
  convertMarketingItemToPostAction,
  reviewMarketingItemAction,
} from "@/app/actions/marketing-ai-hq";
import {
  REJECT_REASON_LABELS,
  REJECT_REASONS,
  type RejectReason,
} from "@/shared/types/marketing-reject-reasons";
import {
  selectArticleCandidates,
  selectTextPostCandidates,
} from "@/shared/types/marketing-workspace-state";
import type { MarketingItem } from "@/shared/types/marketing-ai-hq";
import type { MarketingPost } from "@/shared/types/marketing-post";
import { nextPublishSlot } from "@/lib/publishing/auto-approve";
import { useCompanyTimezone } from "@/shared/lib/company-timezone";
import { formatDateTimeInTimeZone } from "@/shared/lib/datetime";

/**
 * The rest of the one approval queue: everything that is not a video.
 *
 * ==================== WHY THIS SITS UNDER THE VIDEO CARDS ====================
 * Until 2026-10-25 the Marketing page had four approval lists and only the
 * video one could publish. Website articles from the agent platform had no
 * approve button anywhere, and Marketing HQ's weekly social ideas sat on a
 * separate page behind a two-step approve-then-convert flow. Both now land in
 * the same queue as the videos, and every Approve here calls the same
 * destination-bound approval action the video cards use: nothing publishes
 * from this component, the scheduled run does.
 *
 * Marketing HQ ideas are shown only for `social_post`, because that is the
 * only kind `convertMarketingItemToPostAction` can turn into a post. HQ's SEO
 * and blog ideas have no publish path; the agent platform's articles do, and
 * those appear in the Articles group.
 */

type MarketingQueueExtrasProps = {
  posts: readonly MarketingPost[];
  hqIdeas: readonly MarketingItem[];
  onChanged: () => void;
};

/** Newest ideas shown before "Show older"; the rest stay folded. */
const IDEAS_VISIBLE = 5;

const CARD =
  "rounded-lg border border-[var(--north-star-plate-border)] bg-[var(--north-star-plate)] p-6 space-y-4";
const SELECT =
  "rounded border border-[var(--north-star-plate-border)] bg-[var(--north-star-plate)] px-2 py-1 text-xs text-altair-ink";

function RejectControl({
  busy,
  onReject,
}: {
  busy: boolean;
  onReject: (reason: RejectReason) => void;
}) {
  const [open, setOpen] = useState(false);
  // Never pre-selected: these labels are training data, and a hurried
  // default click would record a reason nobody chose.
  const [reason, setReason] = useState<RejectReason | "">("");
  if (!open) {
    return (
      <Button
        size="sm"
        variant="secondary"
        onClick={() => {
          setReason("");
          setOpen(true);
        }}
      >
        Reject
      </Button>
    );
  }
  return (
    <span className="flex flex-wrap items-center gap-2">
      <select
        className={SELECT}
        value={reason}
        onChange={(event) => setReason(event.target.value as RejectReason | "")}
      >
        <option value="" disabled>
          Pick a reason…
        </option>
        {REJECT_REASONS.map((code) => (
          <option key={code} value={code}>
            {REJECT_REASON_LABELS[code]}
          </option>
        ))}
      </select>
      <Button
        size="sm"
        variant="secondary"
        disabled={reason === ""}
        loading={busy}
        onClick={() => {
          if (reason !== "") onReject(reason);
        }}
      >
        Confirm reject
      </Button>
      <Button size="sm" variant="quiet" onClick={() => setOpen(false)}>
        Cancel
      </Button>
    </span>
  );
}

export function MarketingQueueExtras({
  posts,
  hqIdeas,
  onChanged,
}: MarketingQueueExtrasProps) {
  const articles = useMemo(() => selectArticleCandidates(posts), [posts]);
  const textPosts = useMemo(() => selectTextPostCandidates(posts), [posts]);
  const ideas = useMemo(
    () => hqIdeas.filter((item) => item.kind === "social_post" && item.status === "draft"),
    [hqIdeas],
  );
  const [busy, setBusy] = useState<string | null>(null);
  const timeZone = useCompanyTimezone();
  const nextRunLabel = formatDateTimeInTimeZone(
    nextPublishSlot(new Date().toISOString()),
    timeZone,
    { weekday: "short", hour: "numeric", minute: "2-digit" },
  );
  const [expanded, setExpanded] = useState<string | null>(null);
  const [openIdea, setOpenIdea] = useState<string | null>(null);
  const [showAllIdeas, setShowAllIdeas] = useState(false);
  const [error, setError] = useState<{ id: string; message: string } | null>(null);

  async function run(id: string, work: () => Promise<string | null>) {
    setError(null);
    setBusy(id);
    try {
      const failure = await work();
      if (failure) {
        setError({ id, message: failure });
        return;
      }
      onChanged();
    } finally {
      setBusy(null);
    }
  }

  const approve = (post: MarketingPost) =>
    run(post.id, async () => {
      // Approve books the NEXT daily publishing run. An approval with no
      // slot records the job as "approved" but never "scheduled", and the
      // publisher only leases scheduled jobs — found 2026-10-25 when the
      // first article approved here would never have gone out.
      const result = await approveMarketingPostForDistributionAction(post.id, {
        scheduledAt: nextPublishSlot(new Date().toISOString()),
        connectedAccountId: null,
      });
      return result?.error ?? null;
    });

  const reject = (post: MarketingPost, reason: RejectReason) =>
    run(post.id, async () => {
      const result = await archiveMarketingPostAction(post.id, { reason });
      return result?.error ?? null;
    });

  const keepIdea = (item: MarketingItem) =>
    run(item.id, async () => {
      const reviewed = await reviewMarketingItemAction(item.id, "approved");
      if (reviewed?.error) return reviewed.error;
      const converted = await convertMarketingItemToPostAction(item.id);
      return converted?.error ?? null;
    });

  const dismissIdea = (item: MarketingItem) =>
    run(item.id, async () => {
      const result = await reviewMarketingItemAction(item.id, "rejected");
      return result?.error ?? null;
    });

  if (articles.length === 0 && textPosts.length === 0 && ideas.length === 0) {
    return null;
  }

  const errorFor = (id: string) =>
    error?.id === id ? (
      <p className="text-[11px] text-altair-danger">{error.message}</p>
    ) : null;

  return (
    <div className="space-y-6">
      {articles.map((post) => (
        <section key={post.id} className={CARD}>
          <header className="space-y-1">
            <p className="text-[11px] uppercase tracking-wide text-altair-ink-muted">
              Website article
            </p>
            <h2 className="text-xl font-semibold text-altair-ink">{post.title}</h2>
            {post.directorRationale ? (
              <p className="text-sm text-altair-ink-muted whitespace-pre-line">
                {post.directorRationale}
              </p>
            ) : null}
          </header>
          <div>
            <p
              className={`whitespace-pre-line rounded-md border border-[var(--north-star-plate-border)] p-3 text-sm text-altair-ink ${
                expanded === post.id ? "" : "max-h-48 overflow-hidden"
              }`}
            >
              {post.postText}
            </p>
            <Button
              size="sm"
              variant="quiet"
              onClick={() => setExpanded((current) => (current === post.id ? null : post.id))}
            >
              {expanded === post.id ? "Show less" : "Read the whole article"}
            </Button>
          </div>
          <p className="rounded-md border border-altair-warning/40 bg-[var(--surface-tile)] p-3 text-[12px] text-altair-warning">
            Approving publishes this page on www.altair-op.com at the next
            daily publishing run ({nextRunLabel}).
          </p>
          <div className="flex flex-wrap items-center gap-3 border-t border-[var(--north-star-plate-border)] pt-4">
            <Button size="sm" loading={busy === post.id} onClick={() => void approve(post)}>
              Approve article
            </Button>
            <RejectControl busy={busy === post.id} onReject={(reason) => void reject(post, reason)} />
          </div>
          {errorFor(post.id)}
        </section>
      ))}

      {textPosts.map((post) => (
        <section key={post.id} className={CARD}>
          <header className="space-y-1">
            <p className="text-[11px] uppercase tracking-wide text-altair-ink-muted">
              Facebook post (text)
            </p>
            <h2 className="text-lg font-semibold text-altair-ink">{post.title}</h2>
          </header>
          <p className="whitespace-pre-line rounded-md border border-[var(--north-star-plate-border)] p-3 text-sm text-altair-ink">
            {post.postText}
          </p>
          {post.suggestedHashtags.length > 0 ? (
            <p className="text-[11px] text-altair-ink-muted">
              {post.suggestedHashtags.map((tag) => `#${tag}`).join(" ")}
            </p>
          ) : null}
          <p className="text-[11px] text-altair-ink-muted">
            Edit the wording under Library before approving if it needs changes.
            Approving publishes it at the next daily run ({nextRunLabel}), and
            Facebook posts are public the moment they publish.
          </p>
          <div className="flex flex-wrap items-center gap-3 border-t border-[var(--north-star-plate-border)] pt-4">
            <Button size="sm" loading={busy === post.id} onClick={() => void approve(post)}>
              Approve post
            </Button>
            <RejectControl busy={busy === post.id} onReject={(reason) => void reject(post, reason)} />
          </div>
          {errorFor(post.id)}
        </section>
      ))}

      {ideas.length > 0 ? (
        <section className={CARD}>
          <header className="space-y-1">
            <h2 className="text-lg font-semibold text-altair-ink">
              Ideas from the weekly marketing AI
            </h2>
            <p className="text-sm text-altair-ink-muted">
              Keep turns an idea into a Facebook draft in Library, where you can
              edit it and then approve it here. Dismiss removes it from this list.
            </p>
          </header>
          {/* Owner, 2026-10-25: one line per idea, opened on a click, and
              only the newest few until asked — 54 open ideas made Today
              eight screens long. */}
          <ul className="space-y-2">
            {(showAllIdeas ? ideas : ideas.slice(0, IDEAS_VISIBLE)).map((item) => {
              const open = openIdea === item.id;
              return (
                <li
                  key={item.id}
                  className="rounded-md border border-[var(--north-star-plate-border)] bg-[var(--surface-tile)]"
                >
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenIdea((current) => (current === item.id ? null : item.id))}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left"
                  >
                    <span className="min-w-0 truncate text-sm font-medium text-altair-ink">
                      {item.title}
                    </span>
                    <span className="shrink-0 text-[11px] text-altair-ink-muted">
                      {item.createdAt.slice(0, 10)} {open ? "▴" : "▾"}
                    </span>
                  </button>
                  {open ? (
                    <div className="space-y-2 border-t border-[var(--north-star-plate-border)] px-3 py-3">
                      <p className="whitespace-pre-line text-sm text-altair-ink-muted">
                        {item.bodyText}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button size="sm" loading={busy === item.id} onClick={() => void keepIdea(item)}>
                          Keep
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={busy === item.id}
                          onClick={() => void dismissIdea(item)}
                        >
                          Dismiss
                        </Button>
                      </div>
                      {errorFor(item.id)}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {ideas.length > IDEAS_VISIBLE ? (
            <Button size="sm" variant="quiet" onClick={() => setShowAllIdeas((value) => !value)}>
              {showAllIdeas ? "Show fewer" : `Show ${String(ideas.length - IDEAS_VISIBLE)} older ideas`}
            </Button>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
