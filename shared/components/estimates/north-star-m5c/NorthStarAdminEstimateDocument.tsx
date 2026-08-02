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
import {
  altairMcCardClass,
  altairMcCardPadClass,
  altairMcMetricLabelClass,
} from "@/shared/design-system/components";
import type { BillingSignature } from "@/shared/types/billing-signature";

type NorthStarAdminEstimateDocumentProps = {
  estimate: EstimateDocumentData;
  company: BillingCompanyContact;
  signature?: BillingSignature | null;
  companyTimeZone?: string;
  logoUrl?: string | null;
};

const printOnlyBlockClass = `${estimatePrintOnlyBlockClass} hidden print:block print:break-inside-avoid`;

function formatBillingAddress(estimate: EstimateDocumentData): string[] {
  const lines: string[] = [];
  const line1 = estimate.customerAddress?.trim();
  const line2 = estimate.customerAddressLine2?.trim();
  if (line1) lines.push(line1);
  if (line2) lines.push(line2);

  const cityStateZip = [
    estimate.customerCity?.trim(),
    [estimate.customerState?.trim(), estimate.customerZip?.trim()]
      .filter(Boolean)
      .join(" "),
  ]
    .filter(Boolean)
    .join(", ");

  if (cityStateZip) lines.push(cityStateZip);
  return lines;
}

export function NorthStarAdminEstimateDocument({
  estimate,
  company,
  signature,
  companyTimeZone,
  logoUrl,
}: NorthStarAdminEstimateDocumentProps) {
  const billingAddressLines = formatBillingAddress(estimate);

  const totalHero = (
    <EstimateTotalHero total={estimate.total} northStar />
  );

  return (
    <section
      id="estimate-document"
      className={`${altairMcCardClass} ${altairMcCardPadClass} estimate-north-star-document relative flex min-h-[960px] flex-col overflow-x-hidden print:min-h-0 print:rounded-none print:border print:border-slate-400 print:bg-white print:p-0 print:shadow-none`}
      data-north-star-admin-estimate-document="true"
    >
      <div className="order-1">
        <InvoiceCompanyHeroHeader company={company} logoUrl={logoUrl} />
      </div>

      <div
        className="order-2 mt-2.5 grid grid-cols-[minmax(0,1fr)_minmax(0,42%)] items-start gap-2 sm:mt-3 sm:grid-cols-1 sm:gap-3 lg:grid-cols-[minmax(0,1fr)_min(100%,280px)] lg:items-stretch lg:gap-4 print:grid-cols-[1fr_200px] print:gap-4"
      >
        <EstimateIdentityCard
          estimateNumber={estimate.estimateNumber}
          issueDate={estimate.createdAt}
          validUntil={estimate.validUntil}
          northStar
        />
        {totalHero}
      </div>

      <div className="order-3 mt-2 border-t border-altair-border pt-2 sm:mt-2.5 sm:pt-2.5 print:mt-1.5 print:border-slate-200 print:pt-1.5">
        <p className={`${altairMcMetricLabelClass} print:text-slate-600`}>Bill to</p>
        <div className="mt-0.5 min-w-0 print:mt-0.5">
          <p className="break-words text-sm font-semibold leading-tight text-altair-ink-on-paper print:text-sm print:text-slate-900">
            <DemoDisplayName>{estimate.customerName}</DemoDisplayName>
          </p>
          {billingAddressLines.length > 0 ? (
            <div className="mt-0.5 space-y-0.5 text-xs leading-tight text-altair-ink-on-paper-secondary print:text-slate-600">
              {billingAddressLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="order-5 mt-2.5 flex min-h-0 flex-1 flex-col sm:mt-3 print:order-4 print:mt-2 print:flex-none">
        <div>
          <h3 className={`${altairMcMetricLabelClass} print:text-slate-600`}>
            Proposed services
          </h3>
          <div className="estimate-line-items estimate-north-star-line-items mt-1 sm:mt-1.5">
            <BillingLineItemsList
              items={estimate.lineItems}
              documentLabel="estimate"
              variant="table"
              documentStyle="estimate"
              northStar
            />
          </div>
        </div>

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
      </div>

      {estimate.notes ? (
        <div className="order-6 mt-2.5 border-t border-altair-border pt-2.5 sm:mt-3 sm:pt-3 print:order-5 print:mt-2 print:border-slate-200 print:pt-2">
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
