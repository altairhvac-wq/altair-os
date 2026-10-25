"use client";

import { useMemo, useState } from "react";
import { Button } from "@/shared/design-system/components";
import { useCompanyTimezone } from "@/shared/lib/company-timezone";
import { formatDateTimeInTimeZone } from "@/shared/lib/datetime";
import { MarketingMediaPreview } from "./MarketingMediaPreview";
import { MarketingAutomationStatusStrip } from "./MarketingAutomationStatusStrip";
import { archiveMarketingPostAction } from "@/app/actions/marketing-posts";
import { approveMarketingPostForDistributionAction } from "@/app/actions/marketing-publish-approval";
import {
  listDestinationCandidates,
  providerForChannelTarget,
} from "@/shared/lib/marketing-publish-destination";
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
import type {
  MarketingPost,
  MeasuredRenderQa,
} from "@/shared/types/marketing-post";
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
 * marketing decision, so none of them is here. (The diagnostics tabs that
 * held them were retired with the three-tab page on 2026-10-25.)
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

/**
 * The MEASURED verdict's label — and the one piece of wording on this card
 * that has to be exactly right.
 *
 * ==================== ABSENCE IS NOT A PASS, AND SAYS SO ====================
 * `undefined` means no measured verdict was transported for this post. That
 * is not "fine", it is "nobody looked", and the label says the second. The
 * whole upstream policy is built on keeping "not measured" apart from
 * "measured and clean"; a UI that renders the first as a blank space, or
 * worse as a green tick, throws that distinction away at the last hop —
 * which is the only hop a founder actually sees.
 *
 * `UNEVALUATED` is the third state and gets its own words too: the
 * measurement RAN and could not reach an answer. That is a fault in the
 * measuring, not in the video, and it needs a different fix from a FAIL.
 */
