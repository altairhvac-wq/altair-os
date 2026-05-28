"use client";

import { ChevronRight } from "lucide-react";
import type { CommandStripPanelId } from "@/shared/lib/dashboard-command-strip";
import { useDashboardDrilldown } from "@/shared/components/dashboard/dashboard-drilldown-context";

export function DashboardOpenPanelButton({
  panelId,
  label,
  className = "",
}: {
  panelId: CommandStripPanelId;
  label: string;
  className?: string;
}) {
  const { openDashboardPanel, hasPanel } = useDashboardDrilldown();

  if (!hasPanel(panelId)) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => openDashboardPanel(panelId)}
      className={`inline-flex w-full items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-cyan-700 shadow-sm transition-colors hover:border-cyan-200 hover:bg-cyan-50/50 sm:w-auto ${className}`}
    >
      {label}
      <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
    </button>
  );
}
