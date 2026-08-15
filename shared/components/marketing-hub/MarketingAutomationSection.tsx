import {
  EmptyState,
  MetricCard,
  SectionHeader,
  StatusPill,
  altairMcCardClass,
  altairMcCardPadClass,
  altairMcListClass,
  altairMcListRowClass,
  altairMcTileClass,
} from "@/shared/design-system/components";
import type { StoredAgentSnapshot } from "@/lib/database/queries/agent-snapshots";
import type { AgentDecisionRecord } from "@/lib/database/queries/agent-decisions";
import { AgentDecisionControls } from "./AgentDecisionControls";
import { MarketingMediaPreview } from "./MarketingMediaPreview";
import type {
  AgentListSection,
  AgentSnapshotProvenance,
} from "@/shared/types/agent-snapshot";

/**
 * The automation-first half of the Marketing page.
 *
 * A SERVER COMPONENT rendered above the existing Marketing Hub, deliberately:
 * the hub's 756-line client view is untouched, this needs no interactivity in
 * its current read-only form, and the snapshot is read with the service-role
 * client which must never reach a browser bundle.
 *
 * WHAT IT SHOWS, in the order the founder needs it: what needs a decision,
 * what just happened, what happens next, who is doing it, how it is
 * performing, what the AI suggests, and what the video pipeline is doing.
 * Manual controls stay below, in the existing hub.
 *
 * ============================ DATA HONESTY ============================
 * Every value here comes from the Agent Platform's own read model. Nothing is
 * computed, inferred, defaulted or invented to fill a card, per the
 * repository's standing data-honesty rule. Three states are rendered
 * DIFFERENTLY on purpose, because collapsing them is how a dashboard lies:
 *
 *   SUPPORTED_WITH_DATA  the rows
 *   SUPPORTED_EMPTY      an honest empty state ("nothing yet")
 *   NOT_SUPPORTED        an explicit unavailable state carrying the
 *                        platform's own reason ("cannot say")
 *
 * And a missing snapshot entirely is a fourth, louder state: the automation
 * has never reported in. That is NOT an empty dashboard.
 */

type MarketingAutomationSectionProps = {
  stored: StoredAgentSnapshot | null;
  /** Decisions already recorded, so a subject is never offered twice. */
  decisions: AgentDecisionRecord[];
  /**
   * Render job ids whose media is in THIS deployment's object storage.
   *
   * Read from Altair OS, not from the snapshot, because the snapshot's
   * `previewAvailability` describes a file on the machine that rendered it —
   * a fact about the operator's laptop, not about whether this page can play
   * anything. Storage is the only authority on that, so the button appears
   * for a job in this set even when the platform still reports
   * NOT_TRANSPORTED, and never appears for one that is not.
   */
  storedMediaJobIds: readonly string[];
  /** True when the deployment has the bridge env configured at all. */
  bridgeConfigured: boolean;
  /**
   * Request time, injected rather than read from the ambient clock.
   *
   * Every "5m ago" and every staleness judgement below is a pure function of
   * this value, so the component renders identically for identical props —
   * which is what makes it cacheable and testable, and is the same
   * inject-the-clock discipline the Agent Platform applies to its own
   * projection.
   */
  nowIso: string;
};

const STALE_AFTER_HOURS = 36;

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatRelative(value: string | null, nowMs: number): string {
  if (!value) return "never";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return "unknown";
  const minutes = Math.max(0, Math.round((nowMs - parsed) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function formatDuration(ms: number | null): string | null {
  if (ms === null) return null;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, "0")}s`;
}

function formatBytes(bytes: number | null): string | null {
  if (bytes === null || bytes <= 0) return null;
  const mb = bytes / 1_048_576;
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${Math.round(mb)} MB`;
}

function formatInterval(intervalMs: number | null): string {
  if (intervalMs === null) return "one-time";
  const hours = intervalMs / 3_600_000;
  if (hours >= 24 && hours % 24 === 0) return `every ${hours / 24}d`;
  if (hours >= 1) return `every ${Math.round(hours)}h`;
  return `every ${Math.round(intervalMs / 60000)}m`;
}

/** Provenance is shown only when it would change how a number is read. */
function ProvenanceNote({
  data,
  model,
}: {
  data: AgentSnapshotProvenance;
  model: AgentSnapshotProvenance;
}) {
  const notReal = model === "FAKE" || data === "MOCK";
  if (!notReal) return null;
  return (
    <StatusPill tone="warning" size="sm">
      {model === "FAKE" ? "Analysis is deterministic filler" : "Fixture data"}
    </StatusPill>
  );
}

/**
 * The shared shell every section uses, so the three support levels are
 * rendered identically everywhere and cannot drift per-section.
 */
function AutomationSection<T>({
  title,
  section,
  emptyTitle,
  emptyDescription,
  children,
}: {
  title: string;
  section: AgentListSection<T>;
  emptyTitle: string;
  emptyDescription: string;
  children: (items: T[]) => React.ReactNode;
}) {
  return (
    <section className="space-y-2.5">
      <SectionHeader title={title} />
      {section.support === "NOT_SUPPORTED" ? (
        <div className={`${altairMcCardClass} ${altairMcCardPadClass}`}>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone="neutral" size="sm">
              Not available yet
            </StatusPill>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-altair-ink-muted">
            {section.unsupportedReason}
          </p>
        </div>
      ) : section.items.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        children(section.items)
      )}
    </section>
  );
}

