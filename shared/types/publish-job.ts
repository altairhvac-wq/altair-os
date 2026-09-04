/**
 * The publish queue — mutable scheduling state for work that has not
 * happened yet.
 *
 * ============= WHY THIS IS NOT COLUMNS ON THE DELIVERY LEDGER =============
 * `marketing_channel_deliveries` (migration 143) is a LEDGER: a row is claimed
 * immediately before an external call and settled immediately after, and what
 * it records is "we started an external write, and here is what we learned".
 * Its value comes entirely from being an immutable account of attempts. A row
 * stuck in `in_flight` is not a defect in the ledger — it is the ledger doing
 * its job, saying "an external write began and never reported back".
 *
 * Scheduling state is the opposite kind of data. A lease is taken and dropped,
 * an attempt counter climbs, a backoff pushes a timestamp forward, a worker
 * name is written and erased. Putting those on the ledger would mean the row
 * that answers "what did we attempt, and what happened?" is rewritten several
 * times per attempt by a process that is not attempting anything — and the
 * question the ledger exists to answer stops having a trustworthy answer.
 * Worse, `created_at` on the ledger is load-bearing: `decideDelivery` measures
 * staleness from it, so a queue that touched the row to record a retry would
 * silently reset the reconciliation clock on a claim that may already have
 * published.
 *
 * So: two tables, one key.
 *
 * ==================== ONE KEY, DELIBERATELY IDENTICAL ====================
 * The queue is keyed `unique (company_id, marketing_post_id, provider)` —
 * character for character the ledger's duplicate guard. That is not tidiness.
 * It means the queue can hold at most one job for exactly the unit of work the
 * ledger can hold at most one claim for, so the queue can never outrun the
 * ledger and can never enqueue a second job for work that is already claimed.
 * Two different keys would allow a second queue row to exist for a post whose
 * delivery is already `in_flight`, and the only thing standing between that
 * row and a double publish would be a code path remembering to check.
 *
 * The ordering that follows from the shared key is worth stating plainly:
 * THE QUEUE DECIDES WHEN, THE LEDGER DECIDES WHETHER. Nothing in this file
 * authorizes an external write. A leased job still has to claim a delivery,
 * and `decideDelivery` refuses an unsettled claim regardless of what the queue
 * thinks. `RECLAIM` below is the sharpest case of that: reclaiming an expired
 * lease returns the queue row to `scheduled`, and the ledger then declines the
 * republish because its own row says `NEEDS_RECONCILIATION`.
 *
 * ============== THE VOCABULARY, AND WHAT IT DOES NOT MEAN ==============
 * These eight words are the required queue vocabulary. Three of them already
 * mean something else elsewhere in this system, so the mapping is written out
 * rather than assumed:
 *
 *   job_state           marketing_posts.status   delivery_state
 *   ------------------  ----------------------   ------------------
 *   draft               draft                    (no row yet)
 *   ready_for_approval  ready                    (no row yet)
 *   approved            ready                    (no row yet)
 *   scheduled           scheduled                (no row yet)
 *   publishing          scheduled                in_flight
 *   published           posted                   posted | draft
 *   failed              failed                   failed | (no row)
 *   cancelled           archived                 (no row)
 *
 * "draft" now names three different things about three different subjects:
 *   - `marketing_posts.status = 'draft'` — the COPY is still being written.
 *   - `delivery_state = 'draft'` — the content REACHED the provider and is
 *     sitting there unpublished for a human to finish (TikTok pre-review,
 *     Facebook/Instagram/LinkedIn/Reddit/Google Business per the capability
 *     matrix's `defaultVisibility`).
 *   - `job_state = 'draft'` — the QUEUE ENTRY exists but the work has not yet
 *     been offered for approval.
 * None of the three implies either of the others.
 *
 * "published" is the honest gap. The vocabulary has no word for "the provider
 * accepted it as an unpublished draft", so a `draft_only` channel settles its
 * job to `published` meaning ONLY "the queue has nothing left to do". Whether
 * anything is live is answered by `delivery_state`, never by `job_state`. That
 * mapping is made explicit by `decideJobOutcome` accepting a `"drafted"`
 * outcome rather than letting a caller quietly pass `"published"` for it.
 *
 * "approved" has no counterpart at all: `marketing_post_status` (migration
 * 087) has no approval label, so both `ready_for_approval` and `approved`
 * project onto `ready`. The queue row is the only place the approval of a
 * specific piece of content to a specific provider is recorded, which is why
 * the transition graph below refuses `draft -> scheduled`.
 *
 * A fourth vocabulary sits next to these and is not this one.
 * `marketing_content_packages.package_state` (migration 182) is
 * draft/approved/publishing/published/archived and describes the CREATIVE
 * BUNDLE, which fans out to many posts across many providers. `job_state`
 * describes ONE (post, provider) pair's trip through the queue. A package may
 * read `published` while a job for one of its providers is still `scheduled`
 * or `failed`; the words are shared, the subject is not, and neither is a
 * proxy for the other.
 *
 * ================= scheduled_for IS NOT run_after =================
 * `scheduled_for` is the intended publication time — an operator's decision,
 * shown in the UI, unchanged by anything mechanical. `run_after` is the
 * earliest instant a runner may pick the row up. They start equal and diverge
 * the moment a backoff pushes `run_after` forward. Collapsing them would mean
 * a retry silently rewrites the time the operator chose, and the UI would
 * report a publication time that nobody asked for.
 *
 * ======================= WHY THIS FILE IS PURE =======================
 * One relative import, of a sibling pure module, reused rather than reforked.
 * No `server-only`, no database client, no clock: every timestamp is injected.
 * The lease/backoff/transition decisions are therefore total functions of a
 * row, testable without a worker, a provider, or a crash — which matters
 * because the branches that matter most are the ones reachable only by a
 * process dying at an inconvenient moment.
 */
