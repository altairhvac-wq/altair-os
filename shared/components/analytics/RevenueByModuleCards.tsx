import {
  ArrowDownRight,
  Briefcase,
  DollarSign,
  FileText,
  Network,
  Receipt,
  TrendingUp,
} from "lucide-react";
import { formatCurrency } from "@/shared/types/customer";
import { formatPercent, type RevenueModule } from "@/shared/types/analytics";

type RevenueByModuleCardsProps = {
  modules: RevenueModule[];
};

const iconMap = {
  jobs: Briefcase,
  invoices: Receipt,
  estimates: FileText,
  network: Network,
  expenses: DollarSign,
};

export function RevenueByModuleCards({ modules }: RevenueByModuleCardsProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-violet-600" />
          <h3 className="text-base font-bold text-slate-900">
            Revenue by module
          </h3>
        </div>
        <p className="text-xs text-slate-500">
          Cross-module financial activity in Altair OS
        </p>
      </div>

      <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-5">
        {modules.map((module) => {
          const Icon = iconMap[module.iconKey];
          const isPositive = module.changePercent >= 0;

          return (
            <article
              key={module.module}
              className="rounded-xl border border-slate-100 bg-slate-50/50 p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow-sm">
                  <Icon className="h-4 w-4 text-slate-700" />
                </div>
                <span
                  className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    isPositive
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-rose-50 text-rose-700"
                  }`}
                >
                  {isPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {formatPercent(Math.abs(module.changePercent), 1)}
                </span>
              </div>
              <p className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-400">
                {module.module}
              </p>
              <p className="mt-1 text-xl font-black text-slate-900">
                {formatCurrency(module.revenue)}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
