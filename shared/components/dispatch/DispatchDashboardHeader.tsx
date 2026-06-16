import { MasterPageHeader } from "@/shared/design-system/shell";
import {
  signatureHeaderBandClass,
  signatureHeroContentClass,
} from "@/shared/design-system/shell/tokens";
import { HorizonHero } from "@/shared/design-system/signature";

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
      <span className="rounded-full border border-slate-200/70 bg-white/90 px-2 py-1 text-[11px] font-semibold tabular-nums text-slate-700 shadow-sm sm:px-3 sm:py-1.5 sm:text-xs">
        <span className="sm:hidden">{jobCount} today</span>
        <span className="hidden sm:inline">{jobCount} scheduled today</span>
      </span>
      <span className="rounded-full border border-slate-200/70 bg-white/90 px-2 py-1 text-[11px] font-semibold tabular-nums text-slate-700 shadow-sm sm:px-3 sm:py-1.5 sm:text-xs">
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
    <HorizonHero
      tone="cyan"
      beamTone="cyan"
      beamPosition="left"
      size="compact"
      className={signatureHeaderBandClass}
    >
      <MasterPageHeader
        density="compact"
        title="Dispatch"
        subtitle="Today's field operations command center"
        secondaryAction={
          <DispatchStatPills
            jobCount={jobCount}
            technicianCount={technicianCount}
          />
        }
        className={`!border-0 !bg-transparent !p-0 !shadow-none ${signatureHeroContentClass} rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 [&_h1]:sm:text-xl [&_p]:hidden [&_p]:sm:block`}
      />
    </HorizonHero>
  );
}
