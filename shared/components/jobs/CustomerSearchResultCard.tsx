import Link from "next/link";
import { formatPhoneForDisplay } from "@/shared/lib/phone";
import { ChevronRight, MapPin } from "lucide-react";
import {
  getCustomerInitials,
  type Customer,
} from "@/shared/types/customer";
import { jobMissionClasses as jm } from "./job-list-presentation";

type CustomerSearchResultCardProps = {
  customer: Customer;
  /** @deprecated Mission Control unifies presentation; retained for call-site compatibility. */
  northStar?: boolean;
};

export function CustomerSearchResultCard({
  customer,
}: CustomerSearchResultCardProps) {
  const location = [customer.city, customer.state].filter(Boolean).join(", ");

  return (
    <Link
      href={`/customers/${customer.id}`}
      className="flex items-center gap-3 px-3 py-3 transition-colors hover:bg-altair-paper-subtle/70"
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-altair-stone text-xs font-bold text-altair-ink-on-paper ring-1 ring-altair-border"
      >
        {getCustomerInitials(customer.name)}
      </div>

      <div className="min-w-0 flex-1">
        <p className={jm.primaryText}>
          {customer.name}
          {customer.phone ? (
            <span className={`font-normal ${jm.secondaryText}`}>
              {" · "}
              {formatPhoneForDisplay(customer.phone)}
            </span>
          ) : null}
        </p>
        <div
          className={`mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 ${jm.secondaryText}`}
        >
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

      <ChevronRight className="h-4 w-4 shrink-0 text-altair-ink-on-paper-muted/60" />
    </Link>
  );
}
