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
  REJECT_REASON_LABELS,
  REJECT_REASONS,
  type RejectReason,
} from "@/shared/types/marketing-reject-reasons";
import {
  deriveMarketingTodayState,
  selectTodayCandidates,
  type MarketingAutomationHealth,
  type TodayStateInput,
} from "@/shared/types/marketing-workspace-state";
import type { MarketingConnectedAccount } from "@/shared/types/marketing-connected-account";
import type { MarketingPost } from "@/shared/types/marketing-post";
import {
  markReelVersions,
  parseRenderJobId,
  type ReelVersionMark,
  type ReelVideoOption,
} from "@/shared/types/marketing-reel";

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

/**
 * ============ WHICH RENDER IS THIS ============
 *
 * Three drafts of `altair-overview-hookB` sat in Today looking identical, and
 * only the newest was worth approving. Every fact needed to tell them apart was
 * already on the row: `marketing_media_assets.source_job_id` carries the Agent
 * Platform's render job id, and that id encodes the reel/variation name and the
 * render time. It was simply never displayed.
 *
 * Reports what it has and says so when it has not got it. `hasAudio` is the
 * only audio fact the platform snapshot carries, and it means A TRACK EXISTS —
 * not that anyone can hear it — so it is worded as presence, never as sound.
 */
/**
 * A friendly label and a color cue for agent-platform's own
 * STUB / REVIEWABLE_CREATIVE / PRODUCTION_READY render-quality verdict
 * (migration 195's `quality_state`). Unrecognized text is shown verbatim
 * rather than hidden — a value this reader does not know about is still a
 * real fact from the platform, not nothing.
 *
 * Labeled "Render QA" on the card, deliberately not "Quality": this is an
 * AUTOMATED classification (stub ingredients / missing guard data / measured
 * silence — see quality-classification.ts on the agent-platform side), not a
 * human or creative judgment of how good the content is. "Quality" alone
 * would overstate what this row actually asserts.
 */
function formatQualityState(state: string): { label: string; className: string } {
  if (state === "STUB")
    return { label: "Stub (placeholder render)", className: "text-altair-danger" };
  if (state === "REVIEWABLE_CREATIVE")
    return {
      label: "Reviewable creative",
      className: "text-altair-ink-secondary",
    };
  if (state === "PRODUCTION_READY")
    return { label: "Production ready", className: "text-altair-success" };
  return { label: state, className: "text-altair-ink-secondary" };
}

