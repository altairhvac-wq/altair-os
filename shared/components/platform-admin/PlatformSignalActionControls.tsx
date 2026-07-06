"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  markPlatformSignalContactedAction,
  reopenPlatformSignalAction,
  resolvePlatformSignalAction,
  snoozePlatformSignalAction,
  updatePlatformSignalNoteAction,
  type PlatformFounderSignalSnoozeDays,
} from "@/app/actions/platform-founder-signals";
import type { PlatformPrioritySignal } from "@/shared/types/platform-admin";
import { CheckCircle2, Clock, MessageSquare, RotateCcw } from "lucide-react";

type PlatformSignalActionControlsProps = {
  signal: PlatformPrioritySignal;
  compact?: boolean;
  northStar?: boolean;
};

const SNOOZE_OPTIONS: PlatformFounderSignalSnoozeDays[] = [1, 3, 7];

function actionStatusLabel(status: string): string {
  switch (status) {
    case "contacted":
      return "Contacted";
    case "snoozed":
      return "Snoozed";
    case "resolved":
      return "Resolved";
    default:
      return "Open";
  }
}

function actionStatusClass(status: string, northStar: boolean): string {
  if (northStar) {
    switch (status) {
      case "contacted":
        return "bg-[rgba(22,101,52,0.1)] text-[#166534] ring-[rgba(22,101,52,0.16)]";
      case "snoozed":
        return "bg-[rgba(100,116,139,0.1)] text-[#475569] ring-[rgba(100,116,139,0.16)]";
      case "resolved":
        return "bg-[rgba(100,116,139,0.08)] text-[#64748B] ring-[rgba(100,116,139,0.12)]";
      default:
        return "bg-[rgba(138,99,36,0.1)] text-[#8A6324] ring-[rgba(138,99,36,0.16)]";
    }
  }

  switch (status) {
    case "contacted":
      return "bg-emerald-50 text-emerald-800 ring-emerald-600/10";
    case "snoozed":
      return "bg-slate-100 text-slate-600 ring-slate-600/10";
    case "resolved":
      return "bg-slate-100 text-slate-500 ring-slate-600/10";
    default:
      return "bg-cyan-50 text-cyan-800 ring-cyan-600/10";
  }
}

function buildPayload(signal: PlatformPrioritySignal) {
  return {
    signalKey: signal.signalKey!,
    signalKind: signal.kind,
    signalTitleSnapshot: signal.title,
    companyId: signal.companyId ?? null,
    companyNameSnapshot: signal.companyName ?? null,
    fingerprint: signal.fingerprint ?? "v1",
  };
}

export function PlatformSignalActionControls({
  signal,
  compact = false,
  northStar = false,
}: PlatformSignalActionControlsProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState(signal.founderAction?.note ?? "");
  const [snoozeOpen, setSnoozeOpen] = useState(false);

  if (!signal.supportsFounderActions || !signal.signalKey) {
    return null;
  }

  const payload = buildPayload(signal);
  const founderAction = signal.founderAction;
  const notePreview = founderAction?.note?.trim();

  function runAction(action: () => Promise<{ error?: string; success?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        setError(result.error);
      } else {
        setSnoozeOpen(false);
      }
    });
  }

  const buttonClass = compact
    ? northStar
      ? "inline-flex min-h-8 items-center gap-1 rounded-lg border border-[rgba(138,99,36,0.2)] bg-white px-2 py-1 text-[11px] font-semibold text-[#4F4638] hover:bg-[#F3EBDD] disabled:opacity-50"
      : "inline-flex min-h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
    : northStar
      ? "inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[rgba(138,99,36,0.2)] bg-white px-3 py-1.5 text-xs font-semibold text-[#4F4638] hover:bg-[#F3EBDD] disabled:opacity-50"
      : "inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50";

  return (
    <div
      className="mt-2 space-y-2"
      onClick={(event) => event.preventDefault()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <div className="flex flex-wrap items-center gap-2">
        {founderAction ? (
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${actionStatusClass(founderAction.status, northStar)}`}
          >
            {actionStatusLabel(founderAction.status)}
          </span>
        ) : null}

        {founderAction?.status === "resolved" ? (
          <button
            type="button"
            className={buttonClass}
            disabled={isPending}
            onClick={() => runAction(() => reopenPlatformSignalAction(payload.signalKey))}
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Reopen
          </button>
        ) : (
          <>
            <button
              type="button"
              className={buttonClass}
              disabled={isPending}
              onClick={() =>
                runAction(() =>
                  markPlatformSignalContactedAction({ ...payload, note: note.trim() || null }),
                )
              }
            >
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              Contacted
            </button>

            <div className="relative">
              <button
                type="button"
                className={buttonClass}
                disabled={isPending}
                onClick={() => setSnoozeOpen((open) => !open)}
              >
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                Snooze
              </button>
              {snoozeOpen ? (
                <div
                  className={
                    northStar
                      ? "absolute left-0 top-full z-10 mt-1 flex gap-1 rounded-lg border border-[rgba(138,99,36,0.2)] bg-white p-1 shadow-sm"
                      : "absolute left-0 top-full z-10 mt-1 flex gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm"
                  }
                >
                  {SNOOZE_OPTIONS.map((days) => (
                    <button
                      key={days}
                      type="button"
                      className={
                        northStar
                          ? "rounded-md px-2 py-1 text-[11px] font-semibold text-[#4F4638] hover:bg-[#F3EBDD]"
                          : "rounded-md px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                      }
                      disabled={isPending}
                      onClick={() =>
                        runAction(() =>
                          snoozePlatformSignalAction({
                            ...payload,
                            days,
                            note: note.trim() || null,
                          }),
                        )
                      }
                    >
                      {days}d
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              className={buttonClass}
              disabled={isPending}
              onClick={() =>
                runAction(() =>
                  resolvePlatformSignalAction({ ...payload, note: note.trim() || null }),
                )
              }
            >
              Resolve
            </button>
          </>
        )}

        <button
          type="button"
          className={buttonClass}
          disabled={isPending}
          onClick={() => setNoteOpen((open) => !open)}
        >
          <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
          Note
        </button>

        {!compact ? (
          <Link href={signal.href} className={buttonClass}>
            Open
          </Link>
        ) : null}
      </div>

      {notePreview && !noteOpen ? (
        <p
          className={
            northStar
              ? "text-[11px] leading-snug text-[#6B6255]"
              : "text-[11px] leading-snug text-slate-500"
          }
        >
          Note: {notePreview}
        </p>
      ) : null}

      {noteOpen ? (
        <div className="space-y-2">
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={2}
            maxLength={2000}
            placeholder="Founder note — what you did or plan to follow up on"
            className={
              northStar
                ? "w-full rounded-lg border border-[rgba(138,99,36,0.2)] bg-white px-3 py-2 text-xs text-[#17130E] placeholder:text-[#8A6324]/60"
                : "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400"
            }
          />
          <button
            type="button"
            className={buttonClass}
            disabled={isPending}
            onClick={() =>
              runAction(() =>
                updatePlatformSignalNoteAction({ ...payload, note: note.trim() || null }),
              )
            }
          >
            Save note
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="text-[11px] font-medium text-red-600">{error}</p>
      ) : null}
    </div>
  );
}

export function PlatformSignalActionBadge({
  signal,
  northStar = false,
}: {
  signal: PlatformPrioritySignal;
  northStar?: boolean;
}) {
  if (!signal.founderAction) {
    return null;
  }

  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${actionStatusClass(signal.founderAction.status, northStar)}`}
    >
      {actionStatusLabel(signal.founderAction.status)}
    </span>
  );
}
