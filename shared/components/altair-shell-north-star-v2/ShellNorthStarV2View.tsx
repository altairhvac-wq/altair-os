import type { ActiveCompanyContext } from "@/lib/database/types";
import { CommandCenterHero } from "./CommandCenterHero";
import { MissionConceptBadge } from "./MissionConceptBadge";
import { MissionControlSidebar } from "./MissionControlSidebar";
import { MissionTopBar } from "./MissionTopBar";
import { OperationsCommandBoard } from "./OperationsCommandBoard";
import { OperationalFooter } from "./OperationalFooter";
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
  const secondaryActions = data.priorityActions.slice(1);

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

              <CommandCenterHero
                dayState={{ ...data.dayState, greeting }}
                signals={data.signals}
                topPriority={topPriority}
                secondaryActions={secondaryActions}
                insight={data.insight}
              />

              <OperationsCommandBoard
                actionQueue={data.actionQueue}
                officeQueue={data.officeQueue}
                jobs={data.jobsInMotion}
                technicians={data.technicians}
                moneyStages={data.moneyStages}
                expenseReview={data.expenseReview}
                leadOpportunity={data.leadOpportunity}
                connections={data.systemConnections}
              />

              <OperationalFooter
                metrics={data.pulseMetrics}
                activities={data.activities}
                health={data.systemHealth}
                momentum={data.momentum}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
