import { redirect } from "next/navigation";
import { isAiFeaturesEnabled } from "@/lib/ai/env";
import { canViewBilling } from "@/lib/database/access-control";
import { shouldShowAlphaComingSoon } from "@/lib/beta/alpha-hardening";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { getCompanyBillingDefaultsFromRow } from "@/lib/database/queries/companies";
import { getCustomerById } from "@/lib/database/queries/customers";
import { listInvoiceDocumentRefsForEstimates } from "@/lib/database/queries/invoices";
import { listCustomerOptions } from "@/lib/database/queries/customers-page";
import {
  listEstimates,
} from "@/lib/database/queries/estimates";
import {
  getPaymentsThisMonthSummary,
  getPaymentsThisWeekSummary,
  getPaymentsAllTimeSummary,
} from "@/lib/database/queries/invoice-payments";
import {
} from "@/lib/database/queries/invoices";
import { getJobById, listJobOptions } from "@/lib/database/queries/jobs";
import { listActiveServiceItems } from "@/lib/database/queries/service-items";
import {
  getDocumentQueueMetrics,
  listEstimatePipelineData,
  listEstimatesPage,
  listInvoicesPage,
  listInvoicePaymentsPage,
  listPipelinePayments,
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
import { buildEstimatePipelineMetrics } from "@/shared/lib/sales/estimate-pipeline-metrics";
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
    paymentsPage,
    pipelinePayments,
    paymentsAllTime,
    paymentsThisWeek,
    paymentsThisMonth,
    customerOptions,
    jobOptions,
    serviceItems,
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
    // ============================== ONE PAGE, NOT THE LEDGER ==============================
    // This was listInvoicePayments(companyId) -- the whole ledger, unbounded,
    // loaded on all four tabs. PostgREST capped it at 1,000 rows, so the
    // Payments tab showed the newest thousand of 7,857 and said "of 1000",
    // and the "All-time collected" stat above it was summed from the same
    // thousand. Now: one server page with an exact count for the tab that
    // renders it, and nothing at all for the tabs that do not.
    activeTab === "payments"
      ? listInvoicePaymentsPage(companyId, {})
      : Promise.resolve(null),
    // The pipeline needs payments as a two-year cohort, not a list, so it gets
    // its own bounded-but-complete read on the tab that uses it.
    activeTab === "estimate-pipeline"
      ? listPipelinePayments(companyId)
      : Promise.resolve([]),
    activeTab === "payments"
      ? getPaymentsAllTimeSummary(companyId)
      : Promise.resolve({ count: 0, total: 0 }),
    getPaymentsThisWeekSummary(companyId, timeZone),
    getPaymentsThisMonthSummary(companyId, timeZone),
    // Pickers and search, not books. These three were 1,000 rows each of
    // PostgREST's cap -- 12,000 jobs and 10,000 invoices reduced to an
    // arbitrary thousand -- and they were most of this page's 1.79 MB. They
    // were also wrong: a picker cannot offer what it was never sent.
    listCustomerOptions(companyId),
    listJobOptions(companyId),
    listActiveServiceItems(companyId),
  ]);

  // ============================== REDUCED HERE, NOT IN THE BROWSER ==============================
  // The pipeline tab renders a dozen numbers and a cohort table. It used to
  // receive the three arrays those are computed from -- two years of estimates,
  // two years of invoices and the payment ledger -- because the reduction ran
  // in a client component, which meant every row had to be serialised into the
  // RSC payload to get there: 6.7 MB and 34 seconds on the scale-seeded tenant.
  //
  // buildEstimatePipelineMetrics is pure, so it runs here instead and only its
  // result crosses the boundary.
  const estimatePipelineMetrics =
    activeTab === "estimate-pipeline"
      ? buildEstimatePipelineMetrics({
          estimates: pipelineData.estimates,
          invoices: pipelineData.invoices,
          payments: pipelinePayments,
        })
      : null;

  const customers = customerOptions.customers;
  const jobs = jobOptions.jobs;

  // The estimate list shows an "invoiced as INV-1234" badge. That needs the
  // invoices belonging to the estimates ON THIS PAGE, not to the company:
  // reading all of them was 1,000 refs per render out of 10,000 invoices, and
  // an estimate outside that thousand showed no badge even though it had been
  // invoiced.
  const invoiceDocumentRefs = await listInvoiceDocumentRefsForEstimates(
    companyId,
    estimatesPage.rows.map((estimate) => estimate.id),
  );

  // By primary key. A deep link names a specific customer and job, and the
  // bounded option lists are the most recent twenty-five — there is no reason
  // for either to contain the one the link is about.
  const [preselectedCustomer, preselectedJob] = await Promise.all([
    customerId
      ? getCustomerById(companyId, customerId).then((c) => c ?? undefined)
      : Promise.resolve(undefined),
    jobId
      ? getJobById(companyId, jobId).then((j) => j ?? undefined)
      : Promise.resolve(undefined),
  ]);

  const estimatePreselectedJob =
    preselectedJob && preselectedCustomer &&
    preselectedJob.customerId === preselectedCustomer.id
      ? preselectedJob
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

  // Already fetched by id above; the bounded option list is not a lookup table.
  const invoicePreselectedJob = preselectedJob;

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
      estimatePipelineMetrics={estimatePipelineMetrics}
      paymentsPage={paymentsPage}
      paymentsAllTime={paymentsAllTime}
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
