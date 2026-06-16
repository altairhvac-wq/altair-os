import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Tag,
} from "lucide-react";
import { Customer360Card } from "./Customer360Card";
import { CustomerDetailActionBar } from "./CustomerDetailActionBar";
import { CustomerDetailSectionNav } from "./CustomerDetailSectionNav";
import { JobDetailHashScroll } from "@/shared/components/jobs/JobDetailHashScroll";
import { CustomerBillingHistorySection } from "./CustomerBillingHistorySection";
import { CustomerRecentPhotosSection } from "./CustomerRecentPhotosSection";
import { CustomerRecentReceiptsSection } from "./CustomerRecentReceiptsSection";
import { CustomerCard } from "./CustomerCard";
import { CustomerEditControl } from "./CustomerEditControl";
import { CustomerLifecycleControl } from "./CustomerLifecycleControl";
import { CustomerEquipmentSection } from "./CustomerEquipmentSection";
import { CustomerJobsSection } from "./CustomerJobsSection";
import { OperationalActivityTimeline } from "@/shared/components/operational/OperationalActivityTimeline";
import {
  formatDate,
  type Customer,
} from "@/shared/types/customer";
import type { CustomerDeleteDependencies } from "@/shared/lib/customer-lifecycle";
import {
  isCustomerArchived,
  isCustomerDeleted,
} from "@/shared/lib/customer-lifecycle";
import type { Customer360Data } from "@/shared/lib/customers/customer-360";
import type { CustomerFinancialSummary } from "@/shared/types/customer-financial";
import type { Estimate } from "@/shared/types/estimate";
import type { Invoice } from "@/shared/types/invoice";
import type { Job } from "@/shared/types/job";
import type { CustomerEquipment } from "@/shared/types/customer-equipment";
import type { Expense } from "@/shared/types/expense";
import type { JobAttachment } from "@/shared/types/job-attachment";
import type { OperationalActivity } from "@/shared/types/operational-activity";
import type { InvoicePayment } from "@/shared/types/invoice-payment";
import {
  CUSTOMER_DETAIL_360_ANCHOR,
  CUSTOMER_DETAIL_ACTIVITY_ANCHOR,
} from "@/shared/lib/customers/customer-detail-anchors";
import { MasterDetailPageLayout } from "@/shared/design-system/shell";
import {
  adminCardSectionClass,
  adminDetailsBodyClass,
  adminDetailsClass,
  adminDetailsSummaryClass,
  adminMetaRowClass,
} from "@/shared/lib/admin-density";

type CustomerDetailPageViewProps = {
  customer: Customer;
  jobs: Job[];
  estimates: Estimate[];
  invoices: Invoice[];
  payments: InvoicePayment[];
  activities: OperationalActivity[];
  equipment: CustomerEquipment[];
  recentPhotos: JobAttachment[];
  recentReceipts: Expense[];
  canCreateJob: boolean;
  canManageCustomers: boolean;
  canManageEquipment: boolean;
  canViewBilling: boolean;
  canManageBilling: boolean;
  canViewCompanyExpenses: boolean;
  financialSummary?: CustomerFinancialSummary;
  customer360?: Customer360Data | null;
  deleteDependencies: CustomerDeleteDependencies;
};

