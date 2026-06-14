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

type NetworkReferralSummaryCardsProps = {
  metrics: NetworkReferralSummaryMetrics;
  direction: "sent" | "received";
};

function formatRate(value: number | null): string {
  return value === null ? "—" : formatPercent(value, 0);
}

export function NetworkReferralSummaryCards({
  metrics,
  direction,
}: NetworkReferralSummaryCardsProps) {
  const pendingLabel = direction === "sent" ? "Sent" : "Received";
  const pendingMobileLabel = direction === "sent" ? "Sent" : "Recv";
  const winRate = getNetworkReferralWinRate(metrics);
  const conversionRate = getNetworkReferralConversionRate(metrics);

  const cards = [
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

  return (
    <PageSummaryStrip cards={cards} lgColumnsClass="lg:grid-cols-4 xl:grid-cols-7" />
  );
}
