import { MasterPageHeader } from "@/shared/design-system/shell";

type DispatchDashboardHeaderProps = {
  jobCount: number;
  technicianCount: number;
};

function DispatchStatPills({
  jobCount,
  technicianCount,
}: DispatchDashboardHeaderProps) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-1.5 text-[11px] text-slate-500 sm:gap-2 sm:text-xs">
      <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold tabular-nums text-slate-700 shadow-sm ring-1 ring-slate-200/80 sm:px-3 sm:py-1.5 sm:text-xs">
        <span className="sm:hidden">{jobCount} today</span>
        <span className="hidden sm:inline">{jobCount} scheduled today</span>
      </span>
      <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold tabular-nums text-slate-700 shadow-sm ring-1 ring-slate-200/80 sm:px-3 sm:py-1.5 sm:text-xs">
        <span className="sm:hidden">{technicianCount} techs</span>
        <span className="hidden sm:inline">{technicianCount} technicians</span>
      </span>
    </div>
  );
}

export function DispatchDashboardHeader({
  jobCount,
  technicianCount,
}: DispatchDashboardHeaderProps) {
  return (
    <MasterPageHeader
      title="Dispatch"
      subtitle="Today's field operations command center"
      secondaryAction={
        <DispatchStatPills
          jobCount={jobCount}
          technicianCount={technicianCount}
        />
      }
      className="flex-wrap items-center gap-2 sm:items-end sm:gap-3 [&_p.admin-text-helper]:mt-0.5 [&_p.admin-text-helper]:hidden [&_p.admin-text-helper]:sm:block [&_p.admin-text-helper]:sm:text-sm [&_h1.admin-heading-page]:sm:text-xl"
    />
  );
}
