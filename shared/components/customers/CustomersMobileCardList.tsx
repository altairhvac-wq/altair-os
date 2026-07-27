"use client";

import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { DemoDisplayName } from "@/shared/components/display/DemoDisplayName";
import { useFormatDemoDisplayName } from "@/shared/components/display/FounderMarketingDisplayContext";
import { isCustomerArchived, isCustomerDeleted } from "@/shared/lib/customer-lifecycle";
import { getCustomerInitials, type Customer } from "@/shared/types/customer";
import { CustomerStatusBadge } from "./CustomerStatusBadge";
import {
  customerMissionClasses as cm,
  resolveCustomerListCue,
} from "./customer-list-presentation";

type CustomersMobileCardListProps = {
  customers: Customer[];
  /** @deprecated Mission Briefing unifies presentation; retained for call-site compatibility. */
  northStar?: boolean;
};

function formatCustomerContactLine(customer: Customer): string {
  const company = customer.company?.trim();
  if (company) {
    return company;
  }

  return [customer.email, customer.phone]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .join(" · ");
}

export function CustomersMobileCardList({
  customers,
}: CustomersMobileCardListProps) {
  const router = useRouter();
  const formatDisplayName = useFormatDemoDisplayName();

  return (
    <ul
      className={`max-w-full min-w-0 divide-y divide-altair-border/50 overflow-hidden md:hidden ${cm.listShell}`}
    >
      {customers.map((customer) => {
        const contactLine = formatCustomerContactLine(customer);
        const cue = resolveCustomerListCue(customer);

        return (
          <li key={customer.id} className="min-w-0 max-w-full">
            <button
              type="button"
              onClick={() => router.push(`/customers/${customer.id}`)}
              className="flex w-full min-w-0 max-w-full items-start gap-3 px-3 py-3.5 text-left transition-colors hover:bg-altair-paper-subtle/70"
              aria-label={`Open customer ${customer.name}`}
            >
              <div className={cm.avatar}>
                {getCustomerInitials(formatDisplayName(customer.name))}
              </div>

              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                  <p className={`min-w-0 truncate ${cm.primaryText}`}>
                    <DemoDisplayName>{customer.name}</DemoDisplayName>
                  </p>
                  {isCustomerDeleted(customer) ? (
                    <span className={cm.badgeDeleted}>Deleted</span>
                  ) : isCustomerArchived(customer) ? (
                    <span className={cm.badgeArchived}>Archived</span>
                  ) : null}
                  <CustomerStatusBadge status={customer.status} className="shrink-0" />
                </div>
                {contactLine ? (
                  <p className={`mt-0.5 truncate ${cm.secondaryText}`}>
                    {contactLine}
                  </p>
                ) : null}
                <p
                  className={`mt-1 truncate text-xs ${
                    cue.tone === "warning"
                      ? "font-medium text-altair-warning-foreground"
                      : "text-altair-ink-on-paper-muted"
                  }`}
                >
                  {cue.label}
                </p>
              </div>

              <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-altair-ink-on-paper-muted/60" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