function ReelIdentityPanel({
  sourceJobId,
  mark,
  render,
  timeZone,
  storedAt,
  durationMs,
  costUsd,
  qualityState,
}: {
  sourceJobId: string;
  mark: ReelVersionMark | undefined;
  render:
    | {
        renderState: string;
        stage: string | null;
        failureName: string | null;
        hasAudio: boolean | null;
      }
    | undefined;
  timeZone: string;
  storedAt: string | null;
  /** Phase 1: `marketing_media_assets.duration_ms`, already on every stored video — no backend change. */
  durationMs: number | null;
  /** Phase 2 (migration 195). Undefined — not null — when this post never had a value; the row is omitted rather than shown as "not reported". */
  costUsd?: number;
  qualityState?: string;
}) {
  const identity = parseRenderJobId(sourceJobId);
  const supersededBy = mark && !mark.isNewest ? mark.siblingCount - 1 : 0;
  const failed = Boolean(render?.failureName);
  // The id's own stamp is when the render STARTED, which is the number that
  // separates these drafts. `storedAt` is when the bytes landed here — close,
  // but a different fact, and used only when the id carries no stamp.
  const renderedAt = identity?.renderedAt ?? storedAt;

  return (
    <div className="rounded-[var(--radius-section)] border border-[var(--north-star-plate-border)] bg-[var(--surface-tile)] p-3.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="text-sm font-medium text-altair-ink">
          {identity ? identity.reelName : "Reel name not in this job id"}
        </p>
        {/* Brass, not green: newest is an identity, not a health verdict. An
            older draft is OLDER, not broken, and nothing here rejects one. */}
        {mark?.isNewest && mark.siblingCount > 1 ? (
          <span className="rounded border border-altair-brass px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-altair-brass">
            Newest render
          </span>
        ) : null}
        {supersededBy > 0 ? (
          <span className="text-[11px] text-altair-ink-muted">
            superseded by {supersededBy} newer render
            {supersededBy === 1 ? "" : "s"} of this Reel
          </span>
        ) : null}
      </div>

      <dl className="mt-2 grid gap-x-4 gap-y-1 text-[11px] sm:grid-cols-[auto_1fr]">
        <dt className="uppercase tracking-wide text-altair-ink-muted">Render job</dt>
        <dd className="break-all font-mono text-[11px] text-altair-ink-secondary">
          {sourceJobId}
        </dd>

        <dt className="uppercase tracking-wide text-altair-ink-muted">Rendered</dt>
        <dd className="text-altair-ink-secondary">
          {renderedAt
            ? formatDateTimeInTimeZone(renderedAt, timeZone, {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })
            : "time not reported"}
        </dd>

        <dt className="uppercase tracking-wide text-altair-ink-muted">Render</dt>
        <dd className={failed ? "text-altair-danger" : "text-altair-ink-secondary"}>
          {render
            ? [
                render.renderState,
                render.stage ? `stage ${render.stage}` : null,
                render.failureName,
              ]
                .filter(Boolean)
                .join(" · ")
            : "not reported by the platform"}
        </dd>

        <dt className="uppercase tracking-wide text-altair-ink-muted">Audio</dt>
        <dd
          className={
            render?.hasAudio === false
              ? "text-altair-danger"
              : "text-altair-ink-secondary"
          }
        >
          {render?.hasAudio === true
            ? "audio track present"
            : render?.hasAudio === false
              ? "NO audio track"
              : "not reported"}
        </dd>

        <dt className="uppercase tracking-wide text-altair-ink-muted">Duration</dt>
        <dd className="text-altair-ink-secondary">
          {typeof durationMs === "number" && durationMs > 0
            ? `${(durationMs / 1000).toFixed(1)}s`
            : "not reported"}
        </dd>

        {/* Migration 195 enrichment. Omitted entirely rather than "not
            reported" — unlike the render facts above, most existing posts
            (and any post from a deployment that never configured cost
            tracking or quality classification) genuinely have no value here,
            and a blank row for a fact this page never claimed to know would
            just be noise. */}
        {typeof costUsd === "number" ? (
          <>
            <dt className="uppercase tracking-wide text-altair-ink-muted">
              Est. cost
            </dt>
            <dd className="text-altair-ink-secondary">
              ${costUsd.toFixed(2)}
            </dd>
          </>
        ) : null}

        {typeof qualityState === "string"
          ? (() => {
              const quality = formatQualityState(qualityState);
              return (
                <>
                  <dt className="uppercase tracking-wide text-altair-ink-muted">
                    Render QA
                  </dt>
                  <dd className={quality.className}>{quality.label}</dd>
                </>
              );
            })()
          : null}
      </dl>
    </div>
  );
}

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
  /** Post id whose reject-reason picker is open, and the picked reason.
   * "" = no reason picked yet — the picker never pre-selects one, because a
   * hurried default click would record a label nobody actually chose, and
   * these labels are training data. */
  const [rejectPickerFor, setRejectPickerFor] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<RejectReason | "">("");
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

  // Which render of each Reel is newest. Derived from the job ids already on
  // the rows — nothing new is stored, nothing is filtered, and an id from an
  // older scheme simply gets no mark.
  const versionMarks = useMemo(
    () => markReelVersions(videoOptions.map((option) => option.sourceJobId)),
    [videoOptions],
  );

  // The platform's own account of each render, by job id. Absent for a render
  // it never reported, which the panel says rather than guessing.
  const renderByJobId = useMemo(
    () => new Map((renders?.items ?? []).map((item) => [item.jobId, item])),
    [renders],
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

  async function reject(post: MarketingPost, reason: RejectReason) {
    setError(null);
    setRejecting(post.id);
    try {
      // The reason rides the SAME button press that archives — the label
      // factory lives on the control the founder already uses, never on a
      // parallel surface (the zero-rows decision channel is the cautionary
      // precedent). SUPERSEDED exists so clearing a stale draft is
      // distinguishable from rejecting a bad one.
      const result = await archiveMarketingPostAction(post.id, { reason });
      if (result?.error) setError(result.error);
      else {
        // Close only THIS post's picker — an in-flight success must not
        // slam shut a picker the founder just opened on another card.
        setRejectPickerFor((current) => (current === post.id ? null : current));
        onChanged();
      }
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
          // The daily-pilot queue's own rationale (lib/marketing/store.ts,
          // via marketing_items) takes priority when it exists — it predates
          // migration 195 and nothing here should change what a post already
          // showed. `post.directorRationale` is the fallback for a post this
          // queue mechanism never touched, e.g. one opened by
          // /api/agent/draft-posts for the transported-render pipeline,
          // which has never gone through marketing_items at all.
          const rationale = rationaleByPostId[post.id] ?? post.directorRationale;
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
                <>
                  <ReelIdentityPanel
                    sourceJobId={video.sourceJobId}
                    mark={versionMarks.get(video.sourceJobId)}
                    render={renderByJobId.get(video.sourceJobId)}
                    timeZone={timeZone}
                    storedAt={video.storedAt}
                    durationMs={video.durationMs}
                    costUsd={post.costUsd}
                    qualityState={post.qualityState}
                  />
                  <MarketingMediaPreview sourceJobId={video.sourceJobId} />
                </>
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
                {rejectPickerFor === post.id ? (
                  <span className="flex flex-wrap items-center gap-2">
                    <select
                      className="rounded border border-[var(--north-star-plate-border)] bg-[var(--north-star-plate)] px-2 py-1 text-xs text-altair-ink"
                      value={rejectReason}
                      onChange={(event) =>
                        setRejectReason(event.target.value as RejectReason | "")
                      }
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
                      disabled={rejectReason === ""}
                      loading={rejecting === post.id}
                      onClick={() => {
                        if (rejectReason !== "") void reject(post, rejectReason);
                      }}
                    >
                      Confirm reject
                    </Button>
                    <Button
                      size="sm"
                      variant="quiet"
                      onClick={() => setRejectPickerFor(null)}
                    >
                      Cancel
                    </Button>
                  </span>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      // Fresh picker per post — a reason picked for one draft
                      // must never linger as another draft's default.
                      setRejectReason("");
                      setRejectPickerFor(post.id);
                    }}
                  >
                    Reject
                  </Button>
                )}
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
