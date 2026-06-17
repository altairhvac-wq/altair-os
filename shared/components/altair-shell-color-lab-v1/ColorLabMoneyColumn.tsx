"use client";

import Link from "next/link";
import { DollarSign, Receipt, Target } from "lucide-react";
import type { MoneyStage } from "@/shared/components/dashboard/north-star-v2/sample-data";
import { usePaletteTokens } from "./palette-context";

const stageEmphasisStyles = {
  positive: "from-emerald-500 to-emerald-600",
  neutral: "from-slate-400 to-slate-500",
  attention: "from-amber-500 to-amber-600",
} as const;

type ColorLabMoneyColumnProps = {
  moneyStages: MoneyStage[];
  expenseReview: { pendingCount: number; pendingTotal: string };
  leadOpportunity: { label: string; value: string; detail: string };
};

export function ColorLabMoneyColumn({
  moneyStages,
  expenseReview,
  leadOpportunity,
}: ColorLabMoneyColumnProps) {
  const t = usePaletteTokens();

  return (
    <div className={`relative flex flex-col gap-4 border-t ${t.columnDivider} p-4 sm:p-5 lg:border-t-0 lg:p-6 lg:pl-7 ${t.columnWell}`}>
      <div className={t.columnHeader}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-amber-700" aria-hidden="true" />
              <p className={t.eyebrowLight}>Money waiting</p>
            </div>
            <h3 className={`mt-1 ${t.workspaceSubheading}`}>Completed work → cash</h3>
            <p className={`text-xs ${t.meta}`}>Invoice pipeline · what crews earned today</p>
          </div>
          <Link href="/invoices" className={`shrink-0 ${t.link}`}>
            Billing
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {moneyStages.map((stage) => {
          const emphasis = stage.emphasis ?? "neutral";
          return (
            <Link key={stage.id} href="/invoices" className={`group flex items-center gap-3 ${t.row}`}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-sm font-semibold ${t.bodyPrimary} group-hover:opacity-90`}>
                    {stage.label}
                  </span>
                  <span className={`text-sm font-bold tabular-nums ${t.workspaceSubheading}`}>
                    {stage.amount}
                  </span>
                </div>
                <div className={`mt-1.5 h-1 overflow-hidden rounded-full ${t.moneyTrack}`}>
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${stageEmphasisStyles[emphasis as keyof typeof stageEmphasisStyles] ?? stageEmphasisStyles.neutral}`}
                    style={{ width: `${stage.fill}%` }}
                  />
                </div>
                <p className={`mt-0.5 text-[10px] ${t.meta}`}>{stage.detail}</p>
              </div>
            </Link>
          );
        })}
      </div>

      <div className={`mt-auto grid grid-cols-2 gap-2 border-t ${t.columnDivider} pt-3`}>
        <Link
          href="/expenses"
          className={`group block ${t.surfaceInset} transition-all hover:opacity-95`}
        >
          <div className="flex items-center gap-1.5">
            <Receipt className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            <span className={t.labelMuted}>Parts & expenses</span>
          </div>
          <p className={`mt-1 text-base font-bold tabular-nums ${t.workspaceSubheading}`}>
            {expenseReview.pendingTotal}
          </p>
          <p className={`text-[10px] ${t.meta}`}>{expenseReview.pendingCount} to review</p>
        </Link>

        <Link
          href="/leads"
          className={`group block border-l-2 ${t.moneyLeadBorder} ${t.surfaceInset} transition-all hover:opacity-95`}
        >
          <div className="flex items-center gap-1.5">
            <Target className={`h-3.5 w-3.5 ${t.intelligenceAccent}`} aria-hidden="true" />
            <span className={t.labelMuted}>{leadOpportunity.label}</span>
          </div>
          <p className={`mt-1 text-base font-bold tabular-nums ${t.workspaceSubheading}`}>
            {leadOpportunity.value}
          </p>
          <p className={`text-[10px] ${t.meta}`}>{leadOpportunity.detail}</p>
        </Link>
      </div>
    </div>
  );
}
