"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  CircleDashed,
  HelpCircle,
  Loader2,
  Send,
} from "lucide-react";
import { askChiefAction } from "@/app/actions/marketing-chief";
import { requestWorkAction } from "@/app/actions/marketing-work-request";
import type { AgentDecisionRecord } from "@/lib/database/queries/agent-decisions";
import { AgentDecisionControls } from "./AgentDecisionControls";
import {
  chiefCommandQuestionId,
  describeWorkRequest,
  OPERATOR_BUTTON_KINDS,
  WORK_REQUEST_DESCRIPTORS,
  workRequestDisplayLabel,
  type WorkRequest,
  type WorkRequestKind,
} from "@/shared/types/agent-work-request";
import { StatusPill } from "@/shared/design-system/components";
import {
  altairMcCardClass,
  altairMcCardPadClass,
  altairMcListClass,
  altairMcListRowClass,
} from "@/shared/design-system/components/mc-surface";
import {
  CHIEF_MESSAGE_MAX,
  describeChiefConversation,
  validateChiefQuestion,
  type ActivityEntry,
  type AttentionItem,
  type ChiefMessage,
  type CommandLane,
  type CommandLaneState,
} from "@/shared/types/marketing-command";
import { useCompanyTimezone } from "@/shared/lib/company-timezone";
import { formatDateTimeInTimeZone } from "@/shared/lib/datetime";
import {
  formatRelativeAge,
  type AgentPlatformStatusReport,
} from "@/shared/types/agent-heartbeat";

/**
 * `crypto.randomUUID` exists only on secure origins. Testing this surface from
 * a phone over plain-http LAN would otherwise throw a raw TypeError inside the
 * click handler; a request key only needs uniqueness per operator attempt, so
 * a time+random fallback is sufficient there.
 */
function mintRequestKey(prefix: string): string {
  const unique =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  return `${prefix}:${unique}`;
}

/**
 * Marketing Command — the Chief of Staff surface.
 *
 * ====================== THE CHIEF IS NOT IN THIS BROWSER ======================
 * It runs on the Agent Platform, which sits behind NAT. A question is QUEUED
 * and answered on the platform's next cycle. This component therefore never
 * shows a typing indicator and never claims a live connection: the waiting
 * copy names the real mechanism, because an operator who believes an answer
 * is seconds away will wait for one that is minutes away.
 *
 * ====================== EVERY PANEL IS REAL STATE ======================
 * Lanes, attention items and activity are projected server-side from stored
 * rows by `shared/types/marketing-command.ts`. There are no hardcoded stages
 * and no decorative progress: a lane the system cannot see reports `unknown`
 * rather than a comforting "waiting".
 */

const LANE_ICON: Record<
  CommandLaneState,
  { icon: typeof Circle; className: string }
> = {
  done: { icon: CheckCircle2, className: "text-altair-success" },
  active: { icon: Loader2, className: "text-altair-brass" },
  waiting: { icon: CircleDashed, className: "text-altair-ink-muted" },
  blocked: { icon: AlertTriangle, className: "text-altair-danger" },
  idle: { icon: Circle, className: "text-altair-ink-muted" },
  // Not the same as idle: the platform is not reporting, so nothing is known.
  unknown: { icon: HelpCircle, className: "text-altair-ink-muted" },
};

