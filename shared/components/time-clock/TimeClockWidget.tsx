import { Timer } from "lucide-react";
import type { MockActiveTechnicianSession } from "@/shared/types/time-entry-mock";
import { ClockInOutPanel } from "./ClockInOutPanel";
import { TechnicianTimeCard } from "./TechnicianTimeCard";

type TimeClockWidgetProps = {
  activeSession: MockActiveTechnicianSession | null;
  onClockIn: () => void;
  onClockOut: () => void;
};

export function TimeClockWidget({
  activeSession,
  onClockIn,
  onClockOut,
}: TimeClockWidgetProps) {
  return (
    <div className="shrink-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-50">
          <Timer className="h-4 w-4 text-cyan-600" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900">Time clock</h2>
          <p className="text-xs text-slate-500">
            Track field hours and job-linked sessions
          </p>
        </div>
      </div>

      {activeSession ? (
        <div className="mb-4">
          <TechnicianTimeCard session={activeSession} />
        </div>
      ) : (
        <div className="mb-4 rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center">
          <p className="text-sm font-medium text-slate-700">Not clocked in</p>
          <p className="mt-1 text-xs text-slate-500">
            No active technician session. Clock in to start tracking time.
          </p>
        </div>
      )}

      <ClockInOutPanel
        activeSession={activeSession}
        onClockIn={onClockIn}
        onClockOut={onClockOut}
      />
    </div>
  );
}