export function CustomerDetailPageView({
  customer,
  jobs,
  estimates,
  invoices,
  payments,
  activities,
  equipment,
  recentPhotos,
  recentReceipts,
  canCreateJob,
  canManageCustomers,
  canManageEquipment,
  canViewBilling,
  canManageBilling,
  canViewCompanyExpenses,
  financialSummary,
  customer360,
  deleteDependencies,
}: CustomerDetailPageViewProps) {
  const hasNotes = Boolean(customer.notes?.trim());
  const archived = isCustomerArchived(customer);
  const deleted = isCustomerDeleted(customer);

  return (
    <MasterDetailPageLayout
      backLink={
        <Link
          href="/customers"
          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Customers
        </Link>
      }
    >
      <JobDetailHashScroll />

      <div className={adminCardSectionClass}>
        <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
          <CustomerCard
            customer={customer}
            showRevenueStats={canViewBilling}
            financialSummary={financialSummary}
          />
          <div className="flex flex-col items-end gap-2">
            {customer360 ? (
              <Link
                href={`#${CUSTOMER_DETAIL_360_ANCHOR}`}
                className="text-xs font-medium text-slate-600 transition-colors hover:text-slate-900"
              >
                View Customer 360
              </Link>
            ) : null}
            <CustomerEditControl
              customer={customer}
              canManage={canManageCustomers}
            />
            <CustomerLifecycleControl
              customer={customer}
              deleteDependencies={deleteDependencies}
              canManage={canManageCustomers}
            />
          </div>
        </div>

        {deleted ? (
          <div className="mb-2 rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-900">
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
          <div className="mb-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            This customer is archived and hidden from active customer lists.
          </div>
        ) : null}

        <div className="mt-2 rounded-lg border border-slate-100 bg-slate-50/50 px-2.5 py-2 text-sm text-slate-700">
          <div className={adminMetaRowClass}>
            <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span>
              {customer.address}, {customer.city}, {customer.state}{" "}
              {customer.zip}
            </span>
          </div>
          <div className={`mt-1 ${adminMetaRowClass}`}>
            <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span>Since {formatDate(customer.createdAt)}</span>
          </div>
          {customer.tags.length > 0 ? (
            <div className={`mt-1.5 flex flex-wrap gap-1.5 ${adminMetaRowClass}`}>
              {customer.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-0.5 rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 ring-1 ring-slate-200"
                >
                  <Tag className="h-2.5 w-2.5 text-slate-400" />
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <CustomerDetailSectionNav
        showCustomer360={Boolean(customer360)}
        showBilling={canViewBilling}
      />

      <CustomerDetailActionBar
        customerId={customer.id}
        invoices={invoices}
        canCreateJob={canCreateJob}
        canManageBilling={canManageBilling}
      />

      {customer360 ? (
        <Customer360Card data={customer360} canViewBilling={canViewBilling} />
      ) : null}

      {hasNotes ? (
        <details className={adminDetailsClass}>
          <summary className={adminDetailsSummaryClass}>
            <span>Notes</span>
          </summary>
          <div className={adminDetailsBodyClass}>
            <p className="text-sm leading-snug text-slate-600">{customer.notes}</p>
          </div>
        </details>
      ) : null}

      <CustomerJobsSection
        customerId={customer.id}
        jobs={jobs}
        canCreateJob={canCreateJob}
      />

      <CustomerEquipmentSection
        customerId={customer.id}
        equipment={equipment.filter((item) => item.isActive)}
        canManage={canManageEquipment}
      />

      {canViewBilling ? (
        <CustomerBillingHistorySection
          customerId={customer.id}
          estimates={estimates}
          invoices={invoices}
          payments={payments}
          canManageBilling={canManageBilling}
        />
      ) : null}

      <CustomerRecentPhotosSection
        customerId={customer.id}
        attachments={recentPhotos}
      />

      {canViewCompanyExpenses ? (
        <CustomerRecentReceiptsSection
          customerId={customer.id}
          expenses={recentReceipts}
        />
      ) : null}

      <OperationalActivityTimeline
        activities={activities}
        canViewBilling={canViewBilling}
        sectionId={CUSTOMER_DETAIL_ACTIVITY_ANCHOR}
        sectionClassName="scroll-mt-6"
        description={
          canViewBilling
            ? "Jobs, billing, and account events"
            : "Jobs, equipment, and account events"
        }
        emptyDescription={
          canViewBilling
            ? "Activity will appear here as work progresses."
            : "Activity will appear here as work progresses."
        }
      />
    </MasterDetailPageLayout>
  );
}
