import { adminListRowClass } from "@/shared/lib/admin-density";
import Link from "next/link";
import { ChevronRight, MapPin } from "lucide-react";
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
      className={`${adminListRowClass} items-center`}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-xs font-bold text-white">
        {getCustomerInitials(customer.name)}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-slate-900">
          {customer.name}
          {customer.phone ? (
            <span className="font-normal text-slate-500">
              {" · "}
              {customer.phone}
            </span>
          ) : null}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
          {customer.company ? (
            <span className="truncate">{customer.company}</span>
          ) : null}
          {location ? (
            <span className="inline-flex min-w-0 items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{location}</span>
            </span>
          ) : null}
        </div>
      </div>

      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
    </Link>
  );
}
