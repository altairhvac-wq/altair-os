import type { TechnicianPresence } from "./sample-data";

const stateStyles = {
  on_job: {
    ring: "ring-cyan-400/60",
    dot: "bg-cyan-400",
    label: "On job",
  },
  available: {
    ring: "ring-emerald-400/50",
    dot: "bg-emerald-400",
    label: "Available",
  },
  break: {
    ring: "ring-slate-300/60",
    dot: "bg-slate-400",
    label: "Break",
  },
} as const;

type TeamPresenceDockProps = {
  technicians: TechnicianPresence[];
};

export function TeamPresenceDock({ technicians }: TeamPresenceDockProps) {
  const activeCount = technicians.filter((t) => t.state === "on_job").length;

  return (
    <aside
      aria-label="Team presence"
      className="w-full shrink-0 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 p-4 shadow-[0_12px_40px_-16px_rgba(15,23,42,0.5)] sm:w-[15rem] lg:w-[13.5rem]"
    >
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Crew
        </p>
        <span className="text-[11px] font-medium text-cyan-300/90">
          {activeCount} active
        </span>
      </div>

      <ul className="flex flex-col gap-3">
        {technicians.map((tech) => {
          const style = stateStyles[tech.state];
          return (
            <li key={tech.id} className="flex items-center gap-3">
              <div className="relative shrink-0">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-[11px] font-semibold text-white ring-2 ${style.ring}`}
                >
                  {tech.initials}
                </div>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-slate-950 ${style.dot}`}
                  aria-hidden="true"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-100">{tech.name}</p>
                <p className="truncate text-[11px] text-slate-400">
                  {tech.jobLabel ?? style.label}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
