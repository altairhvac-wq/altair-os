import Link from "next/link";
import { Calendar, Mail, MapPin, Phone, Tag } from "lucide-react";
import { CustomerEditControl } from "../CustomerEditControl";
import { CustomerLifecycleControl } from "../CustomerLifecycleControl";
import { CustomerStatusBadge } from "../CustomerStatusBadge";
import { DemoDisplayName } from "@/shared/components/display/DemoDisplayName";
import { northStarDetailTokens as dt } from "@/shared/design-system/north-star/tokens";
import {
  CUSTOMER_DETAIL_360_ANCHOR,
} from "@/shared/lib/customers/customer-detail-anchors";
import type { CustomerDeleteDependencies } from "@/shared/lib/customer-lifecycle";
import type { Customer360Data } from "@/shared/lib/customers/customer-360";
import type { CustomerFinancialSummary } from "@/shared/types/customer-financial";
import {
  formatCurrency,
  formatDate,
  getCustomerInitials,
  type Customer,
} from "@/shared/types/customer";

type CustomerDetailNorthStarHeroProps = {
  customer: Customer;
  financialSummary?: CustomerFinancialSummary;
  canViewBilling: boolean;
  canManageCustomers: boolean;
  customer360?: Customer360Data | null;
  deleteDependencies: CustomerDeleteDependencies;
  deleted: boolean;
  archived: boolean;
};

export function CustomerDetailNorthStarHero({
  customer,
  financialSummary,
  canViewBilling,
  canManageCustomers,
  customer360,
  deleteDependencies,
  deleted,
  archived,
}: CustomerDetailNorthStarHeroProps) {
  const showFinancialSummary = canViewBilling && financialSummary != null;
  const location = `${customer.city}, ${customer.state}`;

  return (
    <div className={dt.heroShell}>
      <div aria-hidden="true" className={dt.heroAccentRail} />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <div className={dt.heroAvatar}>{getCustomerInitials(customer.name)}</div>

          <div className="min-w-0 flex-1">
            <p className={dt.heroEyebrow}>Customer 360</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h1 className={dt.heroTitle}>
                <DemoDisplayName>{customer.name}</DemoDisplayName>
              </h1>
              <CustomerStatusBadge status={customer.status} />
            </div>

            {customer.company ? (
              <p className={dt.heroCompany}>{customer.company}</p>
            ) : null}

            <div className="mt-3 space-y-1.5">
              <div className={`flex items-center gap-2 ${dt.heroMeta}`}>
                <Mail className={dt.heroMetaIcon} />
                <span className="truncate">{customer.email || "No email on file"}</span>
              </div>
              <div className={`flex items-center gap-2 ${dt.heroMeta}`}>
                <Phone className={dt.heroMetaIcon} />
                <span>{customer.phone || "No phone on file"}</span>
              </div>
              <div className={`flex items-center gap-2 ${dt.heroMeta}`}>
                <MapPin className={dt.heroMetaIcon} />
                <span className="truncate">{location}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          {customer360 ? (
            <Link href={`#${CUSTOMER_DETAIL_360_ANCHOR}`} className={dt.heroLink}>
              View Customer 360
            </Link>
          ) : null}
          <CustomerEditControl
            customer={customer}
            canManage={canManageCustomers}
            northStar
          />
          <CustomerLifecycleControl
            customer={customer}
            deleteDependencies={deleteDependencies}
            canManage={canManageCustomers}
            northStar
          />
        </div>
      </div>

      {deleted ? (
        <div className={`mt-3 ${dt.bannerDeleted}`}>
          This customer is in Recently Deleted and hidden from customer lists.
          {customer.deletedAt ? (
            <>
              {" "}
              Deleted {formatDate(customer.deletedAt)}
              {customer.deleteAfter
                ? ` · eligible for permanent deletion after ${formatDate(customer.deleteAfter)}`
                : null}
              .
            </>
          ) : null}
        </div>
      ) : archived ? (
        <div className={`mt-3 ${dt.bannerArchived}`}>
          This customer is archived and hidden from active customer lists.
        </div>
      ) : null}

      <div className={dt.metaStrip}>
        <div className={dt.metaRow}>
          <MapPin className={dt.metaIcon} />
          <span>
            {customer.address}, {customer.city}, {customer.state} {customer.zip}
          </span>
        </div>
        <div className={`mt-1 ${dt.metaRow}`}>
          <Calendar className={dt.metaIcon} />
          <span>Since {formatDate(customer.createdAt)}</span>
        </div>
        {customer.tags.length > 0 ? (
          <div className={`mt-1.5 flex flex-wrap gap-1.5 ${dt.metaRow}`}>
            {customer.tags.map((tag) => (
              <span key={tag} className={dt.tagChip}>
                <Tag className="h-2.5 w-2.5 text-[#D6BE78]" />
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 border-t border-[rgba(201,164,77,0.14)] pt-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className={dt.heroStatLabel}>Jobs</p>
          <p className={dt.heroStatValue}>{customer.totalJobs}</p>
        </div>
        {showFinancialSummary ? (
          <>
            <div>
              <p className={dt.heroStatLabel}>Total invoiced</p>
              <p className={dt.heroStatValue}>
                {formatCurrency(financialSummary.totalInvoiced)}
              </p>
            </div>
            <div>
              <p className={dt.heroStatLabel}>Total collected</p>
              <p className={dt.heroStatValue}>
                {formatCurrency(financialSummary.totalCollected)}
              </p>
            </div>
            <div>
              <p className={dt.heroStatLabel}>Balance due</p>
              <p className={dt.heroStatValue}>
                {formatCurrency(financialSummary.outstandingBalance)}
              </p>
            </div>
          </>
        ) : canViewBilling ? (
          <>
            <div>
              <p className={dt.heroStatLabel}>Revenue</p>
              <p className={dt.heroStatValue}>
                {formatCurrency(customer.totalRevenue)}
              </p>
            </div>
            <div>
              <p className={dt.heroStatLabel}>Last service</p>
              <p className={`${dt.heroStatValue} text-base`}>
                {customer.lastServiceDate
                  ? formatDate(customer.lastServiceDate)
                  : "—"}
              </p>
            </div>
          </>
        ) : (
          <div>
            <p className={dt.heroStatLabel}>Last service</p>
            <p className={`${dt.heroStatValue} text-base`}>
              {customer.lastServiceDate
                ? formatDate(customer.lastServiceDate)
                : "—"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
