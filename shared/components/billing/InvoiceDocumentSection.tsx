import type { ReactNode } from "react";
import type { InvoiceDetail } from "@/shared/types/invoice";
import type { BillingCompanyContact } from "@/shared/lib/billing-company-contact";
import type { BillingDocumentLayoutVariant } from "@/shared/lib/billing-document-style";
import { getBillingScopeSummary } from "@/shared/lib/billing-document-scope-summary";
import { formatDate } from "@/shared/types/customer";
import { BillingCollapsibleSection } from "./BillingCollapsibleSection";
import { BillingLineItemsList } from "./BillingLineItemsList";
import { BillingSignatureSection } from "./BillingSignatureSection";
import type { BillingSignatureCaptureContext } from "./BillingSignatureSection";
import { BillingTotalsSummary } from "./BillingTotalsSummary";
import { InvoiceAmountDueHero } from "./InvoiceAmountDueHero";
import { InvoiceCompanyHeroHeader } from "./InvoiceCompanyHeroHeader";
import { InvoiceIdentityCard } from "./InvoiceIdentityCard";
import { InvoiceNotesBlock } from "./InvoiceNotesBlock";
import { InvoiceThankYouFooter } from "./InvoiceThankYouFooter";
import { PublicBillingCompactAmount } from "./PublicBillingCompactAmount";
import { PublicBillingCompactHeader } from "./PublicBillingCompactHeader";

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
  /** Allow in-app signature capture beside the signature block. */
  canCaptureSignature?: boolean;
  signatureCaptureContext?: BillingSignatureCaptureContext;
  /** Renders after customer on mobile, after footer on sm+ (e.g. public payment panel). */
  afterCustomer?: ReactNode;
  /** Compact customer-facing layout for public payment links. */
  layoutVariant?: BillingDocumentLayoutVariant;
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
  canCaptureSignature = false,
  signatureCaptureContext,
  afterCustomer,
  layoutVariant = "default",
}: InvoiceDocumentSectionProps) {
  const customerEmail = invoice.customerEmail?.trim();
  const customerPhone = invoice.customerPhone?.trim();
  const isPublicLayout = layoutVariant === "public";
  const isPaidInFull = invoice.balanceDue <= 0;

  if (isPublicLayout) {
    const scopeSummary = getBillingScopeSummary(invoice.lineItems);
    const lineItemCount = invoice.lineItems.length;
    const lineItemsTitle =
      lineItemCount === 1
        ? "Service details"
        : `Services & pricing (${lineItemCount} items)`;
    const dueDateHint =
      !isPaidInFull && invoice.dueDate?.trim()
        ? `Due ${formatDate(invoice.dueDate, companyTimeZone)}`
        : undefined;

    return (
      <section
        id={id}
        className={`flex min-w-0 flex-col overflow-x-hidden rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm sm:rounded-2xl sm:p-5 ${className}`}
      >
        <PublicBillingCompactHeader
          company={company}
          logoUrl={logoUrl}
          documentKind="invoice"
          documentNumber={invoice.invoiceNumber}
          customerLabel="Bill to"
          customerName={invoice.customerName}
          issueDate={invoice.issueDate}
          secondaryDate={invoice.dueDate}
          secondaryDateLabel="Due"
          companyTimeZone={companyTimeZone}
          scopeSummary={scopeSummary}
          hideDates
          density="compact"
        />

        <div className="mt-2.5">
          <PublicBillingCompactAmount
            label={isPaidInFull ? "Status" : "Balance due"}
            amount={invoice.balanceDue}
            displayValue={isPaidInFull ? "Paid in full" : undefined}
            hint={dueDateHint}
            emphasis={isPaidInFull ? "default" : "primary"}
          />
        </div>

        {afterCustomer ? (
          <div className="mt-2.5 min-w-0 print:hidden">{afterCustomer}</div>
        ) : null}

        <div className="mt-3 min-w-0">
          <BillingCollapsibleSection title={lineItemsTitle}>
            <BillingLineItemsList
              items={invoice.lineItems}
              documentLabel="invoice"
              variant="cards"
              compactDescriptions
            />
            <div className="mt-3">
              <BillingTotalsSummary
                subtotal={invoice.subtotal}
                taxRate={invoice.taxRate}
                taxAmount={invoice.taxAmount ?? 0}
                total={invoice.total}
                amountPaid={invoice.amountPaid}
                balanceDue={invoice.balanceDue}
                documentStyle="default"
                hideTotal
                hideBalanceDue={!isPaidInFull}
              />
            </div>
          </BillingCollapsibleSection>
        </div>

        {invoice.notes ? (
          <div className="mt-2">
            <BillingCollapsibleSection title="Notes">
              <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-700 sm:text-sm">
                {invoice.notes.trim()}
              </p>
            </BillingCollapsibleSection>
          </div>
        ) : null}

        <div className="mt-2">
          <BillingCollapsibleSection title="Questions & contact">
            <InvoiceThankYouFooter company={company} embedded />
          </BillingCollapsibleSection>
        </div>
      </section>
    );
  }

  return (
    <section
      id={id}
      className={`flex flex-col rounded-xl border border-slate-300 bg-white p-3 shadow-sm sm:rounded-2xl sm:p-5 md:p-8 print:rounded-none print:border print:border-slate-400 print:p-0 print:shadow-none ${className}`}
    >
      <div className="order-1">
        <InvoiceCompanyHeroHeader company={company} logoUrl={logoUrl} />
      </div>

      <div className="order-2 mt-4 grid grid-cols-[minmax(0,1fr)_minmax(0,42%)] items-start gap-2 sm:mt-8 sm:grid-cols-1 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_min(100%,360px)] lg:items-stretch lg:gap-8 print:mt-8 print:grid-cols-[1fr_260px] print:gap-8">
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

      <div className="order-3 mt-4 border-t border-slate-200 pt-4 sm:mt-8 sm:pt-8 print:mt-8 print:pt-8">
        <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500 sm:text-[10px] sm:tracking-[0.14em] print:text-slate-600">
          Bill to
        </p>
        <div className="mt-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 ring-1 ring-slate-100 sm:mt-4 sm:rounded-xl sm:px-5 sm:py-5 print:rounded-none print:border-0 print:bg-white print:px-0 print:py-0 print:ring-0">
          <p className="break-words text-base font-semibold text-slate-900 sm:text-xl print:text-base">
            {invoice.customerName}
          </p>
          {(customerEmail || customerPhone) ? (
            <div className="mt-1.5 space-y-0.5 text-xs leading-snug text-slate-600 sm:mt-3 sm:space-y-1.5 sm:text-sm sm:leading-relaxed">
              {customerEmail ? (
                <p className="break-all">{customerEmail}</p>
              ) : null}
              {customerPhone ? <p>{customerPhone}</p> : null}
            </div>
          ) : null}
        </div>
      </div>

      {afterCustomer ? (
        <div className="order-4 mt-3 sm:order-8 sm:mt-8 print:hidden">
          {afterCustomer}
        </div>
      ) : null}

      <div className="order-5 mt-4 sm:order-4 sm:mt-8 print:order-4 print:mt-8">
        <h3 className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500 sm:text-[10px] sm:tracking-[0.14em] print:text-slate-600">
          Services performed
        </h3>
        <div className="mt-2 sm:mt-5">
          <BillingLineItemsList
            items={invoice.lineItems}
            documentLabel="invoice"
            variant="table"
            documentStyle="invoice"
          />
        </div>

        <div className="mt-3 flex justify-end sm:mt-6 print:mt-6">
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
        <div className="order-6 mt-4 border-t border-slate-200 pt-4 sm:order-5 sm:mt-8 sm:pt-8 print:order-5 print:mt-8 print:pt-8">
          <InvoiceNotesBlock notes={invoice.notes} />
        </div>
      ) : null}

      {showSignature ? (
        <BillingSignatureSection
          variant="invoice"
          signature={signature}
          companyTimeZone={companyTimeZone}
          documentStyle="invoice"
          className="order-7 mt-4 sm:order-6 sm:mt-8 print:order-6 print:mt-8"
          canCaptureSignature={canCaptureSignature}
          captureContext={signatureCaptureContext}
        />
      ) : null}

      <div className="order-8 sm:order-7 print:order-7">
        <InvoiceThankYouFooter company={company} />
      </div>
    </section>
  );
}
