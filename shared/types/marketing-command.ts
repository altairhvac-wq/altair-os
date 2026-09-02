/**
 * The Marketing Command surface: what is happening today, what needs a human,
 * and what has recently happened.
 *
 * ====================== WHY THIS IS PURE ======================
 * Every state here is produced by a system that runs on its own schedule —
 * a research pass, a Director plan, a render, a publish, a failure. Arranging
 * any particular combination on demand is not practical, so the mapping from
 * stored facts to what a human reads lives here as data and pure functions.
 * The same reasoning `integration-row.ts` and `site-publishing-details.ts`
 * give for theirs.
 *
 * ====================== IT INVENTS NOTHING ======================
 * There are no hardcoded workflow stages. A lane appears because a real row
 * says so, and a lane with no evidence reports `unknown` rather than a
 * plausible-looking "waiting". A progress indicator that is always there
 * regardless of state is a decoration, and on an operations screen it is a
 * lie the operator will act on.
 *
 * Every input is a projection of something already stored:
 *
 *   agent_marketing_snapshots   tasks, runs, approvals, renders, schedules,
 *                               automation status — pushed by the platform
 *   marketing_site_pages        website publishing state
 *   marketing_channel_deliveries  what actually went out, and what failed
 *   marketing_publish_jobs      approved work waiting to go
 *   marketing_connected_accounts  connection health
 */

export const COMMAND_LANE_STATES = [
  /** Finished, and the evidence says so. */
  "done",
  /** Under way right now. */
  "active",
  /** Waiting on something that is not a person. */
  "waiting",
  /** Waiting on a PERSON. Mirrored into Needs your attention. */
  "blocked",
  /** Nothing has happened on this lane today. */
  "idle",
  /**
   * The system that would answer this is not reporting.
   *
   * Distinct from `idle` on purpose: "nothing happened" and "we cannot see
   * whether anything happened" are different facts, and collapsing them
   * makes a dark platform look like a quiet one.
   */
  "unknown",
] as const;
export type CommandLaneState = (typeof COMMAND_LANE_STATES)[number];

export type CommandLane = {
  readonly key: string;
  readonly label: string;
  readonly state: CommandLaneState;
  /** One line of fact. Never a guess, never a generic placeholder. */
  readonly detail: string;
};

export const ATTENTION_KINDS = [
  "approval",
  "failed_publish",
  "blocked_work",
  "connection",
  "policy_refusal",
] as const;
export type AttentionKind = (typeof ATTENTION_KINDS)[number];

export type AttentionItem = {
  readonly kind: AttentionKind;
  readonly title: string;
  readonly detail: string;
  /** Where the operator goes to act. Null when there is no single place. */
  readonly href: string | null;
  readonly occurredAt: string | null;
};

export type ActivityEntry = {
  readonly at: string;
  readonly label: string;
  readonly detail: string;
};

/* --------------------------------------------------------------- inputs */

/**
 * The operating state, assembled server-side from stored rows.
 *
 * `snapshot` is null when the platform has never pushed one, or when the one
 * it pushed is older than the staleness horizon. That is a first-class state:
 * every lane it would have answered becomes `unknown`, and the surface says
 * the platform is not reporting rather than showing an empty plan.
 */
export type MarketingOperatingState = {
  readonly nowIso: string;
  readonly snapshot: {
    readonly generatedAt: string;
    readonly tasksQueued: number;
    readonly tasksRunning: number;
    readonly tasksFailed: number;
    readonly approvalsPending: number;
    readonly schedulesFailed: number;
    readonly rendersInProgress: number;
    readonly rendersFailed: number;
    readonly latestResearchAt: string | null;
    readonly latestDirectorPlanAt: string | null;
    readonly approvals: readonly {
      readonly approvalId: string;
      readonly humanSummary: string;
      readonly requestedAt: string;
      readonly isExpired: boolean;
      readonly decision: string;
    }[];
  } | null;
  /** How old a snapshot may be before it stops being evidence. */
  readonly snapshotStaleAfterMs: number;
  readonly sitePages: readonly {
    readonly slug: string;
    readonly title: string;
    readonly state: string;
    readonly publishedAt: string | null;
    readonly updatedAt: string;
  }[];
  readonly deliveries: readonly {
    readonly provider: string;
    readonly state: string;
    readonly settledAt: string | null;
    readonly failureDetail: string | null;
    readonly permalink: string | null;
    readonly createdAt: string;
  }[];
  readonly connections: readonly {
    readonly provider: string;
    readonly label: string;
    /** From `deriveMarketingChannelState`. Never re-derived here. */
    readonly channelState: string;
  }[];
};

