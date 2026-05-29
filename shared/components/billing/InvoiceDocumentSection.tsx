import { formatDate } from "@/shared/types/customer";
import type { InvoiceDetail } from "@/shared/types/invoice";
import type { BillingCompanyContact } from "@/shared/lib/billing-company-contact";
import { BillingLineItemsList } from "./BillingLineItemsList";
import { BillingSignatureBlock } from "./BillingSignatureBlock";
import { BillingTotalsSummary } from "./BillingTotalsSummary";
import { InvoiceAmountDueHero } from "./InvoiceAmountDueHero";
import { InvoiceCompanyHeroHeader } from "./InvoiceCompanyHeroHeader";
import { InvoiceThankYouFooter } from "./InvoiceThankYouFooter";

import type { BillingSignature } from "@/shared/types/billing-signature";

type InvoiceDocumentSectionProps = {
  invoice: InvoiceDetail;
  company: BillingCompanyContact;
  signature?: BillingSignature | null;
  companyTimeZone?: string;
  logoUrl?: string | null;
  className?: string;
  id?: string;
};

function InvoiceIdentityMeta({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 print:text-slate-600">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

export function InvoiceDocumentSection({
  invoice,
  company,
  signature,
  companyTimeZone,
  logoUrl,
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
      <InvoiceCompanyHeroHeader company={company} logoUrl={logoUrl} />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_min(100%,320px)] lg:items-start lg:gap-8 print:mt-8 print:grid-cols-[1fr_240px] print:gap-8">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 print:text-slate-600">
            Invoice
          </p>
          <h2 className="mt-1 break-words text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl print:text-2xl">
            {invoice.invoiceNumber}
          </h2>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:max-w-md">
            <InvoiceIdentityMeta
              label="Issue date"
              value={formatDate(invoice.issueDate)}
            />
            <InvoiceIdentityMeta
              label="Due date"
              value={formatDate(invoice.dueDate)}
            />
          </dl>
        </div>

        <InvoiceAmountDueHero
          balanceDue={invoice.balanceDue}
          total={invoice.total}
          amountPaid={invoice.amountPaid}
          dueDate={invoice.dueDate}
        />
      </div>

      <div className="mt-8 border-t border-slate-200 pt-8 print:mt-8 print:pt-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 print:text-slate-600">
          Bill to
        </p>
        <div className="mt-4 rounded-xl bg-slate-50/80 px-5 py-4 ring-1 ring-slate-200/80 print:rounded-none print:bg-white print:px-0 print:py-0 print:ring-0">
          <p className="break-words text-lg font-semibold text-slate-900 print:text-base">
            {invoice.customerName}
          </p>
          {(customerEmail || customerPhone) ? (
            <div className="mt-3 space-y-1.5 text-sm text-slate-600">
              {customerEmail ? (
                <p className="break-all">{customerEmail}</p>
              ) : null}
              {customerPhone ? <p>{customerPhone}</p> : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-8 print:mt-8">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 print:text-slate-600">
          Services
        </h3>
        <div className="mt-5">
          <BillingLineItemsList
            items={invoice.lineItems}
            documentLabel="invoice"
            variant="table"
            documentStyle="invoice"
          />
        </div>

        <div className="mt-6 max-w-md sm:ml-auto print:mt-6 print:max-w-sm print:ml-auto">
          <BillingTotalsSummary
            subtotal={invoice.subtotal}
            taxRate={invoice.taxRate}
            taxAmount={invoice.taxAmount ?? 0}
            total={invoice.total}
            amountPaid={invoice.amountPaid}
            balanceDue={invoice.balanceDue}
            documentStyle="invoice"
          />
        </div>
      </div>

      {invoice.notes ? (
        <div className="mt-8 border-t border-slate-200 pt-8 print:mt-8 print:pt-8">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 print:text-slate-600">
            Notes
          </h3>
          <p className="mt-4 break-words text-sm leading-relaxed text-slate-700">
            {invoice.notes}
          </p>
        </div>
      ) : null}

      <BillingSignatureBlock
        variant="invoice"
        signature={signature}
        companyTimeZone={companyTimeZone}
        documentStyle="invoice"
        className="mt-8 print:mt-8"
      />

      <InvoiceThankYouFooter company={company} />
    </section>
  );
}
