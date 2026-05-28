import { notFound, redirect } from "next/navigation";
import { canViewBilling } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { listPaymentsForInvoice } from "@/lib/database/queries/invoice-payments";
import { getInvoiceById } from "@/lib/database/queries/invoices";
import { listActiveServiceItems } from "@/lib/database/queries/service-items";
import { ensureInvoiceBillingStatesSynced } from "@/lib/database/services/invoice-billing";
import { InvoiceEditPageView } from "@/shared/components/invoices/InvoiceEditPageView";
import { UnauthorizedAccessView } from "@/shared/components/layout/UnauthorizedAccessView";

type InvoiceEditPageProps = {
  params: Promise<{ invoiceId: string }>;
};

export default async function InvoiceEditPage({ params }: InvoiceEditPageProps) {
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

  await ensureInvoiceBillingStatesSynced(
    companyContext.company.id,
    companyContext.company.timezone,
  );

  const [invoice, payments, serviceItems] = await Promise.all([
    getInvoiceById(companyContext.company.id, invoiceId),
    listPaymentsForInvoice(companyContext.company.id, invoiceId),
    listActiveServiceItems(companyContext.company.id),
  ]);

  if (!invoice) {
    notFound();
  }

  return (
    <InvoiceEditPageView
      invoice={invoice}
      serviceItems={serviceItems}
      paymentCount={payments.length}
      canManageBilling={companyContext.permissions.manageBilling}
    />
  );
}
