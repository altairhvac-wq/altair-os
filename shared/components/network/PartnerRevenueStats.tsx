import { ArrowDownLeft, ArrowUpRight, Briefcase, Crown, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/shared/types/customer";
import type { NetworkRevenueSummary } from "@/shared/types/network";

type PartnerRevenueStatsProps = {
  summary: NetworkRevenueSummary;
};

export function PartnerRevenueStats({ summary }: PartnerRevenueStatsProps) {
  const topPartners = summary.revenueByPartner.slice(0, 5);

  const cards = [
    {
      label: "Total paid out",
      value: formatCurrency(summary.totalPaidOut),
      description: "Work sent to partners",
      icon: ArrowUpRight,
      iconClass: "text-rose-600 bg-rose-50",
    },
    {
      label: "Total earned",
      value: formatCurrency(summary.totalEarned),
      description: "Work received from network",
      icon: ArrowDownLeft,
      iconClass: "text-emerald-600 bg-emerald-50",
    },
    {
      label: "Jobs sent",
      value: String(summary.jobsSent),
      description: "Subcontracted to partners",
      icon: Briefcase,
      iconClass: "text-blue-600 bg-blue-50",
    },
    {
      label: "Jobs received",
      value: String(summary.jobsReceived),
      description: "Accepted from partners",
      icon: TrendingUp,
      iconClass: "text-violet-600 bg-violet-50",
    },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <div className="grid shrink-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-slate-500">{card.label}</p>
                <p className="mt-2 text-2xl font-black text-slate-900">
                  {card.value}
                </p>
                <p className="mt-1 text-xs text-slate-500">{card.description}</p>
              </div>
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${card.iconClass}`}
              >
                <card.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 gap-4 overflow-hidden lg:grid-cols-[1.2fr_0.8fr]">
        <section className="flex min-h-[16rem] flex-col overflow-hidden admin-card lg:min-h-0">
          <div className="shrink-0 border-b border-slate-100 px-5 py-4">
            <h3 className="text-base font-bold text-slate-900">
              Revenue by partner
            </h3>
            <p className="text-xs text-slate-500">
              Combined payouts and earnings per relationship
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-500">
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
                {summary.revenueByPartner.map((row) => (
                  <tr key={row.partnerId} className="hover:bg-slate-50/80">
                    <td className="px-5 py-3 font-semibold text-slate-900">
                      {row.partnerCompanyName}
                    </td>
                    <td className="px-5 py-3 text-slate-600">{row.tradeType}</td>
                    <td className="px-5 py-3 text-slate-600">{row.jobsSent}</td>
                    <td className="px-5 py-3 text-slate-600">
                      {row.jobsReceived}
                    </td>
                    <td className="px-5 py-3 text-rose-700">
                      {formatCurrency(row.totalPaidOut)}
                    </td>
                    <td className="px-5 py-3 text-emerald-700">
                      {formatCurrency(row.totalEarned)}
                    </td>
                    <td className="px-5 py-3 font-bold text-slate-900">
                      {formatCurrency(row.totalRevenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="flex min-h-[12rem] flex-col overflow-hidden admin-card lg:min-h-0">
          <div className="shrink-0 border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-amber-500" />
              <h3 className="text-base font-bold text-slate-900">
                Top partners
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Highest combined revenue relationships
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <ol className="space-y-3">
              {topPartners.map((partner, index) => (
                <li
                  key={partner.partnerId}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 p-3"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">
                      {partner.partnerCompanyName}
                    </p>
                    <p className="text-xs text-slate-500">{partner.tradeType}</p>
                  </div>
                  <p className="shrink-0 text-sm font-bold text-slate-900">
                    {formatCurrency(partner.totalRevenue)}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </div>
    </div>
  );
}
