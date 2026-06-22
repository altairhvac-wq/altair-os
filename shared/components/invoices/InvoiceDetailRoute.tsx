import { notFound } from "next/navigation";
import { canCaptureBillingSignature } from "@/lib/database/access-control";
import { isAiFeaturesEnabled } from "@/lib/ai/env";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { shouldHideDemoPrefixesForDisplay } from "@/lib/database/founder-marketing-display";
import { formatDemoDisplayName } from "@/shared/lib/demo-display-name";
import { ensureInvoiceBillingStatesSynced } from "@/lib/database/services/invoice-billing";
import { listInvoiceActivitiesForInvoice } from "@/lib/database/queries/invoice-activities";
import { listPaymentsForInvoice } from "@/lib/database/queries/invoice-payments";
import {
  getInvoiceById,
  getInvoiceDeleteDependencies,
} from "@/lib/database/queries/invoices";
import { getBillingSignatureForEntity } from "@/lib/database/queries/billing-signatures";
import { mapCompanyRowToBillingContact } from "@/shared/lib/billing-company-contact";
import { isCompanyOnlineCheckoutAvailable } from "@/lib/payments/online-checkout-availability";
import { isSmsSendingConfigured } from "@/lib/sms/env";
import { InvoiceDetailHeaderActions } from "./InvoiceDetailHeaderActions";
import { InvoiceDetailOverlayShell } from "./InvoiceDetailOverlayShell";
import { InvoiceDetailPageView } from "./InvoiceDetailPageView";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";

type InvoiceDetailRouteProps = {
  invoiceId: string;
  presentation?: "page" | "overlay";
};

export async function InvoiceDetailRoute({
  invoiceId,
  presentation = "page",
}: InvoiceDetailRouteProps) {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    notFound();
  }

  const [invoice, activities, payments, signature, deleteDependencies, onlinePaymentsEnabled, smsSendingConfigured] =
    await Promise.all([
    ensureInvoiceBillingStatesSynced(
      companyContext.company.id,
      companyContext.company.timezone,
    ).then(() => getInvoiceById(companyContext.company.id, invoiceId)),
    listInvoiceActivitiesForInvoice(companyContext.company.id, invoiceId),
    listPaymentsForInvoice(companyContext.company.id, invoiceId),
    getBillingSignatureForEntity(
      companyContext.company.id,
      "invoice",
      invoiceId,
    ),
    getInvoiceDeleteDependencies(companyContext.company.id, invoiceId),
    isCompanyOnlineCheckoutAvailable(companyContext.company.id),
    Promise.resolve(isSmsSendingConfigured()),
  ]);

  if (!invoice) {
    notFound();
  }

  const canManageBilling = companyContext.permissions.manageBilling;
  const canCaptureSignature = canCaptureBillingSignature(
    companyContext,
    "invoice",
  );
  const company = mapCompanyRowToBillingContact(companyContext.company);
  const displayCustomerName = formatDemoDisplayName(
    invoice.customerName,
    shouldHideDemoPrefixesForDisplay(companyContext.user),
  );

  const detailView = (
    <InvoiceDetailPageView
      invoice={invoice}
      activities={activities}
      payments={payments}
      company={company}
      companyTimeZone={companyContext.company.timezone}
      canManageBilling={canManageBilling}
      canManageCustomers={companyContext.permissions.manageCustomers}
      canCaptureSignature={canCaptureSignature}
      signature={signature}
      presentation={presentation}
      aiFeaturesEnabled={isAiFeaturesEnabled()}
      deleteDependencies={deleteDependencies}
      onlinePaymentsEnabled={onlinePaymentsEnabled}
      smsSendingConfigured={smsSendingConfigured}
    />
  );

  if (presentation === "overlay") {
    return (
      <InvoiceDetailOverlayShell
        title={invoice.invoiceNumber}
        subtitle={displayCustomerName}
        headerAside={<InvoiceStatusBadge status={invoice.status} />}
        headerTrailing={<InvoiceDetailHeaderActions />}
      >
        {detailView}
      </InvoiceDetailOverlayShell>
    );
  }

  return detailView;
}
