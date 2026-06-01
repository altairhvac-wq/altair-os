import { notFound } from "next/navigation";
import { isAiFeaturesEnabled } from "@/lib/ai/env";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { ensureInvoiceBillingStatesSynced } from "@/lib/database/services/invoice-billing";
import { listInvoiceActivitiesForInvoice } from "@/lib/database/queries/invoice-activities";
import { listPaymentsForInvoice } from "@/lib/database/queries/invoice-payments";
import { getInvoiceById } from "@/lib/database/queries/invoices";
import { getBillingSignatureForEntity } from "@/lib/database/queries/billing-signatures";
import { mapCompanyRowToBillingContact } from "@/shared/lib/billing-company-contact";
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

  const [invoice, activities, payments, signature] = await Promise.all([
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
  ]);

  if (!invoice) {
    notFound();
  }

  const canManageBilling = companyContext.permissions.manageBilling;
  const company = mapCompanyRowToBillingContact(companyContext.company);

  const detailView = (
    <InvoiceDetailPageView
      invoice={invoice}
      activities={activities}
      payments={payments}
      company={company}
      companyTimeZone={companyContext.company.timezone}
      canManageBilling={canManageBilling}
      signature={signature}
      presentation={presentation}
      aiFeaturesEnabled={isAiFeaturesEnabled()}
    />
  );

  if (presentation === "overlay") {
    return (
      <InvoiceDetailOverlayShell
        title={invoice.invoiceNumber}
        subtitle={invoice.customerName}
        headerAside={<InvoiceStatusBadge status={invoice.status} />}
        headerTrailing={
          <InvoiceDetailHeaderActions
            invoiceId={invoice.id}
            invoiceNumber={invoice.invoiceNumber}
            customerId={invoice.customerId}
            jobId={invoice.jobId ?? null}
            canManageBilling={canManageBilling}
            signature={signature}
          />
        }
      >
        {detailView}
      </InvoiceDetailOverlayShell>
    );
  }

  return detailView;
}
