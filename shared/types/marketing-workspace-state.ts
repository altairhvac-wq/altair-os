/**
 * What the founder-facing Marketing workspace is allowed to SAY.
 *
 * ==================== WHY THIS IS A SEPARATE, PURE MODULE ====================
 * Two sentences on the Marketing page make claims about a system that runs in
 * another process, on another machine, in another repository: "Daily content
 * is on" and "Today's video is being prepared". Both are easy to get subtly
 * wrong, and both are the kind of wrong a founder cannot detect — the page
 * looks calm either way.
 *
 * So the decision is here, in a module with no React, no database and no
 * clock of its own, and it is covered by `scripts/verify-marketing-workspace.mjs`.
 * The components below it render what these functions return and add nothing.
 *
 * ==================== THE RULE THESE FUNCTIONS OBEY ====================
 * Absence of evidence is never rendered as evidence of absence. A snapshot
 * that has never arrived, a section the platform marks NOT_SUPPORTED, and a
 * list that may have been truncated all resolve to UNKNOWN — not to "Off",
 * which is a positive claim that the automation exists and is switched off.
 * Distinguishing those two was the entire point of the read-only audit that
 * preceded this page.
 */

import type {
  AgentMarketingSnapshot,
  AgentVideoRenderEntry,
} from "./agent-snapshot";
import type { MarketingPost } from "./marketing-post";

// ---------------------------------------------------------------------------
// Constants mirrored from the Agent Platform
// ---------------------------------------------------------------------------

/**
 * `DAILY_PILOT_JOB_NAME` in the Agent Platform
 * (`src/agents/content/daily-pilot-job.ts`).
 *
 * HAND-MIRRORED, like every other cross-repo constant in this file's
 * neighbourhood: the two repositories are never merged and share no package.
 * The job name travels in the snapshot as `upcomingWork[].jobName`, so a
 * rename on the platform side surfaces here as "Not reported" rather than as
 * a false "Off" — the safe direction to fail in.
 */
export const DAILY_PILOT_JOB_NAME = "content.daily-pilot";

/**
 * `DEFAULT_SNAPSHOT_LIMITS.upcomingWork` in the platform's snapshot builder.
 *
 * The platform sorts schedules by soonest next run and keeps this many. A
 * full list is therefore possibly truncated, and "the daily job is not in
 * this list" stops meaning "the daily job does not exist". Mirrored so that
 * case can be detected and reported as UNKNOWN instead of Off.
 */
export const SNAPSHOT_UPCOMING_WORK_LIMIT = 25;

/**
 * How old a snapshot may be before its age is itself worth mentioning.
 * Matches `STALE_AFTER_HOURS` in `MarketingAutomationSection`, so the
 * founder-facing summary and the diagnostic view cannot disagree about
 * whether the automation has gone quiet.
 */
export const AUTOMATION_STALE_AFTER_HOURS = 36;

/**
 * How recent a render must be for it to be describing TODAY.
 *
 * The pilot's own `forDate` does not travel in the snapshot, so this page
 * cannot know which calendar day a render belongs to. It can know that a
 * render was submitted within the last day, which is the honest basis for
 * saying "today's video" at all. Anything older is not narrated.
 */
export const RENDER_ACTIVITY_WINDOW_HOURS = 24;

/** The newest render entry, if it is recent enough to be describing today. */
function newestRender(
  items: readonly AgentVideoRenderEntry[],
  nowMs: number,
): AgentVideoRenderEntry | null {
  let newest: AgentVideoRenderEntry | null = null;
  let newestMs = Number.NEGATIVE_INFINITY;
  for (const item of items) {
    const stamp = item.recordedAt ?? item.submittedAt;
    if (!stamp) continue;
    const parsed = Date.parse(stamp);
    if (!Number.isFinite(parsed)) continue;
    if (parsed > newestMs) {
      newestMs = parsed;
      newest = item;
    }
  }
  if (!newest) return null;
  const ageHours = (nowMs - newestMs) / 3_600_000;
  // Older than a day is not "today", and narrating it as today would put a
  // week-old failure under a heading that says this morning.
  if (!Number.isFinite(ageHours) || ageHours > RENDER_ACTIVITY_WINDOW_HOURS) {
    return null;
  }
  return newest;
}

// ---------------------------------------------------------------------------
// Automation health
// ---------------------------------------------------------------------------

/**
 * ON    a recurring daily-pilot schedule is ACTIVE
 * ONCE  a one-time run is scheduled — real, but not a daily cadence
 * OFF   the platform reported its schedules and none of them runs the pilot
 * UNKNOWN nothing has reported, or what reported cannot answer the question
 */
export type DailyContentState = "ON" | "ONCE" | "OFF" | "UNKNOWN";

export type MarketingAutomationHealth = {
  state: DailyContentState;
  /** The words next to "Daily content:". Never invented, never blank. */
  label: string;
  /** One sentence of context. Always present. */
  detail: string;
  /** ISO time of the next run, when one is genuinely scheduled. */
  nextRunAtIso: string | null;
  /** Zero or more concrete reasons a human should look. Never vague. */
  attention: string[];
};

