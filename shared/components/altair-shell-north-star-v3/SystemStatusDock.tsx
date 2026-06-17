import { Bell, ShieldCheck } from "lucide-react";

type SystemStatusDockProps = {
  health: {
    score: number;
    label: string;
    status: string;
    notifications: number;
  };
};

export function SystemStatusDock({ health }: SystemStatusDockProps) {
  const circumference = 2 * Math.PI * 22;
  const dashOffset = circumference - (health.score / 100) * circumference;

  return (
    <div className="flex items-center gap-4 border-t border-[rgba(41,34,24,0.10)] px-4 py-3.5 lg:border-t-0 lg:border-l lg:px-5">
      <div className="relative h-12 w-12 shrink-0">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 52 52" aria-hidden="true">
          <circle cx="26" cy="26" r="22" fill="none" stroke="rgba(41,34,24,0.12)" strokeWidth="3.5" />
          <circle
            cx="26"
            cy="26"
            r="22"
            fill="none"
            stroke="url(#v3-health-score)"
            strokeWidth="3.5"
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
          <span className="text-xs font-bold tabular-nums text-emerald-700">{health.score}</span>
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-[#292218]">{health.label}</p>
        <div className="mt-1 flex items-center gap-1.5">
          <ShieldCheck className="h-3 w-3 text-emerald-600" aria-hidden="true" />
          <span className="text-[11px] font-medium text-emerald-700">{health.status}</span>
        </div>
        <div className="mt-1 flex items-center gap-1.5">
          <Bell className="h-3 w-3 text-[rgba(41,34,24,0.50)]" aria-hidden="true" />
          <span className="text-[11px] text-[rgba(41,34,24,0.65)]">
            {health.notifications} notification{health.notifications === 1 ? "" : "s"}
          </span>
        </div>
      </div>
    </div>
  );
}
