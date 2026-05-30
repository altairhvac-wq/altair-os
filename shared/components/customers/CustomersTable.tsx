"use client";

import { useRouter } from "next/navigation";
import {
  formatCurrency,
  formatDate,
  getCustomerInitials,
  type Customer,
} from "@/shared/types/customer";

type CustomersTableProps = {
  customers: Customer[];
  showRevenueStats?: boolean;
};

const statusStyles: Record<Customer["status"], string> = {
  active: "bg-emerald-50 text-emerald-700",
  lead: "bg-amber-50 text-amber-700",
  inactive: "bg-slate-100 text-slate-600",
};

export function CustomersTable({
  customers,
  showRevenueStats = true,
}: CustomersTableProps) {
  const router = useRouter();

  return (
    <div className="max-w-full overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100/90 bg-white text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th className="admin-table-cell">Customer</th>
            <th className="admin-table-cell">Status</th>
            <th className="admin-table-cell">Location</th>
            <th className="admin-table-cell text-right">Jobs</th>
            {showRevenueStats ? (
              <th className="admin-table-cell text-right">Revenue</th>
            ) : null}
            <th className="hidden admin-table-cell lg:table-cell">Last service</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {customers.map((customer) => (
              <tr
                key={customer.id}
                onClick={() => router.push(`/customers/${customer.id}`)}
                className="cursor-pointer transition-colors hover:bg-slate-50"
              >
                <td className="admin-table-cell">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-400 text-xs font-bold text-white">
                      {getCustomerInitials(customer.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">
                        {customer.name}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {customer.company ?? customer.email}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="admin-table-cell">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusStyles[customer.status]}`}
                  >
                    {customer.status}
                  </span>
                </td>
                <td className="admin-table-cell text-slate-600">
                  {customer.city}, {customer.state}
                </td>
                <td className="admin-table-cell text-right font-medium text-slate-900">
                  {customer.totalJobs}
                </td>
                {showRevenueStats ? (
                  <td className="admin-table-cell text-right font-medium text-slate-900">
                    {formatCurrency(customer.totalRevenue)}
                  </td>
                ) : null}
                <td className="hidden admin-table-cell text-slate-500 lg:table-cell">
                  {customer.lastServiceDate
                    ? formatDate(customer.lastServiceDate)
                    : "—"}
                </td>
              </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
