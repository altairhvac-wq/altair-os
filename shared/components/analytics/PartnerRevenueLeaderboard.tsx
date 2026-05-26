import { ArrowDownLeft, ArrowUpRight, Crown, Network } from "lucide-react";
import { formatCurrency } from "@/shared/types/customer";
import type { PartnerRevenueEntry } from "@/shared/types/analytics";

type PartnerRevenueLeaderboardProps = {
  partners: PartnerRevenueEntry[];
};

export function PartnerRevenueLeaderboard({
  partners,
}: PartnerRevenueLeaderboardProps) {
  const sorted = [...partners].sort((a, b) => b.totalRevenue - a.totalRevenue);

  return (
    <section className="overflow-hidden admin-card">
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <Network className="h-4 w-4 text-indigo-600" />
          <h3 className="text-base font-bold text-slate-900">
            Partner revenue tracker
          </h3>
        </div>
        <p className="text-xs text-slate-500">
          Subcontractor network payouts and earnings
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-5 py-3">Rank</th>
              <th className="px-5 py-3">Partner</th>
              <th className="px-5 py-3">Trade</th>
              <th className="px-5 py-3">Sent</th>
              <th className="px-5 py-3">Received</th>
              <th className="px-5 py-3">Paid out</th>
              <th className="px-5 py-3">Earned</th>
              <th className="px-5 py-3">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {sorted.map((partner, index) => (
              <tr key={partner.id} className="hover:bg-slate-50/80">
                <td className="px-5 py-3">
                  {index === 0 ? (
                    <Crown className="h-4 w-4 text-amber-500" />
                  ) : (
                    <span className="font-bold text-slate-400">
                      #{index + 1}
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 font-semibold text-slate-900">
                  {partner.partnerName}
                </td>
                <td className="px-5 py-3 text-slate-600">
                  {partner.tradeType}
                </td>
                <td className="px-5 py-3 text-slate-600">{partner.jobsSent}</td>
                <td className="px-5 py-3 text-slate-600">
                  {partner.jobsReceived}
                </td>
                <td className="px-5 py-3">
                  <span className="inline-flex items-center gap-1 text-rose-700">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    {formatCurrency(partner.revenuePaidOut)}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span className="inline-flex items-center gap-1 text-emerald-700">
                    <ArrowDownLeft className="h-3.5 w-3.5" />
                    {formatCurrency(partner.revenueEarned)}
                  </span>
                </td>
                <td className="px-5 py-3 font-black text-slate-900">
                  {formatCurrency(partner.totalRevenue)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
