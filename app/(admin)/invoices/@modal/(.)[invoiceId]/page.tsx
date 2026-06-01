import { redirect } from "next/navigation";
import { canViewBilling } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { UnauthorizedAccessView } from "@/shared/components/layout/UnauthorizedAccessView";
import { InvoiceDetailRoute } from "@/shared/components/invoices/InvoiceDetailRoute";

type InterceptedInvoiceDetailPageProps = {
  params: Promise<{ invoiceId: string }>;
};

export default async function InterceptedInvoiceDetailPage({
  params,
}: InterceptedInvoiceDetailPageProps) {
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

  return <InvoiceDetailRoute invoiceId={invoiceId} presentation="overlay" />;
}
