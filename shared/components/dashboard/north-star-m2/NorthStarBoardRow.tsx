"use client";

import Link from "next/link";
import { DashboardQueueActionTrigger } from "@/shared/components/dashboard/DashboardQueueActionTrigger";
import { northStarTokens as t } from "@/shared/design-system/north-star/tokens";
import type { NorthStarBoardRow as NorthStarBoardRowModel } from "@/shared/lib/dashboard-north-star-board";
import type { DashboardData } from "@/shared/types/dashboard";

type NorthStarBoardRowProps = {
  row: NorthStarBoardRowModel;
  data: DashboardData;
  variant?: "action" | "money";
};

function severityDotClass(severity: NorthStarBoardRowModel["severity"]): string {
  switch (severity) {
    case "critical":
      return "bg-red-500";
    case "warning":
      return "bg-amber-500";
    default:
      return "bg-slate-400";
  }
}

function progressBarClass(severity: NorthStarBoardRowModel["severity"]): string {
  switch (severity) {
    case "critical":
      return "bg-gradient-to-r from-red-500 to-red-600";
    case "warning":
      return "bg-gradient-to-r from-amber-500 to-amber-600";
    default:
      return "bg-gradient-to-r from-slate-400 to-slate-500";
  }
}

function ActionRowBody({ row }: { row: NorthStarBoardRowModel }) {
  return (
    <>
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${severityDotClass(row.severity)}`}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className={`truncate ${t.lightCardValue}`}>{row.title}</p>
        <p className={`mt-0.5 truncate ${t.lightCardMeta}`}>{row.meta}</p>
      </div>
      {row.featured ? (
        <span className="shrink-0 rounded-full bg-[rgba(198,167,87,0.16)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#8B7232] ring-1 ring-[rgba(198,167,87,0.28)]">
          Top priority
        </span>
      ) : null}
    </>
  );
}

function MoneyRowBody({ row }: { row: NorthStarBoardRowModel }) {
  const progress = row.progress ?? 0;

  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-center justify-between gap-2">
        <span className={t.lightCardValue}>{row.title}</span>
        {row.amount ? (
          <span className={`text-sm font-bold tabular-nums ${t.workspaceSubheading}`}>
            {row.amount}
          </span>
        ) : null}
      </div>
      {progress > 0 ? (
        <div className={`mt-1.5 h-1 overflow-hidden rounded-full ${t.moneyTrack}`}>
          <div
            className={`h-full rounded-full ${progressBarClass(row.severity)}`}
            style={{ width: `${progress}%` }}
            aria-hidden="true"
          />
        </div>
      ) : null}
      <p className={`mt-0.5 ${t.lightCardMeta}`}>{row.meta}</p>
      {row.featured ? (
        <p className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-[#8B7232]">
          Top priority
        </p>
      ) : null}
    </div>
  );
}

export function NorthStarBoardRow({
  row,
  data,
  variant = "action",
}: NorthStarBoardRowProps) {
  const body =
    variant === "money" ? (
      <MoneyRowBody row={row} />
    ) : (
      <ActionRowBody row={row} />
    );

  const content = <div className={t.row}>{body}</div>;

  if (row.kind === "queue" && row.queueType) {
    return (
      <DashboardQueueActionTrigger
        action={{
          id: row.id,
          label: row.title,
          description: row.meta,
          count: row.count,
          severity: row.severity,
          queueType: row.queueType,
          href: row.href,
        }}
        data={data}
        className="block w-full text-left"
      >
        {content}
      </DashboardQueueActionTrigger>
    );
  }

  if (row.href) {
    return (
      <Link href={row.href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
