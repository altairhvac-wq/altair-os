import type { LucideIcon } from "lucide-react";
import {
  CheckCircle2,
  Inbox,
  Send,
  Target,
  TrendingUp,
  Trophy,
  XCircle,
} from "lucide-react";
import { PageSummaryStrip } from "@/shared/components/layout/PageSummaryStrip";
import {
  getNetworkReferralConversionRate,
  getNetworkReferralWinRate,
  type NetworkReferralSummaryMetrics,
} from "@/shared/lib/network/network-referral-metrics";
import { formatPercent } from "@/shared/types/analytics";
import { st } from "./north-star-m11/network-north-star-styles";

type NetworkReferralSummaryCardsProps = {
  metrics: NetworkReferralSummaryMetrics;
  direction: "sent" | "received";
  surface?: "legacy" | "north-star";
};

type SummaryCard = {
  label: string;
  mobileLabel?: string;
  value: string;
  description?: string;
  icon: LucideIcon;
  iconClassName: string;
  tone?: "brass" | "success" | "muted";
};

function formatRate(value: number | null): string {
  return value === null ? "—" : formatPercent(value, 0);
}

function NorthStarReferralSummary({ cards }: { cards: SummaryCard[] }) {
  return (
    <div
      className="flex flex-wrap gap-1.5 sm:gap-2"
      aria-label="Referral summary metrics"
    >
      {cards.map((card) => {
        const tone = card.tone ?? "brass";
        const chipClass =
          tone === "success"
            ? st.metricChipSuccess
            : tone === "muted"
              ? st.metricChipMuted
              : st.metricChip;

        return (
          <div key={card.label} className={chipClass} title={card.description}>
            <card.icon className="h-3 w-3 shrink-0 opacity-80" aria-hidden="true" />
            <span className={st.metricChipLabel}>
              {card.mobileLabel ?? card.label}
            </span>
            <span className={st.metricChipValue}>{card.value}</span>
          </div>
        );
      })}
    </div>
  );
}

export function NetworkReferralSummaryCards({
  metrics,
  direction,
  surface = "legacy",
}: NetworkReferralSummaryCardsProps) {
  const pendingLabel = direction === "sent" ? "Sent" : "Received";
  const pendingMobileLabel = direction === "sent" ? "Sent" : "Recv";
  const winRate = getNetworkReferralWinRate(metrics);
  const conversionRate = getNetworkReferralConversionRate(metrics);

  const cards: SummaryCard[] = [
    {
      label: pendingLabel,
      mobileLabel: pendingMobileLabel,
      value: String(metrics.pending),
      description:
        direction === "sent"
          ? "Awaiting partner response"
          : "Awaiting your response",
      icon: direction === "sent" ? Send : Inbox,
      iconClassName: "admin-metric-icon-teal",
      tone: "brass",
    },
    {
      label: "Accepted",
      mobileLabel: "Accepted",
      value: String(metrics.accepted),
      description:
        direction === "sent"
          ? "Partners took the referral"
          : "Referrals you accepted",
      icon: CheckCircle2,
      iconClassName: "admin-metric-icon-emerald",
      tone: "success",
    },
    {
      label: "Converted",
      mobileLabel: "Converted",
      value: String(metrics.converted),
      description: "Became customers",
      icon: Target,
      iconClassName: "admin-metric-icon-neutral",
      tone: "brass",
    },
    {
      label: "Won",
      mobileLabel: "Won",
      value: String(metrics.won),
      description: "Closed successfully",
      icon: Trophy,
      iconClassName: "admin-metric-icon-emerald",
      tone: "success",
    },
    {
      label: "Lost",
      mobileLabel: "Lost",
      value: String(metrics.lost),
      description: "Did not close",
      icon: XCircle,
      iconClassName: "admin-metric-icon-slate",
      tone: "muted",
    },
    {
      label: "Win rate",
      mobileLabel: "Win",
      value: formatRate(winRate),
      description: "Won / accepted referrals",
      icon: Trophy,
      iconClassName: "admin-metric-icon-teal",
      tone: "brass",
    },
    {
      label: "Conversion rate",
      mobileLabel: "Conv",
      value: formatRate(conversionRate),
      description: "(Converted + won) / accepted referrals",
      icon: TrendingUp,
      iconClassName: "admin-metric-icon-amber",
      tone: "brass",
    },
  ];

  if (surface === "north-star") {
    return <NorthStarReferralSummary cards={cards} />;
  }

  return (
    <PageSummaryStrip
      cards={cards}
      lgColumnsClass="lg:grid-cols-4 xl:grid-cols-7"
    />
  );
}
