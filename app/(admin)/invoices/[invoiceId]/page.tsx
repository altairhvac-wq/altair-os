import { notFound, redirect } from "next/navigation";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { listInvoiceActivitiesForInvoice } from "@/lib/database/queries/invoice-activities";
import { listPaymentsForInvoice } from "@/lib/database/queries/invoice-payments";
import { getInvoiceById } from "@/lib/database/queries/invoices";
import { InvoiceDetailPageView } from "@/shared/components/invoices/InvoiceDetailPageView";

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

  const [invoice, activities, payments] = await Promise.all([
    getInvoiceById(companyContext.company.id, invoiceId),
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
      canManageBilling={companyContext.permissions.manageBilling}
    />
  );
}
