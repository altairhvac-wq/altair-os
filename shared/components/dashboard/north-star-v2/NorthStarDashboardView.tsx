import { MomentumStrip } from "@/shared/design-system/signature";
import {
  MasterPageCanvas,
  MasterShellPage,
} from "@/shared/design-system/shell";
import { AttentionRadar } from "./AttentionRadar";
import { CommandDeck } from "./CommandDeck";
import { MoneyPipeline } from "./MoneyPipeline";
import { NorthStarConceptBadge } from "./NorthStarConceptBadge";
import { northStarV2SampleData } from "./sample-data";
import { SystemStatusDock } from "./SystemStatusDock";
import { TeamPresenceDock } from "./TeamPresenceDock";
import { WorkFlowRail } from "./WorkFlowRail";

export function NorthStarDashboardView() {
  const data = northStarV2SampleData;

  return (
    <MasterShellPage density="default">
      <MasterPageCanvas width="wide" className="pb-8 lg:pb-12">
        <div className="flex flex-col gap-6 pt-1 sm:gap-8 lg:gap-10">
          <NorthStarConceptBadge />

          <CommandDeck
            dayState={data.dayState}
            signals={data.signals}
            priorityActions={data.priorityActions}
            operatingNodes={data.operatingNodes}
            operatingLinks={data.operatingLinks}
          />

          <div className="flex flex-col gap-4 lg:flex-row lg:gap-5">
            <WorkFlowRail jobs={data.jobsInMotion} />
            <TeamPresenceDock technicians={data.technicians} />
          </div>

          <MoneyPipeline stages={data.moneyStages} />

          <AttentionRadar rails={data.attentionRails} />

          <div className="rounded-2xl bg-gradient-to-r from-emerald-50/50 via-white to-sky-50/30 px-4 py-3 ring-1 ring-emerald-100/40 sm:px-5">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700/70">
              Momentum
            </p>
            <MomentumStrip
              items={data.momentum.map((label) => ({ label }))}
              className="[&_span:last-child]:text-slate-600"
            />
          </div>

          <SystemStatusDock
            health={data.systemStatus.health}
            notifications={data.systemStatus.notifications}
          />
        </div>
      </MasterPageCanvas>
    </MasterShellPage>
  );
}
