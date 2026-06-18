"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { DollarSign, Receipt, Target } from "lucide-react";
import { northStarTokens as t } from "@/shared/design-system/north-star/tokens";
import type { NorthStarBoardMoneyContent } from "@/shared/lib/dashboard-north-star-board";
import type { DashboardData } from "@/shared/types/dashboard";
import { NorthStarBoardRow } from "./NorthStarBoardRow";

type NorthStarMoneyColumnProps = {
  content: NorthStarBoardMoneyContent;
  data: DashboardData;
};

function InsetCard({
  inset,
  accentBorder = false,
  icon,
}: {
  inset: NonNullable<NorthStarBoardMoneyContent["expenseInset"]>;
  accentBorder?: boolean;
  icon: ReactNode;
}) {
  const body = (
    <div className={`${accentBorder ? `border-l-2 ${t.moneyLeadBorder} ` : ""}${t.surfaceInset}`}>
      <div className="flex items-center gap-1.5">
        {icon}
        <span className={t.lightCardLabel}>{inset.label}</span>
      </div>
      <p className={`mt-1 text-base font-bold tabular-nums ${t.workspaceSubheading}`}>
        {inset.amount}
      </p>
      <p className={t.lightCardMeta}>{inset.meta}</p>
    </div>
  );

  if (inset.href) {
    return (
      <Link href={inset.href} className="block transition-opacity hover:opacity-90">
        {body}
      </Link>
    );
  }

  return body;
}

export function NorthStarMoneyColumn({ content, data }: NorthStarMoneyColumnProps) {
  const hasRows = content.rows.length > 0;
  const hasInsets = content.expenseInset || content.leadOpportunityInset;
  const showEmpty = !hasRows && !hasInsets;

  return (
    <div
      className={`relative flex flex-col gap-4 border-t ${t.columnDivider} p-4 sm:p-5 lg:border-t-0 lg:p-6 lg:pl-7 ${t.columnWell}`}
    >
      <div className={t.columnHeader}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-amber-700" aria-hidden="true" />
              <p className={t.lightCardLabel}>Money</p>
            </div>
            <h3 className={`mt-1 ${t.workspaceSubheading}`}>Billing pressure</h3>
            <p className={t.lightSurfaceMuted}>
              Receivables, collections, and review queues
            </p>
          </div>
          <Link href={content.billingHref} className={`shrink-0 ${t.link}`}>
            Billing
          </Link>
        </div>
      </div>

      {hasRows ? (
        <div className="flex flex-col gap-2">
          {content.rows.map((row) => (
            <NorthStarBoardRow key={row.id} row={row} data={data} variant="money" />
          ))}
        </div>
      ) : showEmpty ? (
        <p className={`rounded-lg border border-dashed border-slate-300/80 px-3.5 py-4 text-center ${t.lightSurfaceMuted}`}>
          {content.emptyMessage}
        </p>
      ) : null}

      {hasInsets ? (
        <div
          className={`mt-auto grid gap-2 border-t ${t.columnDivider} pt-3 ${
            content.expenseInset && content.leadOpportunityInset
              ? "grid-cols-2"
              : "grid-cols-1"
          }`}
        >
          {content.expenseInset ? (
            <InsetCard
              inset={content.expenseInset}
              icon={<Receipt className={`h-3.5 w-3.5 ${t.intelligenceAccent}`} aria-hidden="true" />}
            />
          ) : null}
          {content.leadOpportunityInset ? (
            <InsetCard
              inset={content.leadOpportunityInset}
              accentBorder
              icon={
                <Target className={`h-3.5 w-3.5 ${t.intelligenceAccent}`} aria-hidden="true" />
              }
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
