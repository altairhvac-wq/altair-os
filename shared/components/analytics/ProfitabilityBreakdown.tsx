import { PieChart, Wallet } from "lucide-react";
import { formatCurrency } from "@/shared/types/customer";
import {
  formatPercent,
  type ExpenseCategoryMetric,
  type InvoicePaymentBreakdown,
  type ProfitByJobType,
} from "@/shared/types/analytics";

type ProfitabilityBreakdownProps = {
  invoiceBreakdown: InvoicePaymentBreakdown;
  expensesByCategory: ExpenseCategoryMetric[];
  profitByJobType: ProfitByJobType[];
};

export function ProfitabilityBreakdown({
  invoiceBreakdown,
  expensesByCategory,
  profitByJobType,
}: ProfitabilityBreakdownProps) {
  const invoiceTotal =
    invoiceBreakdown.paidAmount + invoiceBreakdown.unpaidAmount;
  const paidPercent = invoiceTotal
    ? (invoiceBreakdown.paidAmount / invoiceTotal) * 100
    : 0;

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-emerald-600" />
          <h3 className="text-base font-bold text-slate-900">
            Paid vs unpaid
          </h3>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Invoice collection status
        </p>

        <div className="mt-5">
          <div className="flex h-4 overflow-hidden rounded-full bg-slate-100">
            <div
              className="bg-emerald-500"
              style={{ width: `${paidPercent}%` }}
            />
            <div
              className="bg-amber-400"
              style={{ width: `${100 - paidPercent}%` }}
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
              <p className="text-xs font-bold text-emerald-700">Paid</p>
              <p className="mt-1 text-lg font-black text-slate-900">
                {formatCurrency(invoiceBreakdown.paidAmount)}
              </p>
              <p className="text-xs text-slate-500">
                {invoiceBreakdown.paidCount} invoices
              </p>
            </div>
            <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3">
              <p className="text-xs font-bold text-amber-700">Unpaid</p>
              <p className="mt-1 text-lg font-black text-slate-900">
                {formatCurrency(invoiceBreakdown.unpaidAmount)}
              </p>
              <p className="text-xs text-slate-500">
                {invoiceBreakdown.unpaidCount} invoices
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <PieChart className="h-4 w-4 text-rose-600" />
          <h3 className="text-base font-bold text-slate-900">
            Expenses by category
          </h3>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Where operating spend is going
        </p>

        <ul className="mt-5 space-y-3">
          {expensesByCategory.map((item) => (
            <li key={item.category}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-700">
                  {item.category}
                </span>
                <span className="font-bold text-slate-900">
                  {formatCurrency(item.amount)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-rose-400 to-orange-400"
                  style={{ width: `${item.percentOfTotal}%` }}
                />
              </div>
              <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
                {formatPercent(item.percentOfTotal, 1)} of total
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-violet-600" />
          <h3 className="text-base font-bold text-slate-900">
            Profit by job type
          </h3>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Estimated margin by service line
        </p>

        <ul className="mt-5 space-y-3">
          {profitByJobType.map((item) => (
            <li
              key={item.type}
              className="rounded-xl border border-slate-100 bg-slate-50/60 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-slate-900">{item.type}</p>
                <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                  {formatPercent(item.marginPercent, 1)} margin
                </span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-slate-400">Revenue</p>
                  <p className="font-bold text-slate-800">
                    {formatCurrency(item.revenue)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Expenses</p>
                  <p className="font-bold text-rose-700">
                    {formatCurrency(item.expenses)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Profit</p>
                  <p className="font-bold text-emerald-700">
                    {formatCurrency(item.profit)}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
