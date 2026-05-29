"use client";

import { LogIn, LogOut, Timer } from "lucide-react";

export type MobileTimeClockToggleAction = "clock_in" | "clock_out";

type MobileTimeClockBannerProps = {
  statusLine: string;
  todayHoursLabel: string;
  toggleAction: MobileTimeClockToggleAction | null;
  isPending: boolean;
  error?: string | null;
  onToggle?: () => void;
};

export function MobileTimeClockBanner({
  statusLine,
  todayHoursLabel,
  toggleAction,
  isPending,
  error,
  onToggle,
}: MobileTimeClockBannerProps) {
  const isClockOut = toggleAction === "clock_out";

  return (
    <section className="rounded-xl bg-white px-3.5 py-3 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-50">
          <Timer className="h-4 w-4 text-cyan-600" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900">Time Clock</p>
          <p className="mt-0.5 text-sm text-slate-600">
            {statusLine}
            <span className="text-slate-400"> · </span>
            <span className="tabular-nums">Today: {todayHoursLabel}</span>
          </p>
        </div>
      </div>

      {error ? (
        <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-xs text-red-700">
          {error}
        </p>
      ) : null}

      {toggleAction && onToggle ? (
        <button
          type="button"
          onClick={onToggle}
          disabled={isPending}
          className={`mt-3 inline-flex min-h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            isClockOut
              ? "bg-slate-900 hover:bg-slate-800"
              : "bg-emerald-600 hover:bg-emerald-700"
          }`}
        >
          {isClockOut ? (
            <LogOut className="h-4 w-4" aria-hidden />
          ) : (
            <LogIn className="h-4 w-4" aria-hidden />
          )}
          {isPending ? "Please wait…" : isClockOut ? "Clock Out" : "Clock In"}
        </button>
      ) : null}
    </section>
  );
}
