"use client";

import type { ActivityItem, PulseMetric } from "./sample-data";
import { ColorLabActivityBand } from "./ColorLabActivityBand";
import { ColorLabRevenueBand } from "./ColorLabRevenueBand";
import { ColorLabSystemDock } from "./ColorLabSystemDock";
import { usePaletteTokens } from "./palette-context";

type ColorLabSupportingBandsProps = {
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

export function ColorLabSupportingBands({
  metrics,
  activities,
  health,
  momentum,
}: ColorLabSupportingBandsProps) {
  const t = usePaletteTokens();

  return (
    <footer aria-label="Supporting metrics and status" className={t.footer}>
      <div aria-hidden="true" className={t.footerTopAccent} />

      <ColorLabRevenueBand metrics={metrics} />

      <div className="grid lg:grid-cols-[1fr_auto]">
        <ColorLabActivityBand activities={activities} momentum={momentum} />
        <ColorLabSystemDock health={health} />
      </div>
    </footer>
  );
}
