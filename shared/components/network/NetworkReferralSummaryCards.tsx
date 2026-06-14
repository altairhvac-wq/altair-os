import type { NetworkReferralSummaryMetrics } from "@/shared/lib/network/network-referral-metrics";

type NetworkReferralSummaryCardsProps = {
  metrics: NetworkReferralSummaryMetrics;
};

const SUMMARY_ITEMS: {
  key: keyof NetworkReferralSummaryMetrics;
  label: string;
  className: string;
}[] = [
  {
    key: "sent",
    label: "Sent",
    className: "border-blue-100 bg-blue-50/70 text-blue-800",
  },
  {
    key: "accepted",
    label: "Accepted",
    className: "border-emerald-100 bg-emerald-50/70 text-emerald-800",
  },
  {
    key: "convertedOrWon",
    label: "Converted / Won",
    className: "border-violet-100 bg-violet-50/70 text-violet-800",
  },
  {
    key: "lost",
    label: "Lost",
    className: "border-slate-200 bg-slate-50 text-slate-700",
  },
];

export function NetworkReferralSummaryCards({
  metrics,
}: NetworkReferralSummaryCardsProps) {
  return (
    <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {SUMMARY_ITEMS.map((item) => (
        <div
          key={item.key}
          className={`rounded-xl border px-4 py-3 ${item.className}`}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">
            {item.label}
          </p>
          <p className="mt-1 text-2xl font-bold">{metrics[item.key]}</p>
        </div>
      ))}
    </div>
  );
}
