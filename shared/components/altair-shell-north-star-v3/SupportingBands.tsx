import type { ActivityItem, PulseMetric } from "./sample-data";
import { ActivityAndHealthBand } from "./ActivityAndHealthBand";
import { RevenueBand } from "./RevenueBand";
import { SystemStatusDock } from "./SystemStatusDock";
import { v3FooterClass } from "./v3-tokens";

type SupportingBandsProps = {
  metrics: PulseMetric[];
  activities: ActivityItem[];
  health: {
    score: number;
    label: string;
    status: string;
    notifications: number;
  };
  momentum: string[];
};

export function SupportingBands({ metrics, activities, health, momentum }: SupportingBandsProps) {
  return (
    <footer aria-label="Supporting metrics and status" className={v3FooterClass}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(184,148,63,0.45)] to-transparent" />

      <RevenueBand metrics={metrics} />

      <div className="grid lg:grid-cols-[1fr_auto]">
        <ActivityAndHealthBand activities={activities} momentum={momentum} />
        <SystemStatusDock health={health} />
      </div>
    </footer>
  );
}
