"use client";

import type { ActivityItem } from "./sample-data";
import { usePaletteTokens } from "./palette-context";

const toneDot = {
  slate: "bg-slate-400",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
} as const;

type ColorLabActivityBandProps = {
  activities: ActivityItem[];
  momentum: string[];
};

export function ColorLabActivityBand({ activities, momentum }: ColorLabActivityBandProps) {
  const t = usePaletteTokens();

  return (
    <div className={`${t.footerSection} grid lg:grid-cols-[1.2fr_0.8fr]`}>
      <div className={`border-b ${t.columnDivider} px-4 py-4 lg:border-b-0 lg:border-r lg:px-5`}>
        <p className={t.eyebrowLight}>Field activity</p>
        <ul className="mt-3 space-y-2">
          {activities.map((item) => (
            <li key={item.id} className="flex items-baseline gap-2.5">
              <span
                className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${toneDot[item.tone]}`}
                aria-hidden="true"
              />
              <span className={t.activityTitle}>{item.title}</span>
              <span className={t.activityTime}>{item.time}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="px-4 py-4 lg:px-5">
        <p className={t.eyebrowLight}>Today&apos;s momentum</p>
        <ul className="mt-3 space-y-1.5">
          {momentum.map((item) => (
            <li key={item} className={`flex items-start gap-2 ${t.meta}`}>
              <span className={t.momentumDot} aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
