import Link from "next/link";
import { ArrowUpRight, Zap } from "lucide-react";
import type { PriorityAction } from "@/shared/components/dashboard/north-star-v2/sample-data";
import { missionEyebrowClass } from "./mission-tokens";

const leverageStyles = {
  primary: {
    shell:
      "col-span-full bg-gradient-to-br from-cyan-950/60 via-slate-900/80 to-indigo-950/50 ring-cyan-500/35 shadow-[0_12px_40px_-8px_rgba(34,211,238,0.15)] sm:col-span-1",
    label: "text-white",
    metric: "text-cyan-200/80",
    icon: "text-cyan-400",
    glow: "from-cyan-400/10",
  },
  secondary: {
    shell: "bg-gradient-to-br from-slate-900/70 to-slate-950/80 ring-slate-700/45",
    label: "text-slate-100",
    metric: "text-slate-400",
    icon: "text-indigo-400",
    glow: "from-indigo-400/5",
  },
  tertiary: {
    shell: "bg-gradient-to-br from-slate-900/50 to-slate-950/70 ring-slate-800/40",
    label: "text-slate-300",
    metric: "text-slate-500",
    icon: "text-slate-500",
    glow: "from-slate-400/5",
  },
} as const;

type PriorityCommandGridProps = {
  actions: PriorityAction[];
};

export function PriorityCommandGrid({ actions }: PriorityCommandGridProps) {
  return (
    <section aria-label="Priority commands" className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Zap className="h-3.5 w-3.5 text-amber-400/80" aria-hidden="true" />
        <p className={missionEyebrowClass}>Urgent priorities</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {actions.map((action, index) => {
          const style = leverageStyles[action.leverage];
          return (
            <Link
              key={action.id}
              href={action.href}
              className={`group relative overflow-hidden rounded-2xl p-4 ring-1 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-12px_rgba(0,0,0,0.5)] sm:p-5 ${style.shell}`}
            >
              <div
                aria-hidden="true"
                className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${style.glow} to-transparent opacity-60`}
              />
              <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-950/50 text-[11px] font-bold tabular-nums text-slate-400 ring-1 ring-slate-700/50">
                      {index + 1}
                    </span>
                    <span className={`text-sm font-semibold leading-snug ${style.label}`}>
                      {action.label}
                    </span>
                  </div>
                  {action.metric ? (
                    <p className={`mt-2 text-sm tabular-nums ${style.metric}`}>{action.metric}</p>
                  ) : null}
                </div>
                <ArrowUpRight
                  className={`h-4 w-4 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 ${style.icon}`}
                  aria-hidden="true"
                />
              </div>
              {action.leverage === "primary" ? (
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent"
                />
              ) : null}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
