import { ArrowRight } from "lucide-react";
import type { JobInMotion, MoneyStage, TechnicianPresence } from "@/shared/components/dashboard/north-star-v2/sample-data";
import type { ActionQueueItem, OfficeQueueItem, SystemConnection } from "./sample-data";
import { ActionColumn } from "./ActionColumn";
import { WorkColumn } from "./WorkColumn";
import { MoneyColumn } from "./MoneyColumn";
import {
  v3BoardHeaderClass,
  v3EyebrowDarkClass,
  v3OperatingBoardClass,
  v3WorkspaceTitleClass,
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
      <div className={v3BoardHeaderClass}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className={v3EyebrowDarkClass}>Operating board</p>
            <h2 className={`mt-1 ${v3WorkspaceTitleClass}`}>Action · Work · Money — one connected loop</h2>
            <p className="mt-1 max-w-2xl text-xs text-slate-400">
              Jobs move crews. Completed work becomes invoices. Overdue AR slows cash. Everything here affects
              dispatch, billing, and customer follow-through.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {connections.map((link) => (
              <div
                key={link.id}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.04] px-2.5 py-1.5 ring-1 ring-white/[0.08]"
              >
                <span className="text-[10px] font-medium text-slate-300">{link.from}</span>
                <ArrowRight className="h-3 w-3 text-slate-500" aria-hidden="true" />
                <span className="text-[10px] font-medium text-slate-300">{link.to}</span>
                <span className="hidden text-[10px] text-slate-500 sm:inline">· {link.note}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 lg:divide-x lg:divide-[rgba(41,34,24,0.10)]">
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
