import { DemoDisplayName } from "@/shared/components/display/DemoDisplayName";
import { BillingLineItemsList } from "@/shared/components/billing/BillingLineItemsList";
import { BillingSignatureSection } from "@/shared/components/billing/BillingSignatureSection";
import { BillingTotalsSummary } from "@/shared/components/billing/BillingTotalsSummary";
import { InvoiceAmountDueHero } from "@/shared/components/billing/InvoiceAmountDueHero";
import { InvoiceCompanyHeroHeader } from "@/shared/components/billing/InvoiceCompanyHeroHeader";
import { InvoiceIdentityCard } from "@/shared/components/billing/InvoiceIdentityCard";
import { InvoiceNotesBlock } from "@/shared/components/billing/InvoiceNotesBlock";
import { InvoiceThankYouFooter } from "@/shared/components/billing/InvoiceThankYouFooter";
import {
  estimateDocumentFooterAnchorClass,
  estimatePrintOnlyBlockClass,
  estimatePrintSignatureClass,
} from "@/shared/lib/billing-document-style";
import type { BillingCompanyContact } from "@/shared/lib/billing-company-contact";
import { northStarInvoiceDocumentTokens as idt } from "@/shared/design-system/north-star/tokens";
import type { BillingSignature } from "@/shared/types/billing-signature";
import type { InvoiceDetail } from "@/shared/types/invoice";

type NorthStarAdminInvoiceDocumentProps = {
  invoice: InvoiceDetail;
  company: BillingCompanyContact;
  signature?: BillingSignature | null;
  companyTimeZone?: string;
  logoUrl?: string | null;
  showSignature?: boolean;
};

const printOnlyBlockClass = `${estimatePrintOnlyBlockClass} hidden print:block print:break-inside-avoid`;

export function NorthStarAdminInvoiceDocument({
  invoice,
  company,
  signature,
  companyTimeZone,
  logoUrl,
  showSignature = true,
}: NorthStarAdminInvoiceDocumentProps) {
  const customerEmail = invoice.customerEmail?.trim();
  const customerPhone = invoice.customerPhone?.trim();
  const customerContactLine = [customerEmail, customerPhone]
    .filter(Boolean)
    .join(" · ");
  const showTaxBreakdown =
    (invoice.taxRate ?? 0) > 0 || (invoice.taxAmount ?? 0) > 0;

  return (
    <section
      id="invoice-document"
      className={idt.documentSurface}
      data-north-star-admin-invoice-document="true"
    >
      <div className="order-1">
        <InvoiceCompanyHeroHeader company={company} logoUrl={logoUrl} />
      </div>

      <div
        className={`order-2 mt-2.5 grid grid-cols-[minmax(0,1fr)_minmax(0,42%)] items-start gap-2 sm:mt-3 sm:grid-cols-1 sm:gap-3 lg:grid-cols-[minmax(0,1fr)_min(100%,280px)] lg:items-stretch lg:gap-4 print:grid-cols-[1fr_200px] print:gap-4`}
      >
        <InvoiceIdentityCard
          invoiceNumber={invoice.invoiceNumber}
          issueDate={invoice.issueDate}
          dueDate={invoice.dueDate}
          northStar
        />

        <InvoiceAmountDueHero
          balanceDue={invoice.balanceDue}
          total={invoice.total}
          amountPaid={invoice.amountPaid}
          dueDate={invoice.dueDate}
          northStar
        />
      </div>

      <div className="order-3 mt-2 border-t border-[rgba(138,99,36,0.12)] pt-2 sm:mt-2.5 sm:pt-2.5 print:mt-1.5 print:pt-1.5">
        <p className={idt.documentSectionLabel}>Bill to</p>
        <div className="mt-0.5 min-w-0 print:mt-0.5">
          <p className="break-words text-sm font-semibold leading-tight text-[#17130E] print:text-sm">
            <DemoDisplayName>{invoice.customerName}</DemoDisplayName>
          </p>
          {customerContactLine ? (
            <p className="mt-0.5 text-xs leading-tight text-[#4F4638]">
              {customerContactLine}
            </p>
          ) : null}
        </div>
      </div>

      <div className="order-5 mt-2.5 flex min-h-0 flex-1 flex-col sm:mt-3 print:order-4 print:mt-2 print:flex-none">
        <div>
          <h3 className={idt.documentSectionLabel}>Services performed</h3>
          <div
            className={`invoice-line-items mt-1 sm:mt-1.5 ${idt.documentLineItemsTable}`}
          >
            <BillingLineItemsList
              items={invoice.lineItems}
              documentLabel="invoice"
              variant="table"
              documentStyle="invoice"
              northStar
            />
          </div>
        </div>

        {showTaxBreakdown || invoice.amountPaid > 0 ? (
          <div className="invoice-totals-block mt-auto flex justify-end pt-4 sm:pt-6 print:mt-1.5 print:pt-2">
            <div className="w-full max-w-md print:max-w-[220px]">
              <BillingTotalsSummary
                subtotal={invoice.subtotal}
                taxRate={invoice.taxRate}
                taxAmount={invoice.taxAmount ?? 0}
                total={invoice.total}
                amountPaid={invoice.amountPaid}
                balanceDue={invoice.balanceDue}
                documentStyle="invoice"
                hideTotal
                hideBalanceDue
                compactSubtotal
                northStar
              />
            </div>
          </div>
        ) : null}
      </div>

      {invoice.notes ? (
        <div className="order-6 mt-2.5 border-t border-[rgba(138,99,36,0.12)] pt-2.5 sm:mt-3 sm:pt-3 print:order-5 print:mt-2 print:pt-2">
          <InvoiceNotesBlock notes={invoice.notes} northStar />
        </div>
      ) : null}

      <div
        className={`${printOnlyBlockClass} order-8 sm:order-7 print:order-6 print:mt-2`}
      >
        {showSignature ? (
          <div className={estimatePrintSignatureClass}>
            <BillingSignatureSection
              variant="invoice"
              signature={signature}
              companyTimeZone={companyTimeZone}
              documentStyle="invoice"
              compact
              printTemplate
              showCaptureAction={false}
            />
          </div>
        ) : null}
        <div className={estimateDocumentFooterAnchorClass}>
          <InvoiceThankYouFooter company={company} />
        </div>
      </div>
    </section>
  );
}
