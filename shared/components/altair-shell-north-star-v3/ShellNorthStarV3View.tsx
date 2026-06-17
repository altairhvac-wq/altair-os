import type { ActiveCompanyContext } from "@/lib/database/types";
import { BrassMissionHero } from "./BrassMissionHero";
import { GraphiteSidebar } from "./GraphiteSidebar";
import { GraphiteTopBar } from "./GraphiteTopBar";
import { IvoryOperatingBoard } from "./IvoryOperatingBoard";
import { SupportingBands } from "./SupportingBands";
import { V3ConceptBadge } from "./V3ConceptBadge";
import { v3SampleData } from "./sample-data";
import {
  v3CanvasClass,
  v3CanvasGlowPrimaryClass,
  v3CanvasGlowSecondaryClass,
  v3RootClass,
} from "./v3-tokens";

type ShellNorthStarV3ViewProps = {
  companyContext: ActiveCompanyContext;
};

export function ShellNorthStarV3View({ companyContext }: ShellNorthStarV3ViewProps) {
  const data = v3SampleData;
  const topPriority = data.priorityActions[0];
  const secondaryActions = data.priorityActions.slice(1);

  return (
    <div className={`flex h-screen overflow-hidden ${v3RootClass}`}>
      <GraphiteSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <GraphiteTopBar companyContext={companyContext} dateLabel={data.dayState.dateLabel} />

        <main className={v3CanvasClass}>
          <div aria-hidden="true" className={v3CanvasGlowPrimaryClass} />
          <div aria-hidden="true" className={v3CanvasGlowSecondaryClass} />

          <div className="relative mx-auto max-w-[92rem] px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
            <div className="flex flex-col gap-4 lg:gap-5">
              <V3ConceptBadge />

              <BrassMissionHero
                dayState={data.dayState}
                signals={data.signals}
                topPriority={topPriority}
                secondaryActions={secondaryActions}
                insight={data.insight}
              />

              <IvoryOperatingBoard
                actionQueue={data.actionQueue}
                officeQueue={data.officeQueue}
                jobs={data.jobsInMotion}
                technicians={data.technicians}
                moneyStages={data.moneyStages}
                expenseReview={data.expenseReview}
                leadOpportunity={data.leadOpportunity}
                connections={data.systemConnections}
              />

              <SupportingBands
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
