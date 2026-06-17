import { Bell, ShieldCheck } from "lucide-react";
import { missionDockClass, missionEyebrowClass } from "./mission-tokens";

type SystemHealthDockProps = {
  health: {
    score: number;
    label: string;
    status: string;
    notifications: number;
  };
};

export function SystemHealthDock({ health }: SystemHealthDockProps) {
  const circumference = 2 * Math.PI * 28;
  const dashOffset = circumference - (health.score / 100) * circumference;

  return (
    <aside aria-label="System health" className={missionDockClass}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={missionEyebrowClass}>System health</p>
          <p className="mt-1 text-sm font-medium text-slate-300">{health.label}</p>
        </div>
        <div className="relative h-14 w-14 shrink-0">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 64 64" aria-hidden="true">
            <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(148,163,184,0.1)" strokeWidth="4" />
            <circle
              cx="32"
              cy="32"
              r="28"
              fill="none"
              stroke="url(#health-score)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
            />
            <defs>
              <linearGradient id="health-score" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-semibold tabular-nums text-emerald-400">{health.score}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <div className="flex items-center gap-2 rounded-lg bg-emerald-950/30 px-3 py-2 ring-1 ring-emerald-500/15">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
          <span className="text-xs text-emerald-300/90">{health.status}</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-slate-900/50 px-3 py-2 ring-1 ring-slate-800/40">
          <Bell className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
          <span className="text-xs text-slate-400">
            {health.notifications} unread notification{health.notifications === 1 ? "" : "s"}
          </span>
        </div>
      </div>
    </aside>
  );
}
