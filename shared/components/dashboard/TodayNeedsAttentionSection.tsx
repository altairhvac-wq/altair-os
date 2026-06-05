"use client";

import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CalendarX,
  CheckCircle2,
  ClipboardList,
  Clock,
  Receipt,
  type LucideIcon,
} from "lucide-react";
import { DashboardQueueActionTrigger } from "@/shared/components/dashboard/DashboardQueueActionTrigger";
import {
  buildDashboardAttentionCards,
  countDashboardAttentionIssues,
  formatDashboardAttentionSeverityLabel,
  type DashboardAttentionCard,
  type DashboardAttentionCardSeverity,
} from "@/shared/lib/dashboard-attention-cards";
import type { DashboardData } from "@/shared/types/dashboard";

type TodayNeedsAttentionSectionProps = {
  data: DashboardData;
};

const CARD_ICONS: Record<DashboardAttentionCard["id"], LucideIcon> = {
  "office-queue": ClipboardList,
  invoicing: Receipt,
  "stalled-jobs": Clock,
  profitability: AlertTriangle,
  readiness: CalendarX,
};

function getAttentionCardStyles(severity: DashboardAttentionCardSeverity): {
  accent: string;
  iconClass: string;
  badgeClass: string;
  Icon: LucideIcon;
} {
  switch (severity) {
    case "critical":
      return {
        accent: "border-rose-200 bg-rose-50/30",
        iconClass: "bg-rose-100 text-rose-700",
        badgeClass: "bg-rose-100 text-rose-800",
        Icon: AlertCircle,
      };
    case "warning":
      return {
        accent: "border-amber-200 bg-amber-50/30",
        iconClass: "bg-amber-100 text-amber-700",
        badgeClass: "bg-amber-100 text-amber-800",
        Icon: AlertTriangle,
      };
    case "info":
      return {
        accent: "border-cyan-200 bg-cyan-50/30",
        iconClass: "bg-cyan-100 text-cyan-700",
        badgeClass: "bg-cyan-100 text-cyan-800",
        Icon: AlertTriangle,
      };
    default:
      return {
        accent: "border-emerald-200 bg-emerald-50/30",
        iconClass: "bg-emerald-100 text-emerald-700",
        badgeClass: "bg-emerald-100 text-emerald-800",
        Icon: CheckCircle2,
      };
  }
}

function AttentionCard({
  card,
  data,
}: {
  card: DashboardAttentionCard;
  data: DashboardData;
}) {
  const CardIcon = CARD_ICONS[card.id];
  const styles = getAttentionCardStyles(card.severity);
  const StatusIcon = styles.Icon;
  const displayValue =
    card.count !== null ? card.count : card.statusLabel;

  const body = (
    <div
      className={`flex h-full flex-col rounded-xl border p-3 transition-colors max-lg:p-3 lg:p-4 ${styles.accent} ${card.href ? "hover:border-slate-300 hover:bg-white" : ""}`}
    >
      <div className="flex items-start justify-between gap-2 max-lg:gap-2 lg:gap-3">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg lg:h-9 lg:w-9 ${styles.iconClass}`}
        >
          <CardIcon className="h-3.5 w-3.5 lg:h-4 lg:w-4" aria-hidden="true" />
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${styles.badgeClass}`}
        >
          <StatusIcon className="h-3 w-3" aria-hidden="true" />
          {formatDashboardAttentionSeverityLabel(card.severity)}
        </span>
      </div>

      <div className="mt-2 min-w-0 flex-1 lg:mt-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 lg:text-xs">
          {card.label}
        </p>
        <p className="mt-0.5 text-xl font-black tabular-nums leading-none text-slate-900 lg:mt-1 lg:text-2xl">
          {displayValue}
        </p>
        <p className="mt-1 line-clamp-3 text-[11px] leading-snug text-slate-600 lg:mt-2 lg:text-xs lg:leading-relaxed">
          {card.explanation}
        </p>
      </div>

      {card.queueType ? (
        <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-cyan-600 lg:mt-3">
          Open queue
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      ) : card.href ? (
        <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-cyan-600 lg:mt-3">
          View details
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      ) : null}
    </div>
  );

  if (card.href || card.queueType) {
    return (
      <DashboardQueueActionTrigger
        action={{
          id: card.id,
          label: card.label,
          description: card.explanation,
          count: card.count,
          severity:
            card.severity === "critical"
              ? "critical"
              : card.severity === "warning"
                ? "warning"
                : "info",
          queueType: card.queueType,
          href: card.href,
        }}
        data={data}
        className="block h-full w-full text-left"
      >
        {body}
      </DashboardQueueActionTrigger>
    );
  }

  return body;
}

function HealthySummaryBanner({ canViewBilling }: { canViewBilling: boolean }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-3 max-lg:px-3 max-lg:py-3 lg:gap-3 lg:px-4 lg:py-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
        <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
      </div>
      <div>
        <p className="text-sm font-bold text-emerald-900">
          All priority areas look healthy
        </p>
        <p className="mt-1 text-xs leading-relaxed text-emerald-800/80">
          {canViewBilling
            ? "Office queue, billing, pipeline, profitability, and readiness signals are clear. Issue cards will appear here when something needs follow-up."
            : "Office queue, pipeline, profitability, and readiness signals are clear. Issue cards will appear here when something needs follow-up."}
        </p>
      </div>
    </div>
  );
}

export function TodayNeedsAttentionSection({
  data,
}: TodayNeedsAttentionSectionProps) {
  const cards = buildDashboardAttentionCards(data);
  const issueCount = countDashboardAttentionIssues(cards);
  const issueCards = cards.filter((card) => card.severity !== "healthy");
  const healthyCards = cards.filter((card) => card.severity === "healthy");

  return (
    <section className="admin-card flex h-full flex-col overflow-hidden">
      <div className="flex flex-col gap-1.5 border-b border-slate-100 px-4 py-3 max-lg:gap-1.5 sm:flex-row sm:items-end sm:justify-between lg:gap-2 lg:px-5 lg:py-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600/90 lg:text-xs">
            Today needs attention
          </p>
          <h2 className="text-base font-black tracking-tight text-slate-900 lg:text-lg">
            Priority areas
          </h2>
          <p className="text-xs text-slate-500 lg:text-sm">
            {issueCount === 0
              ? "Everything looks healthy — no urgent operational risks right now."
              : `${issueCount} area${issueCount === 1 ? "" : "s"} need follow-up today. Open a card for context.`}
          </p>
        </div>
        <Link
          href="/reports"
          className="admin-section-link shrink-0"
        >
          Open reports
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="p-4 lg:p-5">
        {issueCount === 0 ? (
          <HealthySummaryBanner canViewBilling={data.access.canViewBilling} />
        ) : (
          <div className="space-y-3 max-lg:space-y-3 lg:space-y-4">
            <div className="grid grid-cols-2 gap-2 max-lg:gap-2 sm:grid-cols-2 sm:gap-3">
              {issueCards.map((card) => (
                <AttentionCard key={card.id} card={card} data={data} />
              ))}
            </div>

            {healthyCards.length > 0 ? (
              <div className="rounded-xl border border-slate-100 bg-white px-3 py-2.5 max-lg:px-3 max-lg:py-2.5 lg:px-4 lg:py-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Healthy
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  {healthyCards.map((card) => card.label).join(" · ")}
                </p>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
