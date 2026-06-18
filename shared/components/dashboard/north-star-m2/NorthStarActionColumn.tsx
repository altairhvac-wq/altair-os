"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { northStarTokens as t } from "@/shared/design-system/north-star/tokens";
import type { NorthStarBoardColumnContent } from "@/shared/lib/dashboard-north-star-board";
import type { DashboardData } from "@/shared/types/dashboard";
import { NorthStarBoardRow } from "./NorthStarBoardRow";

type NorthStarActionColumnProps = {
  content: NorthStarBoardColumnContent & {
    officeFollowUps: Array<{
      id: string;
      title: string;
      meta: string;
      href?: string;
    }>;
    viewAllHref?: string;
  };
  data: DashboardData;
};

export function NorthStarActionColumn({
  content,
  data,
}: NorthStarActionColumnProps) {
  const hasRows = content.rows.length > 0;
  const hasOfficeFollowUps = content.officeFollowUps.length > 0;

  return (
    <div className={`relative flex flex-col gap-4 p-4 sm:p-5 lg:p-6 lg:pr-7 ${t.columnWell}`}>
      <div aria-hidden="true" className={t.columnRail} />
      <div className={t.columnHeader}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" aria-hidden="true" />
              <p className={t.lightCardLabel}>Action</p>
            </div>
            <h3 className={`mt-1 ${t.workspaceSubheading}`}>Blockers and follow-ups</h3>
            <p className={t.lightSurfaceMuted}>
              Office queues that need attention before work or billing moves
            </p>
          </div>
          {content.viewAllHref ? (
            <Link href={content.viewAllHref} className={`shrink-0 ${t.link}`}>
              View all
            </Link>
          ) : null}
        </div>
      </div>

      {hasRows ? (
        <ul className="flex flex-col gap-2">
          {content.rows.map((row) => (
            <li key={row.id}>
              <NorthStarBoardRow row={row} data={data} />
            </li>
          ))}
        </ul>
      ) : (
        <p className={`rounded-lg border border-dashed border-slate-300/80 px-3.5 py-4 text-center ${t.lightSurfaceMuted}`}>
          {content.emptyMessage}
        </p>
      )}

      {hasOfficeFollowUps ? (
        <div className={`mt-auto border-t ${t.columnDivider} pt-3`}>
          <p className={t.eyebrowLight}>Office follow-ups</p>
          <ul className="mt-2 flex flex-col gap-1">
            {content.officeFollowUps.map((item) => (
              <li key={item.id}>
                {item.href ? (
                  <Link
                    href={item.href}
                    className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs ${t.officeHover}`}
                  >
                    <span className={`min-w-0 flex-1 truncate font-medium ${t.darkSurfaceText}`}>
                      {item.title}
                    </span>
                    <span className={`shrink-0 ${t.darkSurfaceMuted}`}>{item.meta}</span>
                  </Link>
                ) : (
                  <div
                    className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs ${t.officeHover}`}
                  >
                    <span className={`min-w-0 flex-1 truncate font-medium ${t.darkSurfaceText}`}>
                      {item.title}
                    </span>
                    <span className={`shrink-0 ${t.darkSurfaceMuted}`}>{item.meta}</span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
