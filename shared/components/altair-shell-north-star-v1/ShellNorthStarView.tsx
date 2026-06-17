import type { ActiveCompanyContext } from "@/lib/database/types";
import { AttentionSystemPanel } from "./AttentionSystemPanel";
import { CockpitSectionBand } from "./CockpitSectionBand";
import { FeatureCoverageNote } from "./FeatureCoverageNote";
import { GrowthPipelinePanel } from "./GrowthPipelinePanel";
import { MoneySystemPanel } from "./MoneySystemPanel";
import { RecommendationsBand } from "./RecommendationsBand";
import { ShellCommandDeck } from "./ShellCommandDeck";
import { ShellConceptBadge } from "./ShellConceptBadge";
import { ShellSidebar } from "./ShellSidebar";
import { ShellTopBar } from "./ShellTopBar";
import { SystemDock } from "./SystemDock";
import { WorkSystemPanel } from "./WorkSystemPanel";
import { shellNorthStarSampleData } from "./sample-data";

type ShellNorthStarViewProps = {
  companyContext: ActiveCompanyContext;
};

export function ShellNorthStarView({ companyContext }: ShellNorthStarViewProps) {
  const data = shellNorthStarSampleData;
  const greeting =
    companyContext.user.email?.split("@")[0] ?? data.dayState.greeting;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-200/80">
      <ShellSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <ShellTopBar companyContext={companyContext} />

        <main className="flex-1 overflow-y-auto bg-[linear-gradient(180deg,rgb(241_245_249)_0%,rgb(248_250_252)_12%,rgb(226_232_240)_100%)]">
          <div className="mx-auto max-w-[90rem] px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
            <div className="flex flex-col gap-5 sm:gap-6 lg:gap-7">
              <ShellConceptBadge />

              <ShellCommandDeck
                dayState={{ ...data.dayState, greeting }}
                signals={data.signals}
                priorityActions={data.priorityActions}
                operatingNodes={data.operatingNodes}
                operatingLinks={data.operatingLinks}
              />

              <CockpitSectionBand
                variant="dark"
                label="Operations zone"
                title="Field systems below the command deck"
                detail="Work · money · attention · growth"
              />

              <WorkSystemPanel
                jobs={data.jobsInMotion}
                technicians={data.technicians}
                health={data.operationalHealth}
              />

              <MoneySystemPanel stages={data.moneyStages} expenseReview={data.expenseReview} />

              <AttentionSystemPanel
                rails={data.attentionRails}
                officeQueue={data.officeQueue}
                notifications={data.notifications}
              />

              <GrowthPipelinePanel stages={data.leadPipeline} />

              <RecommendationsBand
                recommendations={data.recommendations}
                momentum={data.momentum}
              />

              <SystemDock
                health={data.systemStatus.health}
                notifications={data.systemStatus.notifications}
              />

              <FeatureCoverageNote entries={data.featureCoverage} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