export function MarketingCommandView({
  lanes,
  attention,
  activity,
  messages,
  awaitingReply,
  platformUnavailableReason,
  canAsk,
  decisions,
  workRequests,
  platformStatus,
}: {
  readonly lanes: readonly CommandLane[];
  readonly attention: readonly AttentionItem[];
  readonly activity: readonly ActivityEntry[];
  readonly messages: readonly ChiefMessage[];
  readonly awaitingReply: boolean;
  readonly platformUnavailableReason: string | null;
  readonly canAsk: boolean;
  /**
   * Decisions already recorded in Altair OS, so one is never offered twice.
   *
   * Needed because the two sides disagree for a while by design: a decision
   * recorded here sits unapplied until the platform's next pull, so the
   * snapshot still reports the approval as PENDING. Without this the operator
   * would be shown buttons for something they just decided.
   */
  readonly decisions: readonly AgentDecisionRecord[];
  /** What has been asked of the platform recently, and what came back. */
  readonly workRequests: readonly WorkRequest[];
  /** The platform's own liveness signal — ONLINE / DEGRADED / OFFLINE. */
  readonly platformStatus: AgentPlatformStatusReport;
}) {
  const router = useRouter();
  // ============ RE-CHECK WHILE SOMETHING IS PENDING, AND ONLY THEN ============
  // An answer or a request outcome arrives when the platform's gateway next
  // settles it — typically within a minute or two, never instantly, and this
  // page has no live connection to be pushed over. So while (and ONLY while)
  // something of ours is unsettled, the server projection is re-read on a slow
  // interval. The moment everything is settled the interval is torn down:
  // an idle Command tab makes no requests. This is a re-read of real state,
  // not a liveness performance — the copy still says "queued", because it is.
  //
  // A platform that is not ONLINE is ALSO "something pending": the operator
  // needs to see it recover the moment a heartbeat lands again, not only when
  // they happen to have a queued question of their own.
  const somethingPending =
    awaitingReply ||
    workRequests.some((request) => request.outcome === null) ||
    platformStatus.status !== "online";
  useEffect(() => {
    if (!somethingPending) return;
    const timer = setInterval(() => router.refresh(), 20_000);
    return () => clearInterval(timer);
  }, [somethingPending, router]);

  // ================= ONE COLUMN ON A PHONE, IN PRIORITY ORDER =================
  // Below `lg` the two column wrappers dissolve (`max-lg:contents`) so every
  // panel is a direct grid child and can be ordered by importance instead of
  // by desktop column: conversation, then what needs a human, then the plan.
  // DOM order is unchanged, so desktop columns and screen readers see the
  // original arrangement.
  return (
    <div
      className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_20rem]"
      data-testid="marketing-command"
    >
      <div className="max-lg:contents lg:space-y-3">
        <div className="min-w-0 max-lg:order-1">
          <ChiefConversation
            messages={messages}
            awaitingReply={awaitingReply}
            platformStatus={platformStatus}
            platformUnavailableReason={platformUnavailableReason}
            canAsk={canAsk}
            workRequests={workRequests}
          />
        </div>
        <div className="min-w-0 max-lg:order-3">
          <TodayPlan lanes={lanes} />
        </div>
      </div>
      <div className="max-lg:contents lg:space-y-3">
        <div className="min-w-0 max-lg:order-2">
          <NeedsAttention items={attention} decisions={decisions} />
        </div>
        <div className="min-w-0 max-lg:order-4">
          <RequestWork requests={workRequests} canAsk={canAsk} />
        </div>
        <div className="min-w-0 max-lg:order-5">
          <RecentActivity entries={activity} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------- platform liveness badge */

const PLATFORM_STATUS_TONE = {
  online: "success",
  degraded: "warning",
  offline: "danger",
} as const;

const PLATFORM_STATUS_LABEL = {
  online: "Agent Platform online",
  degraded: "Agent Platform degraded",
  offline: "Agent Platform offline",
} as const;

/**
 * ONLINE / DEGRADED / OFFLINE + "last seen", always rendered.
 *
 * ====================== WHY THIS EXISTS ======================
 * Before this badge, a queued Chief question could sit for HOURS with only
 * "waiting for next cycle" — indistinguishable from a platform working
 * normally on a slow day. This makes the platform's own aliveness a first-
 * class, always-visible fact rather than something inferred from silence.
 *
 * ====================== WHY "LAST SEEN" TICKS WITHOUT A NETWORK CALL ======================
 * The server computed `ageMs` once, at render time. A `setInterval` here only
 * forces a RE-RENDER of the already-fetched timestamp through
 * `formatRelativeAge` — zero network cost, so the number keeps advancing
 * between the page's own 20s poll cycles instead of freezing at whatever it
 * said when the page last loaded.
 */
function AgentPlatformBadge({
  status,
}: {
  readonly status: AgentPlatformStatusReport;
}) {
  // `nowMs` is set ONLY from inside effects (mount, then every 10s) — never
  // read from `Date.now()` in the render body itself, which must stay pure.
  // Before the mount effect has run (server render, first paint) it is
  // null and the badge falls back to the server-computed `status.ageMs`,
  // which is also what keeps SSR and the first client render in agreement.
  const [nowMs, setNowMs] = useState<number | null>(null);
  useEffect(() => {
    setNowMs(Date.now());
    if (status.lastSeenAt === null) return;
    const timer = setInterval(() => setNowMs(Date.now()), 10_000);
    return () => clearInterval(timer);
  }, [status.lastSeenAt]);

  const liveAgeMs =
    status.lastSeenAt === null
      ? null
      : nowMs === null
        ? status.ageMs
        : Math.max(0, nowMs - Date.parse(status.lastSeenAt));
  const detail =
    liveAgeMs === null
      ? "never reported in"
      : `last seen ${formatRelativeAge(liveAgeMs)} ago`;

  return (
    <StatusPill
      tone={PLATFORM_STATUS_TONE[status.status]}
      size="sm"
      className="gap-1"
    >
      <span
        aria-hidden="true"
        className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-current"
      />
      {PLATFORM_STATUS_LABEL[status.status]}
      <span className="text-altair-ink-muted">· {detail}</span>
    </StatusPill>
  );
}

/* --------------------------------------------------------- conversation */

function ChiefConversation({
  messages,
  awaitingReply,
  platformStatus,
  platformUnavailableReason,
  canAsk,
  workRequests,
}: {
  readonly messages: readonly ChiefMessage[];
  readonly awaitingReply: boolean;
  readonly platformStatus: AgentPlatformStatusReport;
  readonly platformUnavailableReason: string | null;
  readonly canAsk: boolean;
  readonly workRequests: readonly WorkRequest[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Messages render oldest-first, so without this the newest turn sits below
  // the fold of the scroller — on a phone the panel looks unchanged after
  // sending, which reads as a failed send. Scrolling the container directly
  // (not scrollIntoView) keeps the page itself from jumping.
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (scroller) scroller.scrollTop = scroller.scrollHeight;
  }, [messages]);

  const status = describeChiefConversation({
    messages,
    awaitingReply,
    platformUnavailableReason,
  });

  function send() {
    const validated = validateChiefQuestion(draft);
    if (!validated.ok) {
      setError(validated.error);
      return;
    }
    setError(null);

    // One key per submission. A double-click reuses it and the unique index
    // refuses the second insert, so the Chief is asked once.
    const requestKey = mintRequestKey("chief");

    startTransition(async () => {
      const result = await askChiefAction({ body: validated.body, requestKey });
      if (result.error) {
        setError(result.error);
        return;
      }
      setDraft("");
      router.refresh();
    });
  }

  return (
    <section
      className={`${altairMcCardClass} ${altairMcCardPadClass}`}
      aria-label="Chief of Staff"
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-altair-ink">
          Chief of Staff
        </h2>
        <div className="flex items-center gap-1.5">
          {/* ALWAYS visible, not only when something is wrong — a queued
              question must never sit for hours with no indication the
              platform is offline (the failure this badge exists to close). */}
          <AgentPlatformBadge status={platformStatus} />
          {platformStatus.status === "online" && awaitingReply ? (
            <StatusPill tone="info" size="sm">
              Queued
            </StatusPill>
          ) : null}
        </div>
      </header>

      <p className="mt-1 text-xs leading-5 text-altair-ink-muted">{status}</p>

      {/* Viewport-relative on a phone so the scroller is not half the screen
          nested inside the page scroller; the fixed 320px stays at lg. */}
      <div
        ref={scrollerRef}
        className="mt-3 max-h-[45dvh] space-y-2 overflow-y-auto lg:max-h-80"
      >
        {messages.length === 0 ? (
          <p className="py-6 text-center text-xs text-altair-ink-muted">
            No conversation yet.
          </p>
        ) : (
          messages.map((message) => (
            <ChiefBubble
              key={message.id}
              message={message}
              // Requests the Chief queued FROM this message, matched by the
              // deterministic request-key prefix. Real rows, real states.
              startedWork={
                message.role === "user"
                  ? workRequests.filter(
                      (request) =>
                        chiefCommandQuestionId(request.requestKey) === message.id,
                    )
                  : []
              }
            />
          ))
        )}
      </div>

      <div className="mt-3 flex items-end gap-2">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={CHIEF_MESSAGE_MAX}
          rows={2}
          disabled={!canAsk || pending}
          placeholder={
            canAsk
              ? "Ask about today's work, approvals, or what is blocked…"
              : "You do not have access to Marketing operations."
          }
          className="min-w-0 flex-1 resize-none rounded-none border border-altair-border bg-white px-2 py-1.5 text-xs text-altair-ink placeholder:text-altair-ink-muted focus:outline-none focus:ring-1 focus:ring-altair-brass disabled:opacity-60"
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              send();
            }
          }}
        />
        <button
          type="button"
          onClick={send}
          disabled={!canAsk || pending || draft.trim().length === 0}
          className="admin-btn-primary inline-flex shrink-0 items-center gap-1.5 text-xs disabled:opacity-60"
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {pending ? "Queueing…" : "Ask"}
        </button>
      </div>

      {error ? (
        <p className="mt-1.5 text-xs text-altair-danger" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}

function ChiefBubble({
  message,
  startedWork,
}: {
  readonly message: ChiefMessage;
  readonly startedWork: readonly WorkRequest[];
}) {
  const isUser = message.role === "user";

  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div
        className={`max-w-[85%] rounded-none border px-2.5 py-1.5 ${
          isUser
            ? "border-altair-border bg-[#FAF6EE]/70"
            : "border-altair-brass/30 bg-white"
        }`}
      >
        <p className="text-[10px] font-medium uppercase tracking-wide text-altair-ink-muted">
          {isUser ? "You" : "Chief of Staff"}
        </p>
        <p className="mt-0.5 whitespace-pre-wrap text-xs leading-5 text-altair-ink">
          {message.body}
        </p>
        {/* A queued question says so. A failed one says why, and is not
            dressed up as an answer from the Chief. */}
        {isUser && message.status === "queued" ? (
          <p className="mt-1 text-[10px] text-altair-ink-muted">
            Waiting for the Agent Platform&rsquo;s next cycle.
          </p>
        ) : null}
        {isUser && message.status === "failed" ? (
          <p className="mt-1 text-[10px] text-altair-danger">
            {message.errorDetail ?? "The Chief could not answer this."}
          </p>
        ) : null}
        {startedWork.length > 0 ? (
          <StartedWorkList requests={startedWork} />
        ) : null}
      </div>
    </div>
  );
}

