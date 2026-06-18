import { Bell, ShieldCheck } from "lucide-react";
import { northStarTokens as t } from "@/shared/design-system/north-star/tokens";
import { buildNorthStarSupportingBandsContent } from "@/shared/lib/dashboard-north-star-supporting-bands";
import type { NorthStarSystemDockContent } from "@/shared/lib/dashboard-north-star-supporting-bands";
import type { DashboardData } from "@/shared/types/dashboard";

type NorthStarSystemDockProps = {
  dock: NorthStarSystemDockContent;
};

function NorthStarSystemDock({ dock }: NorthStarSystemDockProps) {
  const circumference = 2 * Math.PI * 20;
  const dashOffset = circumference - (dock.score / 100) * circumference;

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
          <span className={t.healthScoreValue}>{dock.score}</span>
        </div>
      </div>
      <div className="min-w-0">
        <p className={t.lightCardLabel}>System health</p>
        <p className={`mt-1 text-xs font-semibold ${t.workspaceSubheading}`}>{dock.label}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
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
  );
}

type NorthStarSupportingBandsProps = {
  data: DashboardData;
};

export function NorthStarSupportingBands({ data }: NorthStarSupportingBandsProps) {
  const content = buildNorthStarSupportingBandsContent(data);

  return (
    <footer aria-label="Supporting metrics and status" className={t.footer}>
      <div aria-hidden="true" className={t.footerTopAccent} />

      <div className={`${t.footerSection} px-2 pb-2 pt-4 sm:px-3 sm:pb-3`}>
        <p className={`px-2 sm:px-3 ${t.eyebrowLight}`}>Business pulse</p>
        <div className="mt-2 grid sm:grid-cols-4">
          {content.pulseMetrics.map((metric) => (
            <div key={metric.id} className={t.footerMetric}>
              <p className={t.metricLabel}>{metric.label}</p>
              <p className={`mt-0.5 text-lg font-bold tabular-nums ${t.workspaceSubheading}`}>
                {metric.value}
              </p>
              <p className={t.metricDelta}>{metric.delta}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_auto]">
        <div className={`${t.footerSection} grid gap-3 p-3 sm:p-4 lg:grid-cols-[1.2fr_0.8fr]`}>
          <div className={`${t.footerPanel} px-4 py-4 lg:px-5`}>
            <p className={t.lightCardLabel}>Field activity</p>
            {content.activities.length === 0 ? (
              <p className={`mt-3 ${t.lightSurfaceMuted}`}>No recent activity yet.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {content.activities.map((item) => (
                  <li key={item.id} className="flex items-baseline gap-2.5">
                    <span
                      className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400"
                      aria-hidden="true"
                    />
                    <span className={t.activityTitle}>{item.title}</span>
                    <span className={t.activityTime}>{item.time}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={`${t.footerPanel} px-4 py-4 lg:px-5`}>
            <p className={t.lightCardLabel}>Today&apos;s momentum</p>
            <ul className="mt-3 space-y-1.5">
              {content.momentumLines.map((item) => (
                <li key={item.id} className={`flex items-start gap-2 ${t.lightSurfaceMuted}`}>
                  <span className={t.momentumDot} aria-hidden="true" />
                  {item.text}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <NorthStarSystemDock dock={content.systemDock} />
      </div>
    </footer>
  );
}