import {
  DELIVERY_FAILURE_DETAIL_MAX,
  clampFailureDetail,
} from "./marketing-delivery";

/** Mirrors the `job_state` CHECK in migration 184, in order. */
export const PUBLISH_JOB_STATES = [
  /** The queue entry exists; the content is not finished. */
  "draft",
  /** Content complete, waiting on a human. */
  "ready_for_approval",
  /** A human said yes to this content, for this provider. */
  "approved",
  /** Has a time and is eligible to run. The runner's work list. */
  "scheduled",
  /** Leased by a worker. An external call may be in progress. */
  "publishing",
  /** The queue is done with this row. NOT a claim that anything is live. */
  "published",
  /** Attempts exhausted. Re-openable by a human, unlike the two below. */
  "failed",
  /** Withdrawn. Terminal, and permanent for this (post, provider) pair. */
  "cancelled",
] as const;
export type PublishJobState = (typeof PUBLISH_JOB_STATES)[number];

/**
 * How long a worker owns a leased job.
 *
 * ================== THIS NUMBER PREVENTS A DOUBLE PUBLISH ==================
 * It MUST exceed every `pollBudgetMs` in `./integration-capability` (the
 * largest today is YouTube's and TikTok's 240s). A lease that expires while a
 * legitimate poll is still running is reclaimed, handed to a second worker,
 * and the same content goes out twice — the exact failure the delivery ledger
 * was built to stop, reintroduced one layer above it.
 *
 * It also exceeds `DELIVERY_IN_FLIGHT_GRACE_MS` (5 min). That ordering is
 * deliberate: the LEDGER must be the first to declare an attempt abandoned,
 * because the ledger is the only thing that can refuse a second external
 * write. A queue that gave up first would put a job back on the work list
 * while the ledger still called the attempt live, which produces a confusing
 * operator story even though the claim would still be refused.
 *
 * `scripts/verify-publish-job-machine.mjs` asserts both relationships against
 * the real capability matrix, so widening a poll budget without widening this
 * fails a check rather than shipping.
 */
export const JOB_LEASE_MS = 10 * 60_000;

/** First retry delay; doubles per attempt. See `nextRunAfter`. */
export const JOB_BACKOFF_MS = 60_000;

/**
 * Mirrors the `max_attempts` CHECK ceiling in migration 184.
 *
 * The ceiling is what lets `nextRunAfter` grow without a clamp: the largest
 * delay any real row can reach is `JOB_BACKOFF_MS * 2 ** 5` — 32 minutes —
 * bounded by the schema rather than by a ceiling in the backoff itself. A
 * clamped backoff would plateau, and a plateau is not strictly increasing.
 */
export const JOB_MAX_ATTEMPTS_CEILING = 6;

/**
 * Unreachable given the CHECK above. It exists so a corrupted or hand-edited
 * row cannot turn `2 ** attempt` into `Infinity` and hand the caller an
 * `Invalid Date` string that Postgres would then reject at write time.
 */
const JOB_BACKOFF_MAX_EXPONENT = 16;

