import { MasterPageHeader } from "@/shared/design-system/shell";
import {
  signatureHeaderBandClass,
  signatureHeroContentClass,
} from "@/shared/design-system/shell/tokens";
import { HorizonHero } from "@/shared/design-system/signature";
import {
  northStarDispatchTokens as dt,
  northStarListTokens as lt,
} from "@/shared/design-system/north-star/tokens";

type DispatchDashboardHeaderProps = {
  jobCount: number;
  technicianCount: number;
  unassignedCount?: number;
  northStar?: boolean;
};

function DispatchStatPills({
  jobCount,
  technicianCount,
  unassignedCount = 0,
  northStar = false,
}: DispatchDashboardHeaderProps) {
  if (northStar) {
    return (
      <div className="flex shrink-0 flex-wrap items-center gap-1.5 text-[11px] sm:gap-2 sm:text-xs">
        <span className={dt.statPill}>
          <span className="sm:hidden">{jobCount} today</span>
          <span className="hidden sm:inline">{jobCount} scheduled today</span>
        </span>
        <span className={dt.statPill}>
          <span className="sm:hidden">{technicianCount} techs</span>
          <span className="hidden sm:inline">{technicianCount} technicians</span>
        </span>
        {unassignedCount > 0 ? (
          <span className={dt.statPillUnassigned}>
            <span className="sm:hidden">{unassignedCount} unassigned</span>
            <span className="hidden sm:inline">
              {unassignedCount} unassigned
            </span>
          </span>
        ) : null}
      </div>
    );
  }

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
  unassignedCount = 0,
  northStar = false,
}: DispatchDashboardHeaderProps) {
  if (northStar) {
    return (
      <MasterPageHeader
        eyebrow="Mission control"
        title="Dispatch"
        subtitle="Today's field operations command board"
        density="compact"
        surfaceVariant="northStar"
        className={`north-star-dispatch-page-header ${lt.pageHeader}`}
        eyebrowClassName={lt.pageHeaderEyebrow}
        titleClassName={lt.pageHeaderTitle}
        subtitleClassName={lt.pageHeaderSubtitle}
        secondaryAction={
          <DispatchStatPills
            jobCount={jobCount}
            technicianCount={technicianCount}
            unassignedCount={unassignedCount}
            northStar
          />
        }
      />
    );
  }

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
