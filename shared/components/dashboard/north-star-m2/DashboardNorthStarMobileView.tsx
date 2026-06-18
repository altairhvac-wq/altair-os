"use client";

import { useMemo } from "react";
import { Bell, ShieldCheck } from "lucide-react";
import { northStarTokens as t } from "@/shared/design-system/north-star/tokens";
import { buildNorthStarBoardContent } from "@/shared/lib/dashboard-north-star-board";
import { buildNorthStarSupportingBandsContent } from "@/shared/lib/dashboard-north-star-supporting-bands";
import type { DashboardData } from "@/shared/types/dashboard";
import { MasterContentStack } from "@/shared/design-system/shell";
import { NorthStarMissionHero } from "./NorthStarMissionHero";
import { NorthStarActionColumn } from "./NorthStarActionColumn";
import { NorthStarWorkColumn } from "./NorthStarWorkColumn";
import { NorthStarMoneyColumn } from "./NorthStarMoneyColumn";

type DashboardNorthStarMobileViewProps = {
  data: DashboardData;
  dateLabel: string;
};

const MOBILE_ACTIVITY_LIMIT = 3;
const MOBILE_HEALTH_GRADIENT_ID = "ns-health-score-mobile";

function NorthStarMobileSupportingSection({ data }: { data: DashboardData }) {
  const content = useMemo(
    () => buildNorthStarSupportingBandsContent(data),
    [data],
  );
  const activities = content.activities.slice(0, MOBILE_ACTIVITY_LIMIT);
  const dock = content.systemDock;
  const circumference = 2 * Math.PI * 18;
  const dashOffset = circumference - (dock.score / 100) * circumference;

  return (
    <footer aria-label="Supporting status" className={t.footer}>
      <div aria-hidden="true" className={t.footerTopAccent} />

      <div className={`${t.footerSection} p-3`}>
        <div className={`${t.footerPanel} px-3.5 py-3.5`}>
          <div className="flex items-start gap-3">
            <div className="relative h-10 w-10 shrink-0">
              <svg
                className="h-full w-full -rotate-90"
                viewBox="0 0 40 40"
                aria-hidden="true"
              >
                <circle
                  cx="20"
                  cy="20"
                  r="18"
                  fill="none"
                  stroke={t.healthScoreTrack}
                  strokeWidth="3"
                />
                <circle
                  cx="20"
                  cy="20"
                  r="18"
                  fill="none"
                  stroke={`url(#${MOBILE_HEALTH_GRADIENT_ID})`}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                />
                <defs>
                  <linearGradient
                    id={MOBILE_HEALTH_GRADIENT_ID}
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                  >
                    <stop offset="0%" stopColor={t.healthScoreGradientStart} />
                    <stop offset="100%" stopColor={t.healthScoreGradientEnd} />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={t.healthScoreValue}>{dock.score}</span>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className={t.lightCardLabel}>System health</p>
              <p className={`mt-0.5 text-sm font-semibold ${t.workspaceSubheading}`}>
                {dock.label}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <span className={t.systemStatusText}>
                  <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                  {dock.statusText}
                </span>
                <span className={t.systemNotificationText}>
                  <Bell className="h-3 w-3" aria-hidden="true" />
                  {dock.notificationText}
                </span>
              </div>
            </div>
          </div>
        </div>

        {activities.length > 0 ? (
          <div className={`${t.footerPanel} mt-2.5 px-3.5 py-3.5`}>
            <p className={t.lightCardLabel}>Recent field activity</p>
            <ul className="mt-2.5 space-y-2">
              {activities.map((item) => (
                <li key={item.id} className="flex items-baseline gap-2">
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#B8943F]"
                    aria-hidden="true"
                  />
                  <span className={`min-w-0 flex-1 ${t.activityTitle}`}>
                    {item.title}
                  </span>
                  <span className={t.activityTime}>{item.time}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </footer>
  );
}

function NorthStarMobileOperatingBoard({ data }: { data: DashboardData }) {
  const board = useMemo(() => buildNorthStarBoardContent(data), [data]);

  return (
    <section aria-label="Operating board" className={t.operatingBoard}>
      <div aria-hidden="true" className={t.boardTopAccent} />

      <div className={t.boardHeader}>
        <p className={t.eyebrowAccent}>Operating board</p>
        <h2 className={`mt-1 ${t.boardTitle}`}>Action · Work · Money</h2>
        <p className={`mt-1 ${t.darkSurfaceMuted}`}>
          Today&apos;s dispatch, office queues, and billing rollups.
        </p>
      </div>

      <div className="flex min-w-0 flex-col">
        <NorthStarActionColumn content={board.action} data={data} />
        <NorthStarWorkColumn content={board.work} data={data} />
        <NorthStarMoneyColumn content={board.money} data={data} />
      </div>
    </section>
  );
}

export function DashboardNorthStarMobileView({
  data,
  dateLabel,
}: DashboardNorthStarMobileViewProps) {
  return (
    <MasterContentStack density="compact" className="min-w-0 lg:hidden">
      <NorthStarMissionHero data={data} dateLabel={dateLabel} />
      <NorthStarMobileOperatingBoard data={data} />
      <NorthStarMobileSupportingSection data={data} />
    </MasterContentStack>
  );
}
