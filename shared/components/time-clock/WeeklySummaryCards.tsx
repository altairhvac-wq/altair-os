import { AlertTriangle, Clock, Timer, Users } from "lucide-react";
import {
  formatMockHours,
  getMockWeeklySummary,
  type MockTimeEntry,
} from "@/shared/types/time-entry-mock";

type WeeklySummaryCardsProps = {
  entries: MockTimeEntry[];
};

export function WeeklySummaryCards({ entries }: WeeklySummaryCardsProps) {
  const { totalHours, activeTechnicians, overtimeEntries, pendingApprovals } =
    getMockWeeklySummary(entries);

  const cards = [
    {
      label: "Total Hours",
      value: formatMockHours(totalHours),
      description: "Logged this week",
      icon: Clock,
      iconClass: "text-blue-600 bg-blue-50",
    },
    {
      label: "Active Technicians",
      value: String(activeTechnicians),
      description: "Currently clocked in",
      icon: Users,
      iconClass: "text-cyan-600 bg-cyan-50",
    },
    {
      label: "Overtime Entries",
      value: String(overtimeEntries),
      description: "Flagged for review",
      icon: AlertTriangle,
      iconClass: "text-amber-600 bg-amber-50",
    },
    {
      label: "Pending Approvals",
      value: String(pendingApprovals),
      description: "Awaiting manager sign-off",
      icon: Timer,
      iconClass: "text-violet-600 bg-violet-50",
    },
  ];

  return (
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
  );
}