/* ------------------------------------------------------------ today's plan */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function isSameDayOrNewer(iso: string | null, nowIso: string): boolean {
  if (!iso) return false;
  const at = Date.parse(iso);
  const now = Date.parse(nowIso);
  if (Number.isNaN(at) || Number.isNaN(now)) return false;
  return now - at <= MS_PER_DAY;
}

export function isSnapshotFresh(state: MarketingOperatingState): boolean {
  if (!state.snapshot) return false;
  const at = Date.parse(state.snapshot.generatedAt);
  const now = Date.parse(state.nowIso);
  if (Number.isNaN(at) || Number.isNaN(now)) return false;
  return now - at <= state.snapshotStaleAfterMs;
}

/**
 * Today, lane by lane.
 *
 * The platform-fed lanes report `unknown` when the snapshot is missing or
 * stale, because the only honest answer about a system that is not reporting
 * is that we do not know. The publishing lanes read Altair OS's own tables
 * and stay truthful either way — those rows are ours.
 */
export function buildTodayPlan(
  state: MarketingOperatingState,
): readonly CommandLane[] {
  const fresh = isSnapshotFresh(state);
  const snap = fresh ? state.snapshot : null;

  const lanes: CommandLane[] = [];

  lanes.push(
    !fresh
      ? {
          key: "research",
          label: "Research",
          state: "unknown",
          detail: "The Agent Platform has not reported recently.",
        }
      : isSameDayOrNewer(snap?.latestResearchAt ?? null, state.nowIso)
        ? {
            key: "research",
            label: "Research",
            state: "done",
            detail: "Research completed in the last 24 hours.",
          }
        : {
            key: "research",
            label: "Research",
            state: "idle",
            detail: "No research recorded in the last 24 hours.",
          },
  );

  lanes.push(
    !fresh
      ? {
          key: "director",
          label: "Director",
          state: "unknown",
          detail: "The Agent Platform has not reported recently.",
        }
      : isSameDayOrNewer(snap?.latestDirectorPlanAt ?? null, state.nowIso)
        ? {
            key: "director",
            label: "Director",
            state: "done",
            detail: "A plan was selected in the last 24 hours.",
          }
        : {
            key: "director",
            label: "Director",
            state: "idle",
            detail: "No Director plan recorded in the last 24 hours.",
          },
  );

  // Website reads our own table, so it is answerable regardless of the
  // platform's reporting.
  const recentPage = state.sitePages.find((page) =>
    isSameDayOrNewer(page.publishedAt ?? page.updatedAt, state.nowIso),
  );
  const anyPublished = state.sitePages.some((p) => p.state === "published");
  lanes.push(
    recentPage
      ? {
          key: "website",
          label: "Website",
          state: recentPage.state === "published" ? "done" : "active",
          detail:
            recentPage.state === "published"
              ? `Published: ${recentPage.title}`
              : `Draft in progress: ${recentPage.title}`,
        }
      : {
          key: "website",
          label: "Website",
          state: anyPublished ? "idle" : "idle",
          detail: anyPublished
            ? "No website changes in the last 24 hours."
            : "No website pages published yet.",
        },
  );

  lanes.push(buildDeliveryLane(state, "youtube", "YouTube", fresh, snap));
  lanes.push(buildDeliveryLane(state, "facebook", "Facebook", fresh, snap));

  const failedDeliveries = state.deliveries.filter((d) => d.state === "failed");
  lanes.push(
    failedDeliveries.length > 0
      ? {
          key: "performance",
          label: "Performance",
          state: "blocked",
          detail: `${failedDeliveries.length} delivery failure${
            failedDeliveries.length === 1 ? "" : "s"
          } to review.`,
        }
      : !fresh
        ? {
            key: "performance",
            label: "Performance",
            state: "unknown",
            detail: "The Agent Platform has not reported recently.",
          }
        : {
            key: "performance",
            label: "Performance",
            state: "idle",
            detail: "No performance review recorded in the last 24 hours.",
          },
  );

  return lanes;
}

