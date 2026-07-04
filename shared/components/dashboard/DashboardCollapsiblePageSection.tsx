"use client";

import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import {
  MasterPageSection,
  type MasterPageSectionProps,
} from "@/shared/design-system/shell";

type DashboardCollapsiblePageSectionProps = MasterPageSectionProps & {
  defaultCollapsed?: boolean;
  summaryHint?: string;
};

export function DashboardCollapsiblePageSection({
  title,
  description,
  children,
  density = "compact",
  id,
  className = "",
  defaultCollapsed = false,
  summaryHint,
}: DashboardCollapsiblePageSectionProps) {
  if (!defaultCollapsed) {
    return (
      <MasterPageSection
        title={title}
        description={description}
        density={density}
        id={id}
        className={className}
      >
        {children}
      </MasterPageSection>
    );
  }

  return (
    <CollapsibleSectionShell
      title={title}
      description={description}
      summaryHint={summaryHint}
      id={id}
      className={className}
    >
      {children}
    </CollapsibleSectionShell>
  );
}

type CollapsibleSectionShellProps = {
  title: string;
  description?: string;
  summaryHint?: string;
  id?: string;
  className?: string;
  children: ReactNode;
};

export function CollapsibleSectionShell({
  title,
  description,
  summaryHint,
  id,
  className = "",
  children,
}: CollapsibleSectionShellProps) {
  return (
    <details
      id={id}
      className={`group admin-card overflow-hidden ${className}`}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 border-b border-slate-200/80 px-3 py-2.5 marker:content-none [&::-webkit-details-marker]:hidden lg:px-3.5 lg:py-3">
        <div className="min-w-0">
          <h2 className="text-xs font-bold uppercase tracking-wide text-slate-800 sm:text-sm">
            {title}
          </h2>
          {description ? (
            <p className="mt-0.5 text-[11px] leading-snug text-slate-500 sm:text-xs">
              {description}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {summaryHint ? (
            <span className="hidden text-xs font-semibold tabular-nums text-slate-500 sm:inline">
              {summaryHint}
            </span>
          ) : null}
          <ChevronRight
            className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-90"
            aria-hidden="true"
          />
        </div>
      </summary>
      <div className="flex min-w-0 flex-col gap-2 p-2.5 lg:gap-3 lg:p-3">
        {summaryHint ? (
          <p className="text-xs font-semibold tabular-nums text-slate-500 sm:hidden">
            {summaryHint}
          </p>
        ) : null}
        {children}
      </div>
    </details>
  );
}