/**
 * The work the Chief queued from one message, with its REAL states.
 *
 * Every row here is an `agent_work_requests` row matched by request key —
 * there is no simulated progress and no invented "running" stage, because
 * the browser genuinely cannot observe the platform mid-cycle. Queued,
 * done, refused and failed are the four facts that exist; those are what
 * is shown.
 */
function StartedWorkList({
  requests,
}: {
  readonly requests: readonly WorkRequest[];
}) {
  const ordered = [...requests].sort((a, b) =>
    a.requestKey.localeCompare(b.requestKey),
  );
  return (
    <div className="mt-1.5 border-t border-altair-border pt-1.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-altair-ink-muted">
        Started {ordered.length} task{ordered.length === 1 ? "" : "s"}
      </p>
      <ul className="mt-0.5 space-y-0.5">
        {ordered.map((request) => {
          const done = request.outcome === "completed";
          const broken =
            request.outcome === "refused" || request.outcome === "failed";
          const Icon = done ? CheckCircle2 : broken ? AlertTriangle : CircleDashed;
          return (
            <li key={request.id} className="flex items-start gap-1.5">
              <Icon
                className={`mt-0.5 h-3 w-3 shrink-0 ${
                  done
                    ? "text-altair-success"
                    : broken
                      ? "text-altair-danger"
                      : "text-altair-ink-muted"
                }`}
                aria-hidden="true"
              />
              <span className="min-w-0 text-[11px] leading-4 text-altair-ink">
                <span className="font-medium">
                  {workRequestDisplayLabel(request)}
                </span>{" "}
                <span
                  className={
                    done
                      ? "text-altair-success"
                      : broken
                        ? "text-altair-danger"
                        : "text-altair-ink-muted"
                  }
                >
                  {done
                    ? "— done"
                    : request.outcome === "refused"
                      ? "— not run"
                      : request.outcome === "failed"
                        ? "— failed"
                        : "— queued"}
                </span>
                {broken && request.outcomeDetail ? (
                  <span className="line-clamp-2 block text-[10px] text-altair-ink-muted">
                    {request.outcomeDetail}
                  </span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ----------------------------------------------------------- today's plan */

function TodayPlan({ lanes }: { readonly lanes: readonly CommandLane[] }) {
  return (
    <section
      className={`${altairMcCardClass} ${altairMcCardPadClass}`}
      aria-label="Today"
    >
      <h2 className="text-sm font-semibold text-altair-ink">Today</h2>
      <ul className={`${altairMcListClass} mt-2`}>
        {lanes.map((lane, index) => {
          const { icon: Icon, className } = LANE_ICON[lane.state];
          return (
            <li
              key={lane.key}
              className={`${altairMcListRowClass} flex items-start gap-2 ${
                index === 0 ? "" : "border-t border-altair-border"
              }`}
            >
              <Icon
                className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${className} ${
                  lane.state === "active" ? "animate-spin" : ""
                }`}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <span className="block text-xs font-medium text-altair-ink">
                  {lane.label}
                </span>
                <span className="block text-xs leading-5 text-altair-ink-muted">
                  {lane.detail}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* -------------------------------------------------------- needs attention */

function NeedsAttention({
  items,
  decisions,
}: {
  readonly items: readonly AttentionItem[];
  readonly decisions: readonly AgentDecisionRecord[];
}) {
  // Keyed exactly as the Advanced tab keys it, because it is the same queue.
  const decisionBySubject = new Map(
    decisions.map((entry) => [entry.decisionKey, entry]),
  );
  return (
    <section
      className={`${altairMcCardClass} ${altairMcCardPadClass}`}
      aria-label="Needs your attention"
    >
      <h2 className="text-sm font-semibold text-altair-ink">
        Needs your attention
      </h2>
      {items.length === 0 ? (
        // Not an empty-state illustration: "nothing needs you" is a real and
        // welcome answer on an operations screen.
        <p className="mt-2 text-xs text-altair-ink-muted">
          Nothing needs you right now.
        </p>
      ) : (
        <ul className="mt-2 space-y-2">
          {items.map((item, index) => (
            <li key={`${item.kind}-${index}`}>
              <div className="flex items-start gap-2">
                <AlertTriangle
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-altair-danger"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <span className="block text-xs font-medium text-altair-ink">
                    {item.title}
                  </span>
                  <span className="block text-xs leading-5 text-altair-ink-muted">
                    {item.detail}
                  </span>
                  {item.href ? (
                    <a
                      href={item.href}
                      className="mt-0.5 inline-flex min-h-11 items-center text-xs text-altair-brass underline underline-offset-4 md:min-h-0"
                    >
                      Open
                    </a>
                  ) : null}
                  {/* ============ THE ONE DELEGATION ON THIS SURFACE ============
                      The operator decides, right where the Chief explained
                      what is pending — through the SAME server action, the
                      same decision key and the same queue the Advanced tab
                      writes to. No second approval path exists, the Chief
                      cannot press this, and recording a decision publishes
                      nothing: the platform applies it on its next cycle
                      through its own permission engine. */}
                  {item.decidableApprovalId ? (
                    <AgentDecisionControls
                      subjectKind="approval"
                      subjectId={item.decidableApprovalId}
                      existingDecision={
                        decisionBySubject.get(
                          `approval:${item.decidableApprovalId}`,
                        )?.decision ?? null
                      }
                    />
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ------------------------------------------------------------ request work */

/**
 * Asking the platform to run one named analysis.
 *
 * ====================== ONE BUTTON, ONE NAMED THING ======================
 * Every option is a fixed kind from a closed vocabulary — there is no free
 * text, no argument and no "run whatever I meant". That is what stops vague
 * language from becoming a broad instruction: there is no field for it.
 *
 * ====================== ASKING IS NOT RUNNING ======================
 * The request is queued and the platform decides. Each runner keeps its own
 * consent gate on the machine that runs the agents, which this browser can
 * neither read nor set — so a request can come back `refused` having spent
 * nothing, and the copy never promises otherwise.
 */
function RequestWork({
  requests,
  canAsk,
}: {
  readonly requests: readonly WorkRequest[];
  readonly canAsk: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyKind, setBusyKind] = useState<WorkRequestKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  // One key per attempt, HELD until it succeeds. Minting a fresh key on every
  // click would make a double-click two rows; reusing it means the unique
  // index collapses them into the one request the operator meant.
  const [keys, setKeys] = useState<Partial<Record<WorkRequestKind, string>>>(
    {},
  );

  function submit(kind: WorkRequestKind) {
    setError(null);
    setBusyKind(kind);
    const requestKey = keys[kind] ?? mintRequestKey("work");
    setKeys((current) => ({ ...current, [kind]: requestKey }));

    startTransition(async () => {
      const result = await requestWorkAction({ kind, requestKey });
      setBusyKind(null);
      if (result.error) {
        setError(result.error);
        return;
      }
      setKeys((current) => ({ ...current, [kind]: undefined }));
      router.refresh();
    });
  }

  return (
    <section
      className={`${altairMcCardClass} ${altairMcCardPadClass}`}
      aria-label="Ask the Chief to run something"
    >
      <h2 className="text-sm font-semibold text-altair-ink">
        Ask the Chief to run something
      </h2>
      <p className="mt-1 text-xs text-altair-ink-muted">
        Queued for the Agent Platform. Each of these is read-only — none of them
        publishes.
      </p>

      <div className="mt-2 space-y-2">
        {/* Only the parameterless kinds render as buttons: the others need a
            topic, which is the conversation's job, not a button's. */}
        {OPERATOR_BUTTON_KINDS.map((kind) => {
          const descriptor = WORK_REQUEST_DESCRIPTORS[kind];
          return (
            <div key={kind}>
              <button
                type="button"
                disabled={!canAsk || pending}
                onClick={() => submit(kind)}
                className="min-h-11 w-full rounded border border-altair-border bg-altair-paper-elevated px-3 py-2 text-left text-sm font-medium text-altair-ink hover:border-altair-brass disabled:opacity-50 md:min-h-0 md:px-2 md:py-1.5 md:text-xs"
              >
                {busyKind === kind ? "Queueing…" : descriptor.label}
              </button>
              <p className="mt-0.5 text-[11px] leading-4 text-altair-ink-muted">
                {descriptor.detail}
              </p>
            </div>
          );
        })}
      </div>

      {error ? (
        <p className="mt-2 text-xs text-altair-danger" role="alert">
          {error}
        </p>
      ) : null}

      {requests.length > 0 ? (
        <ul className="mt-3 space-y-1 border-t border-altair-border pt-2">
          {requests.slice(0, 5).map((request) => (
            <li key={request.id} className="text-[11px] leading-4">
              {/* `outcome_detail` may legally be 2000 chars; unclamped that is
                  ~40 lines of 11px text on a phone. */}
              <span
                className={`line-clamp-3 ${
                  request.outcome === "completed"
                    ? "text-altair-success"
                    : request.outcome === "refused" ||
                        request.outcome === "failed"
                      ? "text-altair-danger"
                      : "text-altair-ink-muted"
                }`}
              >
                {describeWorkRequest(request)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

/* --------------------------------------------------------- recent activity */

function RecentActivity({
  entries,
}: {
  readonly entries: readonly ActivityEntry[];
}) {
  // Device-local `toLocaleString` here was both a hydration mismatch (server
  // renders UTC, client re-renders device TZ) and the wrong clock for an
  // operations log. The company timezone is the one the operator plans in.
  const timeZone = useCompanyTimezone();
  return (
    <section
      className={`${altairMcCardClass} ${altairMcCardPadClass}`}
      aria-label="Recent activity"
    >
      <h2 className="text-sm font-semibold text-altair-ink">Recent activity</h2>
      {entries.length === 0 ? (
        <p className="mt-2 text-xs text-altair-ink-muted">
          No recorded activity yet.
        </p>
      ) : (
        <ol className="mt-2 space-y-2">
          {entries.map((entry, index) => (
            <li key={`${entry.at}-${index}`} className="min-w-0">
              <span className="block text-xs font-medium text-altair-ink">
                {entry.label}
              </span>
              {entry.detail ? (
                <span className="block truncate text-xs text-altair-ink-muted">
                  {entry.detail}
                </span>
              ) : null}
              <time
                dateTime={entry.at}
                className="block text-[10px] text-altair-ink-muted"
              >
                {formatDateTimeInTimeZone(entry.at, timeZone)}
              </time>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
