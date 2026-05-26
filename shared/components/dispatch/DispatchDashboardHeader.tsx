import { Radio } from "lucide-react";

type DispatchDashboardHeaderProps = {
  jobCount: number;
  technicianCount: number;
};

export function DispatchDashboardHeader({
  jobCount,
  technicianCount,
}: DispatchDashboardHeaderProps) {
  return (
    <div className="flex shrink-0 flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-black tracking-tight text-slate-900">
          Dispatch
        </h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Today&apos;s field operations command center
        </p>
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span className="rounded-full bg-white px-3 py-1.5 font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200/80">
          {jobCount} scheduled today
        </span>
        <span className="rounded-full bg-white px-3 py-1.5 font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200/80">
          {technicianCount} technicians
        </span>
      </div>
    </div>
  );
}
