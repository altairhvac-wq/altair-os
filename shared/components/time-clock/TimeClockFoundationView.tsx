"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ArrowLeft, History } from "lucide-react";
import {
  clockInAction,
  clockOutAction,
  correctOpenShiftAction,
} from "@/app/actions/time-clock";
import { CompactTimeClockBar } from "@/shared/components/time-clock/CompactTimeClockBar";
import {
  MasterContentStack,
  MasterPageCanvas,
  MasterPageHeader,
  MasterPageSurface,
  MasterShellPage,
  adminFormInputClass,
  masterPanelHeaderClass,
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
import type { TimeClockEntry } from "@/shared/types/time-clock";
import {
  formatDateTime,
  formatDuration,
  getElapsedMinutes,
} from "@/shared/types/time-clock";

type TimeClockFoundationViewProps = {
  initialOpenEntry: TimeClockEntry | null;
  initialEntries: TimeClockEntry[];
  currentUserId: string;
  currentUserName: string;
  canViewCompanyEntries: boolean;
  canCorrectEntries: boolean;
};

const MISSED_CLOCK_OUT_THRESHOLD_MS = 12 * 60 * 60 * 1000;

function isLikelyMissedClockOut(entry: TimeClockEntry, now: number): boolean {
  return (
    entry.status === "open" &&
    now - Date.parse(entry.clockInAt) >= MISSED_CLOCK_OUT_THRESHOLD_MS
  );
}

export function TimeClockFoundationView({
  initialOpenEntry,
  initialEntries,
  currentUserId,
  currentUserName,
  canViewCompanyEntries,
  canCorrectEntries,
}: TimeClockFoundationViewProps) {
  const [openEntry, setOpenEntry] = useState(initialOpenEntry);
  const [entries, setEntries] = useState(initialEntries);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [now, setNow] = useState(() => Date.now());
  const [correctingEntryId, setCorrectingEntryId] = useState<string | null>(null);
  const [correctionEndedAt, setCorrectionEndedAt] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");
  const [correctionError, setCorrectionError] = useState<string | null>(null);
  const shiftHistoryHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    // Server actions can refresh route props without remounting this client view.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpenEntry(initialOpenEntry);
    setEntries(initialEntries);
  }, [initialEntries, initialOpenEntry]);

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

    const minutes = getElapsedMinutes(openEntry.clockInAt, now);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours === 0) {
      return `${remainingMinutes}m active`;
    }

    return `${hours}h ${remainingMinutes}m active`;
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
        const result = await clockOutAction();
        if (result.error) {
          setError(
            formatActionError(result.error, "Could not clock out. Try again."),
          );
          return;
        }

        if (result.entry) {
          setOpenEntry(null);
          upsertEntry(result.entry);
        }
      } catch {
        setError("Could not clock out. Check your connection and try again.");
      }
    });
  }

  function beginCorrection(entry: TimeClockEntry) {
    const localNow = new Date(
      now - new Date(now).getTimezoneOffset() * 60_000,
    )
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

  return (
    <MasterShellPage density="compact">
      <MasterPageCanvas width="standard">
        <MasterContentStack density="compact">
          <Link
            href="/time"
            className="inline-flex min-h-11 w-fit items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Labor &amp; Payroll
          </Link>

          <MasterPageHeader
            title="Shift clock & exceptions"
            subtitle="Clock in or out for shift exceptions, review open shifts, and correct missed clock-outs. Job labor remains tied to Start work and Complete work."
            density="compact"
          />

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Link
              href="/reports"
              className="inline-flex min-h-11 items-center rounded-lg px-2 font-semibold text-cyan-700 transition-colors hover:bg-white hover:text-cyan-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40"
            >
              Open payroll report
            </Link>
          </div>

          <CompactTimeClockBar
            statusLabel={openEntry ? activeDurationLabel ?? "Clocked in" : "Not clocked in"}
            subtext={
              openEntry
                ? `${currentUserName} · Since ${formatDateTime(openEntry.clockInAt)}`
                : `${currentUserName} · Manual clock in/out for shift exceptions`
            }
            toggleAction={openEntry ? "clock_out" : "clock_in"}
            isPending={isPending}
            error={error}
            onToggle={openEntry ? runClockOut : runClockIn}
          />

          <MasterPageSurface variant="card">
            <div className={masterPanelHeaderClass}>
              <h2
                ref={shiftHistoryHeadingRef}
                tabIndex={-1}
                className="text-sm font-semibold text-slate-900 outline-none"
              >
                Shift history
              </h2>
              <p className="text-xs text-slate-500">
                {canViewCompanyEntries ? "Company shift clock entries" : "Your shift clock entries"} ·{" "}
                {visibleEntries.length} entr{visibleEntries.length === 1 ? "y" : "ies"}
              </p>
            </div>

            {visibleEntries.length === 0 ? (
              <p className="px-4 py-8 text-sm text-slate-500">
                No time entries yet. Clock in to start your first shift.
              </p>
            ) : (
              <>
                <ul className="divide-y divide-slate-100 md:hidden">
                  {visibleEntries.map((entry) => (
                    <li key={entry.id} className="space-y-3 px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900">
                            {canViewCompanyEntries
                              ? entry.userName
                              : "Shift entry"}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            Clocked in {formatDateTime(entry.clockInAt)}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            entry.status === "open"
                              ? isLikelyMissedClockOut(entry, now)
                                ? "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200"
                                : "bg-cyan-50 text-cyan-800 ring-1 ring-inset ring-cyan-200"
                              : "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200"
                          }`}
                        >
                          {entry.status === "open" ? "Open" : "Closed"}
                        </span>
                      </div>

                      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl bg-slate-50 px-3 py-3">
                        <div>
                          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            Clock out
                          </dt>
                          <dd className="mt-0.5 text-sm text-slate-800">
                            {entry.clockOutAt
                              ? formatDateTime(entry.clockOutAt)
                              : "Not recorded"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            Duration
                          </dt>
                          <dd className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900">
                            {formatDuration(entry.clockInAt, entry.clockOutAt)}
                          </dd>
                        </div>
                      </dl>

                      {canCorrectEntries && entry.status === "open" ? (
                        <button
                          type="button"
                          onClick={() => beginCorrection(entry)}
                          className={`inline-flex min-h-11 w-full items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 ${
                            isLikelyMissedClockOut(entry, now)
                              ? "border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100 focus-visible:ring-rose-500/30"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-cyan-500/30"
                          }`}
                        >
                          {isLikelyMissedClockOut(entry, now)
                            ? "Correct missed clock-out"
                            : "Review open shift"}
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>

                <div className="hidden overflow-x-auto md:block">
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-white">
                      <tr>
                        {canViewCompanyEntries ? (
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Employee
                          </th>
                        ) : null}
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Clock in
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Clock out
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Duration
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Status
                        </th>
                        {canCorrectEntries ? (
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Review
                          </th>
                        ) : null}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {visibleEntries.map((entry) => (
                        <tr key={entry.id}>
                          {canViewCompanyEntries ? (
                            <td className="px-4 py-3 text-sm font-medium text-slate-900">
                              {entry.userName}
                            </td>
                          ) : null}
                          <td className="px-4 py-3 text-sm text-slate-700">
                            {formatDateTime(entry.clockInAt)}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">
                            {entry.clockOutAt
                              ? formatDateTime(entry.clockOutAt)
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-sm tabular-nums text-slate-700">
                            {formatDuration(entry.clockInAt, entry.clockOutAt)}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">
                            {entry.status === "open" ? "Open" : "Closed"}
                          </td>
                          {canCorrectEntries ? (
                            <td className="px-4 py-3 text-sm">
                              {entry.status === "open" ? (
                                <button
                                  type="button"
                                  onClick={() => beginCorrection(entry)}
                                  className={`inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 ${
                                    isLikelyMissedClockOut(entry, now)
                                      ? "text-rose-700 hover:bg-rose-50 hover:text-rose-800 focus-visible:ring-rose-500/30"
                                      : "text-cyan-700 hover:bg-cyan-50 hover:text-cyan-800 focus-visible:ring-cyan-500/30"
                                  }`}
                                >
                                  {isLikelyMissedClockOut(entry, now)
                                    ? "Correct missed clock-out"
                                    : "Review open shift"}
                                </button>
                              ) : (
                                "—"
                              )}
                            </td>
                          ) : null}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </MasterPageSurface>
        </MasterContentStack>
      </MasterPageCanvas>

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
                isLikelyMissedClockOut(correctingEntry, now)
                  ? "Correct missed clock-out"
                  : "Review open shift"
              }
              subtitle={`${correctingEntry.userName} · Started ${formatDateTime(correctingEntry.clockInAt)}`}
              onClose={cancelCorrection}
              closeDisabled={isPending}
              safeAreaTop
              icon={
                <MobileSheetHeaderIcon className="bg-rose-50 ring-1 ring-rose-200">
                  <History className="h-4 w-4 text-rose-700" aria-hidden="true" />
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
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
                    Use the time the shift actually ended. This correction and
                    its reason will be recorded for payroll review.
                  </div>

                  <label
                    htmlFor="correction-ended-at"
                    className="block text-sm font-semibold text-slate-800"
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
                    className="block text-sm font-semibold text-slate-800"
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
                  <p className="-mt-2 text-xs text-slate-500">
                    Add at least 5 characters so the adjustment has a clear
                    audit trail.
                  </p>

                  {correctionError ? (
                    <p
                      role="alert"
                      aria-live="assertive"
                      className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800"
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
                submitClassName="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-rose-700 px-4 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </MobileSheetFooter>
          </MobileSheetPanel>
        </MobileSheet>
      ) : null}
    </MasterShellPage>
  );
}
