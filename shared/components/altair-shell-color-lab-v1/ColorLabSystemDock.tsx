"use client";

import { Bell, ShieldCheck } from "lucide-react";
import { usePaletteTokens } from "./palette-context";

type ColorLabSystemDockProps = {
  health: {
    score: number;
    label: string;
    status: string;
    notifications: number;
  };
};

export function ColorLabSystemDock({ health }: ColorLabSystemDockProps) {
  const t = usePaletteTokens();
  const circumference = 2 * Math.PI * 20;
  const dashOffset = circumference - (health.score / 100) * circumference;

  return (
    <div
      className={`${t.footerSection} ${t.footerPanel} ${t.footerDock} flex items-center gap-4 border-t ${t.columnDivider} px-4 py-4 lg:border-l lg:border-t-0 lg:px-5`}
    >
      <div className="relative h-11 w-11 shrink-0">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 48 48" aria-hidden="true">
          <circle cx="24" cy="24" r="20" fill="none" stroke={t.healthScoreTrack} strokeWidth="3" />
          <circle
            cx="24"
            cy="24"
            r="20"
            fill="none"
            stroke={`url(#${t.healthScoreGradientId})`}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
          <defs>
            <linearGradient id={t.healthScoreGradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={t.healthScoreGradientStart} />
              <stop offset="100%" stopColor={t.healthScoreGradientEnd} />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={t.healthScoreValue}>{health.score}</span>
        </div>
      </div>
      <div className="min-w-0">
        <p className={t.lightCardLabel}>System health</p>
        <p className={`mt-1 text-xs font-semibold ${t.workspaceSubheading}`}>{health.label}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className={t.systemStatusText}>
            <ShieldCheck className="h-3 w-3" aria-hidden="true" />
            {health.status}
          </span>
          <span className={t.systemNotificationText}>
            <Bell className="h-3 w-3" aria-hidden="true" />
            {health.notifications} notification{health.notifications === 1 ? "" : "s"}
          </span>
        </div>
      </div>
    </div>
  );
}