export function MarketingAutomationSection({
  stored,
  decisions,
  bridgeConfigured,
  storedMediaJobIds,
  nowIso,
}: MarketingAutomationSectionProps) {
  const nowMs = Date.parse(nowIso);
  const decisionBySubject = new Map(
    decisions.map((entry) => [entry.decisionKey, entry]),
  );
  const storedMedia = new Set(storedMediaJobIds);
  // The loudest state, and a distinct one: the automation has never reported.
  // Rendering an empty dashboard here would say "nothing is happening" when
  // the truth is "nothing has ever been heard from".
  if (!stored) {
    return (
      <section className="space-y-2.5">
        <SectionHeader title="Marketing automation" />
        <EmptyState
          tone="info"
          title="Automation has not reported in yet"
          description={
            bridgeConfigured
              ? "The Altair Agent Platform is configured but has not pushed a snapshot to this workspace yet. Run the platform's snapshot push to connect it."
              : "The Agent Platform bridge is not configured for this deployment, so no automation status can be shown. Set the agent bridge environment variables to connect it."
          }
        />
      </section>
    );
  }

  const { snapshot } = stored;
  const status = snapshot.sections.automationStatus.data;
  const hoursSince = status?.hoursSinceLastCompletedRun ?? null;
  // "Quiet" and "stuck" look identical from run counts alone — the failure the
  // platform's own unattended review reproduced. Elapsed time next to an
  // ACTIVE schedule is what tells them apart, so it is a headline tile.
  const looksStalled =
    (status?.schedulesActive ?? 0) > 0 &&
    (hoursSince === null || hoursSince > STALE_AFTER_HOURS);

  const receivedStale =
    nowMs - Date.parse(stored.receivedAt) > STALE_AFTER_HOURS * 3_600_000;

  return (
    <div className="space-y-6">
      <section className="space-y-2.5">
        <SectionHeader title="Marketing automation" />

        <div className={`${altairMcCardClass} ${altairMcCardPadClass}`}>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={receivedStale ? "warning" : "success"} size="sm">
              {receivedStale ? "Report is stale" : "Connected"}
            </StatusPill>
            <span className="text-xs text-altair-ink-muted">
              Last report {formatRelative(stored.receivedAt, nowMs)} · produced{" "}
              {formatDateTime(stored.producedAt)}
            </span>
            {status ? (
              <ProvenanceNote
                data={status.dataProvenance}
                model={status.modelProvenance}
              />
            ) : null}
            {stored.droppedItems > 0 ? (
              <StatusPill tone="danger" size="sm">
                {stored.droppedItems} row(s) unreadable — contract drift
              </StatusPill>
            ) : null}
          </div>
        </div>

        {status ? (
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            <MetricCard
              label="Active schedules"
              value={String(status.schedulesActive)}
              description={
                status.nextScheduledRunAt
                  ? `Next ${formatDateTime(status.nextScheduledRunAt)}`
                  : "Nothing scheduled"
              }
              tone={status.schedulesActive > 0 ? "info" : "neutral"}
            />
            <MetricCard
              label="Last completed run"
              value={
                hoursSince === null ? "Never" : `${Math.round(hoursSince)}h ago`
              }
              description={
                looksStalled
                  ? "A schedule is active but nothing has completed"
                  : "Automation is producing work"
              }
              tone={looksStalled ? "warning" : "success"}
            />
            <MetricCard
              label="Awaiting approval"
              value={String(status.tasksAwaitingApproval)}
              description={`${status.approvalsPending} approval(s) pending`}
              tone={
                status.tasksAwaitingApproval + status.approvalsPending > 0
                  ? "warning"
                  : "neutral"
              }
            />
            <MetricCard
              label="Failed"
              value={String(status.tasksFailed)}
              description={
                status.lastFailedRunAt
                  ? `Last ${formatDateTime(status.lastFailedRunAt)}`
                  : "No failures on record"
              }
              tone={status.tasksFailed > 0 ? "danger" : "neutral"}
            />
          </div>
        ) : null}
      </section>

      {/* Attention first: the only thing on this page a human must act on. */}
      <AutomationSection
        title="Approvals needed"
        section={snapshot.sections.approvals}
        emptyTitle="Nothing is waiting on you"
        emptyDescription="The agents have not proposed any action that needs a human decision."
      >
        {(items) => (
          <ul className={altairMcListClass}>
            {items.map((item) => (
              <li
                key={item.approvalId}
                className={`${altairMcListRowClass} border-b border-[var(--north-star-plate-border)] last:border-b-0`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill
                    tone={
                      item.isExpired
                        ? "danger"
                        : item.approvalDecision === "PENDING"
                          ? "warning"
                          : "neutral"
                    }
                    size="sm"
                  >
                    {item.isExpired ? "EXPIRED" : item.approvalDecision}
                  </StatusPill>
                  <span className="text-xs font-semibold text-altair-ink">
                    {item.toolId}
                  </span>
                  {item.deliveryState ? (
                    <StatusPill
                      tone={
                        item.deliveryState === "UNKNOWN" ? "warning" : "neutral"
                      }
                      size="sm"
                    >
                      delivery {item.deliveryState}
                    </StatusPill>
                  ) : null}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-altair-ink-secondary">
                  {item.humanSummary}
                </p>
                <p className="mt-1 text-[11px] text-altair-ink-muted">
                  Requested {formatDateTime(item.requestedAt)} · expires{" "}
                  {formatDateTime(item.expiresAt)}
                </p>
                {/* Only a still-open approval is decidable. An expired or
                    already-decided one is history, and offering buttons on it
                    would invite a decision that can no longer mean anything. */}
                {item.approvalDecision === "PENDING" && !item.isExpired ? (
                  <AgentDecisionControls
                    subjectKind="approval"
                    subjectId={item.approvalId}
                    existingDecision={
                      decisionBySubject.get(`approval:${item.approvalId}`)
                        ?.decision ?? null
                    }
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </AutomationSection>

      <AutomationSection
        title="Today's activity"
        section={snapshot.sections.recentActivity}
        emptyTitle="No agent runs recorded"
        emptyDescription="Nothing has executed yet. When a scheduled sweep produces work, it appears here."
      >
        {(items) => (
          <ul className={altairMcListClass}>
            {items.slice(0, 10).map((item) => (
              <li
                key={item.runId}
                className={`${altairMcListRowClass} border-b border-[var(--north-star-plate-border)] last:border-b-0`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <StatusPill
                      tone={
                        item.runState === "COMPLETED"
                          ? "success"
                          : item.runState === "FAILED"
                            ? "danger"
                            : "info"
                      }
                      size="sm"
                    >
                      {item.runState}
                    </StatusPill>
                    <span className="truncate text-xs font-semibold text-altair-ink">
                      {item.taskType}
                    </span>
                  </div>
                  <span className="text-[11px] text-altair-ink-muted">
                    {formatRelative(item.completedAt ?? item.startedAt, nowMs)}
                  </span>
                </div>
                {item.errorSummary ? (
                  <p className="mt-1 text-[11px] leading-relaxed text-altair-danger">
                    {item.errorSummary}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </AutomationSection>

      <AutomationSection
        title="Upcoming automation"
        section={snapshot.sections.upcomingWork}
        emptyTitle="No automation scheduled"
        emptyDescription="No recurring marketing work is installed on the Agent Platform yet."
      >
        {(items) => (
          <ul className={altairMcListClass}>
            {items.map((item) => (
              <li
                key={item.scheduleId}
                className={`${altairMcListRowClass} border-b border-[var(--north-star-plate-border)] last:border-b-0`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <StatusPill
                      tone={
                        item.scheduleState === "ACTIVE" ? "success" : "neutral"
                      }
                      size="sm"
                    >
                      {item.scheduleState}
                    </StatusPill>
                    <span className="truncate text-xs font-semibold text-altair-ink">
                      {item.name}
                    </span>
                    <span className="text-[11px] text-altair-ink-muted">
                      {formatInterval(item.intervalMs)}
                    </span>
                  </div>
                  <span className="text-[11px] text-altair-ink-muted">
                    {item.isDue
                      ? "Due now"
                      : `Next ${formatDateTime(item.nextRunAt)}`}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </AutomationSection>

      <AutomationSection
        title="Agent status"
        section={snapshot.sections.agentStatus}
        emptyTitle="No agents installed"
        emptyDescription="The Agent Platform has no marketing agents registered for this workspace."
      >
        {(items) => (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <article key={item.agentId} className={altairMcTileClass}>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill
                    tone={item.enabled ? "success" : "neutral"}
                    size="sm"
                  >
                    {item.enabled ? "Enabled" : "Disabled"}
                  </StatusPill>
                  {/* Authority, stated plainly — a read-only agent cannot post. */}
                  <StatusPill
                    tone={item.canActExternally ? "warning" : "neutral"}
                    size="sm"
                  >
                    {item.canActExternally ? "Can act externally" : "Read-only"}
                  </StatusPill>
                </div>
                <p className="mt-2 truncate text-sm font-semibold text-altair-ink">
                  {item.name}
                </p>
                <p className="mt-1 text-[11px] text-altair-ink-muted">
                  {item.grantedToolCount} tool(s) · {item.runsCompleted}{" "}
                  completed · {item.runsFailed} failed · {item.openTaskCount}{" "}
                  open
                </p>
                <p className="mt-1 text-[11px] text-altair-ink-muted">
                  Last run {formatRelative(item.lastRunAt, nowMs)}
                </p>
              </article>
            ))}
          </div>
        )}
      </AutomationSection>

      <AutomationSection
        title="Current campaign"
        section={snapshot.sections.campaign}
        emptyTitle="No campaign metrics in the last review"
        emptyDescription="The most recent marketing review examined no channels."
      >
        {(items) => (
          <div className="space-y-2.5">
            {items.map((item) => (
              <article
                key={item.channel}
                className={`${altairMcCardClass} ${altairMcCardPadClass}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-altair-ink">
                    Channel {item.channel}
                  </span>
                  <StatusPill
                    tone={item.provenance === "LIVE" ? "success" : "warning"}
                    size="sm"
                  >
                    {item.provenance}
                  </StatusPill>
                  {item.signalCount > 0 ? (
                    <StatusPill tone="warning" size="sm">
                      {item.signalCount} signal(s)
                    </StatusPill>
                  ) : null}
                  <span className="text-[11px] text-altair-ink-muted">
                    Observed {formatDateTime(item.observedAt)}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
                  {item.metrics.map((metric) => (
                    <MetricCard
                      key={metric.metric}
                      label={metric.metric}
                      value={
                        metric.latest === null ? "—" : String(metric.latest)
                      }
                      description={`${metric.pointsExamined} point(s)`}
                      trend={
                        metric.percentChange === null
                          ? undefined
                          : `${metric.percentChange > 0 ? "+" : ""}${metric.percentChange.toFixed(1)}%`
                      }
                      tone={
                        metric.direction === "UP"
                          ? "success"
                          : metric.direction === "DOWN"
                            ? "danger"
                            : "neutral"
                      }
                    />
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </AutomationSection>

      <AutomationSection
        title="AI recommendations"
        section={snapshot.sections.recommendations}
        emptyTitle="No recommendations yet"
        emptyDescription="The marketing agent has not produced a review. Recommendations are advice only — nothing is acted on automatically."
      >
        {(items) => (
          <div className="space-y-2.5">
            {items.slice(0, 5).map((item) => (
              <article
                key={item.artifactId}
                className={`${altairMcCardClass} ${altairMcCardPadClass}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill tone="neutral" size="sm">
                    Advice only
                  </StatusPill>
                  <ProvenanceNote
                    data={item.dataProvenance}
                    model={item.modelProvenance}
                  />
                  {item.resolvedWithoutModel ? (
                    <StatusPill tone="neutral" size="sm">
                      Resolved without a model
                    </StatusPill>
                  ) : null}
                  <span className="text-[11px] text-altair-ink-muted">
                    {formatDateTime(item.createdAt)}
                  </span>
                </div>
                <p className="mt-2 text-sm font-semibold text-altair-ink">
                  {item.headline ?? item.title}
                </p>
                {item.diagnosis ? (
                  <p className="mt-1 text-xs leading-relaxed text-altair-ink-secondary">
                    {item.diagnosis}
                  </p>
                ) : null}
                {item.actions.length > 0 ? (
                  <ul className="mt-2 space-y-1.5">
                    {item.actions.slice(0, 4).map((action, index) => (
                      <li
                        key={`${item.artifactId}-${index}`}
                        className="text-xs leading-relaxed text-altair-ink-secondary"
                      >
                        <span className="font-semibold text-altair-ink">
                          {action.kind.replace(/_/g, " ")}
                        </span>{" "}
                        — {action.action}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </AutomationSection>

      <AutomationSection
        title="Video production"
        section={snapshot.sections.videoRenders}
        emptyTitle="No video jobs"
        emptyDescription="No render has been submitted to the video engine for this workspace."
      >
        {(items) => (
          <ul className={altairMcListClass}>
            {items.map((item) => (
              <li
                key={item.jobId}
                className={`${altairMcListRowClass} border-b border-[var(--north-star-plate-border)] last:border-b-0`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <StatusPill
                      tone={
                        item.renderState === "COMPLETED"
                          ? "success"
                          : item.renderState === "FAILED"
                            ? "danger"
                            : item.renderState === "UNKNOWN"
                              ? "warning"
                              : "info"
                      }
                      size="sm"
                    >
                      {item.renderState}
                    </StatusPill>
                    <span className="truncate text-xs font-semibold text-altair-ink">
                      {item.jobId}
                    </span>
                    {item.attempt > 1 ? (
                      <StatusPill tone="warning" size="sm">
                        attempt {item.attempt}
                      </StatusPill>
                    ) : null}
                  </div>
                  <span className="text-[11px] text-altair-ink-muted">
                    {item.stage ? `stage ${item.stage} · ` : ""}
                    {formatRelative(item.recordedAt ?? item.submittedAt, nowMs)}
                  </span>
                </div>
                {/* Describable, not locatable. The master exists only on the
                    machine that rendered it, so these facts are all a remote
                    reviewer can have — and claiming "ready to watch" without a
                    way to watch it would be the lie. */}
                {item.hasRenderedMaster ? (
                  <p className="mt-1 text-[11px] text-altair-ink-muted">
                    {[
                      formatDuration(item.durationMs),
                      item.widthPx && item.heightPx
                        ? `${item.widthPx}×${item.heightPx}`
                        : null,
                      item.videoCodec,
                      item.hasAudio === null
                        ? null
                        : item.hasAudio
                          ? "audio"
                          : "no audio",
                      formatBytes(item.outputBytes),
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Master rendered"}
                  </p>
                ) : null}
                {/* Storage decides, not the snapshot. A job whose media has
                    been transported into this deployment's private bucket is
                    playable here regardless of what the rendering machine
                    still reports about its own local file; one that has not
                    been transported says so plainly rather than offering a
                    button that would fail. */}
                {storedMedia.has(item.jobId) ? (
                  <MarketingMediaPreview sourceJobId={item.jobId} />
                ) : item.previewAvailability === "NOT_TRANSPORTED" ? (
                  <p className="mt-1 text-[11px] text-altair-ink-muted">
                    Preview unavailable — the file exists only on the machine
                    that rendered it.
                  </p>
                ) : null}
                {item.failureName ? (
                  <p className="mt-1 text-[11px] leading-relaxed text-altair-danger">
                    {item.failureName}
                    {item.failureMessage ? `: ${item.failureMessage}` : ""}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </AutomationSection>

      {snapshot.knownGaps.length > 0 ? (
        <section className="space-y-2.5">
          <SectionHeader title="Not reported yet" />
          <div className={`${altairMcCardClass} ${altairMcCardPadClass}`}>
            <p className="text-[11px] leading-relaxed text-altair-ink-muted">
              The automation reports these capabilities as unavailable, so this
              page deliberately shows nothing for them rather than guessing.
            </p>
            <ul className="mt-2 space-y-1">
              {snapshot.knownGaps.map((gap) => (
                <li
                  key={gap.capability}
                  className="text-[11px] leading-relaxed text-altair-ink-muted"
                >
                  <span className="font-semibold text-altair-ink-secondary">
                    {gap.capability}
                  </span>{" "}
                  — {gap.reason}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </div>
  );
}
