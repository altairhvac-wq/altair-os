"use client";

import Link from "next/link";
import { Clock, Coffee } from "lucide-react";
import type { TechnicianTimeStateSnapshot } from "@/shared/types/time-entry";
import { formatTechnicianTimeState } from "@/shared/types/time-entry";

type TechnicianClockStatusBannerProps = {
  timeState: TechnicianTimeStateSnapshot;
};

export function TechnicianClockStatusBanner({
  timeState,
}: TechnicianClockStatusBannerProps) {
  if (timeState.state === "clocked_in" || timeState.state === "working_job") {
    return null;
  }

  const isOnBreak = timeState.state === "on_break";

  return (
    <Link
      href="/tech/time"
      className={`flex min-h-11 items-center gap-3 rounded-xl px-3.5 py-2.5 shadow-sm ring-1 transition-colors ${
        isOnBreak
          ? "bg-amber-50 ring-amber-200 hover:bg-amber-100/80"
          : "bg-slate-50 ring-slate-200 hover:bg-slate-100/80"
      }`}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
          isOnBreak ? "bg-amber-100 text-amber-700" : "bg-slate-200 text-slate-600"
        }`}
      >
        {isOnBreak ? (
          <Coffee className="h-4 w-4" />
        ) : (
          <Clock className="h-4 w-4" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900">
          {formatTechnicianTimeState(timeState.state)}
        </p>
        <p className="text-xs text-slate-500">
          {isOnBreak
            ? "End break to start job work timers."
            : "Clock in to track job labor time."}
        </p>
      </div>
      <span className="shrink-0 text-xs font-semibold text-cyan-700">
        Time →
      </span>
    </Link>
  );
}
