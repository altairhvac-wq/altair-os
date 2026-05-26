import { Crown, Users } from "lucide-react";
import { formatCurrency, formatDate } from "@/shared/types/customer";
import {
  formatPercent,
  type TechnicianPerformance,
  type TopCustomer,
} from "@/shared/types/analytics";

type TechnicianPerformanceTableProps = {
  technicians: TechnicianPerformance[];
  topCustomers: TopCustomer[];
};

export function TechnicianPerformanceTable({
  technicians,
  topCustomers,
}: TechnicianPerformanceTableProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <section className="flex flex-col overflow-hidden admin-card">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900">
              Top technicians
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            Jobs, revenue, and utilization — no pay data shown
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3">Technician</th>
                <th className="px-5 py-3">Jobs</th>
                <th className="px-5 py-3">Revenue</th>
                <th className="px-5 py-3">Utilization</th>
                <th className="px-5 py-3">On-time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {technicians.map((tech, index) => (
                <tr key={tech.id} className="hover:bg-slate-50/80">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-[10px] font-bold text-white">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-semibold text-slate-900">
                          {tech.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          Avg {formatCurrency(tech.averageJobValue)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 font-semibold text-slate-700">
                    {tech.jobsCompleted}
                  </td>
                  <td className="px-5 py-3 font-bold text-slate-900">
                    {formatCurrency(tech.revenue)}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-cyan-500"
                          style={{ width: `${tech.utilizationPercent}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-slate-600">
                        {formatPercent(tech.utilizationPercent)}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-emerald-700">
                    {formatPercent(tech.onTimeRate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-col overflow-hidden admin-card">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-amber-500" />
            <h3 className="text-base font-bold text-slate-900">
              Top customers
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            Highest revenue accounts in this period
          </p>
        </div>

        <ol className="divide-y divide-slate-50 p-2">
          {topCustomers.map((customer, index) => (
            <li
              key={customer.id}
              className="flex items-center gap-3 rounded-xl p-3 hover:bg-slate-50/80"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-xs font-bold text-amber-700">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-900">
                  {customer.name}
                </p>
                <p className="text-xs text-slate-500">
                  {customer.jobsCompleted} jobs · Last{" "}
                  {formatDate(customer.lastServiceDate)}
                </p>
              </div>
              <p className="shrink-0 text-sm font-bold text-slate-900">
                {formatCurrency(customer.revenue)}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
