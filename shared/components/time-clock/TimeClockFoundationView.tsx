"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { Clock3, History } from "lucide-react";
import {
  clockInAction,
  clockOutAction,
  correctOpenShiftAction,
} from "@/app/actions/time-clock";
import { CompactTimeClockBar } from "@/shared/components/time-clock/CompactTimeClockBar";
import { TimeClockStatStrip } from "@/shared/components/time-clock/TimeClockStatStrip";
import {
  EmptyState,
  SectionHeader,
  StatusPill,
  altairMcListClass,
  altairMcListRowClass,
} from "@/shared/design-system/components";
import {
  MasterPageHeader,
  adminFormInputClass,
} from "@/shared/design-system/shell";
import {
  MobileSheet,
  MobileSheetBody,
  MobileSheetFooter,
  MobileSheetFooterActions,
  MobileSheetHeader,
  MobileSheetHeaderIcon,
  MobileSheetPanel,
} from "@/shared/components/ui/mobile-sheet";
import { formatActionError } from "@/shared/lib/operational-errors";
import type { TechnicianTimeStatusCounts } from "@/shared/lib/technicians/technician-roster-time-status";
import { resolveShiftRowStatus } from "@/shared/lib/time-tracking/shift-row-status";
import { isStaleOpenShift } from "@/shared/lib/time-tracking/shift-time-tracking-summary";
import type { ReportTimeTrackingSummary } from "@/shared/types/reports-page";
import type { TimeClockEntry } from "@/shared/types/time-clock";
import {
  formatDateTime,
  formatDuration,
  getElapsedMinutes,
} from "@/shared/types/time-clock";
import {
  formatDurationMinutes,
  type TimeEntry,
} from "@/shared/types/time-entry";

type TimeClockFoundationViewProps = {
  initialOpenEntry: TimeClockEntry | null;
  initialEntries: TimeClockEntry[];
  activeEntries: TimeEntry[];
  statusCounts: TechnicianTimeStatusCounts;
  timeTracking: ReportTimeTrackingSummary;
  showRosterCounts: boolean;
  currentUserId: string;
  currentUserName: string;
  canViewCompanyEntries: boolean;
  canCorrectEntries: boolean;
  /**
   * When true, omit MasterPageHeader — Team hub hosts page chrome.
   */
  embedded?: boolean;
};

function formatShiftDuration(entry: TimeClockEntry, now: number): string {
  if (entry.clockOutAt) {
    if (entry.durationMinutes != null) {
      return formatDurationMinutes(entry.durationMinutes);
    }
    return formatDuration(entry.clockInAt, entry.clockOutAt);
  }

  return formatDurationMinutes(getElapsedMinutes(entry.clockInAt, now));
}

