import { LogIn, LogOut } from "lucide-react";
import type { MockActiveTechnicianSession } from "@/shared/types/time-entry-mock";

type ClockInOutPanelProps = {
  activeSession: MockActiveTechnicianSession | null;
  onClockIn: () => void;
  onClockOut: () => void;
};

export function ClockInOutPanel({
  activeSession,
  onClockIn,
  onClockOut,
}: ClockInOutPanelProps) {
  const isClockedIn = activeSession != null;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex-1">
        <p className="text-sm font-semibold text-slate-900">
          {isClockedIn ? "End your shift" : "Start your shift"}
        </p>
        <p className="mt-0.5 text-xs text-slate-500">
          {isClockedIn
            ? "Clock out when you leave the job site or finish for the day."
            : "Clock in when you arrive on site or begin field work."}
        </p>
      </div>

      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={onClockIn}
          disabled={isClockedIn}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <LogIn className="h-4 w-4" />
          Clock In
        </button>
        <button
          type="button"
          onClick={onClockOut}
          disabled={!isClockedIn}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" />
          Clock Out
        </button>
      </div>
    </div>
  );
}
