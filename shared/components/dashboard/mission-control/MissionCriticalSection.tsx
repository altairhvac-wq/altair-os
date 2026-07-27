"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import {
  MISSION_CONTROL_SECTION_LABELS,
  type MissionCriticalItem,
} from "@/shared/lib/dashboard-mission-control";
import { DashboardQueueActionTrigger } from "@/shared/components/dashboard/DashboardQueueActionTrigger";
import type { DashboardData } from "@/shared/types/dashboard";
import {
  MasterPageSection,
  altairSurfaceListRowClass,
  altairSurfaceSectionClass,
} from "@/shared/design-system/shell";

type MissionCriticalSectionProps = {
  items: MissionCriticalItem[];
  isClear: boolean;
  data: DashboardData;
};

function resolveQueueType(id: string) {
  switch (id) {
    case "overdue-jobs":
      return "stalled_job" as const;
    case "jobs-waiting-customer":
      return "needs_review" as const;
    case "estimates-waiting":
      return "stale_sent_estimate" as const;
    case "invoices-past-due":
      return "overdue_invoice" as const;
    default:
      return undefined;
  }
}

function NeedsAttentionRow({
  item,
  data,
}: {
  item: MissionCriticalItem;
  data: DashboardData;
}) {
  const queueType = resolveQueueType(item.id);
  const valueClass =
    item.severity === "critical"
      ? "text-rose-800"
      : item.severity === "warning"
        ? "text-amber-800"
        : "text-slate-900";

  const content = (
    <div
      className={`${altairSurfaceListRowClass} flex items-baseline gap-3 border-b-0 py-3 sm:py-3.5`}
    >
      <p className="min-w-0 flex-1 text-sm font-medium text-slate-800 sm:text-[0.9375rem]">
        {item.label}
      </p>
      <span
        aria-hidden="true"
        className="mx-1 hidden min-w-[2rem] flex-1 border-b border-dotted border-slate-300/90 sm:block"
      />
      <p
        className={`shrink-0 text-base font-black tabular-nums sm:text-lg ${valueClass}`}
      >
        {item.count}
      </p>
      <span className="sr-only">{item.description}</span>
    </div>
  );

  if (item.severity === "healthy") {
    return content;
  }

  if (queueType) {
    return (
      <DashboardQueueActionTrigger
        action={{
          id: item.id,
          label: item.label,
          description: item.description,
          count: item.count,
          severity: item.severity === "critical" ? "critical" : "warning",
          queueType,
          href: item.href,
        }}
        data={data}
        className="block w-full text-left"
      >
        {content}
      </DashboardQueueActionTrigger>
    );
  }

  return (
    <Link href={item.href} className="block">
      {content}
    </Link>
  );
}

export function MissionCriticalSection({
  items,
  isClear,
  data,
}: MissionCriticalSectionProps) {
  if (items.length === 0) {
    return null;
  }

  const attentionItems = items.filter((item) => item.severity !== "healthy");

  return (
    <MasterPageSection
      title={MISSION_CONTROL_SECTION_LABELS.missionCritical}
      density="compact"
      headerVariant="spacious"
    >
      {isClear || attentionItems.length === 0 ? (
        <div
          className={`${altairSurfaceSectionClass} flex items-start gap-3 px-3.5 py-4 sm:px-4`}
        >
          <CheckCircle2
            className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-emerald-900">
              Everything is running smoothly
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-emerald-800/80">
              No overdue jobs, billing gaps, or dispatch pressure detected.
            </p>
          </div>
        </div>
      ) : (
        <div className={altairSurfaceSectionClass}>
          <ul className="divide-y divide-slate-200/55 px-1 sm:px-2">
            {attentionItems.map((item) => (
              <li key={item.id}>
                <NeedsAttentionRow item={item} data={data} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </MasterPageSection>
  );
}
