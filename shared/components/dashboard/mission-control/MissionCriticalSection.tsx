"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import {
  MISSION_CRITICAL_ICONS,
  MISSION_CONTROL_SECTION_LABELS,
  type MissionCriticalItem,
} from "@/shared/lib/dashboard-mission-control";
import { DashboardQueueActionTrigger } from "@/shared/components/dashboard/DashboardQueueActionTrigger";
import type { DashboardData } from "@/shared/types/dashboard";
import { MasterPageSection } from "@/shared/design-system/shell";
import { MissionControlInlineEmptyState } from "./MissionControlInlineEmptyState";

type MissionCriticalSectionProps = {
  items: MissionCriticalItem[];
  isClear: boolean;
  data: DashboardData;
};

const severityStyles = {
  critical: {
    row: "border-rose-100 bg-rose-50/50 hover:bg-rose-50/80",
    badge: "bg-rose-100 text-rose-800",
    value: "text-rose-900",
  },
  warning: {
    row: "border-amber-100 bg-amber-50/50 hover:bg-amber-50/80",
    badge: "bg-amber-100 text-amber-800",
    value: "text-amber-900",
  },
  healthy: {
    row: "border-slate-100 bg-white hover:bg-slate-50/80",
    badge: "bg-slate-100 text-slate-700",
    value: "text-slate-900",
  },
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

function MissionCriticalRow({
  item,
  data,
}: {
  item: MissionCriticalItem;
  data: DashboardData;
}) {
  const Icon = MISSION_CRITICAL_ICONS[item.id] ?? CheckCircle2;
  const styles = severityStyles[item.severity];
  const queueType = resolveQueueType(item.id);

  const content = (
    <div
      className={`flex items-start gap-3 rounded-xl border px-3 py-3 transition-colors sm:px-4 sm:py-4 ${styles.row}`}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-black/5">
        <Icon className="h-4 w-4 text-slate-700" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-bold text-slate-900 sm:text-base">{item.label}</p>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${styles.badge}`}>
            {item.severity === "healthy" ? "Clear" : "Attention"}
          </span>
        </div>
        <p className={`mt-1 text-2xl font-black tabular-nums ${styles.value}`}>
          {item.count}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-slate-600 sm:text-sm">
          {item.description}
        </p>
      </div>
      {item.severity !== "healthy" ? (
        <ArrowRight
          className="mt-1 h-4 w-4 shrink-0 text-slate-400"
          aria-hidden="true"
        />
      ) : null}
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

  return (
    <MasterPageSection
      title={MISSION_CONTROL_SECTION_LABELS.missionCritical}
      description="Issues that need immediate office attention."
      density="compact"
    >
      {isClear ? (
        <MissionControlInlineEmptyState
          tone="success"
          title="Everything is running smoothly."
          description="No overdue jobs, billing gaps, or dispatch pressure detected."
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />}
        />
      ) : (
        <div className="grid gap-2 lg:grid-cols-2 lg:gap-3">
          {items
            .filter((item) => item.severity !== "healthy")
            .map((item) => (
              <MissionCriticalRow key={item.id} item={item} data={data} />
            ))}
        </div>
      )}

    </MasterPageSection>
  );
}
