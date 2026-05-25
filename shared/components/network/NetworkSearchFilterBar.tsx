import { Filter, Search } from "lucide-react";
import {
  RELATIONSHIP_STATUS_OPTIONS,
  SUBCONTRACT_JOB_STATUS_OPTIONS,
  TRADE_TYPE_OPTIONS,
  type NetworkTab,
  type RelationshipStatus,
  type SubcontractJobStatus,
  type TradeType,
} from "@/shared/types/network";

type NetworkSearchFilterBarProps = {
  tab: NetworkTab;
  search: string;
  tradeFilter: TradeType | "all";
  statusFilter: RelationshipStatus | SubcontractJobStatus | "all";
  onSearchChange: (value: string) => void;
  onTradeFilterChange: (value: TradeType | "all") => void;
  onStatusFilterChange: (
    value: RelationshipStatus | SubcontractJobStatus | "all",
  ) => void;
  resultCount: number;
};

const resultLabels: Record<NetworkTab, string> = {
  "my-network": "partner",
  "open-jobs": "job",
  "sent-work": "job",
  "received-work": "job",
  "revenue-tracker": "partner",
};

export function NetworkSearchFilterBar({
  tab,
  search,
  tradeFilter,
  statusFilter,
  onSearchChange,
  onTradeFilterChange,
  onStatusFilterChange,
  resultCount,
}: NetworkSearchFilterBarProps) {
  const isPartnerTab = tab === "my-network";
  const statusOptions = isPartnerTab
    ? RELATIONSHIP_STATUS_OPTIONS
    : SUBCONTRACT_JOB_STATUS_OPTIONS;

  const placeholders: Record<NetworkTab, string> = {
    "my-network":
      "Search partner name, trade, service area, or relationship...",
    "open-jobs": "Search job title, trade, location, or posted by...",
    "sent-work": "Search job, partner, location, or status...",
    "received-work": "Search job, partner, location, or status...",
    "revenue-tracker": "Search partner or trade...",
  };

  const unit = resultLabels[tab];
  const countLabel = `${resultCount} ${resultCount === 1 ? unit : `${unit}s`}`;

  return (
    <div className="border-b border-slate-100 px-4 py-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={placeholders[tab]}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-500/20"
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative shrink-0">
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              value={tradeFilter}
              onChange={(e) =>
                onTradeFilterChange(e.target.value as TradeType | "all")
              }
              className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-10 text-sm font-medium text-slate-700 outline-none transition-colors focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-500/20 sm:w-auto"
            >
              {TRADE_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {tab !== "revenue-tracker" ? (
            <div className="relative shrink-0">
              <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) =>
                  onStatusFilterChange(
                    e.target.value as
                      | RelationshipStatus
                      | SubcontractJobStatus
                      | "all",
                  )
                }
                className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-10 text-sm font-medium text-slate-700 outline-none transition-colors focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-500/20 sm:w-auto"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
      </div>

      <p className="mt-2 text-xs text-slate-500">{countLabel}</p>
    </div>
  );
}
