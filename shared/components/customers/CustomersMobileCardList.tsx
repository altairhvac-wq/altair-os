"use client";

import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { DemoDisplayName } from "@/shared/components/display/DemoDisplayName";
import { useFormatDemoDisplayName } from "@/shared/components/display/FounderMarketingDisplayContext";
import { adminListRowClass } from "@/shared/lib/admin-density";
import { isCustomerArchived, isCustomerDeleted } from "@/shared/lib/customer-lifecycle";
import {
  formatCustomerStatusLabel,
  getCustomerInitials,
  type Customer,
} from "@/shared/types/customer";
import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";

type CustomersMobileCardListProps = {
  customers: Customer[];
  northStar?: boolean;
};

const statusStyles: Record<Customer["status"], string> = {
  active: "bg-emerald-50 text-emerald-700",
  inactive: "bg-slate-100 text-slate-600",
};

const northStarStatusStyles: Record<Customer["status"], string> = {
  active: "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200/80",
  inactive: "bg-[#F1E7D2] text-[#4F4638] ring-1 ring-[rgba(138,99,36,0.12)]",
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
  northStar = false,
}: CustomersMobileCardListProps) {
  const router = useRouter();
  const formatDisplayName = useFormatDemoDisplayName();

  return (
    <ul
      className={`max-w-full min-w-0 overflow-hidden md:hidden ${
        northStar ? "divide-y divide-[rgba(79,70,56,0.08)]" : "divide-y divide-slate-100"
      }`}
    >
      {customers.map((customer) => {
        const contactLine = formatCustomerContactLine(customer);

        return (
          <li key={customer.id} className="min-w-0 max-w-full">
            <button
              type="button"
              onClick={() => router.push(`/customers/${customer.id}`)}
              className={
                northStar
                  ? "flex w-full min-w-0 max-w-full items-start gap-3 px-3 py-3 text-left transition-colors"
                  : `${adminListRowClass} px-3 py-3`
              }
              aria-label={`Open customer ${customer.name}`}
            >
              <div
                className={
                  northStar
                    ? lt.tableAvatar
                    : "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-400 text-xs font-bold text-white"
                }
              >
                {getCustomerInitials(formatDisplayName(customer.name))}
              </div>

              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                  <p
                    className={
                      northStar
                        ? `min-w-0 truncate ${lt.tablePrimaryText}`
                        : "min-w-0 truncate text-sm font-semibold text-slate-900"
                    }
                  >
                    <DemoDisplayName>{customer.name}</DemoDisplayName>
                  </p>
                  {isCustomerDeleted(customer) ? (
                    <span
                      className={
                        northStar
                          ? lt.badgeDeleted
                          : "inline-flex shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-800"
                      }
                    >
                      Deleted
                    </span>
                  ) : isCustomerArchived(customer) ? (
                    <span
                      className={
                        northStar
                          ? lt.badgeArchived
                          : "inline-flex shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600"
                      }
                    >
                      Archived
                    </span>
                  ) : null}
                  <span
                    className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                      northStar
                        ? northStarStatusStyles[customer.status]
                        : statusStyles[customer.status]
                    }`}
                  >
                    {formatCustomerStatusLabel(customer.status)}
                  </span>
                </div>
                {contactLine ? (
                  <p
                    className={
                      northStar
                        ? `mt-0.5 truncate ${lt.tableSecondaryText}`
                        : "mt-0.5 truncate text-xs text-slate-500"
                    }
                  >
                    {contactLine}
                  </p>
                ) : null}
              </div>

              <ChevronRight
                className={`mt-1 h-4 w-4 shrink-0 ${
                  northStar ? "text-[#8A6324]/50" : "text-slate-300"
                }`}
              />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
