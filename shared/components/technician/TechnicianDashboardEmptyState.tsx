import { CalendarOff } from "lucide-react";

type TechnicianDashboardEmptyStateProps = {
  variant: "no-jobs" | "off-shift";
  onClockIn?: () => void;
};

export function TechnicianDashboardEmptyState({
  variant,
  onClockIn,
}: TechnicianDashboardEmptyStateProps) {
  const isOffShift = variant === "off-shift";

  return (
    <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
        <CalendarOff className="h-8 w-8 text-slate-400" />
      </div>

      <h3 className="mt-5 text-lg font-bold text-slate-900">
        {isOffShift ? "You're off shift" : "No jobs scheduled today"}
      </h3>

      <p className="mx-auto mt-2 max-w-xs text-sm text-slate-500">
        {isOffShift
          ? "Clock in when you are ready to start field work. Assigned jobs will appear here."
          : "You are caught up for now. New dispatch assignments will show up here automatically."}
      </p>

      {isOffShift && onClockIn ? (
        <button
          type="button"
          onClick={onClockIn}
          className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
        >
          Clock In to Start
        </button>
      ) : null}
    </section>
  );
}
