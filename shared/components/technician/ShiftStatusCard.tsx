import { LogIn, LogOut, Timer } from "lucide-react";
import type { Technician } from "@/shared/types/dispatch";
import {
  formatShiftStatus,
  type TechnicianShift,
} from "@/shared/types/technician";
import { formatTime } from "@/shared/types/time-entry";

type ShiftStatusCardProps = {
  technician: Technician;
  shift: TechnicianShift;
  onClockIn: () => void;
  onClockOut: () => void;
};

export function ShiftStatusCard({
  technician,
  shift,
  onClockIn,
  onClockOut,
}: ShiftStatusCardProps) {
  const isClockedIn = shift.status === "clocked_in";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-600 text-sm font-bold text-white">
          {technician.initials}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold text-slate-900">
            {technician.name}
          </p>
          <p className="text-sm text-slate-500">{technician.role}</p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
                isClockedIn
                  ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
                  : "bg-slate-100 text-slate-600 ring-slate-500/20"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${isClockedIn ? "bg-emerald-500" : "bg-slate-400"}`}
              />
              {formatShiftStatus(shift.status)}
            </span>

            {isClockedIn && shift.clockInAt ? (
              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                <Timer className="h-3.5 w-3.5" />
                Since {formatTime(shift.clockInAt)}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onClockIn}
          disabled={isClockedIn}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 active:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <LogIn className="h-5 w-5" />
          Clock In
        </button>
        <button
          type="button"
          onClick={onClockOut}
          disabled={!isClockedIn}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 active:bg-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <LogOut className="h-5 w-5" />
          Clock Out
        </button>
      </div>
    </section>
  );
}
