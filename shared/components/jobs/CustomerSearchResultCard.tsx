import Link from "next/link";
import { ChevronRight, MapPin, Phone } from "lucide-react";
import {
  getCustomerInitials,
  type Customer,
} from "@/shared/types/customer";

type CustomerSearchResultCardProps = {
  customer: Customer;
};

export function CustomerSearchResultCard({
  customer,
}: CustomerSearchResultCardProps) {
  const location = [customer.city, customer.state].filter(Boolean).join(", ");

  return (
    <Link
      href={`/customers/${customer.id}`}
      className="flex min-w-0 items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/20"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-xs font-bold text-white">
        {getCustomerInitials(customer.name)}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-slate-900">
          {customer.name}
        </p>
        {customer.company ? (
          <p className="truncate text-xs text-slate-500">{customer.company}</p>
        ) : null}
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
          {customer.phone ? (
            <span className="inline-flex min-w-0 items-center gap-1">
              <Phone className="h-3 w-3 shrink-0" />
              <span className="truncate">{customer.phone}</span>
            </span>
          ) : null}
          {location ? (
            <span className="inline-flex min-w-0 items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{location}</span>
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-cyan-600">
          View customer history and jobs
        </p>
      </div>

      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
    </Link>
  );
}
