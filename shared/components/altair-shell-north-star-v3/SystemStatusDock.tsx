import { Bell, ShieldCheck } from "lucide-react";
import { v3EyebrowLightClass, v3FooterSectionClass } from "./v3-tokens";

type SystemStatusDockProps = {
  health: {
    score: number;
    label: string;
    status: string;
    notifications: number;
  };
};

export function SystemStatusDock({ health }: SystemStatusDockProps) {
  const circumference = 2 * Math.PI * 20;
  const dashOffset = circumference - (health.score / 100) * circumference;

  return (
    <div
      className={`${v3FooterSectionClass} flex items-center gap-4 border-t border-[rgba(184,148,63,0.10)] px-4 py-4 lg:border-l lg:border-t-0 lg:px-5`}
    >
      <div className="relative h-11 w-11 shrink-0">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 48 48" aria-hidden="true">
          <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(184,148,63,0.18)" strokeWidth="3" />
          <circle
            cx="24"
            cy="24"
            r="20"
            fill="none"
            stroke="url(#v3-health-score)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
          <defs>
            <linearGradient id="v3-health-score" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#059669" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[11px] font-bold tabular-nums text-emerald-800">{health.score}</span>
        </div>
      </div>
      <div className="min-w-0">
        <p className={v3EyebrowLightClass}>System health</p>
        <p className="mt-1 text-xs font-semibold text-[#292218]">{health.label}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
            <ShieldCheck className="h-3 w-3" aria-hidden="true" />
            {health.status}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-[rgba(41,34,24,0.58)]">
            <Bell className="h-3 w-3" aria-hidden="true" />
            {health.notifications} notification{health.notifications === 1 ? "" : "s"}
          </span>
        </div>
      </div>
    </div>
  );
}
