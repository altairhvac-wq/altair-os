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
import {
  buildDashboardAttentionCards,
  countDashboardAttentionIssues,
  type DashboardAttentionCard,
  type DashboardAttentionCardSeverity,
  type DashboardAttentionCardsInput,
} from "@/shared/lib/dashboard-attention-cards";

type TodayNeedsAttentionSectionProps = {
  data: DashboardAttentionCardsInput;
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

function AttentionCard({ card }: { card: DashboardAttentionCard }) {
  const CardIcon = CARD_ICONS[card.id];
  const styles = getAttentionCardStyles(card.severity);
  const StatusIcon = styles.Icon;
  const displayValue =
    card.count !== null ? card.count : card.statusLabel;

  const body = (
    <div
      className={`flex h-full flex-col rounded-xl border p-4 transition-colors ${styles.accent} ${card.href ? "hover:border-slate-300 hover:bg-white" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${styles.iconClass}`}
        >
          <CardIcon className="h-4 w-4" aria-hidden="true" />
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${styles.badgeClass}`}
        >
          <StatusIcon className="h-3 w-3" aria-hidden="true" />
          {card.severity === "healthy" ? "Healthy" : card.severity}
        </span>
      </div>

      <div className="mt-3 min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
          {card.label}
        </p>
        <p className="mt-1 text-2xl font-black tabular-nums leading-none text-slate-900">
          {displayValue}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-slate-600">
          {card.explanation}
        </p>
      </div>

      {card.href ? (
        <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-cyan-600">
          View details
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      ) : null}
    </div>
  );

  if (card.href) {
    return (
      <Link href={card.href} className="block h-full">
        {body}
      </Link>
    );
  }

  return body;
}

function HealthySummaryBanner() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
        <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
      </div>
      <div>
        <p className="text-sm font-bold text-emerald-900">
          All priority areas look healthy
        </p>
        <p className="mt-1 text-xs leading-relaxed text-emerald-800/80">
          Office queue, billing, pipeline, profitability, and readiness signals
          are clear. Issue cards will appear here when something needs follow-up.
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
      <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-amber-600/90">
            Today needs attention
          </p>
          <h2 className="text-lg font-black tracking-tight text-slate-900">
            Priority areas
          </h2>
          <p className="text-sm text-slate-500">
            {issueCount === 0
              ? "Everything looks healthy — no urgent operational risks right now."
              : `${issueCount} area${issueCount === 1 ? "" : "s"} need follow-up today.`}
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

      <div className="p-5">
        {issueCount === 0 ? (
          <HealthySummaryBanner />
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {issueCards.map((card) => (
                <AttentionCard key={card.id} card={card} />
              ))}
            </div>

            {healthyCards.length > 0 ? (
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3">
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
