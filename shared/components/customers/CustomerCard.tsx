import { Mail, MapPin, Phone } from "lucide-react";
import {
  formatCurrency,
  formatDate,
  getCustomerInitials,
  type Customer,
} from "@/shared/types/customer";

type CustomerCardProps = {
  customer: Customer;
  compact?: boolean;
};

const statusStyles: Record<Customer["status"], string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  lead: "bg-amber-50 text-amber-700 ring-amber-600/20",
  inactive: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

export function CustomerCard({ customer, compact = false }: CustomerCardProps) {
  const location = `${customer.city}, ${customer.state}`;

  return (
    <div className={compact ? "space-y-4" : "rounded-xl border border-slate-100 bg-slate-50/50 p-4"}>
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-sm font-bold text-white">
          {getCustomerInitials(customer.name)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-bold text-slate-900">
              {customer.name}
            </h3>
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset ${statusStyles[customer.status]}`}
            >
              {customer.status}
            </span>
          </div>

          {customer.company ? (
            <p className="mt-0.5 truncate text-sm text-slate-500">
              {customer.company}
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2 text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 shrink-0 text-slate-400" />
          <span className="truncate">{customer.email}</span>
        </div>
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 shrink-0 text-slate-400" />
          <span>{customer.phone}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
          <span className="truncate">{location}</span>
        </div>
      </div>

      {!compact ? (
        <div className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-100 pt-4">
          <div>
            <p className="text-xs font-medium text-slate-500">Jobs</p>
            <p className="mt-0.5 text-lg font-bold text-slate-900">
              {customer.totalJobs}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Revenue</p>
            <p className="mt-0.5 text-lg font-bold text-slate-900">
              {formatCurrency(customer.totalRevenue)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Last service</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-900">
              {customer.lastServiceDate
                ? formatDate(customer.lastServiceDate)
                : "—"}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
