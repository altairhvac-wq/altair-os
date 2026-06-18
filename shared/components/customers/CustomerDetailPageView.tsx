import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Tag,
} from "lucide-react";
import { isNorthStarShellEnabled } from "@/lib/beta/north-star-shell";
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
import { CustomerDetailNorthStarHero } from "./north-star-m3b";
import { northStarDetailTokens as dt } from "@/shared/design-system/north-star/tokens";
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

function CustomerNotesBlock({
  notes,
  northStar,
}: {
  notes: string;
  northStar: boolean;
}) {
  if (northStar) {
    return (
      <details className={dt.notesDetails}>
        <summary className={dt.notesSummary}>
          <span>Notes</span>
        </summary>
        <div className={dt.notesBody}>
          <p className="text-sm font-medium leading-snug text-[#4F4638]">{notes}</p>
        </div>
      </details>
    );
  }

  return (
    <details className={adminDetailsClass}>
      <summary className={adminDetailsSummaryClass}>
        <span>Notes</span>
      </summary>
      <div className={adminDetailsBodyClass}>
        <p className="text-sm leading-snug text-slate-600">{notes}</p>
      </div>
    </details>
  );
}

function NorthStarWorkspace({
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
  canManageEquipment,
  canViewBilling,
  canManageBilling,
  canViewCompanyExpenses,
  customer360,
  hasNotes,
}: {
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
  canManageEquipment: boolean;
  canViewBilling: boolean;
  canManageBilling: boolean;
  canViewCompanyExpenses: boolean;
  customer360?: Customer360Data | null;
  hasNotes: boolean;
}) {
  const activeEquipment = equipment.filter((item) => item.isActive);
  const activityDescription = canViewBilling
    ? "Jobs, billing, and account events"
    : "Jobs, equipment, and account events";

  const mainColumn = (
    <>
      <CustomerJobsSection
        customerId={customer.id}
        jobs={jobs}
        canCreateJob={canCreateJob}
        northStar
        compact
      />

      {canViewBilling ? (
        <CustomerBillingHistorySection
          customerId={customer.id}
          estimates={estimates}
          invoices={invoices}
          payments={payments}
          canManageBilling={canManageBilling}
          northStar
          compact
        />
      ) : null}

      {customer360 ? (
        <Customer360Card
          data={customer360}
          canViewBilling={canViewBilling}
          northStar
          variant="opportunities"
        />
      ) : null}

      <CustomerRecentPhotosSection
        customerId={customer.id}
        attachments={recentPhotos}
        northStar
      />

      {canViewCompanyExpenses ? (
        <CustomerRecentReceiptsSection
          customerId={customer.id}
          expenses={recentReceipts}
          northStar
        />
      ) : null}
    </>
  );

  const sideColumn = (
    <>
      {customer360 ? (
        <Customer360Card
          data={customer360}
          canViewBilling={canViewBilling}
          northStar
          variant="facts"
          heroCoversIdentity
        />
      ) : (
        <section
          className={`${dt.compactSectionSurface} scroll-mt-6`}
          id={CUSTOMER_DETAIL_360_ANCHOR}
        >
          <h2 className={dt.sectionTitle}>Customer facts</h2>
          <p className={dt.sectionSubtitle}>Account details</p>
          <div className={`mt-2 ${dt.innerCard}`}>
            <div className={dt.ivoryMetaRow}>
              <MapPin className={dt.metaIcon} />
              <span className={dt.ivoryCardSecondary}>
                {customer.address}, {customer.city}, {customer.state} {customer.zip}
              </span>
            </div>
            <div className={`mt-1 ${dt.ivoryMetaRow}`}>
              <Calendar className={dt.metaIcon} />
              <span className={dt.ivoryCardSecondary}>
                Customer since {formatDate(customer.createdAt)}
              </span>
            </div>
            {customer.tags.length > 0 ? (
              <div className={`mt-1.5 flex flex-wrap gap-1.5 ${dt.ivoryMetaRow}`}>
                {customer.tags.map((tag) => (
                  <span key={tag} className={dt.ivoryTagChip}>
                    <Tag className="h-2.5 w-2.5 text-[#8A6324]" />
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </section>
      )}

      <CustomerEquipmentSection
        customerId={customer.id}
        equipment={activeEquipment}
        canManage={canManageEquipment}
        northStar
        compact
      />

      {hasNotes ? (
        <CustomerNotesBlock notes={customer.notes!} northStar />
      ) : null}

      <OperationalActivityTimeline
        activities={activities}
        canViewBilling={canViewBilling}
        sectionId={CUSTOMER_DETAIL_ACTIVITY_ANCHOR}
        sectionClassName="scroll-mt-6"
        northStar
        compact
        description={activityDescription}
        emptyDescription="Activity will appear here as work progresses."
      />
    </>
  );

  return (
    <>
      <div className="flex flex-col gap-3 lg:hidden">
        {customer360 ? (
          <Customer360Card
            data={customer360}
            canViewBilling={canViewBilling}
            northStar
            variant="facts"
            heroCoversIdentity
          />
        ) : null}

        <CustomerJobsSection
          customerId={customer.id}
          jobs={jobs}
          canCreateJob={canCreateJob}
          northStar
          compact
        />

        {canViewBilling ? (
          <CustomerBillingHistorySection
            customerId={customer.id}
            estimates={estimates}
            invoices={invoices}
            payments={payments}
            canManageBilling={canManageBilling}
            northStar
            compact
          />
        ) : null}

        {customer360 ? (
          <Customer360Card
            data={customer360}
            canViewBilling={canViewBilling}
            northStar
            variant="opportunities"
          />
        ) : null}

        <CustomerEquipmentSection
          customerId={customer.id}
          equipment={activeEquipment}
          canManage={canManageEquipment}
          northStar
          compact
        />

        {hasNotes ? (
          <CustomerNotesBlock notes={customer.notes!} northStar />
        ) : null}

        <CustomerRecentPhotosSection
          customerId={customer.id}
          attachments={recentPhotos}
          northStar
        />

        {canViewCompanyExpenses ? (
          <CustomerRecentReceiptsSection
            customerId={customer.id}
            expenses={recentReceipts}
            northStar
          />
        ) : null}

        <OperationalActivityTimeline
          activities={activities}
          canViewBilling={canViewBilling}
          sectionId={CUSTOMER_DETAIL_ACTIVITY_ANCHOR}
          sectionClassName="scroll-mt-6"
          northStar
          compact
          description={activityDescription}
          emptyDescription="Activity will appear here as work progresses."
        />
      </div>

      <div className={`hidden lg:grid ${dt.workspaceGrid}`}>
        <div className={dt.workspaceMain}>{mainColumn}</div>
        <div className={dt.workspaceSide}>{sideColumn}</div>
      </div>
    </>
  );
}

function LegacyWorkspace({
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
  canManageEquipment,
  canViewBilling,
  canManageBilling,
  canViewCompanyExpenses,
  customer360,
  hasNotes,
}: {
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
  canManageEquipment: boolean;
  canViewBilling: boolean;
  canManageBilling: boolean;
  canViewCompanyExpenses: boolean;
  customer360?: Customer360Data | null;
  hasNotes: boolean;
}) {
  const activityDescription = canViewBilling
    ? "Jobs, billing, and account events"
    : "Jobs, equipment, and account events";

  return (
    <>
      {customer360 ? (
        <Customer360Card
          data={customer360}
          canViewBilling={canViewBilling}
          northStar={false}
        />
      ) : null}

      {hasNotes ? (
        <CustomerNotesBlock notes={customer.notes!} northStar={false} />
      ) : null}

      <CustomerJobsSection
        customerId={customer.id}
        jobs={jobs}
        canCreateJob={canCreateJob}
        northStar={false}
      />

      <CustomerEquipmentSection
        customerId={customer.id}
        equipment={equipment.filter((item) => item.isActive)}
        canManage={canManageEquipment}
        northStar={false}
      />

      {canViewBilling ? (
        <CustomerBillingHistorySection
          customerId={customer.id}
          estimates={estimates}
          invoices={invoices}
          payments={payments}
          canManageBilling={canManageBilling}
          northStar={false}
        />
      ) : null}

      <CustomerRecentPhotosSection
        customerId={customer.id}
        attachments={recentPhotos}
        northStar={false}
      />

      {canViewCompanyExpenses ? (
        <CustomerRecentReceiptsSection
          customerId={customer.id}
          expenses={recentReceipts}
          northStar={false}
        />
      ) : null}

      <OperationalActivityTimeline
        activities={activities}
        canViewBilling={canViewBilling}
        sectionId={CUSTOMER_DETAIL_ACTIVITY_ANCHOR}
        sectionClassName="scroll-mt-6"
        northStar={false}
        description={activityDescription}
        emptyDescription="Activity will appear here as work progresses."
      />
    </>
  );
}

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
  const northStar = isNorthStarShellEnabled();

  const workspaceProps = {
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
    canManageEquipment,
    canViewBilling,
    canManageBilling,
    canViewCompanyExpenses,
    customer360,
    hasNotes,
  };

  return (
    <MasterDetailPageLayout
      className={northStar ? dt.pageCanvas : undefined}
      canvasWidth={northStar ? "detailWide" : "detail"}
      backLink={
        <Link
          href="/customers"
          className={
            northStar
              ? dt.backLink
              : "inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
          }
        >
          <ArrowLeft className="h-4 w-4" />
          Customers
        </Link>
      }
    >
      <JobDetailHashScroll />

      {northStar ? (
        <CustomerDetailNorthStarHero
          customer={customer}
          financialSummary={financialSummary}
          canViewBilling={canViewBilling}
          canManageCustomers={canManageCustomers}
          customer360={customer360}
          deleteDependencies={deleteDependencies}
          deleted={deleted}
          archived={archived}
        />
      ) : (
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
      )}

      {northStar ? (
        <div className={dt.commandPlate}>
          <CustomerDetailSectionNav
            showCustomer360
            showBilling={canViewBilling}
            northStar
          />
          <CustomerDetailActionBar
            customerId={customer.id}
            invoices={invoices}
            canCreateJob={canCreateJob}
            canManageBilling={canManageBilling}
            northStar
            compact
          />
        </div>
      ) : (
        <>
          <CustomerDetailSectionNav
            showCustomer360={Boolean(customer360)}
            showBilling={canViewBilling}
            northStar={false}
          />

          <CustomerDetailActionBar
            customerId={customer.id}
            invoices={invoices}
            canCreateJob={canCreateJob}
            canManageBilling={canManageBilling}
            northStar={false}
          />
        </>
      )}

      {northStar ? (
        <NorthStarWorkspace {...workspaceProps} />
      ) : (
        <LegacyWorkspace {...workspaceProps} />
      )}
    </MasterDetailPageLayout>
  );
}
