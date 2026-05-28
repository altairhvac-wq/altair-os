"use client";

import { BarChart3, SlidersHorizontal, Users } from "lucide-react";
import type { DispatchPageFocusState } from "@/shared/lib/dispatch-page-focus";

export type DispatchSection = "summary" | "workload" | "filters";

type DispatchSectionActionsProps = {
  openSection: DispatchSection | null;
  onOpenSection: (section: DispatchSection) => void;
  hasJobs: boolean;
  filtersActive: boolean;
  unassignedCount: number;
  dispatchPageFocus?: DispatchPageFocusState;
};

type SectionButtonProps = {
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  isOpen: boolean;
  emphasized?: boolean;
  badge?: React.ReactNode;
  onClick: () => void;
};

function SectionButton({
  label,
  shortLabel,
  icon: Icon,
  isOpen,
  emphasized = false,
  badge,
  onClick,
}: SectionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isOpen}
      className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs font-semibold transition-colors sm:min-h-11 sm:gap-2 sm:px-3 sm:text-sm ${
        isOpen
          ? "border-cyan-300 bg-cyan-50 text-cyan-900 ring-2 ring-cyan-500/20"
          : emphasized
            ? "border-amber-300 bg-amber-50 text-amber-900 ring-2 ring-amber-400/20"
            : "border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="sm:hidden">{shortLabel}</span>
      <span className="hidden sm:inline">{label}</span>
      {badge}
    </button>
  );
}

export function DispatchSectionActions({
  openSection,
  onOpenSection,
  hasJobs,
  filtersActive,
  unassignedCount,
  dispatchPageFocus,
}: DispatchSectionActionsProps) {
  const emphasizeSummary =
    (dispatchPageFocus?.highlightedSummaryLabels.length ?? 0) > 0;
  const emphasizeWorkload = dispatchPageFocus?.emphasizeWorkload ?? false;

  return (
    <div className="flex min-w-0 max-w-full shrink-0 gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <SectionButton
        label="Overview"
        shortLabel="Overview"
        icon={BarChart3}
        isOpen={openSection === "summary"}
        emphasized={emphasizeSummary}
        onClick={() => onOpenSection("summary")}
      />

      <SectionButton
        label="Workload"
        shortLabel="Workload"
        icon={Users}
        isOpen={openSection === "workload"}
        emphasized={emphasizeWorkload}
        onClick={() => onOpenSection("workload")}
      />

      {hasJobs ? (
        <SectionButton
          label="Search & Filters"
          shortLabel="Filters"
          icon={SlidersHorizontal}
          isOpen={openSection === "filters"}
          emphasized={
            dispatchPageFocus?.highlightUnassignedPanel ?? false
          }
          badge={
            filtersActive || unassignedCount > 0 ? (
              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-slate-700 sm:px-2 sm:text-xs">
                {unassignedCount > 0
                  ? unassignedCount
                  : filtersActive
                    ? "On"
                    : null}
              </span>
            ) : null
          }
          onClick={() => onOpenSection("filters")}
        />
      ) : null}
    </div>
  );
}
