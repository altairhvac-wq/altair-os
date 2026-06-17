import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { PriorityAction } from "./sample-data";

const leverageStyles = {
  primary: {
    shell:
      "bg-gradient-to-br from-cyan-500/20 via-slate-900 to-slate-900 ring-cyan-400/40 shadow-[0_8px_32px_rgba(34,211,238,0.12)]",
    label: "text-white",
    metric: "text-cyan-200/80",
    badge: "bg-cyan-400/20 text-cyan-200",
  },
  secondary: {
    shell: "bg-slate-900/80 ring-slate-700/60 shadow-[0_4px_20px_rgba(15,23,42,0.25)]",
    label: "text-slate-100",
    metric: "text-slate-400",
    badge: "bg-slate-700/60 text-slate-300",
  },
  tertiary: {
    shell: "bg-slate-900/50 ring-slate-800/50",
    label: "text-slate-300",
    metric: "text-slate-500",
    badge: "bg-slate-800/60 text-slate-500",
  },
} as const;

type PriorityActionDockProps = {
  actions: PriorityAction[];
};

export function PriorityActionDock({ actions }: PriorityActionDockProps) {
  return (
    <aside
      aria-label="Priority actions"
      className="flex w-full flex-col gap-2 lg:w-[15.5rem] lg:shrink-0"
    >
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        Action dock
      </p>
      {actions.map((action, index) => {
        const style = leverageStyles[action.leverage];
        return (
          <Link
            key={action.id}
            href={action.href}
            className={`group relative flex flex-col gap-1 rounded-xl px-3.5 py-3 ring-1 transition-transform hover:-translate-y-0.5 ${style.shell}`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className={`text-sm font-semibold leading-snug ${style.label}`}>
                {action.label}
              </span>
              <ArrowUpRight
                className="h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-cyan-300"
                aria-hidden="true"
              />
            </div>
            {action.metric ? (
              <span className={`text-xs tabular-nums ${style.metric}`}>{action.metric}</span>
            ) : null}
            {index === 0 ? (
              <span
                className="absolute -left-px top-3 h-8 w-1 rounded-r-full bg-cyan-400"
                aria-hidden="true"
              />
            ) : null}
          </Link>
        );
      })}
    </aside>
  );
}
