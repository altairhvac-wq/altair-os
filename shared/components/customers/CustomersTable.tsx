import {
  formatCurrency,
  formatDate,
  getCustomerInitials,
  type Customer,
} from "@/shared/types/customer";

type CustomersTableProps = {
  customers: Customer[];
  selectedId: string | null;
  onSelect: (customer: Customer) => void;
};

const statusStyles: Record<Customer["status"], string> = {
  active: "bg-emerald-50 text-emerald-700",
  lead: "bg-amber-50 text-amber-700",
  inactive: "bg-slate-100 text-slate-600",
};

export function CustomersTable({
  customers,
  selectedId,
  onSelect,
}: CustomersTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3">Customer</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Location</th>
            <th className="px-4 py-3 text-right">Jobs</th>
            <th className="px-4 py-3 text-right">Revenue</th>
            <th className="hidden px-4 py-3 lg:table-cell">Last service</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {customers.map((customer) => {
            const isSelected = customer.id === selectedId;

            return (
              <tr
                key={customer.id}
                onClick={() => onSelect(customer)}
                className={`cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-cyan-50/70"
                    : "hover:bg-slate-50"
                }`}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                        isSelected ? "bg-cyan-600" : "bg-slate-400"
                      }`}
                    >
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
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusStyles[customer.status]}`}
                  >
                    {customer.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {customer.city}, {customer.state}
                </td>
                <td className="px-4 py-3 text-right font-medium text-slate-900">
                  {customer.totalJobs}
                </td>
                <td className="px-4 py-3 text-right font-medium text-slate-900">
                  {formatCurrency(customer.totalRevenue)}
                </td>
                <td className="hidden px-4 py-3 text-slate-500 lg:table-cell">
                  {customer.lastServiceDate
                    ? formatDate(customer.lastServiceDate)
                    : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