function cadence(intervalMs: number | null): string | null {
  if (intervalMs === null || intervalMs <= 0) return null;
  const hours = intervalMs / 3_600_000;
  if (hours >= 24 && hours % 24 === 0) {
    const days = hours / 24;
    return days === 1 ? "once a day" : `every ${days} days`;
  }
  if (hours >= 1) return `every ${Math.round(hours)} hours`;
  return `every ${Math.round(intervalMs / 60_000)} minutes`;
}

function hoursSince(iso: string | null, nowMs: number): number | null {
  if (!iso) return null;
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) return null;
  return (nowMs - parsed) / 3_600_000;
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

export type AutomationHealthInput = {
  /** The stored projection, or null when the platform has never reported. */
  snapshot: { snapshot: AgentMarketingSnapshot; producedAt: string } | null;
  nowIso: string;
};

/**
 * Reduces the whole snapshot to the three things the front page may claim.
 *
 * Order matters: the UNKNOWN cases are settled FIRST, so no later branch can
 * reach a positive claim on data that was never there.
 */
export function deriveMarketingAutomationHealth(
  input: AutomationHealthInput,
): MarketingAutomationHealth {
  const nowMs = Date.parse(input.nowIso);
  const attention: string[] = [];

  if (!input.snapshot) {
    return {
      state: "UNKNOWN",
      label: "Not reported",
      detail:
        "The automation has never reported in to this workspace, so its schedule cannot be shown here.",
      nextRunAtIso: null,
      attention: [],
    };
  }

  const { snapshot, producedAt } = input.snapshot;
  const upcoming = snapshot.sections.upcomingWork;
  const status = snapshot.sections.automationStatus;

  // Staleness is about the REPORT, not the schedule, so it is collected before
  // any branch and applies to every outcome below.
  const reportAgeHours = hoursSince(producedAt, nowMs);
  if (reportAgeHours !== null && reportAgeHours > AUTOMATION_STALE_AFTER_HOURS) {
    attention.push(
      `The automation last reported ${Math.round(reportAgeHours / 24)} days ago.`,
    );
  }

  if (status.support !== "NOT_SUPPORTED" && status.data) {
    if (status.data.schedulesFailed > 0) {
      attention.push(
        `${plural(status.data.schedulesFailed, "schedule is", "schedules are")} in a failed state and will not run until resumed.`,
      );
    }
    if (status.data.tasksFailed > 0) {
      attention.push(
        `${plural(status.data.tasksFailed, "task", "tasks")} failed.`,
      );
    }
  }

  const failedRender = newestRender(snapshot.sections.videoRenders.items, nowMs);
  if (failedRender && failedRender.renderState === "FAILED") {
    attention.push("The most recent video render failed.");
  }

  if (upcoming.support === "NOT_SUPPORTED") {
    return {
      state: "UNKNOWN",
      label: "Not reported",
      detail:
        upcoming.unsupportedReason ??
        "The automation cannot report its schedules to this workspace.",
      nextRunAtIso: null,
      attention,
    };
  }

  const daily = upcoming.items.find(
    (entry) => entry.jobName === DAILY_PILOT_JOB_NAME,
  );

  if (!daily) {
    // A FULL list is a possibly-truncated list, and the daily job may simply
    // have been sorted off the end of it. Saying "Off" here would be a claim
    // built on a limit rather than on a fact.
    if (upcoming.items.length >= SNAPSHOT_UPCOMING_WORK_LIMIT) {
      return {
        state: "UNKNOWN",
        label: "Not reported",
        detail:
          "The automation reported more schedules than this summary receives, so the daily schedule cannot be confirmed either way.",
        nextRunAtIso: null,
        attention,
      };
    }
    return {
      state: "OFF",
      label: "Off",
      detail:
        "No daily content schedule is registered. Candidates are produced by running the pilot manually.",
      nextRunAtIso: null,
      attention,
    };
  }

  if (daily.scheduleState === "PAUSED") {
    attention.push("The daily content schedule is paused.");
    return {
      state: "OFF",
      label: "Off",
      detail: "The daily content schedule exists but is paused.",
      nextRunAtIso: null,
      attention,
    };
  }

  if (daily.scheduleState === "FAILED") {
    attention.push(
      "The daily content schedule is in a failed state and will not run until it is resumed.",
    );
    return {
      state: "OFF",
      label: "Off",
      detail: "The daily content schedule stopped after a failure.",
      nextRunAtIso: null,
      attention,
    };
  }

  if (daily.scheduleState !== "ACTIVE") {
    return {
      state: "OFF",
      label: "Off",
      detail: `The daily content schedule is ${daily.scheduleState.toLowerCase()}.`,
      nextRunAtIso: null,
      attention,
    };
  }

  const every = cadence(daily.intervalMs);
  if (every === null) {
    // A one-time schedule is what `pilot:once` installs. It is genuinely
    // scheduled and genuinely not a daily cadence, and collapsing it into
    // either On or Off would misdescribe the state this product is actually
    // in today.
    return {
      state: "ONCE",
      label: "One run scheduled",
      detail:
        "A single run is scheduled. There is no recurring daily schedule yet.",
      nextRunAtIso: daily.nextRunAt,
      attention,
    };
  }

  return {
    state: "ON",
    label: "On",
    detail: `The daily content pilot runs ${every}.`,
    nextRunAtIso: daily.nextRunAt,
    attention,
  };
}

