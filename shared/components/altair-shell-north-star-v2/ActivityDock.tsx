import type { ActivityItem } from "./sample-data";
import { missionDockClass, missionEyebrowClass } from "./mission-tokens";

const toneDot = {
  cyan: "bg-cyan-400",
  emerald: "bg-emerald-400",
  amber: "bg-amber-400",
  slate: "bg-slate-500",
} as const;

type ActivityDockProps = {
  activities: ActivityItem[];
};

export function ActivityDock({ activities }: ActivityDockProps) {
  return (
    <aside aria-label="Recent activity" className={missionDockClass}>
      <p className={missionEyebrowClass}>Recent activity</p>
      <ul className="mt-3 flex flex-col gap-2.5">
        {activities.map((item) => (
          <li key={item.id} className="flex items-start gap-2.5">
            <span
              className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${toneDot[item.tone]}`}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-slate-300">{item.title}</p>
              <p className="text-[11px] text-slate-600">{item.time}</p>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
