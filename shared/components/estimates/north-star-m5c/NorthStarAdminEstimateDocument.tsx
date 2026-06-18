import type { EstimateDocumentData } from "@/shared/components/billing/EstimateDocumentSection";
import { DemoDisplayName } from "@/shared/components/display/DemoDisplayName";
import { BillingLineItemsList } from "@/shared/components/billing/BillingLineItemsList";
import { BillingSignatureSection } from "@/shared/components/billing/BillingSignatureSection";
import { BillingTotalsSummary } from "@/shared/components/billing/BillingTotalsSummary";
import { EstimateIdentityCard } from "@/shared/components/billing/EstimateIdentityCard";
import { EstimateThankYouFooter } from "@/shared/components/billing/EstimateThankYouFooter";
import { EstimateTotalHero } from "@/shared/components/billing/EstimateTotalHero";
import { InvoiceCompanyHeroHeader } from "@/shared/components/billing/InvoiceCompanyHeroHeader";
import { InvoiceNotesBlock } from "@/shared/components/billing/InvoiceNotesBlock";
import {
  estimateDocumentFooterAnchorClass,
  estimatePrintOnlyBlockClass,
  estimatePrintSignatureClass,
} from "@/shared/lib/billing-document-style";
import type { BillingCompanyContact } from "@/shared/lib/billing-company-contact";
import { northStarEstimateDocumentTokens as edt } from "@/shared/design-system/north-star/tokens";
import type { BillingSignature } from "@/shared/types/billing-signature";

type NorthStarAdminEstimateDocumentProps = {
  estimate: EstimateDocumentData;
  company: BillingCompanyContact;
  signature?: BillingSignature | null;
  companyTimeZone?: string;
  logoUrl?: string | null;
};

const printOnlyBlockClass = `${estimatePrintOnlyBlockClass} hidden print:block print:break-inside-avoid`;

export function NorthStarAdminEstimateDocument({
  estimate,
  company,
  signature,
  companyTimeZone,
  logoUrl,
}: NorthStarAdminEstimateDocumentProps) {
  const customerEmail = estimate.customerEmail?.trim();
  const customerPhone = estimate.customerPhone?.trim();
  const customerContactLine = [customerEmail, customerPhone]
    .filter(Boolean)
    .join(" · ");
  const showTaxBreakdown =
    (estimate.taxRate ?? 0) > 0 || (estimate.tax ?? 0) > 0;

  const totalHero = (
    <EstimateTotalHero total={estimate.total} northStar />
  );

  return (
    <section
      id="estimate-document"
      className={edt.documentSurface}
      data-north-star-admin-estimate-document="true"
    >
      <div className="order-1">
        <InvoiceCompanyHeroHeader company={company} logoUrl={logoUrl} />
      </div>

      <div
        className={`order-2 mt-2.5 grid grid-cols-[minmax(0,1fr)_minmax(0,42%)] items-start gap-2 sm:mt-3 sm:grid-cols-1 sm:gap-3 lg:grid-cols-[minmax(0,1fr)_min(100%,280px)] lg:items-stretch lg:gap-4 print:grid-cols-[1fr_200px] print:gap-4`}
      >
        <EstimateIdentityCard
          estimateNumber={estimate.estimateNumber}
          issueDate={estimate.createdAt}
          validUntil={estimate.validUntil}
          northStar
        />
        {totalHero}
      </div>

      <div className="order-3 mt-2 border-t border-[rgba(138,99,36,0.12)] pt-2 sm:mt-2.5 sm:pt-2.5 print:mt-1.5 print:pt-1.5">
        <p className={edt.documentSectionLabel}>Bill to</p>
        <div className="mt-0.5 min-w-0 print:mt-0.5">
          <p className="break-words text-sm font-semibold leading-tight text-[#17130E] print:text-sm">
            <DemoDisplayName>{estimate.customerName}</DemoDisplayName>
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
          <h3 className={edt.documentSectionLabel}>Proposed services</h3>
          <div
            className={`estimate-line-items mt-1 sm:mt-1.5 ${edt.documentLineItemsTable}`}
          >
            <BillingLineItemsList
              items={estimate.lineItems}
              documentLabel="estimate"
              variant="table"
              documentStyle="estimate"
              northStar
            />
          </div>
        </div>

        {showTaxBreakdown ? (
          <div className="estimate-totals-block mt-auto flex justify-end pt-4 sm:pt-6 print:mt-1.5 print:pt-2">
            <div className="w-full max-w-md print:max-w-[220px]">
              <BillingTotalsSummary
                subtotal={estimate.subtotal}
                taxRate={estimate.taxRate}
                taxAmount={estimate.tax ?? 0}
                total={estimate.total}
                documentStyle="estimate"
                hideTotal
                compactSubtotal
                northStar
              />
            </div>
          </div>
        ) : null}
      </div>

      {estimate.notes ? (
        <div className="order-6 mt-2.5 border-t border-[rgba(138,99,36,0.12)] pt-2.5 sm:mt-3 sm:pt-3 print:order-5 print:mt-2 print:pt-2">
          <InvoiceNotesBlock notes={estimate.notes} northStar />
        </div>
      ) : null}

      <div
        className={`${printOnlyBlockClass} order-7 mt-2.5 sm:order-6 sm:mt-3 print:order-6 print:mt-2`}
      >
        <div className={estimatePrintSignatureClass}>
          <BillingSignatureSection
            variant="estimate"
            signature={signature}
            companyTimeZone={companyTimeZone}
            documentStyle="estimate"
            compact
            printTemplate
            showCaptureAction={false}
          />
        </div>
        <div className={estimateDocumentFooterAnchorClass}>
          <EstimateThankYouFooter company={company} />
        </div>
      </div>
    </section>
  );
}
