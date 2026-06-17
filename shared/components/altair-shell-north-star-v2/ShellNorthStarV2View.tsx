import type { ActiveCompanyContext } from "@/lib/database/types";
import { ActionQueueBoard } from "./ActionQueueBoard";
import { ActivityDock } from "./ActivityDock";
import { BusinessPulsePanel } from "./BusinessPulsePanel";
import { CommandCenterHero } from "./CommandCenterHero";
import { IntelligencePanel } from "./IntelligencePanel";
import { MissionConceptBadge } from "./MissionConceptBadge";
import { MissionControlSidebar } from "./MissionControlSidebar";
import { MissionTopBar } from "./MissionTopBar";
import { PriorityCommandGrid } from "./PriorityCommandGrid";
import { RevenueCommandBoard } from "./RevenueCommandBoard";
import { SystemHealthDock } from "./SystemHealthDock";
import { WorkCommandBoard } from "./WorkCommandBoard";
import { missionControlSampleData } from "./sample-data";
import {
  missionRootClass,
  missionCanvasClass,
  missionCanvasGlowPrimaryClass,
  missionCanvasGlowSecondaryClass,
  missionCanvasGlowAccentClass,
} from "./mission-tokens";

type ShellNorthStarV2ViewProps = {
  companyContext: ActiveCompanyContext;
};

export function ShellNorthStarV2View({ companyContext }: ShellNorthStarV2ViewProps) {
  const data = missionControlSampleData;
  const greeting =
    companyContext.user.email?.split("@")[0] ?? data.dayState.greeting;
  const topPriority = data.priorityActions[0];

  return (
    <div className={`flex h-screen overflow-hidden ${missionRootClass}`}>
      <MissionControlSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <MissionTopBar companyContext={companyContext} dateLabel={data.dayState.dateLabel} />

        <main className={missionCanvasClass}>
          <div aria-hidden="true" className={missionCanvasGlowPrimaryClass} />
          <div aria-hidden="true" className={missionCanvasGlowSecondaryClass} />
          <div aria-hidden="true" className={missionCanvasGlowAccentClass} />

          <div className="relative mx-auto max-w-[92rem] px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
            <div className="flex flex-col gap-5 lg:gap-6">
              <MissionConceptBadge />

              {/* PRIMARY — dominant command hero */}
              <CommandCenterHero
                dayState={{ ...data.dayState, greeting }}
                signals={data.signals}
                topPriority={topPriority}
              />

              {/* SECONDARY — priority grid + intelligence sidecar */}
              <div className="grid gap-5 lg:grid-cols-[1fr_22rem] lg:gap-6 xl:grid-cols-[1fr_24rem]">
                <PriorityCommandGrid actions={data.priorityActions} />
                <IntelligencePanel insight={data.insight} momentum={data.momentum} />
              </div>

              {/* SECONDARY — three operating zones, asymmetric */}
              <div className="grid gap-5 lg:grid-cols-12 lg:gap-6">
                <div className="lg:col-span-7">
                  <ActionQueueBoard items={data.actionQueue} officeQueue={data.officeQueue} />
                </div>
                <div className="lg:col-span-5">
                  <RevenueCommandBoard
                    stages={data.moneyStages}
                    expenseReview={data.expenseReview}
                    leadOpportunity={data.leadOpportunity}
                  />
                </div>
              </div>

              <WorkCommandBoard jobs={data.jobsInMotion} technicians={data.technicians} />

              {/* SUPPORTING — pulse band + docks */}
              <BusinessPulsePanel metrics={data.pulseMetrics} />

              <div className="grid gap-5 sm:grid-cols-2 lg:gap-6">
                <ActivityDock activities={data.activities} />
                <SystemHealthDock health={data.systemHealth} />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
