"use client";

import type { ActiveCompanyContext } from "@/lib/database/types";
import { ColorLabConceptBadge } from "./ColorLabConceptBadge";
import { ColorLabMissionHero } from "./ColorLabMissionHero";
import { ColorLabOperatingBoard } from "./ColorLabOperatingBoard";
import { ColorLabSidebar } from "./ColorLabSidebar";
import { ColorLabSupportingBands } from "./ColorLabSupportingBands";
import { ColorLabTopBar } from "./ColorLabTopBar";
import { PaletteProvider } from "./palette-context";
import type { PaletteTokens } from "./palette-tokens";
import { colorLabSampleData } from "./sample-data";

type ColorLabShellPreviewProps = {
  companyContext: ActiveCompanyContext;
  palette: PaletteTokens;
};

export function ColorLabShellPreview({ companyContext, palette }: ColorLabShellPreviewProps) {
  const data = colorLabSampleData;
  const topPriority = data.priorityActions[0];
  const secondaryActions = data.priorityActions.slice(1);

  return (
    <PaletteProvider palette={palette}>
      <div className={`flex h-full overflow-hidden ${palette.root}`}>
        <ColorLabSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <ColorLabTopBar companyContext={companyContext} dateLabel={data.dayState.dateLabel} />

          <main className={palette.canvas}>
            <div aria-hidden="true" className={palette.canvasGlowPrimary} />
            <div aria-hidden="true" className={palette.canvasGlowSecondary} />

            <div className="relative mx-auto max-w-[92rem] px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
              <div className="flex flex-col gap-4 lg:gap-5">
                <ColorLabConceptBadge />

                <ColorLabMissionHero
                  dayState={data.dayState}
                  signals={data.signals}
                  topPriority={topPriority}
                  secondaryActions={secondaryActions}
                  insight={data.insight}
                />

                <ColorLabOperatingBoard
                  actionQueue={data.actionQueue}
                  officeQueue={data.officeQueue}
                  jobs={data.jobsInMotion}
                  technicians={data.technicians}
                  moneyStages={data.moneyStages}
                  expenseReview={data.expenseReview}
                  leadOpportunity={data.leadOpportunity}
                  connections={data.systemConnections}
                />

                <ColorLabSupportingBands
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
    </PaletteProvider>
  );
}
