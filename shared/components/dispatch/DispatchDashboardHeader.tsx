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
    <div className="flex min-w-0 max-w-full shrink-0 flex-wrap items-center justify-between gap-2 sm:items-end sm:gap-3">
      <div className="min-w-0">
        <h1 className="text-lg font-black tracking-tight text-slate-900 sm:text-xl">
          Dispatch
        </h1>
        <p className="mt-0.5 hidden text-sm text-slate-500 sm:block">
          Today&apos;s field operations command center
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-1.5 text-[11px] text-slate-500 sm:gap-2 sm:text-xs">
        <span className="rounded-full bg-white px-2 py-1 font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200/80 sm:px-3 sm:py-1.5">
          <span className="sm:hidden">{jobCount} today</span>
          <span className="hidden sm:inline">{jobCount} scheduled today</span>
        </span>
        <span className="rounded-full bg-white px-2 py-1 font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200/80 sm:px-3 sm:py-1.5">
          <span className="sm:hidden">{technicianCount} techs</span>
          <span className="hidden sm:inline">{technicianCount} technicians</span>
        </span>
      </div>
    </div>
  );
}