export function TimeClockFoundationView({
  initialOpenEntry,
  initialEntries,
  activeEntries: initialActiveEntries,
  statusCounts,
  timeTracking,
  showRosterCounts,
  currentUserId,
  currentUserName,
  canViewCompanyEntries,
  canCorrectEntries,
  embedded = false,
}: TimeClockFoundationViewProps) {
  const [openEntry, setOpenEntry] = useState(initialOpenEntry);
  const [entries, setEntries] = useState(initialEntries);
  const [activeEntries, setActiveEntries] = useState(initialActiveEntries);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [now, setNow] = useState(() => Date.now());
  const [correctingEntryId, setCorrectingEntryId] = useState<string | null>(
    null,
  );
  const [correctionEndedAt, setCorrectionEndedAt] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");
  const [correctionError, setCorrectionError] = useState<string | null>(null);
  const shiftHistoryHeadingRef = useRef<HTMLHeadingElement>(null);
  const searchParams = useSearchParams();
  const focusEntryId = searchParams.get("entry");

  useEffect(() => {
    // Server actions can refresh route props without remounting this client view.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpenEntry(initialOpenEntry);
    setEntries(initialEntries);
    setActiveEntries(initialActiveEntries);
  }, [initialActiveEntries, initialEntries, initialOpenEntry]);

  useEffect(() => {
    if (!focusEntryId) return;
    const node = document.getElementById(`time-entry-${focusEntryId}`);
    if (!node) return;
    node.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusEntryId, entries]);

  useEffect(() => {
    if (!entries.some((entry) => entry.status === "open")) {
      return;
    }

    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, [entries]);

  const activeDurationLabel = useMemo(() => {
    if (!openEntry) {
      return null;
    }

    return `${formatDurationMinutes(getElapsedMinutes(openEntry.clockInAt, now))} active`;
  }, [now, openEntry]);

  function upsertEntry(entry: TimeClockEntry) {
    setEntries((previous) => {
      const withoutCurrent = previous.filter((item) => item.id !== entry.id);
      return [entry, ...withoutCurrent];
    });
  }

  function runClockIn() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await clockInAction();
        if (result.error) {
          setError(
            formatActionError(result.error, "Could not clock in. Try again."),
          );
          return;
        }

        if (result.entry) {
          setOpenEntry(result.entry);
          upsertEntry(result.entry);
        }
      } catch {
        setError("Could not clock in. Check your connection and try again.");
      }
    });
  }

  function runClockOut() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await clockOutAction(openEntry?.id);
        if (result.error) {
          setError(
            formatActionError(result.error, "Could not clock out. Try again."),
          );
          return;
        }

        if (result.entry) {
          setOpenEntry(null);
          upsertEntry(result.entry);
          setActiveEntries((previous) =>
            previous.filter(
              (active) =>
                !(
                  active.technicianId === result.entry!.userId &&
                  !active.endedAt
                ),
            ),
          );
        }
      } catch {
        setError("Could not clock out. Check your connection and try again.");
      }
    });
  }

  function beginCorrection(entry: TimeClockEntry) {
    const localNow = new Date(now - new Date(now).getTimezoneOffset() * 60_000)
      .toISOString()
      .slice(0, 16);
    setCorrectingEntryId(entry.id);
    setCorrectionEndedAt(localNow);
    setCorrectionReason("");
    setCorrectionError(null);
    setError(null);
  }

  function cancelCorrection() {
    if (isPending) return;

    setCorrectingEntryId(null);
    setCorrectionEndedAt("");
    setCorrectionReason("");
    setCorrectionError(null);
  }

  function runCorrection(entry: TimeClockEntry) {
    if (isPending || !correctionEndedAt || correctionReason.trim().length < 5) {
      return;
    }

    const correctedEnd = new Date(correctionEndedAt);
    if (Number.isNaN(correctedEnd.getTime())) {
      setCorrectionError("Enter a valid clock-out date and time.");
      return;
    }

    setCorrectionError(null);
    startTransition(async () => {
      try {
        const result = await correctOpenShiftAction({
          entryId: entry.id,
          endedAt: correctedEnd.toISOString(),
          reason: correctionReason,
        });
        if (result.error) {
          setCorrectionError(
            formatActionError(result.error, "Could not correct this shift."),
          );
          return;
        }
        if (result.entry) {
          upsertEntry(result.entry);
          if (openEntry?.id === result.entry.id) setOpenEntry(null);
          setActiveEntries((previous) =>
            previous.filter(
              (active) =>
                !(
                  active.technicianId === result.entry!.userId &&
                  !active.endedAt
                ),
            ),
          );
        }
        setCorrectingEntryId(null);
        setCorrectionEndedAt("");
        setCorrectionReason("");
        window.requestAnimationFrame(() => {
          shiftHistoryHeadingRef.current?.focus({ preventScroll: true });
        });
      } catch {
        setCorrectionError(
          "Could not save the correction. Check your connection and try again.",
        );
      }
    });
  }

  const visibleEntries = canViewCompanyEntries
    ? entries
    : entries.filter((entry) => entry.userId === currentUserId);
  const correctingEntry =
    visibleEntries.find((entry) => entry.id === correctingEntryId) ?? null;
  const correctionFormId = "missed-clock-out-correction-form";

  function canCorrectEntry(entry: TimeClockEntry): boolean {
    if (entry.status !== "open") return false;
    if (canCorrectEntries) return true;
    return (
      entry.userId === currentUserId && isStaleOpenShift(entry.clockInAt, now)
    );
  }

  return (
    <div className="space-y-4">
      {embedded ? null : (
        <MasterPageHeader
          title="Time Clock"
          subtitle="Shift history, live crew status, and missed clock-out corrections"
          density="compact"
          surfaceVariant="northStar"
        />
      )}

      <TimeClockStatStrip
        statusCounts={statusCounts}
        timeTracking={timeTracking}
        showRosterCounts={showRosterCounts}
      />

      <CompactTimeClockBar
        statusLabel={
          openEntry ? (activeDurationLabel ?? "Clocked in") : "Not clocked in"
        }
        subtext={
          openEntry
            ? `${currentUserName} · Since ${formatDateTime(openEntry.clockInAt)}`
            : `${currentUserName} · Clock in or out for your own shift`
        }
        toggleAction={openEntry ? "clock_out" : "clock_in"}
        isPending={isPending}
        error={error}
        onToggle={openEntry ? runClockOut : runClockIn}
      />

      <section className="space-y-2">
        <SectionHeader
          title="Shift history"
          action={
            visibleEntries.length > 0
              ? {
                  label: `${visibleEntries.length} shift${visibleEntries.length === 1 ? "" : "s"}`,
                }
              : undefined
          }
        />
        <h2
          ref={shiftHistoryHeadingRef}
          tabIndex={-1}
          className="sr-only outline-none"
        >
          Shift history
        </h2>

        {visibleEntries.length === 0 ? (
          <EmptyState
            title="No shifts yet"
            description="Clock in to start a shift. Closed and open company shifts will show up here."
            icon={<Clock3 className="h-6 w-6" />}
          />
        ) : (
          <div className={altairMcListClass}>
            <div className="hidden border-b border-altair-border px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-altair-ink-on-paper-muted md:grid md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.7fr)_minmax(0,0.8fr)_minmax(0,0.9fr)] md:gap-3">
              {canViewCompanyEntries ? <span>Technician</span> : <span>Shift</span>}
              <span>Clock in</span>
              <span>Clock out</span>
              <span>Duration</span>
              <span>Status</span>
              <span>Review</span>
            </div>

            <ul className="divide-y divide-altair-border">
              {visibleEntries.map((entry) => {
                const rowStatus = resolveShiftRowStatus(
                  entry,
                  activeEntries,
                  now,
                );
                const showCorrect = canCorrectEntry(entry);
                const stale = isStaleOpenShift(entry.clockInAt, now);

                const isFocused = focusEntryId === entry.id;

                return (
                  <li
                    id={`time-entry-${entry.id}`}
                    key={entry.id}
                    className={`${altairMcListRowClass} scroll-mt-24 ${
                      isFocused
                        ? "bg-altair-brass/10 ring-2 ring-inset ring-altair-brass/40"
                        : ""
                    }`}
                  >
                    <div className="grid gap-2 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.7fr)_minmax(0,0.8fr)_minmax(0,0.9fr)] md:items-center md:gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-altair-ink-on-paper">
                          {canViewCompanyEntries
                            ? entry.userName
                            : "Your shift"}
                        </p>
                        <p className="mt-0.5 text-[11px] text-altair-ink-on-paper-muted md:hidden">
                          In {formatDateTime(entry.clockInAt)}
                        </p>
                      </div>

                      <p className="hidden text-sm text-altair-ink-on-paper-secondary md:block">
                        {formatDateTime(entry.clockInAt)}
                      </p>

                      <p className="text-sm text-altair-ink-on-paper-secondary">
                        <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-altair-ink-on-paper-muted md:hidden">
                          Out
                        </span>
                        {entry.clockOutAt
                          ? formatDateTime(entry.clockOutAt)
                          : "—"}
                      </p>

                      <p className="text-sm font-semibold tabular-nums text-altair-ink-on-paper">
                        <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-altair-ink-on-paper-muted md:hidden">
                          Duration
                        </span>
                        {formatShiftDuration(entry, now)}
                      </p>

                      <div>
                        <StatusPill tone={rowStatus.tone} size="sm">
                          {rowStatus.label}
                        </StatusPill>
                      </div>

                      <div>
                        {showCorrect ? (
                          <button
                            type="button"
                            onClick={() => beginCorrection(entry)}
                            className={`inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-altair-brass/40 ${
                              stale
                                ? "text-altair-danger-foreground hover:bg-altair-danger-surface"
                                : "text-altair-ink-on-paper hover:bg-[var(--surface-tile)]"
                            }`}
                          >
                            {stale
                              ? "Correct missed clock-out"
                              : "Review open shift"}
                          </button>
                        ) : (
                          <span className="hidden text-sm text-altair-ink-on-paper-muted md:inline">
                            —
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      {correctingEntry ? (
        <MobileSheet
          onClose={cancelCorrection}
          closeDisabled={isPending}
          ariaLabelledBy="missed-clock-out-correction-title"
          variant="responsive"
          zIndex={60}
        >
          <MobileSheetPanel maxWidth="md" maxHeight="90" responsiveRounded>
            <MobileSheetHeader
              titleId="missed-clock-out-correction-title"
              title={
                isStaleOpenShift(correctingEntry.clockInAt, now)
                  ? "Correct missed clock-out"
                  : "Review open shift"
              }
              subtitle={`${correctingEntry.userName} · Started ${formatDateTime(correctingEntry.clockInAt)}`}
              onClose={cancelCorrection}
              closeDisabled={isPending}
              safeAreaTop
              icon={
                <MobileSheetHeaderIcon className="bg-altair-danger-surface ring-1 ring-altair-danger/20">
                  <History
                    className="h-4 w-4 text-altair-danger-foreground"
                    aria-hidden="true"
                  />
                </MobileSheetHeaderIcon>
              }
            />

            <MobileSheetBody>
              <div>
                <form
                  id={correctionFormId}
                  className="space-y-4"
                  aria-busy={isPending}
                  onSubmit={(event) => {
                    event.preventDefault();
                    runCorrection(correctingEntry);
                  }}
                >
                  <div className="rounded-lg border border-altair-warning/20 bg-altair-warning-surface px-3 py-2.5 text-sm text-altair-warning-foreground">
                    Use the time the shift actually ended. This correction and
                    its reason will be recorded for payroll review.
                  </div>

                  <label
                    htmlFor="correction-ended-at"
                    className="block text-sm font-semibold text-altair-ink-on-paper"
                  >
                    Actual clock-out time
                    <input
                      id="correction-ended-at"
                      name="endedAt"
                      type="datetime-local"
                      data-mobile-sheet-initial-focus
                      required
                      value={correctionEndedAt}
                      onChange={(event) => {
                        setCorrectionEndedAt(event.target.value);
                        setCorrectionError(null);
                      }}
                      className={`${adminFormInputClass} mt-1.5 [color-scheme:light]`}
                    />
                  </label>

                  <label
                    htmlFor="correction-reason"
                    className="block text-sm font-semibold text-altair-ink-on-paper"
                  >
                    Reason for correction
                    <textarea
                      id="correction-reason"
                      name="reason"
                      required
                      minLength={5}
                      rows={3}
                      value={correctionReason}
                      onChange={(event) => {
                        setCorrectionReason(event.target.value);
                        setCorrectionError(null);
                      }}
                      placeholder="For example: Forgot to clock out after the final appointment"
                      className={`${adminFormInputClass} mt-1.5 min-h-24 resize-y`}
                    />
                  </label>
                  <p className="-mt-2 text-xs text-altair-ink-on-paper-muted">
                    Add at least 5 characters so the adjustment has a clear
                    audit trail.
                  </p>

                  {correctionError ? (
                    <p
                      role="alert"
                      aria-live="assertive"
                      className="rounded-lg border border-altair-danger/20 bg-altair-danger-surface px-3 py-2.5 text-sm text-altair-danger-foreground"
                    >
                      {correctionError}
                    </p>
                  ) : null}
                </form>
              </div>
            </MobileSheetBody>

            <MobileSheetFooter>
              <MobileSheetFooterActions
                onCancel={cancelCorrection}
                submitLabel="Save correction"
                submittingLabel="Saving correction…"
                submitForm={correctionFormId}
                isSubmitting={isPending}
                submitDisabled={
                  !correctionEndedAt || correctionReason.trim().length < 5
                }
                submitClassName="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg bg-altair-danger px-4 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-altair-danger/90 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </MobileSheetFooter>
          </MobileSheetPanel>
        </MobileSheet>
      ) : null}
    </div>
  );
}
