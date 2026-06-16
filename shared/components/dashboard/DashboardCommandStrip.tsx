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
  /** Embedded lives inside the operations cockpit — no section chrome or duplicate headers. */
  variant?: "embedded" | "standalone";
};

const EMBEDDED_SEVERITY_STYLES: Record<
  CommandStripSeverity,
  { card: string; label: string; value: string; chevron: string; pill?: string }
> = {
  healthy: {
    card: "border-0 bg-transparent hover:bg-white/50 focus-visible:ring-2 focus-visible:ring-cyan-400/25",
    label: "text-slate-500",
    value: "text-slate-900",
    chevron: "text-slate-300 group-hover:text-slate-500",
  },
  info: {
    card: "border-0 bg-transparent hover:bg-white/50 focus-visible:ring-2 focus-visible:ring-cyan-400/25",
    label: "text-slate-500",
    value: "text-slate-900",
    chevron: "text-slate-300 group-hover:translate-x-0.5 group-hover:text-cyan-600",
  },
  warning: {
    card: "border-0 border-l-2 border-l-amber-400/75 bg-transparent pl-2 hover:bg-amber-50/25 focus-visible:ring-2 focus-visible:ring-amber-400/20",
    label: "text-slate-500",
    value: "text-slate-900",
    chevron: "text-slate-300 group-hover:text-amber-600",
    pill: "bg-amber-100/70 text-amber-800",
  },
  critical: {
    card: "border-0 border-l-2 border-l-rose-400/70 bg-transparent pl-2 hover:bg-rose-50/20 focus-visible:ring-2 focus-visible:ring-rose-400/20",
    label: "text-slate-500",
    value: "text-slate-900",
    chevron: "text-slate-300 group-hover:text-rose-600",
    pill: "bg-rose-100/60 text-rose-800",
  },
};

const STANDALONE_SEVERITY_STYLES: Record<
  CommandStripSeverity,
  { card: string; label: string; value: string; chevron: string; pill?: string }
> = {
  healthy: {
    card: "border border-emerald-200/90 border-l-4 border-l-emerald-500 bg-emerald-50/75 hover:border-emerald-300 hover:bg-emerald-50 focus-visible:ring-2 focus-visible:ring-emerald-400/40",
    label: "text-emerald-700",
    value: "text-emerald-900",
    chevron: "text-emerald-400 group-hover:text-emerald-600",
  },
  info: {
    card: "border border-slate-200/90 border-l-4 border-l-cyan-400 bg-white/85 hover:border-cyan-200 hover:bg-white focus-visible:ring-2 focus-visible:ring-cyan-400/35",
    label: "text-slate-500",
    value: "text-slate-900",
    chevron: "text-slate-400 group-hover:translate-x-0.5 group-hover:text-cyan-600",
  },
  warning: {
    card: "border border-amber-200/90 border-l-4 border-l-amber-500 bg-amber-50/80 hover:border-amber-300 hover:bg-amber-50 shadow-sm focus-visible:ring-2 focus-visible:ring-amber-400/40",
    label: "text-amber-700",
    value: "text-amber-900",
    chevron: "text-amber-400 group-hover:text-amber-600",
  },
  critical: {
    card: "border border-rose-200/90 border-l-4 border-l-rose-500 bg-rose-50/85 hover:border-rose-300 hover:bg-rose-50 shadow-sm focus-visible:ring-2 focus-visible:ring-rose-400/40",
    label: "text-rose-700",
    value: "text-rose-900",
    chevron: "text-rose-400 group-hover:text-rose-600",
  },
};

