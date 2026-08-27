import { redirect } from "next/navigation";
import { isAiFeaturesEnabled } from "@/lib/ai/env";
import { canViewBilling } from "@/lib/database/access-control";
import { shouldShowAlphaComingSoon } from "@/lib/beta/alpha-hardening";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { getCompanyBillingDefaultsFromRow } from "@/lib/database/queries/companies";
import { listCustomers } from "@/lib/database/queries/customers";
import {
  listEstimates,
} from "@/lib/database/queries/estimates";
import {
  getPaymentsThisMonthSummary,
  getPaymentsThisWeekSummary,
  listInvoicePayments,
} from "@/lib/database/queries/invoice-payments";
import {
  listInvoiceDocumentRefs,
} from "@/lib/database/queries/invoices";
import { listJobs } from "@/lib/database/queries/jobs";
import { listActiveServiceItems } from "@/lib/database/queries/service-items";
import {
  getDocumentQueueMetrics,
  listEstimatePipelineData,
  listEstimatesPage,
  listInvoicesPage,
} from "@/lib/database/queries/list-pages";
import { ComingSoonView } from "@/shared/components/layout/ComingSoonView";
import { UnauthorizedAccessView } from "@/shared/components/layout/UnauthorizedAccessView";
import { SalesHubPageView } from "@/shared/components/sales/SalesHubPageView";
import {
  getEstimateCreateInitialData,
  getInvoiceCreateInitialData,
} from "@/shared/lib/company-billing-defaults";
import { parseInvoicePageSearchParams } from "@/shared/lib/invoice-page-focus";
import { resolveSalesHubTab } from "@/shared/lib/sales/sales-hub";
import {
  isInvoiceWorkQueue,
  resolveDefaultInvoiceWorkQueueFromMetrics,
  type InvoiceWorkQueue,
} from "@/shared/components/invoices/invoice-work-queues";
import {
  isEstimateWorkQueue,
  resolveDefaultEstimateWorkQueue,
  type EstimateWorkQueue,
} from "@/shared/components/estimates/estimate-work-queues";

type SalesPageProps = {
  searchParams: Promise<{
    tab?: string;
    customerId?: string;
    create?: string;
    leadId?: string;
    jobId?: string;
    status?: string;
    focus?: string;
    /**
     * Work-queue pills. Both lists live on one route, so they need one
     * parameter each. They are applied in SQL, which is why they are in the
     * URL rather than in component state.
     */
    invoiceQueue?: string;
    estimateQueue?: string;
  }>;
};

