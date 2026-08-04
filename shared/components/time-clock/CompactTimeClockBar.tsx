"use client";

import { Loader2, LogIn, LogOut } from "lucide-react";
import {
  altairMcCardClass,
  altairMcCardPadClass,
} from "@/shared/design-system/components";

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
    <section
      className={`${altairMcCardClass} ${altairMcCardPadClass}`}
      aria-busy={isPending}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-altair-ink-on-paper">
            {statusLabel}
          </p>
          {subtext ? (
            <p className="mt-0.5 break-words text-xs leading-5 text-altair-ink-on-paper-muted">
              {subtext}
            </p>
          ) : null}
        </div>

        {toggleAction && onToggle ? (
          <button
            type="button"
            onClick={onToggle}
            disabled={isPending}
            className={`inline-flex min-h-11 w-full shrink-0 touch-manipulation items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-altair-brass/40 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto ${
              isClockOut
                ? "bg-altair-ink-on-paper hover:bg-altair-ink"
                : "bg-altair-success hover:bg-altair-success/90"
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
        <p
          role="alert"
          aria-live="assertive"
          className="mt-3 rounded-lg border border-altair-danger/20 bg-altair-danger-surface px-2.5 py-2 text-xs text-altair-danger-foreground"
        >
          {error}
        </p>
      ) : null}
    </section>
  );
}
