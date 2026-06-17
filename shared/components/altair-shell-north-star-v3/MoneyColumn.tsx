import Link from "next/link";
import { DollarSign, Receipt, Target } from "lucide-react";
import type { MoneyStage } from "@/shared/components/dashboard/north-star-v2/sample-data";
import {
  v3ColumnHeaderClass,
  v3EyebrowLightClass,
  v3LabelMutedClass,
  v3LinkClass,
  v3RowClass,
  v3WorkspaceSubheadingClass,
} from "./v3-tokens";

const stageEmphasisStyles = {
  positive: "from-emerald-500 to-emerald-600",
  neutral: "from-slate-400 to-slate-500",
  attention: "from-amber-500 to-amber-600",
} as const;

type MoneyColumnProps = {
  moneyStages: MoneyStage[];
  expenseReview: { pendingCount: number; pendingTotal: string };
  leadOpportunity: { label: string; value: string; detail: string };
};

export function MoneyColumn({ moneyStages, expenseReview, leadOpportunity }: MoneyColumnProps) {
  return (
    <div className="relative flex flex-col gap-4 border-t border-[rgba(41,34,24,0.10)] p-4 sm:p-5 lg:border-t-0 lg:p-6">
      <div className={v3ColumnHeaderClass}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-amber-700" aria-hidden="true" />
              <p className={v3EyebrowLightClass}>Money waiting</p>
            </div>
            <h3 className={`mt-1 ${v3WorkspaceSubheadingClass}`}>Completed work → cash</h3>
            <p className="text-xs text-[rgba(41,34,24,0.65)]">Invoice pipeline · what crews earned today</p>
          </div>
          <Link href="/invoices" className={`shrink-0 ${v3LinkClass}`}>
            Billing
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {moneyStages.map((stage) => {
          const emphasis = stage.emphasis ?? "neutral";
          return (
            <Link key={stage.id} href="/invoices" className={`group flex items-center gap-3 ${v3RowClass}`}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-[#3D3428] group-hover:text-[#292218]">
                    {stage.label}
                  </span>
                  <span className="text-sm font-bold tabular-nums text-[#292218]">{stage.amount}</span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[#EFEAE2]">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${stageEmphasisStyles[emphasis as keyof typeof stageEmphasisStyles] ?? stageEmphasisStyles.neutral}`}
                    style={{ width: `${stage.fill}%` }}
                  />
                </div>
                <p className="mt-0.5 text-[10px] text-[rgba(41,34,24,0.65)]">{stage.detail}</p>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-auto grid grid-cols-2 gap-2 border-t border-[rgba(41,34,24,0.10)] pt-3">
        <Link
          href="/expenses"
          className="group rounded-xl border border-[rgba(41,34,24,0.10)] bg-[#FBF9F5] p-2.5 shadow-[0_1px_2px_rgba(41,34,24,0.03)] transition-all hover:border-[rgba(41,34,24,0.16)] hover:shadow-[0_2px_6px_rgba(41,34,24,0.05)]"
        >
          <div className="flex items-center gap-1.5">
            <Receipt className="h-3.5 w-3.5 text-[rgba(41,34,24,0.50)]" aria-hidden="true" />
            <span className={v3LabelMutedClass}>Parts & expenses</span>
          </div>
          <p className="mt-1 text-base font-bold tabular-nums text-[#292218]">{expenseReview.pendingTotal}</p>
          <p className="text-[10px] text-[rgba(41,34,24,0.65)]">{expenseReview.pendingCount} to review</p>
        </Link>

        <Link
          href="/leads"
          className="group rounded-xl border border-[rgba(41,34,24,0.10)] bg-[#FBF9F5] p-2.5 shadow-[0_1px_2px_rgba(41,34,24,0.03)] transition-all hover:border-[rgba(184,148,63,0.28)] hover:shadow-[0_2px_6px_rgba(41,34,24,0.05)]"
        >
          <div className="flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5 text-[#6B5A2E]" aria-hidden="true" />
            <span className={v3LabelMutedClass}>{leadOpportunity.label}</span>
          </div>
          <p className="mt-1 text-base font-bold tabular-nums text-[#292218]">{leadOpportunity.value}</p>
          <p className="text-[10px] text-[rgba(41,34,24,0.65)]">{leadOpportunity.detail}</p>
        </Link>
      </div>
    </div>
  );
}