function buildDeliveryLane(
  state: MarketingOperatingState,
  provider: string,
  label: string,
  fresh: boolean,
  snap: MarketingOperatingState["snapshot"],
): CommandLane {
  const mine = state.deliveries.filter((d) => d.provider === provider);
  const failed = mine.find((d) => d.state === "failed");
  if (failed) {
    return {
      key: provider,
      label,
      state: "blocked",
      detail: failed.failureDetail ?? "The last delivery failed.",
    };
  }

  const inFlight = mine.find((d) => d.state === "in_flight");
  if (inFlight) {
    return {
      key: provider,
      label,
      state: "active",
      detail: "A delivery is in progress.",
    };
  }

  const recent = mine.find((d) =>
    isSameDayOrNewer(d.settledAt ?? d.createdAt, state.nowIso),
  );
  if (recent) {
    return {
      key: provider,
      label,
      state: "done",
      detail: "Delivered in the last 24 hours.",
    };
  }

  // YouTube renders are the platform's business, so an unreported platform
  // makes this lane unknowable rather than idle.
  if (provider === "youtube" && !fresh) {
    return {
      key: provider,
      label,
      state: "unknown",
      detail: "The Agent Platform has not reported recently.",
    };
  }

  if (provider === "youtube" && snap && snap.rendersInProgress > 0) {
    return {
      key: provider,
      label,
      state: "waiting",
      detail: `${snap.rendersInProgress} render${
        snap.rendersInProgress === 1 ? "" : "s"
      } in progress.`,
    };
  }

  const connection = state.connections.find((c) => c.provider === provider);
  if (connection && connection.channelState !== "DIRECT_PUBLISH_READY") {
    return {
      key: provider,
      label,
      state: "blocked",
      detail: `The connection is ${connection.channelState}.`,
    };
  }

  return {
    key: provider,
    label,
    state: "idle",
    detail: "Nothing delivered in the last 24 hours.",
  };
}

/* ------------------------------------------------------ needs attention */

/**
 * Only things a PERSON must act on.
 *
 * Successful automation is deliberately absent. A list that shows every
 * healthy publish alongside the one broken connection trains the reader to
 * skim it, and then the broken connection is missed — which is the failure
 * mode this section exists to prevent.
 */
export function buildAttentionItems(
  state: MarketingOperatingState,
): readonly AttentionItem[] {
  const items: AttentionItem[] = [];

  if (isSnapshotFresh(state) && state.snapshot) {
    for (const approval of state.snapshot.approvals) {
      // Expired and already-decided approvals are history, not work.
      if (approval.isExpired || approval.decision !== "PENDING") continue;
      items.push({
        kind: "approval",
        title: "Approval requested",
        detail: approval.humanSummary,
        href: "/marketing",
        occurredAt: approval.requestedAt,
      });
    }
  }

  for (const delivery of state.deliveries) {
    if (delivery.state !== "failed") continue;
    items.push({
      kind: "failed_publish",
      title: `${delivery.provider} delivery failed`,
      detail: delivery.failureDetail ?? "The publish did not complete.",
      href: "/marketing",
      occurredAt: delivery.settledAt ?? delivery.createdAt,
    });
  }

  for (const connection of state.connections) {
    // `canAcceptContent`'s two healthy states. Anything else needs a human,
    // except TOKEN_EXPIRED which recovers on its own via the refresh path.
    if (
      connection.channelState === "DIRECT_PUBLISH_READY" ||
      connection.channelState === "DRAFT_UPLOAD_ONLY" ||
      connection.channelState === "TOKEN_EXPIRED" ||
      connection.channelState === "NOT_CONFIGURED"
    ) {
      continue;
    }
    items.push({
      kind: "connection",
      title: `${connection.label} needs attention`,
      detail: `The connection is ${connection.channelState}.`,
      href: "/settings/integrations",
      occurredAt: null,
    });
  }

  if (isSnapshotFresh(state) && state.snapshot) {
    if (state.snapshot.tasksFailed > 0) {
      items.push({
        kind: "blocked_work",
        title: "Agent work failed",
        detail: `${state.snapshot.tasksFailed} task${
          state.snapshot.tasksFailed === 1 ? "" : "s"
        } failed on the Agent Platform.`,
        href: null,
        occurredAt: state.snapshot.generatedAt,
      });
    }
    if (state.snapshot.schedulesFailed > 0) {
      items.push({
        kind: "blocked_work",
        title: "Schedule failed",
        detail: `${state.snapshot.schedulesFailed} schedule${
          state.snapshot.schedulesFailed === 1 ? "" : "s"
        } is in a failed state.`,
        href: null,
        occurredAt: state.snapshot.generatedAt,
      });
    }
  }

  return items;
}

