"use client";

import { useState, useTransition } from "react";
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
}: {
  readonly lanes: readonly CommandLane[];
  readonly attention: readonly AttentionItem[];
  readonly activity: readonly ActivityEntry[];
  readonly messages: readonly ChiefMessage[];
  readonly awaitingReply: boolean;
  readonly platformUnavailableReason: string | null;
  readonly canAsk: boolean;
}) {
  return (
    <div
      className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_20rem]"
      data-testid="marketing-command"
    >
      <div className="space-y-3">
        <ChiefConversation
          messages={messages}
          awaitingReply={awaitingReply}
          platformUnavailableReason={platformUnavailableReason}
          canAsk={canAsk}
        />
        <TodayPlan lanes={lanes} />
      </div>
      <div className="space-y-3">
        <NeedsAttention items={attention} />
        <RecentActivity entries={activity} />
      </div>
    </div>
  );
}

/* --------------------------------------------------------- conversation */

function ChiefConversation({
  messages,
  awaitingReply,
  platformUnavailableReason,
  canAsk,
}: {
  readonly messages: readonly ChiefMessage[];
  readonly awaitingReply: boolean;
  readonly platformUnavailableReason: string | null;
  readonly canAsk: boolean;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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
    const requestKey = `chief:${crypto.randomUUID()}`;

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
        {platformUnavailableReason ? (
          <StatusPill tone="warning" size="sm">
            Platform not reporting
          </StatusPill>
        ) : awaitingReply ? (
          <StatusPill tone="info" size="sm">
            Queued
          </StatusPill>
        ) : null}
      </header>

      <p className="mt-1 text-xs leading-5 text-altair-ink-muted">{status}</p>

      <div className="mt-3 max-h-80 space-y-2 overflow-y-auto">
        {messages.length === 0 ? (
          <p className="py-6 text-center text-xs text-altair-ink-muted">
            No conversation yet.
          </p>
        ) : (
          messages.map((message) => (
            <ChiefBubble key={message.id} message={message} />
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

function ChiefBubble({ message }: { readonly message: ChiefMessage }) {
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
      </div>
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
}: {
  readonly items: readonly AttentionItem[];
}) {
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
                      className="mt-0.5 inline-block text-xs text-altair-brass underline underline-offset-4"
                    >
                      Open
                    </a>
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

/* --------------------------------------------------------- recent activity */

function RecentActivity({
  entries,
}: {
  readonly entries: readonly ActivityEntry[];
}) {
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
                {new Date(entry.at).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </time>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
