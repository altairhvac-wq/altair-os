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
};

function formatRate(value: number | null): string {
  return value === null ? "—" : formatPercent(value, 0);
}

function NorthStarMetricCard({
  label,
  value,
  description,
  icon: Icon,
  iconTone,
}: {
  label: string;
  value: string;
  description?: string;
  icon: LucideIcon;
  iconTone: "brass" | "success" | "muted";
}) {
  const iconWrapClass =
    iconTone === "success"
      ? st.metricIconWrapSuccess
      : iconTone === "muted"
        ? st.metricIconWrapMuted
        : st.metricIconWrapBrass;

  return (
    <div className={st.metricCard}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={st.metricLabel}>{label}</p>
          <p className={st.metricValue}>{value}</p>
          {description ? <p className={st.metricDescription}>{description}</p> : null}
        </div>
        <div className={iconWrapClass}>
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

function NorthStarReferralSummary({
  statusCards,
  rateCards,
}: {
  statusCards: SummaryCard[];
  rateCards: SummaryCard[];
}) {
  const iconToneForCard = (label: string): "brass" | "success" | "muted" => {
    if (label === "Accepted" || label === "Won") {
      return "success";
    }
    if (label === "Lost") {
      return "muted";
    }
    return "brass";
  };

  return (
    <div className="space-y-4">
      <section aria-label="Referral status counts">
        <p className={st.metricGroupLabel}>Status counts</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {statusCards.map((card) => (
            <NorthStarMetricCard
              key={card.label}
              label={card.label}
              value={card.value}
              description={card.description}
              icon={card.icon}
              iconTone={iconToneForCard(card.label)}
            />
          ))}
        </div>
      </section>

      <section aria-label="Referral performance rates">
        <p className={st.metricGroupLabel}>Performance rates</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {rateCards.map((card) => (
            <NorthStarMetricCard
              key={card.label}
              label={card.label}
              value={card.value}
              description={card.description}
              icon={card.icon}
              iconTone="brass"
            />
          ))}
        </div>
      </section>
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

  const statusCards: SummaryCard[] = [
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
    },
    {
      label: "Converted",
      mobileLabel: "Converted",
      value: String(metrics.converted),
      description: "Became customers",
      icon: Target,
      iconClassName: "admin-metric-icon-neutral",
    },
    {
      label: "Won",
      mobileLabel: "Won",
      value: String(metrics.won),
      description: "Closed successfully",
      icon: Trophy,
      iconClassName: "admin-metric-icon-emerald",
    },
    {
      label: "Lost",
      mobileLabel: "Lost",
      value: String(metrics.lost),
      description: "Did not close",
      icon: XCircle,
      iconClassName: "admin-metric-icon-slate",
    },
  ];

  const rateCards: SummaryCard[] = [
    {
      label: "Win rate",
      mobileLabel: "Win",
      value: formatRate(winRate),
      description: "Won / accepted referrals",
      icon: Trophy,
      iconClassName: "admin-metric-icon-teal",
    },
    {
      label: "Conversion rate",
      mobileLabel: "Conv",
      value: formatRate(conversionRate),
      description: "(Converted + won) / accepted referrals",
      icon: TrendingUp,
      iconClassName: "admin-metric-icon-amber",
    },
  ];

  if (surface === "north-star") {
    return (
      <NorthStarReferralSummary statusCards={statusCards} rateCards={rateCards} />
    );
  }

  return (
    <PageSummaryStrip
      cards={[...statusCards, ...rateCards]}
      lgColumnsClass="lg:grid-cols-4 xl:grid-cols-7"
    />
  );
}