function CommandStripCardButton({
  label,
  value,
  detail,
  severity,
  onClick,
  variant,
}: {
  label: string;
  value: string | number;
  detail?: string;
  severity: CommandStripSeverity;
  onClick: () => void;
  variant: "embedded" | "standalone";
}) {
  const styles =
    variant === "embedded"
      ? EMBEDDED_SEVERITY_STYLES[severity]
      : STANDALONE_SEVERITY_STYLES[severity];
  const isElevated = severity === "warning" || severity === "critical";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`View ${label} details`}
      className={`group flex min-w-0 flex-col rounded-lg p-2 text-left transition-colors lg:p-2.5 ${styles.card}`}
    >
      <div className="flex items-start justify-between gap-1">
        <p
          className={`text-[10px] font-semibold uppercase tracking-wide ${styles.label}`}
        >
          {label}
        </p>
        <div className="flex shrink-0 items-center gap-1">
          {variant === "embedded" && isElevated && styles.pill ? (
            <span
              className={`rounded px-1 py-px text-[9px] font-bold uppercase tracking-wide ${styles.pill}`}
            >
              {severity === "critical" ? "Urgent" : "Watch"}
            </span>
          ) : null}
          <ChevronRight
            className={`h-3.5 w-3.5 transition-transform ${styles.chevron}`}
            aria-hidden="true"
          />
        </div>
      </div>
      <p
        className={`mt-0.5 truncate tabular-nums leading-none tracking-tight ${
          isElevated && variant === "standalone"
            ? `text-lg font-black lg:text-xl ${styles.value}`
            : `text-base font-semibold lg:text-lg ${styles.value}`
        }`}
      >
        {value}
      </p>
      {detail ? (
        <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-slate-500">
          {detail}
        </p>
      ) : null}
    </button>
  );
}

function CommandStripGroupSection({
  group,
  onOpenPanel,
  variant,
}: {
  group: CommandStripGroup;
  onOpenPanel: (panelId: CommandStripPanelId) => void;
  variant: "embedded" | "standalone";
}) {
  const { hasPanel } = useDashboardDrilldown();

  return (
    <div className="min-w-0">
      <p
        className={`mb-1 font-semibold uppercase tracking-[0.16em] text-slate-400 ${
          variant === "embedded" ? "text-[9px]" : "text-[10px] font-bold text-slate-500"
        }`}
      >
        {group.label}
      </p>
      <div
        className={
          variant === "embedded"
            ? "grid grid-cols-2 gap-x-3 gap-y-0 divide-y divide-slate-200/50 sm:grid-cols-4 sm:gap-x-2 sm:divide-y-0"
            : "grid grid-cols-2 gap-1.5 sm:gap-2 lg:grid-cols-4"
        }
      >
        {group.cards.map((card) => (
          <CommandStripCardButton
            key={card.id}
            label={card.label}
            value={card.value}
            detail={card.detail}
            severity={card.severity}
            variant={variant}
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

export function DashboardCommandStrip({
  data,
  variant = "embedded",
}: DashboardCommandStripProps) {
  const groups = buildDashboardCommandStripGroups(data);
  const { openDashboardPanel } = useDashboardDrilldown();

  if (groups.length === 0) {
    return null;
  }

  if (variant === "embedded") {
    return (
      <div
        aria-label="Live operational signals"
        className="min-w-0 border-t border-slate-200/45 pt-3"
      >
        <div className="flex flex-col gap-3 lg:gap-3.5">
          {groups.map((group) => (
            <CommandStripGroupSection
              key={group.id}
              group={group}
              variant="embedded"
              onOpenPanel={openDashboardPanel}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <section
      aria-label="Operational command strip"
      className="admin-command-strip-surface min-w-0 overflow-hidden p-2.5 lg:p-3"
    >
      <div className="mb-2 flex items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-600">
            Command strip
          </p>
          <h2 className="mt-0.5 text-sm font-black tracking-tight text-slate-900 lg:text-base">
            Operations at a glance
          </h2>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 lg:gap-3">
        {groups.map((group) => (
          <CommandStripGroupSection
            key={group.id}
            group={group}
            variant="standalone"
            onOpenPanel={openDashboardPanel}
          />
        ))}
      </div>
    </section>
  );
}
