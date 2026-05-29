import type { InvoiceDetail } from "@/shared/types/invoice";
import type { BillingCompanyContact } from "@/shared/lib/billing-company-contact";
import { BillingLineItemsList } from "./BillingLineItemsList";
import { BillingSignatureBlock } from "./BillingSignatureBlock";
import { BillingTotalsSummary } from "./BillingTotalsSummary";
import { InvoiceAmountDueHero } from "./InvoiceAmountDueHero";
import { InvoiceCompanyHeroHeader } from "./InvoiceCompanyHeroHeader";
import { InvoiceIdentityCard } from "./InvoiceIdentityCard";
import { InvoiceNotesBlock } from "./InvoiceNotesBlock";
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
  showSignature?: boolean;
};

export function InvoiceDocumentSection({
  invoice,
  company,
  signature,
  companyTimeZone,
  logoUrl,
  className = "",
  id = "invoice-document",
  showSignature = true,
}: InvoiceDocumentSectionProps) {
  const customerEmail = invoice.customerEmail?.trim();
  const customerPhone = invoice.customerPhone?.trim();

  return (
    <section
      id={id}
      className={`rounded-2xl border border-slate-300 bg-white p-5 shadow-sm sm:p-8 print:rounded-none print:border print:border-slate-400 print:p-0 print:shadow-none ${className}`}
    >
      <InvoiceCompanyHeroHeader company={company} logoUrl={logoUrl} />

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_min(100%,360px)] lg:items-stretch lg:gap-8 print:mt-8 print:grid-cols-[1fr_260px] print:gap-8">
        <InvoiceIdentityCard
          invoiceNumber={invoice.invoiceNumber}
          issueDate={invoice.issueDate}
          dueDate={invoice.dueDate}
        />

        <InvoiceAmountDueHero
          balanceDue={invoice.balanceDue}
          total={invoice.total}
          amountPaid={invoice.amountPaid}
          dueDate={invoice.dueDate}
        />
      </div>

      <div className="mt-8 border-t border-slate-200 pt-8 print:mt-8 print:pt-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 print:text-slate-600">
          Bill to
        </p>
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 px-5 py-5 ring-1 ring-slate-100 print:rounded-none print:border-0 print:bg-white print:px-0 print:py-0 print:ring-0">
          <p className="break-words text-xl font-semibold text-slate-900 print:text-base">
            {invoice.customerName}
          </p>
          {(customerEmail || customerPhone) ? (
            <div className="mt-3 space-y-1.5 text-sm leading-relaxed text-slate-600">
              {customerEmail ? (
                <p className="break-all">{customerEmail}</p>
              ) : null}
              {customerPhone ? <p>{customerPhone}</p> : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-8 print:mt-8">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 print:text-slate-600">
          Services performed
        </h3>
        <div className="mt-5">
          <BillingLineItemsList
            items={invoice.lineItems}
            documentLabel="invoice"
            variant="table"
            documentStyle="invoice"
          />
        </div>

        <div className="mt-6 flex justify-end print:mt-6">
          <div className="w-full max-w-md print:max-w-sm">
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
      </div>

      {invoice.notes ? (
        <div className="mt-8 border-t border-slate-200 pt-8 print:mt-8 print:pt-8">
          <InvoiceNotesBlock notes={invoice.notes} />
        </div>
      ) : null}

      {showSignature ? (
        <BillingSignatureBlock
          variant="invoice"
          signature={signature}
          companyTimeZone={companyTimeZone}
          documentStyle="invoice"
          className="mt-8 print:mt-8"
        />
      ) : null}

      <InvoiceThankYouFooter company={company} />
    </section>
  );
}
