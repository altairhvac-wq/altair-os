"use client";

import { Loader2, LogIn, LogOut } from "lucide-react";

export type CompactTimeClockToggleAction = "clock_in" | "clock_out";

type CompactTimeClockBarProps = {
  statusLabel: string;
  subtext?: string | null;
  toggleAction: CompactTimeClockToggleAction | null;
  isPending: boolean;
  error?: string | null;
  onToggle?: () => void;
};

export function CompactTimeClockBar({
  statusLabel,
  subtext,
  toggleAction,
  isPending,
  error,
  onToggle,
}: CompactTimeClockBarProps) {
  const isClockOut = toggleAction === "clock_out";

  return (
    <section className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm sm:px-4">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">{statusLabel}</p>
          {subtext ? (
            <p className="mt-0.5 truncate text-xs text-slate-500">{subtext}</p>
          ) : null}
        </div>

        {toggleAction && onToggle ? (
          <button
            type="button"
            onClick={onToggle}
            disabled={isPending}
            className={`inline-flex h-10 shrink-0 touch-manipulation items-center justify-center gap-1.5 rounded-lg px-3.5 text-sm font-semibold text-white shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              isClockOut
                ? "bg-slate-900 hover:bg-slate-800"
                : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Please wait…
              </>
            ) : (
              <>
                {isClockOut ? (
                  <LogOut className="h-4 w-4" aria-hidden />
                ) : (
                  <LogIn className="h-4 w-4" aria-hidden />
                )}
                {isClockOut ? "Clock Out" : "Clock In"}
              </>
            )}
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-xs text-red-700">
          {error}
        </p>
      ) : null}
    </section>
  );
}