/* ------------------------------------------------------- recent activity */

/** A compact timeline of things that actually happened, newest first. */
export function buildRecentActivity(
  state: MarketingOperatingState,
  limit = 12,
): readonly ActivityEntry[] {
  const entries: ActivityEntry[] = [];

  for (const page of state.sitePages) {
    if (page.state !== "published" || !page.publishedAt) continue;
    entries.push({
      at: page.updatedAt,
      label: "Website page published",
      detail: page.title,
    });
  }

  for (const delivery of state.deliveries) {
    if (!delivery.settledAt) continue;
    entries.push({
      at: delivery.settledAt,
      label:
        delivery.state === "posted"
          ? `${delivery.provider} delivered`
          : `${delivery.provider} delivery ${delivery.state}`,
      detail: delivery.permalink ?? delivery.failureDetail ?? "",
    });
  }

  return entries
    .filter((entry) => !Number.isNaN(Date.parse(entry.at)))
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, limit);
}

/* ------------------------------------------------------------- the chief */

export const CHIEF_MESSAGE_MAX = 2000;

export type ChiefMessage = {
  readonly id: string;
  readonly role: "user" | "chief";
  readonly body: string;
  readonly status: "queued" | "answered" | "failed";
  readonly createdAt: string;
  readonly answeredAt: string | null;
  readonly errorDetail: string | null;
};

export type ChiefConversationState = {
  readonly messages: readonly ChiefMessage[];
  /** True when a question is waiting for the platform's next cycle. */
  readonly awaitingReply: boolean;
  /** Null when the platform is reporting normally. */
  readonly platformUnavailableReason: string | null;
};

/**
 * How the conversation should describe itself.
 *
 * ============ IT NEVER CLAIMS TO BE INSTANT ============
 * The Chief runs on the Agent Platform, which is behind NAT and answers on
 * its own cycle. A "typing…" indicator would imply something is happening
 * right now that is not, so the waiting copy names the real mechanism and the
 * unavailable copy names the real cause.
 */
export function describeChiefConversation(
  state: ChiefConversationState,
): string {
  if (state.platformUnavailableReason) {
    return state.platformUnavailableReason;
  }
  if (state.awaitingReply) {
    return "Queued for the Chief of Staff. It answers on the Agent Platform's next cycle.";
  }
  if (state.messages.length === 0) {
    return "Ask the Chief of Staff about today's work, what needs approval, or what is blocked.";
  }
  return "The Chief of Staff has answered.";
}

/** Refuses an empty or over-long question before it reaches the queue. */
export function validateChiefQuestion(
  body: string,
): { ok: true; body: string } | { ok: false; error: string } {
  const trimmed = body.trim();
  if (!trimmed) {
    return { ok: false, error: "Type a question for the Chief of Staff." };
  }
  if (trimmed.length > CHIEF_MESSAGE_MAX) {
    return {
      ok: false,
      error: `Questions are limited to ${CHIEF_MESSAGE_MAX} characters.`,
    };
  }
  return { ok: true, body: trimmed };
}
