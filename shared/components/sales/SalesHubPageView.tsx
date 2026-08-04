"use client";

import { useCallback, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import type { RecentInvoicePayment } from "@/lib/database/queries/invoice-payments";
import { EstimatesPageView } from "@/shared/components/estimates/EstimatesPageView";
import { InvoicesPageView } from "@/shared/components/invoices/InvoicesPageView";
import { PaymentsPageView } from "@/shared/components/payments/PaymentsPageView";
import { SalesHubTabs } from "@/shared/components/sales/SalesHubTabs";
import { Button } from "@/shared/design-system/components";
import { MasterListPageLayout } from "@/shared/design-system/shell";
import type { InvoiceDocumentRef } from "@/shared/lib/documents/document-refs";
import type { InvoicePageFocusState } from "@/shared/lib/invoice-page-focus";
import {
  resolveSalesHubTab,
  SALES_HUB_DEFAULT_TAB,
  type SalesHubTabId,
} from "@/shared/lib/sales/sales-hub";
import type { Customer } from "@/shared/types/customer";
import type { Estimate, EstimateFormData } from "@/shared/types/estimate";
import type { Invoice, InvoiceFormData } from "@/shared/types/invoice";
import type { InvoicePayment } from "@/shared/types/invoice-payment";
import type { Job } from "@/shared/types/job";
import type { ServiceItem } from "@/shared/types/service-item";

type SalesHubPageViewProps = {
  estimates: Estimate[];
  invoices: Invoice[];
  invoicePayments: InvoicePayment[];
  paymentsLedger: RecentInvoicePayment[];
  paymentsThisWeek: { count: number; total: number };
  paymentsThisMonth: { count: number; total: number };
  customers: Customer[];
  jobs: Job[];
  serviceItems: ServiceItem[];
  invoiceDocumentRefs: InvoiceDocumentRef[];
  canManageBilling: boolean;
  canManageCustomers: boolean;
  aiFeaturesEnabled: boolean;
  estimatesCreateInitialData?: Partial<EstimateFormData>;
  invoicesCreateInitialData?: Partial<InvoiceFormData>;
  estimatesInitialPanelMode?: "create" | "empty";
  invoicesInitialPanelMode?: "create" | "empty";
  initialLeadId?: string;
  initialJobId?: string;
  initialJobLabel?: string;
  initialInvoiceCreateMode?: boolean;
  invoicePageFocus?: InvoicePageFocusState;
  invoicesInitialStatusFilter?: InvoicePageFocusState["statusFilter"];
};

function hubSubtitle(tab: SalesHubTabId): string {
  switch (tab) {
    case "invoices":
      return "Collect money, send invoices, and find past billing records.";
    case "payments":
      return "Collected payments from the invoice ledger.";
    case "estimates":
    default:
      return "Finish, send, and follow up on estimates.";
  }
}

const TAB_SCOPED_PARAMS = [
  "create",
  "status",
  "focus",
  "customerId",
  "jobId",
  "leadId",
] as const;

export function SalesHubPageView({
  estimates,
  invoices,
  invoicePayments,
  paymentsLedger,
  paymentsThisWeek,
  paymentsThisMonth,
  customers,
  jobs,
  serviceItems,
  invoiceDocumentRefs,
  canManageBilling,
  canManageCustomers,
  aiFeaturesEnabled,
  estimatesCreateInitialData,
  invoicesCreateInitialData,
  estimatesInitialPanelMode = "empty",
  invoicesInitialPanelMode = "empty",
  initialLeadId,
  initialJobId,
  initialJobLabel,
  initialInvoiceCreateMode = false,
  invoicePageFocus,
  invoicesInitialStatusFilter,
}: SalesHubPageViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = resolveSalesHubTab(searchParams.get("tab"));
  const estimateCreateHandlerRef = useRef<(() => void) | null>(null);
  const invoiceCreateHandlerRef = useRef<(() => void) | null>(null);

  const syncTabToUrl = useCallback(
    (tab: SalesHubTabId) => {
      const params = new URLSearchParams(searchParams.toString());

      if (tab === SALES_HUB_DEFAULT_TAB) {
        params.delete("tab");
      } else {
        params.set("tab", tab);
      }

      for (const key of TAB_SCOPED_PARAMS) {
        params.delete(key);
      }

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  const registerEstimateCreateHandler = useCallback((handler: () => void) => {
    estimateCreateHandlerRef.current = handler;
  }, []);

  const registerInvoiceCreateHandler = useCallback((handler: () => void) => {
    invoiceCreateHandlerRef.current = handler;
  }, []);

  const primaryAction =
    activeTab === "estimates" && canManageBilling ? (
      <Button
        size="sm"
        onClick={() => estimateCreateHandlerRef.current?.()}
        disabled={customers.length === 0}
        leadingIcon={<Plus className="h-3.5 w-3.5" />}
      >
        New Estimate
      </Button>
    ) : activeTab === "invoices" && canManageBilling ? (
      <Button
        size="sm"
        onClick={() => invoiceCreateHandlerRef.current?.()}
        disabled={customers.length === 0}
        leadingIcon={<Plus className="h-3.5 w-3.5" />}
      >
        New Invoice
      </Button>
    ) : undefined;

  return (
    <MasterListPageLayout
      title="Sales"
      subtitle={hubSubtitle(activeTab)}
      density="compact"
      headerSurfaceVariant="default"
      headerTitleClassName="min-w-0 text-base font-semibold tracking-tight text-altair-ink-on-paper sm:text-lg"
      headerSubtitleClassName="min-w-0 truncate text-[11px] leading-snug text-altair-ink-on-paper-muted"
      headerClassName="py-1.5"
      headerCenter={
        <SalesHubTabs activeTab={activeTab} onTabChange={syncTabToUrl} />
      }
      primaryAction={primaryAction}
    >
      {activeTab === "estimates" ? (
        <EstimatesPageView
          initialEstimates={estimates}
          customers={customers}
          jobs={jobs}
          serviceItems={serviceItems}
          invoiceDocumentRefs={invoiceDocumentRefs}
          canManageEstimates={canManageBilling}
          canManageCustomers={canManageCustomers}
          initialPanelMode={estimatesInitialPanelMode}
          createInitialData={estimatesCreateInitialData}
          initialLeadId={initialLeadId}
          aiFeaturesEnabled={aiFeaturesEnabled}
          embedded
          onRegisterCreateHandler={registerEstimateCreateHandler}
        />
      ) : null}

      {activeTab === "invoices" ? (
        <InvoicesPageView
          initialInvoices={invoices}
          initialPayments={invoicePayments}
          customers={customers}
          jobs={jobs}
          serviceItems={serviceItems}
          canManageInvoices={canManageBilling}
          canManageCustomers={canManageCustomers}
          initialPanelMode={invoicesInitialPanelMode}
          createInitialData={invoicesCreateInitialData}
          initialJobId={initialJobId}
          initialJobLabel={initialJobLabel}
          initialCreateMode={initialInvoiceCreateMode}
          initialStatusFilter={invoicesInitialStatusFilter}
          invoicePageFocus={invoicePageFocus}
          embedded
          onRegisterCreateHandler={registerInvoiceCreateHandler}
        />
      ) : null}

      {activeTab === "payments" ? (
        <PaymentsPageView
          payments={paymentsLedger}
          thisWeek={paymentsThisWeek}
          thisMonth={paymentsThisMonth}
          canManageCustomers={canManageCustomers}
          embedded
        />
      ) : null}
    </MasterListPageLayout>
  );
}
