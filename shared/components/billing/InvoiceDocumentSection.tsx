import { formatDate } from "@/shared/types/customer";
import type { InvoiceDetail } from "@/shared/types/invoice";
import type { BillingCompanyContact } from "@/shared/lib/billing-company-contact";
import { BillingCompanyContactBlock } from "./BillingCompanyContactBlock";
import { BillingLineItemsList } from "./BillingLineItemsList";
import { BillingTotalsSummary } from "./BillingTotalsSummary";
import { InvoiceStatusBadge } from "@/shared/components/invoices/InvoiceStatusBadge";

type InvoiceDocumentSectionProps = {
  invoice: InvoiceDetail;
  company: BillingCompanyContact;
  className?: string;
  id?: string;
};

export function InvoiceDocumentSection({
  invoice,
  company,
  className = "",
  id = "invoice-document",
}: InvoiceDocumentSectionProps) {
  const customerEmail = invoice.customerEmail?.trim();
  const customerPhone = invoice.customerPhone?.trim();

  return (
    <section
      id={id}
      className={`rounded-2xl border border-slate-300 bg-white p-5 shadow-sm sm:p-8 print:rounded-none print:border print:border-slate-400 print:p-0 print:shadow-none ${className}`}
    >
      <div className="grid gap-6 border-b border-slate-200 pb-6 sm:grid-cols-2 print:gap-8 print:pb-8">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 print:text-slate-700">
            From
          </p>
          <h2 className="mt-1 break-words text-xl font-bold text-slate-900 print:text-2xl">
            {company.name}
          </h2>
          <div className="mt-3">
            <BillingCompanyContactBlock company={company} showAddress />
          </div>
        </div>

        <div className="min-w-0 sm:text-right print:text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 print:text-slate-700">
            Invoice
          </p>
          <h2 className="mt-1 break-words text-xl font-bold text-slate-900 print:text-2xl">
            {invoice.invoiceNumber}
          </h2>
          <div className="mt-3 space-y-1 text-sm text-slate-600">
            <p>
              <span className="font-medium text-slate-700">Issued:</span>{" "}
              {formatDate(invoice.issueDate)}
            </p>
            <p>
              <span className="font-medium text-slate-700">Due:</span>{" "}
              {formatDate(invoice.dueDate)}
            </p>
            <div className="pt-1 sm:flex sm:justify-end print:flex print:justify-end">
              <InvoiceStatusBadge status={invoice.status} />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 border-b border-slate-200 pb-6 print:mt-8 print:pb-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 print:text-slate-700">
          Bill to
        </p>
        <p className="mt-2 break-words text-base font-semibold text-slate-900">
          {invoice.customerName}
        </p>
        <div className="mt-2 space-y-1 text-sm text-slate-600">
          {customerEmail ? (
            <p className="break-all">{customerEmail}</p>
          ) : null}
          {customerPhone ? <p>{customerPhone}</p> : null}
        </div>
      </div>

      <div className="mt-6 print:mt-8">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 print:text-slate-700">
          Line items
        </h3>
        <div className="mt-4">
          <BillingLineItemsList
            items={invoice.lineItems}
            documentLabel="invoice"
            variant="table"
          />
        </div>

        <div className="mt-4 max-w-md sm:ml-auto print:max-w-sm print:ml-auto">
          <BillingTotalsSummary
            subtotal={invoice.subtotal}
            taxRate={invoice.taxRate}
            taxAmount={invoice.taxAmount ?? 0}
            total={invoice.total}
            amountPaid={invoice.amountPaid}
            balanceDue={invoice.balanceDue}
          />
        </div>
      </div>

      {invoice.notes ? (
        <div className="mt-6 border-t border-slate-200 pt-6 print:mt-8 print:pt-8">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 print:text-slate-700">
            Notes
          </h3>
          <p className="mt-3 break-words text-sm leading-relaxed text-slate-700">
            {invoice.notes}
          </p>
        </div>
      ) : null}
    </section>
  );
}