// ---------------------------------------------------------------------------
// Today
// ---------------------------------------------------------------------------

/**
 * A post belongs on Today when it is a draft AND carries a video.
 *
 * ==================== WHY THE VIDEO IS PART OF THE DEFINITION ====================
 * This is the DAILY SOCIAL queue. A draft with no video is a half-written
 * idea, and admitting one would rebuild the pile the page exists to remove.
 *
 * It is also what keeps SEO work out of here. An SEO item
 * (`lib/marketing/roles/seo.ts`) is a `marketing_items` row whose kind is
 * `seo_page` or `blog_article`; `convertMarketingItemToPostAction` refuses
 * anything but `social_post`, so an SEO item cannot become a post at all — and
 * even if that guard were ever relaxed, an SEO page has no rendered Reel, so
 * it still could not satisfy this filter. Two independent reasons, which is
 * the right number for a rule that must not quietly stop holding.
 */
export function selectTodayCandidates(
  posts: readonly MarketingPost[],
): MarketingPost[] {
  return posts
    .filter((post) => post.status === "draft" && Boolean(post.videoMediaAssetId))
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

export type TodayStateKind =
  | "AWAITING_DECISION"
  | "PREPARING"
  | "FAILED"
  | "RENDERED_NOT_QUEUED"
  | "UNRESOLVED"
  | "NOTHING";

export type MarketingTodayState = {
  kind: TodayStateKind;
  headline: string;
  detail: string;
};

export type TodayStateInput = {
  posts: readonly MarketingPost[];
  /** The snapshot's video-render section, or null when nothing reported. */
  renders: {
    support: "SUPPORTED_WITH_DATA" | "SUPPORTED_EMPTY" | "NOT_SUPPORTED";
    items: readonly AgentVideoRenderEntry[];
  } | null;
  nowIso: string;
};

/**
 * What the Today tab says when there is no decision to make.
 *
 * "Nothing waiting" was true and useless: it could mean the render is running,
 * the render failed, or nothing was ever started, and the founder had to open
 * Advanced to find out which. Each of those now has its own sentence, and each
 * sentence is derived from the platform's own reported state — the failure
 * text below is the platform's, quoted, not a rewrite of it.
 */
export function deriveMarketingTodayState(
  input: TodayStateInput,
): MarketingTodayState {
  if (selectTodayCandidates(input.posts).length > 0) {
    return {
      kind: "AWAITING_DECISION",
      headline: "Today's video",
      detail: "",
    };
  }

  const nowMs = Date.parse(input.nowIso);
  const recent =
    input.renders && input.renders.support !== "NOT_SUPPORTED"
      ? newestRender(input.renders.items, nowMs)
      : null;

  if (!recent) {
    return {
      kind: "NOTHING",
      headline: "Nothing waiting",
      detail: "No video is waiting for a decision right now.",
    };
  }

  if (recent.renderState === "PENDING") {
    return {
      kind: "PREPARING",
      headline: "Today's video is being prepared",
      detail: recent.stage
        ? `The video engine is working on it (${recent.stage}). It will appear here when it is ready for your decision.`
        : "The video engine is working on it. It will appear here when it is ready for your decision.",
    };
  }

  if (recent.renderState === "FAILED") {
    // The platform's own words. Paraphrasing a failure is how a diagnosable
    // problem becomes an unsearchable one.
    const reason = [recent.failureName, recent.failureMessage]
      .filter((part): part is string => Boolean(part && part.trim()))
      .join(": ");
    return {
      kind: "FAILED",
      headline: "Today's video could not be prepared",
      detail: reason
        ? `The video engine reported: ${reason}`
        : "The video engine reported a failure without a reason. Advanced has the full record.",
    };
  }

  if (recent.renderState === "CANCELLED") {
    return {
      kind: "NOTHING",
      headline: "Today's video was cancelled",
      detail: "The render was cancelled before it finished.",
    };
  }

  if (recent.renderState === "UNKNOWN") {
    // UNKNOWN is explicitly NOT a synonym for failure in the platform's
    // contract, and rendering it as one would eventually cause someone to
    // retry something that had already happened.
    return {
      kind: "UNRESOLVED",
      headline: "Today's video has no reported outcome",
      detail:
        "The video engine has not reported whether the last render finished. Advanced has the full record.",
    };
  }

  return {
    kind: "RENDERED_NOT_QUEUED",
    headline: "Today's video finished, but no post was created",
    detail:
      "A render completed and nothing is waiting for a decision. The video is in Advanced under Video production.",
  };
}
