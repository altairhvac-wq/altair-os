import type { ActivityItem } from "./sample-data";
import { v3EyebrowLightClass, v3FooterSectionClass, v3MetaClass } from "./v3-tokens";

const toneDot = {
  slate: "bg-[rgba(41,34,24,0.35)]",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
} as const;

type ActivityAndHealthBandProps = {
  activities: ActivityItem[];
  momentum: string[];
};

export function ActivityAndHealthBand({ activities, momentum }: ActivityAndHealthBandProps) {
  return (
    <div className={`${v3FooterSectionClass} grid lg:grid-cols-[1.2fr_0.8fr]`}>
      <div className="border-b border-[rgba(184,148,63,0.10)] px-4 py-4 lg:border-b-0 lg:border-r lg:px-5">
        <p className={v3EyebrowLightClass}>Field activity</p>
        <ul className="mt-3 space-y-2">
          {activities.map((item) => (
            <li key={item.id} className="flex items-baseline gap-2.5">
              <span
                className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${toneDot[item.tone]}`}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 text-xs font-medium text-[#292218]">{item.title}</span>
              <span className="shrink-0 text-[10px] tabular-nums text-[rgba(41,34,24,0.48)]">{item.time}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="px-4 py-4 lg:px-5">
        <p className={v3EyebrowLightClass}>Today&apos;s momentum</p>
        <ul className="mt-3 space-y-1.5">
          {momentum.map((item) => (
            <li key={item} className={`flex items-start gap-2 ${v3MetaClass}`}>
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#B8943F]" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
