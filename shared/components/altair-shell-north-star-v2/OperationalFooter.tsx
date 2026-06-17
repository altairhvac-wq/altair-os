import { Bell, ShieldCheck } from "lucide-react";
import type { ActivityItem, PulseMetric } from "./sample-data";
import { missionEyebrowClass, missionMetaClass } from "./mission-tokens";

const toneStyles = {
  cyan: "text-cyan-300",
  emerald: "text-emerald-300",
  amber: "text-amber-300",
  violet: "text-violet-300",
} as const;

const toneDot = {
  cyan: "bg-cyan-400",
  emerald: "bg-emerald-400",
  amber: "bg-amber-400",
  slate: "bg-slate-400",
} as const;

type OperationalFooterProps = {
  metrics: PulseMetric[];
  activities: ActivityItem[];
  health: {
    score: number;
    label: string;
    status: string;
    notifications: number;
  };
  momentum: string[];
};

export function OperationalFooter({ metrics, activities, health, momentum }: OperationalFooterProps) {
  const circumference = 2 * Math.PI * 22;
  const dashOffset = circumference - (health.score / 100) * circumference;

  return (
    <footer
      aria-label="Operational footer"
      className="relative overflow-hidden rounded-2xl bg-slate-950/60 ring-1 ring-slate-800/50 backdrop-blur-sm"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/25 to-transparent"
      />

      {/* Pulse strip — inline metrics, not a separate panel */}
      <div className="grid divide-y divide-slate-800/50 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        {metrics.map((metric) => (
          <div key={metric.id} className="px-4 py-3.5 sm:px-5">
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400">
              {metric.label}
            </p>
            <p className={`mt-0.5 text-lg font-semibold tabular-nums ${toneStyles[metric.tone]}`}>
              {metric.value}
            </p>
            <p className="text-[11px] text-slate-400">{metric.delta}</p>
          </div>
        ))}
      </div>

      {/* Activity + health + momentum — one thin band */}
      <div className="grid border-t border-slate-800/50 lg:grid-cols-[1fr_auto_auto]">
        <div className="border-b border-slate-800/50 px-4 py-3.5 lg:border-b-0 lg:border-r">
          <p className={missionEyebrowClass}>Field activity</p>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
            {activities.map((item) => (
              <li key={item.id} className="flex items-center gap-2">
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${toneDot[item.tone]}`}
                  aria-hidden="true"
                />
                <span className="text-xs text-slate-300">{item.title}</span>
                <span className="text-[10px] text-slate-500">{item.time}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center gap-4 border-b border-slate-800/50 px-4 py-3.5 lg:border-b-0 lg:border-r lg:px-5">
          <div className="relative h-12 w-12 shrink-0">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 52 52" aria-hidden="true">
              <circle cx="26" cy="26" r="22" fill="none" stroke="rgba(148,163,184,0.12)" strokeWidth="3.5" />
              <circle
                cx="26"
                cy="26"
                r="22"
                fill="none"
                stroke="url(#footer-health-score)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
              />
              <defs>
                <linearGradient id="footer-health-score" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#22d3ee" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-semibold tabular-nums text-emerald-300">{health.score}</span>
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-200">{health.label}</p>
            <div className="mt-1 flex items-center gap-1.5">
              <ShieldCheck className="h-3 w-3 text-emerald-400" aria-hidden="true" />
              <span className="text-[11px] text-emerald-300/90">{health.status}</span>
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <Bell className="h-3 w-3 text-slate-500" aria-hidden="true" />
              <span className="text-[11px] text-slate-400">
                {health.notifications} notification{health.notifications === 1 ? "" : "s"}
              </span>
            </div>
          </div>
        </div>

        <div className="px-4 py-3.5 lg:px-5">
          <p className={missionEyebrowClass}>Today&apos;s momentum</p>
          <ul className="mt-2 flex flex-col gap-1">
            {momentum.map((item) => (
              <li key={item} className={`flex items-start gap-2 ${missionMetaClass}`}>
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-400/90" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
