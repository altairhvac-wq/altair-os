"use client";

import { ArrowRight } from "lucide-react";
import type { JobInMotion, MoneyStage, TechnicianPresence } from "@/shared/components/dashboard/north-star-v2/sample-data";
import type { ActionQueueItem, OfficeQueueItem, SystemConnection } from "./sample-data";
import { ColorLabActionColumn } from "./ColorLabActionColumn";
import { ColorLabMoneyColumn } from "./ColorLabMoneyColumn";
import { ColorLabWorkColumn } from "./ColorLabWorkColumn";
import { usePaletteTokens } from "./palette-context";

type ColorLabOperatingBoardProps = {
  actionQueue: ActionQueueItem[];
  officeQueue: OfficeQueueItem[];
  jobs: JobInMotion[];
  technicians: TechnicianPresence[];
  moneyStages: MoneyStage[];
  expenseReview: { pendingCount: number; pendingTotal: string };
  leadOpportunity: { label: string; value: string; detail: string };
  connections: SystemConnection[];
};

export function ColorLabOperatingBoard({
  actionQueue,
  officeQueue,
  jobs,
  technicians,
  moneyStages,
  expenseReview,
  leadOpportunity,
  connections,
}: ColorLabOperatingBoardProps) {
  const t = usePaletteTokens();

  return (
    <section aria-label="Operating board" className={t.operatingBoard}>
      <div aria-hidden="true" className={t.boardTopAccent} />

      <div className={t.boardHeader}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className={t.eyebrowAccent}>Operating board</p>
            <h2 className={`mt-1 ${t.boardTitle}`}>Action · Work · Money</h2>
            <p className={`mt-1 max-w-2xl ${t.meta}`}>
              One connected loop — jobs move crews, completed work becomes invoices, overdue AR slows cash.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {connections.map((link) => (
              <div key={link.id} className={t.connectionChip}>
                <span>{link.from}</span>
                <ArrowRight className={t.connectionArrow} aria-hidden="true" />
                <span>{link.to}</span>
                <span className={`hidden ${t.meta} sm:inline`}>· {link.note}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3">
        <ColorLabActionColumn actionQueue={actionQueue} officeQueue={officeQueue} />
        <ColorLabWorkColumn jobs={jobs} technicians={technicians} />
        <ColorLabMoneyColumn
          moneyStages={moneyStages}
          expenseReview={expenseReview}
          leadOpportunity={leadOpportunity}
        />
      </div>
    </section>
  );
}
