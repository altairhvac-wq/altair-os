import { notFound, redirect } from "next/navigation";
import { canViewBilling } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { ensureInvoiceBillingStatesSynced } from "@/lib/database/services/invoice-billing";
import { listInvoiceActivitiesForInvoice } from "@/lib/database/queries/invoice-activities";
import { listPaymentsForInvoice } from "@/lib/database/queries/invoice-payments";
import { getInvoiceById } from "@/lib/database/queries/invoices";
import { mapCompanyRowToBillingContact } from "@/shared/lib/billing-company-contact";
import { InvoiceDetailPageView } from "@/shared/components/invoices/InvoiceDetailPageView";
import { UnauthorizedAccessView } from "@/shared/components/layout/UnauthorizedAccessView";

type InvoiceDetailPageProps = {
  params: Promise<{ invoiceId: string }>;
};

export default async function InvoiceDetailPage({
  params,
}: InvoiceDetailPageProps) {
  const { invoiceId } = await params;
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  if (!canViewBilling(companyContext)) {
    return (
      <UnauthorizedAccessView description="Invoice records are limited to billing and admin roles." />
    );
  }

  const [invoice, activities, payments] = await Promise.all([
    ensureInvoiceBillingStatesSynced(
      companyContext.company.id,
      companyContext.company.timezone,
    ).then(() => getInvoiceById(companyContext.company.id, invoiceId)),
    listInvoiceActivitiesForInvoice(companyContext.company.id, invoiceId),
    listPaymentsForInvoice(companyContext.company.id, invoiceId),
  ]);

  if (!invoice) {
    notFound();
  }

  return (
    <InvoiceDetailPageView
      invoice={invoice}
      activities={activities}
      payments={payments}
      company={mapCompanyRowToBillingContact(companyContext.company)}
      companyTimeZone={companyContext.company.timezone}
      canManageBilling={companyContext.permissions.manageBilling}
    />
  );
}
