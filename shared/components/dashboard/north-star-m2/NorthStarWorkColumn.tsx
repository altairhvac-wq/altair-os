"use client";

import Link from "next/link";
import { Truck, Users } from "lucide-react";
import { northStarTokens as t } from "@/shared/design-system/north-star/tokens";
import type { NorthStarBoardWorkContent } from "@/shared/lib/dashboard-north-star-board";
import type { DashboardData } from "@/shared/types/dashboard";
import { NorthStarBoardRow } from "./NorthStarBoardRow";

type NorthStarWorkColumnProps = {
  content: NorthStarBoardWorkContent;
  data: DashboardData;
};

function dispatchPressureTone(
  severity: NonNullable<NorthStarBoardWorkContent["dispatchPressure"]>["severity"],
): string {
  switch (severity) {
    case "critical":
      return "bg-red-500";
    case "warning":
      return "bg-amber-500";
    default:
      return "bg-emerald-500";
  }
}

export function NorthStarWorkColumn({ content, data }: NorthStarWorkColumnProps) {
  const hasWork =
    content.jobRows.length > 0 ||
    content.unassignedRow !== null ||
    content.dispatchPressure?.severity !== "healthy";

  return (
    <div
      className={`relative flex flex-col gap-4 border-t ${t.columnDivider} p-4 sm:p-5 lg:border-t-0 lg:p-6 lg:px-7 ${t.columnWell}`}
    >
      <div aria-hidden="true" className={t.columnRail} />
      <div className={t.columnHeader}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-slate-600" aria-hidden="true" />
              <p className={t.lightCardLabel}>Work</p>
            </div>
            <h3 className={`mt-1 ${t.workspaceSubheading}`}>Today&apos;s field work</h3>
            <p className={t.lightSurfaceMuted}>{content.summary}</p>
          </div>
          <Link href={content.dispatchHref} className={`shrink-0 ${t.link}`}>
            Dispatch
          </Link>
        </div>
      </div>

      {content.dispatchPressure &&
      content.dispatchPressure.severity !== "healthy" ? (
        <Link href={content.dispatchPressure.href} className="block">
          <div className={t.row}>
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${dispatchPressureTone(content.dispatchPressure.severity)}`}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className={`truncate ${t.lightCardValue}`}>
                {content.dispatchPressure.label}
              </p>
              <p className={`mt-0.5 truncate ${t.lightCardMeta}`}>
                {content.dispatchPressure.meta}
              </p>
            </div>
          </div>
        </Link>
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {content.statusMetrics.map((metric) => (
          <div
            key={metric.label}
            className={`rounded-lg border border-slate-200/85 bg-[#FAF9F6] px-2.5 py-2 text-center shadow-[0_2px_6px_rgba(0,0,0,0.10)]`}
          >
            <p className={`text-base font-bold tabular-nums ${t.workspaceSubheading}`}>
              {metric.value}
            </p>
            <p className={t.lightCardMeta}>{metric.label}</p>
          </div>
        ))}
      </div>

      {content.unassignedRow ? (
        <NorthStarBoardRow row={content.unassignedRow} data={data} />
      ) : null}

      {content.jobRows.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {content.jobRows.map((job) => (
            <li key={job.id}>
              <Link href={job.href} className="block">
                <div className={`flex items-center gap-3 ${t.row}`}>
                  <span
                    className={`w-10 shrink-0 tabular-nums ${t.lightSurfaceSecondary} font-semibold`}
                  >
                    {job.time}
                  </span>
                  <span className="h-2 w-2 shrink-0 rounded-full bg-slate-400" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className={`truncate ${t.lightCardValue}`}>{job.customer}</p>
                    <p className={`truncate ${t.lightCardMeta}`}>{job.detail}</p>
                  </div>
                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    {job.status}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : !hasWork ? (
        <p className={`rounded-lg border border-dashed border-slate-300/80 px-3.5 py-4 text-center ${t.lightSurfaceMuted}`}>
          {content.emptyMessage}
        </p>
      ) : null}

      {content.remainingJobCount > 0 ? (
        <Link href={content.dispatchHref} className={`text-xs font-semibold ${t.link}`}>
          +{content.remainingJobCount} more on dispatch board
        </Link>
      ) : null}

      {content.technicians.length > 0 ? (
        <div className={`mt-auto border-t ${t.columnDivider} pt-3`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
              <p className={t.eyebrowLight}>Crew load</p>
            </div>
            <Link href={content.timeHref} className={t.link}>
              Time
            </Link>
          </div>
          <ul className="mt-2 grid grid-cols-2 gap-2">
            {content.technicians.map((tech) => (
              <li
                key={tech.id}
                className={`flex items-center gap-2 ${t.surfaceInset} bg-gradient-to-r from-slate-50 to-white ring-1 ring-slate-200`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[9px] font-semibold ${t.workspaceSubheading} ${t.techAvatarBg}`}
                >
                  {tech.initials}
                </span>
                <div className="min-w-0">
                  <p className={`truncate text-[11px] font-semibold ${t.lightSurfaceText}`}>
                    {tech.name}
                  </p>
                  <p className={`truncate ${t.lightCardMeta}`}>{tech.jobLabel}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
