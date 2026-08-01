import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Customer360Card } from "./Customer360Card";
import { CustomerDetailInfoPanel } from "./CustomerDetailInfoPanel";
import { CustomerDetailStatRow } from "./CustomerDetailStatRow";
import { CustomerDetailTabs } from "./CustomerDetailTabs";
import { JobDetailHashScroll } from "@/shared/components/jobs/JobDetailHashScroll";
import { buildCustomerProfileStats } from "@/shared/lib/customers/customer-profile-stats";
import type { CustomerDeleteDependencies } from "@/shared/lib/customer-lifecycle";
import {
  isCustomerArchived,
  isCustomerDeleted,
} from "@/shared/lib/customer-lifecycle";
import type { Customer360Data } from "@/shared/lib/customers/customer-360";
import type { Customer } from "@/shared/types/customer";
import type { CustomerEquipment } from "@/shared/types/customer-equipment";
import type { Estimate } from "@/shared/types/estimate";
import type { Expense } from "@/shared/types/expense";
import type { Invoice } from "@/shared/types/invoice";
import type { InvoicePayment } from "@/shared/types/invoice-payment";
import type { Job } from "@/shared/types/job";
import type { JobAttachment } from "@/shared/types/job-attachment";
import type { OperationalActivity } from "@/shared/types/operational-activity";
import { MasterDetailPageLayout } from "@/shared/design-system/shell";
import { altairMcGridGapClass } from "@/shared/design-system/components";

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
  customer360,
  deleteDependencies,
}: CustomerDetailPageViewProps) {
  const archived = isCustomerArchived(customer);
  const deleted = isCustomerDeleted(customer);
  const profileStats = buildCustomerProfileStats({
    payments,
    jobs,
    lastServiceDate: customer.lastServiceDate,
    canViewBilling,
  });
  const showOpportunities = Boolean(
    customer360 && customer360.opportunities.length > 0,
  );

  return (
    <MasterDetailPageLayout canvasWidth="detailWide">
      <JobDetailHashScroll />

      <div className={`flex flex-col ${altairMcGridGapClass}`}>
        <CustomerDetailTabs
          customer={customer}
          jobs={jobs}
          estimates={estimates}
          invoices={invoices}
          payments={payments}
          activities={activities}
          equipment={equipment}
          jobFiles={recentPhotos}
          expenseReceipts={recentReceipts}
          canCreateJob={canCreateJob}
          canManageEquipment={canManageEquipment}
          canViewBilling={canViewBilling}
          canManageBilling={canManageBilling}
          canViewCompanyExpenses={canViewCompanyExpenses}
          backLink={
            <Link
              href="/customers"
              className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-altair-ink-on-paper-secondary transition-colors hover:text-altair-ink-on-paper"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Customers
            </Link>
          }
          sideRail={
            <div className={`flex flex-col ${altairMcGridGapClass}`}>
              <CustomerDetailInfoPanel
                customer={customer}
                canManageCustomers={canManageCustomers}
                deleteDependencies={deleteDependencies}
                deleted={deleted}
                archived={archived}
              />
              {showOpportunities && customer360 ? (
                <Customer360Card
                  data={customer360}
                  canViewBilling={canViewBilling}
                  variant="opportunities"
                />
              ) : null}
            </div>
          }
          beforePanel={<CustomerDetailStatRow stats={profileStats} />}
        />
      </div>
    </MasterDetailPageLayout>
  );
}
