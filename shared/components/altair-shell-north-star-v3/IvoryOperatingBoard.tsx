import { ArrowRight } from "lucide-react";
import type { JobInMotion, MoneyStage, TechnicianPresence } from "@/shared/components/dashboard/north-star-v2/sample-data";
import type { ActionQueueItem, OfficeQueueItem, SystemConnection } from "./sample-data";
import { ActionColumn } from "./ActionColumn";
import { WorkColumn } from "./WorkColumn";
import { MoneyColumn } from "./MoneyColumn";
import {
  v3BoardHeaderClass,
  v3BoardTitleClass,
  v3ConnectionChipClass,
  v3EyebrowBrassClass,
  v3MetaClass,
  v3OperatingBoardClass,
} from "./v3-tokens";

type IvoryOperatingBoardProps = {
  actionQueue: ActionQueueItem[];
  officeQueue: OfficeQueueItem[];
  jobs: JobInMotion[];
  technicians: TechnicianPresence[];
  moneyStages: MoneyStage[];
  expenseReview: { pendingCount: number; pendingTotal: string };
  leadOpportunity: { label: string; value: string; detail: string };
  connections: SystemConnection[];
};

export function IvoryOperatingBoard({
  actionQueue,
  officeQueue,
  jobs,
  technicians,
  moneyStages,
  expenseReview,
  leadOpportunity,
  connections,
}: IvoryOperatingBoardProps) {
  return (
    <section aria-label="Operating board" className={v3OperatingBoardClass}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(184,148,63,0.45)] to-transparent" />

      <div className={v3BoardHeaderClass}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className={v3EyebrowBrassClass}>Operating board</p>
            <h2 className={`mt-1 ${v3BoardTitleClass}`}>Action · Work · Money</h2>
            <p className={`mt-1 max-w-2xl ${v3MetaClass}`}>
              One connected loop — jobs move crews, completed work becomes invoices, overdue AR slows cash.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {connections.map((link) => (
              <div key={link.id} className={v3ConnectionChipClass}>
                <span>{link.from}</span>
                <ArrowRight className="h-3 w-3 text-[#B8943F]" aria-hidden="true" />
                <span>{link.to}</span>
                <span className="hidden text-[rgba(41,34,24,0.45)] sm:inline">· {link.note}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3">
        <ActionColumn actionQueue={actionQueue} officeQueue={officeQueue} />
        <WorkColumn jobs={jobs} technicians={technicians} />
        <MoneyColumn
          moneyStages={moneyStages}
          expenseReview={expenseReview}
          leadOpportunity={leadOpportunity}
        />
      </div>
    </section>
  );
}
