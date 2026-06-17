import type { ActivityItem } from "./sample-data";
import { v3EyebrowLightClass, v3MetaClass } from "./v3-tokens";

const toneDot = {
  slate: "bg-slate-400",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
} as const;

type ActivityAndHealthBandProps = {
  activities: ActivityItem[];
  momentum: string[];
};

export function ActivityAndHealthBand({ activities, momentum }: ActivityAndHealthBandProps) {
  return (
    <div className="grid border-t border-[rgba(41,34,24,0.10)] lg:grid-cols-[1fr_auto]">
      <div className="border-b border-[rgba(41,34,24,0.10)] px-4 py-3.5 lg:border-b-0 lg:border-r">
        <p className={v3EyebrowLightClass}>Field activity</p>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
          {activities.map((item) => (
            <li key={item.id} className="flex items-center gap-2">
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${toneDot[item.tone]}`}
                aria-hidden="true"
              />
              <span className="text-xs font-medium text-[#292218]">{item.title}</span>
              <span className="text-[10px] text-[rgba(41,34,24,0.55)]">{item.time}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="px-4 py-3.5 lg:px-5">
        <p className={v3EyebrowLightClass}>Today&apos;s momentum</p>
        <ul className="mt-2 flex flex-col gap-1">
          {momentum.map((item) => (
            <li key={item} className={`flex items-start gap-2 ${v3MetaClass}`}>
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