/** Sales hub — Estimates, Invoices, Payments, and Estimate Pipeline panels. */
export default async function SalesPage({ searchParams }: SalesPageProps) {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  if (!canViewBilling(companyContext)) {
    return (
      <UnauthorizedAccessView description="Sales records are limited to billing and admin roles." />
    );
  }

  const params = await searchParams;
  const activeTab = resolveSalesHubTab(params.tab);

  if (
    activeTab === "estimates" &&
    shouldShowAlphaComingSoon("/estimates")
  ) {
    return (
      <ComingSoonView
        title="Estimates temporarily unavailable"
        description="Estimate creation and customer approvals are being finalized. Use jobs and invoices in the meantime."
      />
    );
  }

  const {
    customerId,
    create,
    leadId,
    jobId,
    status,
    focus,
    invoiceQueue,
    estimateQueue,
  } = params;

  const companyId = companyContext.company.id;
  const timeZone = companyContext.company.timezone;
  const pageFocus = parseInvoicePageSearchParams({
    status,
    focus,
    customerId,
    jobId,
    create,
  });

  // The strip metrics come first because the landing pill is chosen from
  // them. resolveDefaultInvoiceWorkQueue used to walk the loaded array and
  // pick "the first queue with anything in it", which over one page means
  // the first queue represented in the newest fifty invoices.
  const queueMetrics = await getDocumentQueueMetrics(companyId);

  const resolvedInvoiceQueue: InvoiceWorkQueue =
    invoiceQueue && isInvoiceWorkQueue(invoiceQueue)
      ? invoiceQueue
      : resolveDefaultInvoiceWorkQueueFromMetrics(
          queueMetrics.invoices,
          pageFocus.statusFilter,
          pageFocus.focus,
        );

  const resolvedEstimateQueue: EstimateWorkQueue =
    estimateQueue && isEstimateWorkQueue(estimateQueue)
      ? estimateQueue
      : resolveDefaultEstimateWorkQueue();

  const [
    estimatesPage,
    pipelineData,
    invoicesPage,
    deletedInvoices,
    paymentsLedger,
    paymentsThisWeek,
    paymentsThisMonth,
    customers,
    jobs,
    serviceItems,
    invoiceDocumentRefs,
  ] = await Promise.all([
    // The two list tabs are paged; the pipeline tab is an aggregate and gets its
    // own bounded-but-complete read instead — a cohort computed from one page is
    // not a cohort.
    listEstimatesPage(companyId, { queue: resolvedEstimateQueue }),
    // ONLY for the pipeline tab. It reads two years of estimates and invoices
    // to completion, which is right for cohorts and completely wrong to ship
    // alongside a 50-row list — doing it unconditionally took this page from
    // 3.4 MB to 11 MB.
    activeTab === "estimate-pipeline"
      ? listEstimatePipelineData(companyId)
      : Promise.resolve({ estimates: [], invoices: [] }),
    listInvoicesPage(companyId, { queue: resolvedInvoiceQueue }),
    Promise.resolve([]),
    listInvoicePayments(companyId),
    getPaymentsThisWeekSummary(companyId, timeZone),
    getPaymentsThisMonthSummary(companyId, timeZone),
    listCustomers(companyId),
    listJobs(companyId),
    listActiveServiceItems(companyId),
    listInvoiceDocumentRefs(companyId),
  ]);

  const preselectedCustomer = customerId
    ? customers.find((customer) => customer.id === customerId)
    : undefined;

  const estimatePreselectedJob =
    jobId && preselectedCustomer
      ? jobs.find(
          (job) =>
            job.id === jobId && job.customerId === preselectedCustomer.id,
        )
      : undefined;

  const billingDefaults = getCompanyBillingDefaultsFromRow(
    companyContext.company,
  );

  const estimatesCreateInitialData = getEstimateCreateInitialData(
    billingDefaults,
    timeZone,
    preselectedCustomer
      ? {
          customerId: preselectedCustomer.id,
          ...(estimatePreselectedJob
            ? { jobId: estimatePreselectedJob.id }
            : {}),
        }
      : undefined,
  );

  const invoicePreselectedJob = jobId
    ? jobs.find((job) => job.id === jobId)
    : undefined;

  const customerJobMismatch = Boolean(
    preselectedCustomer &&
      invoicePreselectedJob &&
      preselectedCustomer.id !== invoicePreselectedJob.customerId,
  );

  const validJob = customerJobMismatch
    ? undefined
    : invoicePreselectedJob &&
        (!preselectedCustomer ||
          invoicePreselectedJob.customerId === preselectedCustomer.id)
      ? invoicePreselectedJob
      : undefined;

  const invoiceCustomer = customerJobMismatch
    ? preselectedCustomer
    : preselectedCustomer ??
      (validJob
        ? customers.find((customer) => customer.id === validJob.customerId)
        : undefined);

  const shouldOpenInvoiceCreate =
    create === "1" && Boolean(invoiceCustomer ?? validJob);

  const invoicesCreateInitialData = getInvoiceCreateInitialData(
    billingDefaults,
    timeZone,
    invoiceCustomer || validJob
      ? {
          customerId: invoiceCustomer?.id ?? validJob!.customerId,
          jobId: validJob?.id ?? "",
        }
      : undefined,
  );

  return (
    <SalesHubPageView
      estimates={estimatesPage.rows}
      invoices={invoicesPage.rows}
      estimatesPage={estimatesPage}
      invoicesPage={invoicesPage}
      pipelineEstimates={pipelineData.estimates}
      pipelineInvoices={pipelineData.invoices}
      invoicePayments={paymentsLedger}
      paymentsLedger={paymentsLedger}
      paymentsThisWeek={paymentsThisWeek}
      paymentsThisMonth={paymentsThisMonth}
      customers={customers}
      jobs={jobs}
      serviceItems={serviceItems}
      invoiceDocumentRefs={invoiceDocumentRefs}
      canManageBilling={companyContext.permissions.manageBilling}
      canManageCustomers={companyContext.permissions.manageCustomers}
      aiFeaturesEnabled={isAiFeaturesEnabled()}
      estimatesCreateInitialData={estimatesCreateInitialData}
      invoicesCreateInitialData={invoicesCreateInitialData}
      estimatesInitialPanelMode={
        create === "1" && preselectedCustomer && activeTab === "estimates"
          ? "create"
          : "empty"
      }
      invoicesInitialPanelMode={
        shouldOpenInvoiceCreate && activeTab === "invoices" ? "create" : "empty"
      }
      initialLeadId={leadId}
      initialJobId={validJob?.id}
      initialJobLabel={validJob?.jobNumber}
      initialInvoiceCreateMode={create === "1"}
      invoicePageFocus={pageFocus}
      invoicesInitialStatusFilter={pageFocus.statusFilter}
    />
  );
}
