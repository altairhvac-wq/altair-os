import { HorizonDivider } from "@/shared/design-system/signature";
import {
  MasterContentStack,
  MasterPageCanvas,
  MasterShellPage,
} from "@/shared/design-system/shell";
import { AttentionQueueSection } from "./AttentionQueueSection";
import { MoneyWaitingSection } from "./MoneyWaitingSection";
import { NorthStarConceptBadge } from "./NorthStarConceptBadge";
import { OperatingPictureSection } from "./OperatingPictureSection";
import { northStarSampleData } from "./sample-data";
import { SystemStatusSection } from "./SystemStatusSection";
import { TeamMomentumSection } from "./TeamMomentumSection";
import { WorkInMotionSection } from "./WorkInMotionSection";

export function NorthStarDashboardView() {
  const data = northStarSampleData;

  return (
    <MasterShellPage density="default">
      <MasterPageCanvas width="wide">
        <MasterContentStack density="default" className="gap-10 pb-12 sm:gap-12 lg:gap-16 lg:pb-16">
          <header className="flex flex-col gap-4 pt-1">
            <NorthStarConceptBadge />
            <p className="max-w-3xl text-sm leading-relaxed text-slate-500">
              Design exploration for Altair as a premium operations OS — static
              sample data, no production wiring. Compare against the current
              Dashboard at{" "}
              <span className="font-medium text-slate-600">/</span> before any
              backport decisions.
            </p>
          </header>

          <OperatingPictureSection data={data} />

          <HorizonDivider variant="glow" />

          <AttentionQueueSection groups={data.attentionGroups} />

          <HorizonDivider variant="fade" className="opacity-40" />

          <WorkInMotionSection
            jobs={data.jobsInMotion}
            technicians={data.technicians}
          />

          <MoneyWaitingSection lanes={data.moneyLanes} />

          <TeamMomentumSection momentum={data.momentum} />

          <SystemStatusSection
            health={data.systemStatus.health}
            notifications={data.systemStatus.notifications}
          />
        </MasterContentStack>
      </MasterPageCanvas>
    </MasterShellPage>
  );
}