function formatMeasuredRenderQa(qa: MeasuredRenderQa | undefined): {
  label: string;
  className: string;
} {
  if (!qa) {
    return {
      label: "Not measured",
      className: "text-altair-ink-muted",
    };
  }
  if (qa.state === "FAIL") {
    return {
      label: `Failed — ${qa.summary}`,
      className: "text-altair-danger",
    };
  }
  if (qa.state === "UNEVALUATED") {
    return {
      label: `Could not be measured — ${qa.summary}`,
      className: "text-altair-warning",
    };
  }
  // PASS. Advisories are the WARN rung: the file is deliverable and something
  // about it was still worth writing down. Naming the codes keeps the row
  // honest without turning a pass into a scare.
  return {
    label:
      qa.advisories.length > 0
        ? `Passed with notes — ${qa.advisories.join(", ")}`
        : "Passed",
    className:
      qa.advisories.length > 0
        ? "text-altair-ink-secondary"
        : "text-altair-success",
  };
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
  renderQa,
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
  /**
   * The measured Truthline verdict (migration 198). Undefined means none was
   * transported — which the panel states out loud rather than hiding.
   */
  renderQa?: MeasuredRenderQa;
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

        {/*
          ============ RENDER QA IS ALWAYS SHOWN, INCLUDING WHEN IT IS ABSENT ============
          Every other row on this panel is omitted when it has no value, which
          is right for a cost or a duration: a missing number says nothing
          anyone could misread. A missing QA verdict is different. Hiding it
          left a founder unable to tell "measured and clean" from "never
          measured" — the card looked the same either way, and the quiet
          version of that mistake is what shipped a −35.8 LUFS master and a
          silent placeholder to Instagram.

          So this row is unconditional, and `undefined` gets words rather than
          an empty space.
        */}
        <dt className="uppercase tracking-wide text-altair-ink-muted">
          Render QA
        </dt>
        <dd className={formatMeasuredRenderQa(renderQa).className}>
          {formatMeasuredRenderQa(renderQa).label}
        </dd>

        {/*
          The provenance verdict, kept as its own row and its own words. It
          answers "were the ingredients real?", not "does the file measure
          clean?", and stacking them under one label would let the weaker
          claim borrow the stronger one's authority.
        */}
        {typeof qualityState === "string"
          ? (() => {
              const quality = formatQualityState(qualityState);
              return (
                <>
                  <dt className="uppercase tracking-wide text-altair-ink-muted">
                    Ingredients
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
  if (channel === "youtube") return "YouTube";
  return channel.charAt(0).toUpperCase() + channel.slice(1);
}

/**
 * One VIDEO, one card — however many channels it is drafted for.
 *
 * ==================== WHY THE GROUP EXISTS ====================
 * The morning workflow this file's header describes has always been "watch
 * the video, read the Facebook copy, read the Instagram copy, decide" — one
 * decision about one video. The bridge opens one draft ROW per channel
 * (delivery claims are per channel, so that is the right storage), and
 * rendering each row as its own card showed the same video two or three
 * times with near-identical framing. Grouping is presentation only: the
 * rows, the candidate rule (`selectTodayCandidates`, untouched) and the
 * per-channel publish actions are exactly what they were.
 */
type TodayGroup = { key: string; posts: MarketingPost[] };

/** Newest approved items shown before "Show older". */
const APPROVED_VISIBLE = 3;

const CHANNEL_ORDER: Record<string, number> = {
  youtube: 0,
  facebook: 1,
  instagram: 2,
};

function groupByVideo(posts: readonly MarketingPost[]): TodayGroup[] {
  const map = new Map<string, MarketingPost[]>();
  for (const post of posts) {
    // A post with no video cannot be a Today candidate, but the approved
    // strip reuses this too — key by id there so nothing collapses wrongly.
    const key = post.videoMediaAssetId ?? post.id;
    const bucket = map.get(key);
    if (bucket) bucket.push(post);
    else map.set(key, [post]);
  }
  return [...map.entries()].map(([key, grouped]) => ({
    key,
    posts: [...grouped].sort(
      (a, b) =>
        (CHANNEL_ORDER[a.channelTarget] ?? 9) -
        (CHANNEL_ORDER[b.channelTarget] ?? 9),
    ),
  }));
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
  /** Group key whose reject-reason picker is open, and the picked reason.
   * "" = no reason picked yet — the picker never pre-selects one, because a
   * hurried default click would record a label nobody actually chose, and
   * these labels are training data. */
  const [rejectPickerFor, setRejectPickerFor] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<RejectReason | "">("");
  /** Group key mid-approval, and each group's optional distribution slot
   * (datetime-local text, empty = approve without a slot). */
  const [approving, setApproving] = useState<string | null>(null);
  const [slotByGroup, setSlotByGroup] = useState<Record<string, string>>({});
  /** Destination per (group, channel) — only asked for when the company has
   * more than one eligible account for that channel. Key: `${group}:${channel}`. */
  const [destinationByKey, setDestinationByKey] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const timeZone = useCompanyTimezone();

  const candidates = useMemo(() => selectTodayCandidates(posts), [posts]);
  const groups = useMemo(() => groupByVideo(candidates), [candidates]);

  /**
   * Already approved for scheduled distribution: agent-proposed drafts that
   * a person moved to `ready` (approved, slot pending) or `scheduled` (slot
   * assigned). Shown below the queue so an approved Short remains visible
   * with its release slot instead of silently vanishing — and scoped to the
   * agent source so a founder's own manually-staged posts do not suddenly
   * appear in an automation strip they never asked for.
   */
  const approvedGroups = useMemo(
    () =>
      groupByVideo(
        posts
          .filter(
            // Every approved-but-unpublished post since 2026-10-25, not only
            // agent videos: an approved website article or Facebook post
            // vanished from Today the moment it was approved.
            (post) => post.status === "ready" || post.status === "scheduled",
          )
          .sort((a, b) =>
            (b.scheduledAt ?? b.createdAt ?? "").localeCompare(
              a.scheduledAt ?? a.createdAt ?? "",
            ),
          ),
      ),
    [posts],
  );
  /** Owner, 2026-10-25: finished items fold to one line and open on click. */
  const [openApproved, setOpenApproved] = useState<string | null>(null);
  const [showAllApproved, setShowAllApproved] = useState(false);

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

  async function reject(group: TodayGroup, reason: RejectReason) {
    setError(null);
    setRejecting(group.key);
    try {
      // The reason rides the SAME button press that archives — the label
      // factory lives on the control the founder already uses, never on a
      // parallel surface (the zero-rows decision channel is the cautionary
      // precedent). SUPERSEDED exists so clearing a stale draft is
      // distinguishable from rejecting a bad one. One decision covers the
      // whole video: every channel's draft is archived under the one reason,
      // because "the Instagram copy is bad" still returns the VIDEO to
      // rework — a per-channel partial reject was never a real state here.
      for (const post of group.posts) {
        const result = await archiveMarketingPostAction(post.id, { reason });
        if (result?.error) {
          setError(`${channelLabel(post.channelTarget)}: ${result.error}`);
          return;
        }
      }
      // Close only THIS group's picker — an in-flight success must not
      // slam shut a picker the founder just opened on another card.
      setRejectPickerFor((current) => (current === group.key ? null : current));
      onChanged();
    } finally {
      setRejecting(null);
    }
  }

  /**
   * APPROVED FOR SCHEDULED DISTRIBUTION — deliberately not a publish.
   *
   * Calls the approval action, which keeps the existing schedule/status
   * coupling (a slot sets `scheduledAt` and derives `scheduled`; no slot
   * sets `ready`) and ALSO writes the `marketing_publish_jobs` row with the
   * explicit destination account and the approver. Nothing goes live from
   * this button: distribution is the separate, operator-armed cron, which is
   * the entire point for Meta — Facebook and Instagram are PUBLIC the
   * moment they publish, so "approve" must never be the same click.
   */
  async function approveForScheduledDistribution(group: TodayGroup) {
    setError(null);
    setApproving(group.key);
    try {
      const slot = (slotByGroup[group.key] ?? "").trim();
      const scheduledAtIso = slot ? new Date(slot).toISOString() : null;
      for (const post of group.posts) {
        // The approval now CARRIES its destination: the server resolves a
        // single eligible account itself and refuses to guess between
        // several, so the id is only sent when the human picked one here.
        const result = await approveMarketingPostForDistributionAction(post.id, {
          scheduledAt: scheduledAtIso,
          connectedAccountId:
            destinationByKey[`${group.key}:${post.channelTarget}`] ?? null,
        });
        if (result?.error) {
          setError(`${channelLabel(post.channelTarget)}: ${result.error}`);
          return;
        }
      }
      onChanged();
    } finally {
      setApproving(null);
    }
  }

  /** Channels in this group with MORE THAN ONE eligible destination. */
  function ambiguousDestinations(group: TodayGroup) {
    const seen = new Set<string>();
    const out: { channel: string; candidates: MarketingConnectedAccount[] }[] = [];
    for (const post of group.posts) {
      if (seen.has(post.channelTarget)) continue;
      seen.add(post.channelTarget);
      const provider = providerForChannelTarget(post.channelTarget);
      if (!provider) continue;
      const candidates = listDestinationCandidates(connectedAccounts, provider);
      if (candidates.length > 1) out.push({ channel: post.channelTarget, candidates });
    }
    return out;
  }

  return (
    <div className="space-y-6">
      <MarketingAutomationStatusStrip
        health={automationHealth}
        nextRunLabel={nextRunLabel}
      />

      {groups.length === 0 ? (
        <section className="rounded-lg border border-[var(--north-star-plate-border)] bg-[var(--north-star-plate)] p-6">
          <h2 className="text-lg font-semibold text-altair-ink">
            {todayState.headline}
          </h2>
          <p className="mt-1 text-sm text-altair-ink-muted">
            {todayState.detail}
          </p>
        </section>
      ) : (
        groups.map((group) => {
          const lead = group.posts[0];
          const video = lead.videoMediaAssetId
            ? videoById.get(lead.videoMediaAssetId)
            : undefined;
          // The daily-pilot queue's own rationale (lib/marketing/store.ts,
          // via marketing_items) takes priority when it exists — it predates
          // migration 195 and nothing here should change what a post already
          // showed. `post.directorRationale` is the fallback for a post this
          // queue mechanism never touched, e.g. one opened by
          // /api/agent/draft-posts for the transported-render pipeline,
          // which has never gone through marketing_items at all. In a group
          // the channels share one render, so the first recorded rationale
          // speaks for the video.
          const rationale =
            group.posts
              .map((post) => rationaleByPostId[post.id] ?? post.directorRationale)
              .find((value) => Boolean(value)) ?? undefined;
          const hasMetaChannel = group.posts.some(
            (post) =>
              post.channelTarget === "facebook" ||
              post.channelTarget === "instagram",
          );
          // Sibling drafts of the SAME video that already went out. The
          // delivery claim is per (post, provider), so a second sibling can
          // still reach the same platform — a real duplicate, live on a real
          // account. The queue cannot stop a determined click, but it can
          // stop an uninformed one.
          const postedSiblings = lead.videoMediaAssetId
            ? posts.filter(
                (post) =>
                  post.videoMediaAssetId === lead.videoMediaAssetId &&
                  post.status === "posted",
              )
            : [];
          return (
            <section
              key={group.key}
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
                  {lead.title}
                </h2>
                <p className="text-[11px] text-altair-ink-muted">
                  Intended platforms:{" "}
                  {group.posts
                    .map((post) => channelLabel(post.channelTarget))
                    .join(" · ")}
                </p>
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
                    costUsd={lead.costUsd}
                    qualityState={lead.qualityState}
                    renderQa={lead.renderQa}
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

              {/* Every channel's copy, side by side — the founder reads what
                  each platform will actually carry before one decision covers
                  them all. There is no publish-now button on any channel
                  (2026-10-25 simplification): Approve below is the one way
                  out, so every publish goes through the destination-bound
                  job, the kill switch and the scheduled run. */}
              {group.posts.map((post) => (
                <div key={post.id}>
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
              ))}

              {postedSiblings.length > 0 ? (
                <p className="rounded-md border border-altair-danger/40 bg-[var(--surface-tile)] p-3 text-[12px] text-altair-danger">
                  This video already went out from a sibling card:{" "}
                  {postedSiblings
                    .map((post) => channelLabel(post.channelTarget))
                    .join(", ")}
                  . Approving the same platform again would post a DUPLICATE on
                  the real account — reject this card unless that is intended.
                </p>
              ) : null}

              {hasMetaChannel ? (
                <p className="rounded-md border border-altair-warning/40 bg-[var(--surface-tile)] p-3 text-[12px] text-altair-warning">
                  Facebook and Instagram are public-on-publish: when
                  distribution runs, those Reels are live immediately — Meta
                  has no private or draft mode. YouTube uploads stay private
                  until a person flips them.
                </p>
              ) : null}

              <div className="flex flex-wrap items-center gap-3 border-t border-[var(--north-star-plate-border)] pt-4">
                {/* Approval here means APPROVED FOR SCHEDULED DISTRIBUTION —
                    the approval action moves every channel's draft to
                    scheduled (slot given) or ready (slot pending) AND writes
                    the publish-queue row with its destination and approver.
                    Nothing publishes from this button; the publisher cron
                    runs scheduled jobs, and only when the deployment is
                    armed. */}
                <label className="flex items-center gap-2 text-[11px] text-altair-ink-muted">
                  Release slot
                  <input
                    type="datetime-local"
                    className="rounded border border-[var(--north-star-plate-border)] bg-[var(--north-star-plate)] px-2 py-1 text-xs text-altair-ink"
                    value={slotByGroup[group.key] ?? ""}
                    onChange={(event) =>
                      setSlotByGroup((current) => ({
                        ...current,
                        [group.key]: event.target.value,
                      }))
                    }
                  />
                </label>
                {ambiguousDestinations(group).map(({ channel, candidates }) => (
                  <label
                    key={`${group.key}:${channel}`}
                    className="flex items-center gap-2 text-[11px] text-altair-ink-muted"
                  >
                    {channelLabel(channel)} destination
                    <select
                      className="rounded border border-[var(--north-star-plate-border)] bg-[var(--north-star-plate)] px-2 py-1 text-xs text-altair-ink"
                      value={destinationByKey[`${group.key}:${channel}`] ?? ""}
                      onChange={(event) =>
                        setDestinationByKey((current) => ({
                          ...current,
                          [`${group.key}:${channel}`]: event.target.value,
                        }))
                      }
                    >
                      <option value="">Choose an account…</option>
                      {candidates.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.providerResourceName?.trim() ||
                            account.providerAccountName?.trim() ||
                            account.id}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
                <Button
                  size="sm"
                  loading={approving === group.key}
                  onClick={() => void approveForScheduledDistribution(group)}
                >
                  {slotByGroup[group.key]?.trim()
                    ? "Approve for scheduled distribution"
                    : "Approve (slot pending)"}
                </Button>
                {rejectPickerFor === group.key ? (
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
                      loading={rejecting === group.key}
                      onClick={() => {
                        if (rejectReason !== "") void reject(group, rejectReason);
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
                      // Fresh picker per card — a reason picked for one draft
                      // must never linger as another draft's default.
                      setRejectReason("");
                      setRejectPickerFor(group.key);
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

      {approvedGroups.length > 0 ? (
        <section className="rounded-lg border border-[var(--north-star-plate-border)] bg-[var(--north-star-plate)] p-6">
          <h2 className="text-lg font-semibold text-altair-ink">
            Approved for scheduled distribution
          </h2>
          <p className="mt-1 text-[12px] text-altair-ink-muted">
            Nothing publishes from this page automatically: the operator-armed
            distribution run picks these up, publishes each platform
            independently, and verifies every publish by readback. Facebook
            and Instagram go PUBLIC at that moment.
          </p>
          <ul className="mt-3 space-y-2">
            {(showAllApproved ? approvedGroups : approvedGroups.slice(0, APPROVED_VISIBLE)).map((group) => {
              const lead = group.posts[0];
              const open = openApproved === group.key;
              const slotIso =
                group.posts
                  .map((post) => post.scheduledAt)
                  .find((value) => Boolean(value)) ?? null;
              return (
                <li
                  key={group.key}
                  className="rounded-md border border-[var(--north-star-plate-border)] bg-[var(--surface-tile)]"
                >
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() =>
                      setOpenApproved((current) => (current === group.key ? null : group.key))
                    }
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left"
                  >
                    <span className="min-w-0 truncate text-sm font-medium text-altair-ink">
                      {lead.title}
                    </span>
                    <span className="shrink-0 text-[11px] text-altair-ink-muted">
                      {group.posts.map((post) => channelLabel(post.channelTarget)).join(" · ")}{" "}
                      {open ? "▴" : "▾"}
                    </span>
                  </button>
                  {open ? (
                    <div className="space-y-1 border-t border-[var(--north-star-plate-border)] px-3 py-3">
                      <p className="text-[11px] text-altair-ink-muted">
                        {group.posts
                          .map(
                            (post) =>
                              `${channelLabel(post.channelTarget)}: ${post.status}`,
                          )
                          .join(" · ")}
                      </p>
                      <p className="text-[11px] text-altair-ink-secondary">
                        {slotIso
                          ? `Release slot: ${formatDateTimeInTimeZone(slotIso, timeZone, {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })}`
                          : "No release time set, so this will not publish until one is set."}
                      </p>
                      <p className="line-clamp-6 whitespace-pre-line text-sm text-altair-ink-muted">
                        {lead.postText}
                      </p>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {approvedGroups.length > APPROVED_VISIBLE ? (
            <Button
              size="sm"
              variant="quiet"
              onClick={() => setShowAllApproved((value) => !value)}
            >
              {showAllApproved
                ? "Show fewer"
                : `Show ${String(approvedGroups.length - APPROVED_VISIBLE)} older`}
            </Button>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