/** The subset of a queue row the scheduling decisions actually read. */
export type PublishJobLeaseFacts = {
  readonly jobState: PublishJobState;
  /**
   * Earliest instant a runner may take this row. Never null, mirroring the
   * `not null` on the column: the runner's work-list index orders by it, so a
   * row without one is a row whose place in the queue is undefined.
   */
  readonly runAfter: string;
  /** Null whenever no worker holds the row. */
  readonly leaseExpiresAt: string | null;
};

/** The full queue row, as the application sees it. */
export type PublishJobRecord = PublishJobLeaseFacts & {
  readonly id: string;
  readonly companyId: string;
  readonly marketingPostId: string;
  readonly contentPackageId: string | null;
  readonly provider: string;
  readonly connectedAccountId: string | null;
  readonly attempt: number;
  readonly maxAttempts: number;
  readonly leasedBy: string | null;
  readonly lastError: string | null;
  /** The operator's intended publication time. Never moved by a retry. */
  readonly scheduledFor: string | null;
  readonly requiresApproval: boolean;
  readonly approvedBy: string | null;
  readonly approvedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export const JOB_LEASE_DECISIONS = [
  /** Take this row and run it. The ONLY decision that leads to a provider. */
  "LEASE",
  /** Leave it alone. The safe answer, and the answer to anything unclear. */
  "SKIP",
  /**
   * A lease expired: the worker that held this row is gone.
   *
   * This releases the LEASE, not the ledger's claim. The row returns to
   * `scheduled` and is picked up again, at which point `decideDelivery` sees
   * an unsettled `in_flight` claim and returns `NEEDS_RECONCILIATION` — so
   * the reclaim cannot become a republish. Reclaiming is how a row stops
   * being invisible; it is not permission to try again.
   */
  "RECLAIM",
] as const;
export type JobLeaseDecision = (typeof JOB_LEASE_DECISIONS)[number];

/**
 * May a runner take this row right now?
 *
 * ================= UNREADABLE TIME FAILS TO SKIP =================
 * Every parse failure returns `SKIP`, never `LEASE` and never `RECLAIM`. This
 * is the same posture `decideDelivery` takes with an unreadable `created_at`
 * (it answers `NEEDS_RECONCILIATION`, not "stale, go ahead"): the cost of
 * refusing is a row that waits for a human, and the cost of guessing is a
 * duplicate post. A missing `lease_expires_at` on a `publishing` row is
 * treated the same way — an unknown expiry is not an expired one, exactly as
 * `isTokenExpired` refuses to read a null expiry as expiry.
 */
export function decideJobLease(
  row: PublishJobLeaseFacts,
  nowIso: string,
): JobLeaseDecision {
  const now = Date.parse(nowIso);
  if (Number.isNaN(now)) return "SKIP";

  switch (row.jobState) {
    case "scheduled": {
      const runAfter = Date.parse(row.runAfter);
      if (Number.isNaN(runAfter)) return "SKIP";
      return runAfter <= now ? "LEASE" : "SKIP";
    }
    case "publishing": {
      if (!row.leaseExpiresAt) return "SKIP";
      const expires = Date.parse(row.leaseExpiresAt);
      if (Number.isNaN(expires)) return "SKIP";
      return expires <= now ? "RECLAIM" : "SKIP";
    }
    case "draft":
    case "ready_for_approval":
    case "approved":
    case "published":
    case "failed":
    case "cancelled":
      return "SKIP";
  }
}

/** True for the one decision that may reach a provider. */
export function mayLease(decision: JobLeaseDecision): boolean {
  return decision === "LEASE";
}

/** When a lease taken now would expire. */
export function leaseExpiryFor(nowIso: string): string {
  const now = Date.parse(nowIso);
  if (Number.isNaN(now)) {
    throw new RangeError(
      "leaseExpiryFor received an unparseable clock reading, so no lease boundary could be computed.",
    );
  }
  return new Date(now + JOB_LEASE_MS).toISOString();
}

/**
 * The earliest instant the next attempt may run: exponential from `attempt`,
 * which is 1-based and counts attempts already MADE.
 *
 * ============== WHY AN UNREADABLE CLOCK THROWS RATHER THAN GUESSES ==============
 * Every other decision in this file fails safe by refusing. There is no
 * refusal available here — the function's whole output is a timestamp, and
 * both fallbacks are worse than stopping. Reading the real clock would put a
 * hidden clock inside a pure module (the thing every injected `nowIso` in this
 * codebase exists to prevent), and inventing a far-future instant would strand
 * the job somewhere no operator would think to look.
 *
 * Throwing degrades safely because of where it lands: the caller is settling
 * an attempt, so the row stays `publishing` with a live lease, and the lease
 * expiry is the backstop that eventually surfaces it through `RECLAIM`. A
 * caller that cannot read its own clock is a bug, and it fails loudly, before
 * a wrong timestamp is written.
 */
export function nextRunAfter(attempt: number, nowIso: string): string {
  const now = Date.parse(nowIso);
  if (Number.isNaN(now)) {
    throw new RangeError(
      "nextRunAfter received an unparseable clock reading, so no backoff could be computed.",
    );
  }
  const made = Number.isFinite(attempt) ? Math.trunc(attempt) : 1;
  const exponent = Math.min(Math.max(0, made - 1), JOB_BACKOFF_MAX_EXPONENT);
  return new Date(now + JOB_BACKOFF_MS * 2 ** exponent).toISOString();
}

/**
 * What an attempt actually achieved.
 *
 * `drafted` exists so the `published` mapping is a decision someone made and
 * not an accident: a `draft_only` channel finished the queue's work without
 * publishing anything, and the caller has to say so.
 */
export type JobAttemptOutcome = "published" | "drafted" | "failed";

export type DecideJobOutcomeInput = {
  readonly outcome: JobAttemptOutcome;
  /** Attempts made INCLUDING the one being settled. 1-based. */
  readonly attempt: number;
  readonly maxAttempts: number;
  readonly nowIso: string;
  /** Provider or transport error text. Clamped, never stored raw. */
  readonly errorDetail?: string | null;
};

/** What every settled attempt writes, whichever way it went. */
type JobOutcomeCommon = {
  readonly attempt: number;
  readonly lastError: string | null;
  /** A settled or requeued job holds no lease. Always cleared together. */
  readonly leaseExpiresAt: null;
  readonly leasedBy: null;
};

/**
 * The column patch a settled attempt produces.
 *
 * ============= WHY A TERMINAL OUTCOME HAS NO run_after AT ALL =============
 * `run_after` is `not null` in migration 184, so null is not a value this
 * decision is allowed to ask for. A settle that spread `run_after: null` into
 * its update would be refused by the constraint — and refused at the worst
 * possible moment, on the write that records the outcome of an external call
 * that has already happened, leaving the row `publishing` with a lease over
 * work that is finished.
 *
 * There is also nothing to say. A terminal row is never taken again: the
 * runnable index is partial on `job_state = 'scheduled'`, and `decideJobLease`
 * answers `SKIP` for every other state, so the stored timestamp is dead data
 * and leaving it exactly as it was is the honest write.
 *
 * So the key is ABSENT on the terminal members rather than null. A caller that
 * spreads a decision into a column patch cannot carry an illegal value in with
 * it, because there is no value to carry; and `runAfter?: never` turns reading
 * one off a terminal decision into a type error instead of a habit that
 * happens to work today.
 */
export type JobOutcomeDecision =
  | (JobOutcomeCommon & {
      /** Back on the work list. */
      readonly jobState: "scheduled";
      /** Present only here: the earliest instant the next attempt may run. */
      readonly runAfter: string;
    })
  | (JobOutcomeCommon & {
      /** The queue is done with this row, either way. */
      readonly jobState: "published" | "failed";
      readonly runAfter?: never;
    });

/**
 * Where a settled attempt leaves the row.
 *
 * The retry boundary is `attempt === max_attempts`, and it is written `>=` so
 * that a row whose counter is somehow past its ceiling terminates rather than
 * requeueing forever. A queue that can loop is a queue that can hammer a
 * provider, and Reddit's `maxAttempts: 1` exists precisely because a retry
 * there reads as the spam behaviour their rules are written to catch.
 *
 * Error text is clamped through `clampFailureDetail` — the same function and
 * the same 1000-character bound the delivery ledger uses — rather than a
 * second copy of that logic. An over-long provider error body must degrade to
 * a truncated message, never fail the write that records the failure.
 */
export function decideJobOutcome(
  input: DecideJobOutcomeInput,
): JobOutcomeDecision {
  const attempt = input.attempt;

  if (input.outcome === "published" || input.outcome === "drafted") {
    return {
      // `drafted` lands here too. The queue is finished either way; only
      // `delivery_state` can say whether anything is live.
      jobState: "published",
      attempt,
      // No `runAfter` key: the column is not null, and a finished row is
      // never taken again, so there is nothing to write.
      lastError: null,
      leaseExpiresAt: null,
      leasedBy: null,
    };
  }

  const raw = input.errorDetail ?? "";
  const detail = raw.trim() ? clampFailureDetail(raw) : null;

  if (attempt >= input.maxAttempts) {
    return {
      jobState: "failed",
      attempt,
      // Same reason as the settle above: absent, not null.
      lastError: detail,
      leaseExpiresAt: null,
      leasedBy: null,
    };
  }

  return {
    jobState: "scheduled",
    attempt,
    runAfter: nextRunAfter(attempt, input.nowIso),
    lastError: detail,
    leaseExpiresAt: null,
    leasedBy: null,
  };
}

/**
 * The legal moves. Everything absent from this table is refused.
 *
 * ===================== WHY draft -> scheduled IS MISSING =====================
 * Approval is not recordable anywhere else. `marketing_post_status` has no
 * approval label, so if a job could reach `scheduled` without passing through
 * `approved`, the approval requirement would live entirely in whichever code
 * path remembered to consult `requires_approval`. Every provider in the
 * capability matrix carries `requiresManualApproval: true`, so the single
 * path — draft, ready for approval, approved, scheduled — costs nothing and
 * removes the bypass structurally.
 *
 * ==================== WHY publishing -> cancelled IS MISSING ====================
 * A cancel would be a claim that we stopped something. Once a worker holds
 * the lease the external call may already be out, and the only honest
 * outcomes are `published`, `failed`, or the lease expiring into `RECLAIM`.
 * Marking it cancelled would tell an operator nothing went out, which is
 * exactly the lie the delivery ledger exists to prevent.
 *
 * ============= WHY THE BACKWARD EDGES INTO draft EXIST =============
 * The unique key allows exactly ONE job per (company, post, provider) —
 * forever, by design, since it mirrors the ledger's. So "send it back for
 * edits" cannot be cancel-and-recreate: the cancelled row would occupy the
 * key and nothing could ever publish that pair again. Withdrawing to `draft`
 * is therefore a transition, and `cancelled` genuinely means never, in the
 * same way the ledger's `posted` means never again.
 *
 * `failed` is re-openable for the same reason, and it matches the ledger,
 * which lets a `failed` delivery be retaken because a recorded failure proves
 * no external object was created.
 *
 * A state is never allowed to transition to itself: an update that moves a
 * row to the state it already holds is either a duplicate write or a lost
 * update, and neither should be silently blessed.
 */
const ALLOWED_JOB_TRANSITIONS: Readonly<
  Record<PublishJobState, readonly PublishJobState[]>
> = {
  draft: ["ready_for_approval", "cancelled"],
  ready_for_approval: ["approved", "draft", "cancelled"],
  approved: ["scheduled", "draft", "cancelled"],
  scheduled: ["publishing", "draft", "cancelled"],
  publishing: ["published", "failed", "scheduled"],
  published: [],
  failed: ["draft", "cancelled"],
  cancelled: [],
};

/** Whether a job may move from one state to another. */
export function canTransitionJobState(
  from: PublishJobState,
  to: PublishJobState,
): boolean {
  return ALLOWED_JOB_TRANSITIONS[from].includes(to);
}

/** The moves available from a state, for a UI that renders real buttons. */
export function allowedJobTransitions(
  from: PublishJobState,
): readonly PublishJobState[] {
  return ALLOWED_JOB_TRANSITIONS[from];
}

/** Derived from the graph, never hand-listed, so the two cannot disagree. */
export function isTerminalJobState(state: PublishJobState): boolean {
  return ALLOWED_JOB_TRANSITIONS[state].length === 0;
}

/**
 * One line of operator-facing copy per state, exhaustive over the union so a
 * new state cannot be added without someone deciding what a human is told.
 *
 * `published` deliberately does not assert the content is live: for a
 * draft-only channel it is not, and a queue is not the thing that knows.
 */
export function describeJobState(state: PublishJobState): string {
  switch (state) {
    case "draft":
      return "Being prepared. Not yet offered for approval.";
    case "ready_for_approval":
      return "Waiting for someone to approve publishing this to this channel.";
    case "approved":
      return "Approved. Waiting to be given a publication time.";
    case "scheduled":
      return "Scheduled. It will publish at its appointed time.";
    case "publishing":
      return "Publishing now. A worker holds this job.";
    case "published":
      return "The publish finished. Check the delivery record for what the channel actually did with it.";
    case "failed":
      return "Every attempt failed. Nothing was published; reopen it to try again.";
    case "cancelled":
      return "Cancelled. This post will not be published to this channel.";
  }
}

/** The bound migration 184 puts on `last_error`, shared with the ledger. */
export const PUBLISH_JOB_ERROR_MAX = DELIVERY_FAILURE_DETAIL_MAX;
