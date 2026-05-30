"use client";

import Link from "next/link";
import { Coffee } from "lucide-react";
import type { TechnicianTimeStateSnapshot } from "@/shared/types/time-entry";

type TechnicianClockStatusBannerProps = {
  timeState: TechnicianTimeStateSnapshot;
};

export function TechnicianClockStatusBanner({
  timeState,
}: TechnicianClockStatusBannerProps) {
  if (timeState.state !== "on_break") {
    return null;
  }

  return (
    <Link
      href="/tech/time"
      className="flex min-h-11 items-center gap-3 rounded-xl bg-amber-50 px-3.5 py-2.5 shadow-sm ring-1 ring-amber-200 transition-colors hover:bg-amber-100/80"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
        <Coffee className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900">On break</p>
        <p className="text-xs text-slate-500">
          End your break before starting work on a job.
        </p>
      </div>
      <span className="shrink-0 text-xs font-semibold text-cyan-700">
        Manage →
      </span>
    </Link>
  );
}
