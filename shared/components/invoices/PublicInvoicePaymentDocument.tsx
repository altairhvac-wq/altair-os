import type { PublicInvoicePaymentView } from "@/shared/types/public-invoice-payment";
import { InvoiceDocumentSection } from "@/shared/components/billing/InvoiceDocumentSection";
import type { InvoiceDetail } from "@/shared/types/invoice";

type PublicInvoicePaymentDocumentProps = {
  view: PublicInvoicePaymentView;
};

function mapPublicViewToInvoiceDetail(
  view: PublicInvoicePaymentView,
): InvoiceDetail | null {
  const company = view.company;
  const invoice = view.invoice;

  if (!company || !invoice) {
    return null;
  }

  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    customerId: "",
    customerName: invoice.customerName,
    status: invoice.status,
    lineItems: invoice.lineItems,
    subtotal: invoice.subtotal,
    taxRate: invoice.taxRate,
    taxAmount: invoice.taxAmount,
    total: invoice.total,
    amountPaid: invoice.amountPaid,
    balanceDue: invoice.balanceDue,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    notes: invoice.notes,
    createdAt: invoice.issueDate,
  };
}

export function PublicInvoicePaymentDocument({
  view,
}: PublicInvoicePaymentDocumentProps) {
  const company = view.company;
  const invoice = mapPublicViewToInvoiceDetail(view);

  if (!company || !invoice) {
    return null;
  }

  return (
    <InvoiceDocumentSection
      invoice={invoice}
      company={company}
      showSignature={false}
    />
  );
}
