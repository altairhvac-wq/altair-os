"use client";

import { ChevronRight } from "lucide-react";
import { useDashboardDrilldown } from "@/shared/components/dashboard/dashboard-drilldown-context";
import {
  buildDashboardCommandStripGroups,
  type CommandStripGroup,
  type CommandStripPanelId,
  type CommandStripSeverity,
} from "@/shared/lib/dashboard-command-strip";
import type { DashboardData } from "@/shared/types/dashboard";

type DashboardCommandStripProps = {
  data: DashboardData;
};

const SEVERITY_STYLES: Record<
  CommandStripSeverity,
  { card: string; value: string; badge: string }
> = {
  healthy: {
    card: "border-emerald-200/80 bg-emerald-50/40 hover:border-emerald-300 hover:bg-emerald-50/70",
    value: "text-emerald-900",
    badge: "bg-emerald-100 text-emerald-800",
  },
  info: {
    card: "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80",
    value: "text-slate-900",
    badge: "bg-slate-100 text-slate-700",
  },
  warning: {
    card: "border-amber-200/80 bg-amber-50/40 hover:border-amber-300 hover:bg-amber-50/70",
    value: "text-amber-900",
    badge: "bg-amber-100 text-amber-800",
  },
  critical: {
    card: "border-rose-200/80 bg-rose-50/40 hover:border-rose-300 hover:bg-rose-50/70",
    value: "text-rose-900",
    badge: "bg-rose-100 text-rose-800",
  },
};

function CommandStripCardButton({
  label,
  value,
  detail,
  severity,
  onClick,
}: {
  label: string;
  value: string | number;
  detail?: string;
  severity: CommandStripSeverity;
  onClick: () => void;
}) {
  const styles = SEVERITY_STYLES[severity];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex min-w-0 flex-col rounded-lg border p-2 text-left shadow-sm transition-colors lg:p-2.5 ${styles.card}`}
    >
      <div className="flex items-start justify-between gap-1">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <ChevronRight
          className="h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </div>
      <p
        className={`mt-0.5 truncate text-lg font-black tabular-nums leading-none tracking-tight lg:text-xl ${styles.value}`}
      >
        {value}
      </p>
      {detail ? (
        <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-slate-600">
          {detail}
        </p>
      ) : null}
    </button>
  );
}

function CommandStripGroupSection({
  group,
  onOpenPanel,
}: {
  group: CommandStripGroup;
  onOpenPanel: (panelId: CommandStripPanelId) => void;
}) {
  const { hasPanel } = useDashboardDrilldown();

  return (
    <div className="min-w-0">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
        {group.label}
      </p>
      <div className="grid grid-cols-2 gap-1.5 sm:gap-2 lg:grid-cols-4">
        {group.cards.map((card) => (
          <CommandStripCardButton
            key={card.id}
            label={card.label}
            value={card.value}
            detail={card.detail}
            severity={card.severity}
            onClick={() => {
              if (hasPanel(card.panelId)) {
                onOpenPanel(card.panelId);
              }
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function DashboardCommandStrip({ data }: DashboardCommandStripProps) {
  const groups = buildDashboardCommandStripGroups(data);
  const { openDashboardPanel } = useDashboardDrilldown();

  if (groups.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Operational command strip"
      className="admin-command-surface min-w-0 overflow-hidden p-2.5 lg:p-3"
    >
      <div className="mb-2 flex items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300/90">
            Command strip
          </p>
          <h2 className="mt-0.5 text-sm font-black tracking-tight text-white lg:text-base">
            Operations at a glance
          </h2>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 lg:gap-3">
        {groups.map((group) => (
          <CommandStripGroupSection
            key={group.id}
            group={group}
            onOpenPanel={openDashboardPanel}
          />
        ))}
      </div>
    </section>
  );
}
