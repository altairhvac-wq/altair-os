import type { EstimateDetail } from "@/shared/types/estimate";
import type { BillingCompanyContact } from "@/shared/lib/billing-company-contact";
import type { BillingDocumentLayoutVariant } from "@/shared/lib/billing-document-style";
import { getBillingScopeSummary } from "@/shared/lib/billing-document-scope-summary";
import { EstimateStatusBadge } from "@/shared/components/estimates/EstimateStatusBadge";
import { BillingCollapsibleSection } from "./BillingCollapsibleSection";
import { BillingLineItemsList } from "./BillingLineItemsList";
import { BillingSignatureSection } from "./BillingSignatureSection";
import type { BillingSignatureCaptureContext } from "./BillingSignatureSection";
import { BillingTotalsSummary } from "./BillingTotalsSummary";
import { EstimateIdentityCard } from "./EstimateIdentityCard";
import { EstimateThankYouFooter } from "./EstimateThankYouFooter";
import { EstimateTotalHero } from "./EstimateTotalHero";
import { InvoiceCompanyHeroHeader } from "./InvoiceCompanyHeroHeader";
import { InvoiceNotesBlock } from "./InvoiceNotesBlock";
import { PublicBillingCompactAmount } from "./PublicBillingCompactAmount";
import { PublicBillingCompactHeader } from "./PublicBillingCompactHeader";

import type { BillingSignature } from "@/shared/types/billing-signature";
import type { ReactNode } from "react";

export type EstimateDocumentData = Pick<
  EstimateDetail,
  | "estimateNumber"
  | "customerName"
  | "customerEmail"
  | "customerPhone"
  | "status"
  | "lineItems"
  | "subtotal"
  | "taxRate"
  | "tax"
  | "total"
  | "validUntil"
  | "notes"
  | "createdAt"
>;

type EstimateDocumentSectionProps = {
  estimate: EstimateDocumentData;
  company: BillingCompanyContact;
  signature?: BillingSignature | null;
  companyTimeZone?: string;
  logoUrl?: string | null;
  className?: string;
  id?: string;
  /** Show internal status badge in the identity area. Default true. */
  showStatusBadge?: boolean;
  /** Show captured signature block. Default true. */
  showSignature?: boolean;
  /** Allow in-app signature capture beside the signature block. */
  canCaptureSignature?: boolean;
  signatureCaptureContext?: BillingSignatureCaptureContext;
  /** Show customer-facing thank-you footer. Default true. */
  showFooter?: boolean;
  /** Label for the customer section. */
  customerSectionLabel?: "Bill to" | "Prepared for";
  /** Include online approval guidance in the footer. */
  showApprovalGuidance?: boolean;
  /** Renders after customer on mobile, after footer on sm+ (e.g. public approval form). */
  afterCustomer?: ReactNode;
  /** Compact customer-facing layout for public approval links. */
  layoutVariant?: BillingDocumentLayoutVariant;
};

export function EstimateDocumentSection({
  estimate,
  company,
  signature,
  companyTimeZone,
  logoUrl,
  className = "",
  id = "estimate-document",
  showStatusBadge = true,
  showSignature = true,
  canCaptureSignature = false,
  signatureCaptureContext,
  showFooter = true,
  customerSectionLabel = "Bill to",
  showApprovalGuidance = false,
  afterCustomer,
  layoutVariant = "default",
}: EstimateDocumentSectionProps) {
  const customerEmail = estimate.customerEmail?.trim();
  const customerPhone = estimate.customerPhone?.trim();
  const isPublicLayout = layoutVariant === "public";

  if (isPublicLayout) {
    const scopeSummary = getBillingScopeSummary(estimate.lineItems);
    const lineItemCount = estimate.lineItems.length;
    const lineItemsTitle =
      lineItemCount === 1
        ? "Service details"
        : `Services & pricing (${lineItemCount} items)`;

    return (
      <section
        id={id}
        className={`flex min-w-0 flex-col overflow-x-hidden rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm sm:rounded-2xl sm:p-5 ${className}`}
      >
        <PublicBillingCompactHeader
          company={company}
          logoUrl={logoUrl}
          documentKind="estimate"
          documentNumber={estimate.estimateNumber}
          customerLabel={customerSectionLabel}
          customerName={estimate.customerName}
          issueDate={estimate.createdAt}
          secondaryDate={estimate.validUntil}
          secondaryDateLabel="Valid until"
          companyTimeZone={companyTimeZone}
          scopeSummary={scopeSummary}
          hideDates
          density="compact"
        />

        <div className="mt-2.5">
          <PublicBillingCompactAmount
            label="Total"
            amount={estimate.total}
            emphasis="primary"
          />
        </div>

        {afterCustomer ? (
          <div className="mt-2.5 min-w-0 print:hidden">{afterCustomer}</div>
        ) : null}

        <div className="mt-3 min-w-0">
          <BillingCollapsibleSection title={lineItemsTitle}>
            <BillingLineItemsList
              items={estimate.lineItems}
              documentLabel="estimate"
              variant="cards"
              compactDescriptions
            />
            <div className="mt-3">
              <BillingTotalsSummary
                subtotal={estimate.subtotal}
                taxRate={estimate.taxRate}
                taxAmount={estimate.tax ?? 0}
                total={estimate.total}
                documentStyle="default"
                hideTotal
              />
            </div>
          </BillingCollapsibleSection>
        </div>

        {estimate.notes ? (
          <div className="mt-2">
            <BillingCollapsibleSection title="Notes">
              <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-700 sm:text-sm">
                {estimate.notes.trim()}
              </p>
            </BillingCollapsibleSection>
          </div>
        ) : null}

        {showFooter ? (
          <div className="mt-2">
            <BillingCollapsibleSection title="Terms & contact">
              <EstimateThankYouFooter
                company={company}
                validUntil={estimate.validUntil}
                showApprovalGuidance={showApprovalGuidance}
                embedded
              />
            </BillingCollapsibleSection>
          </div>
        ) : null}
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
        <div className="min-w-0 space-y-2 sm:space-y-4">
          <EstimateIdentityCard
            estimateNumber={estimate.estimateNumber}
            issueDate={estimate.createdAt}
            validUntil={estimate.validUntil}
          />
          {showStatusBadge ? (
            <div className="no-print flex justify-start lg:justify-end print:hidden">
              <EstimateStatusBadge status={estimate.status} />
            </div>
          ) : null}
        </div>

        <EstimateTotalHero
          total={estimate.total}
          validUntil={estimate.validUntil}
        />
      </div>

      <div className="order-3 mt-4 border-t border-slate-200 pt-4 sm:mt-8 sm:pt-8 print:mt-8 print:pt-8">
        <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500 sm:text-[10px] sm:tracking-[0.14em] print:text-slate-600">
          {customerSectionLabel}
        </p>
        <div className="mt-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 ring-1 ring-slate-100 sm:mt-4 sm:rounded-xl sm:px-5 sm:py-5 print:rounded-none print:border-0 print:bg-white print:px-0 print:py-0 print:ring-0">
          <p className="break-words text-base font-semibold text-slate-900 sm:text-xl print:text-base">
            {estimate.customerName}
          </p>
          {customerEmail || customerPhone ? (
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
          Proposed services
        </h3>
        <div className="mt-2 sm:mt-5">
          <BillingLineItemsList
            items={estimate.lineItems}
            documentLabel="estimate"
            variant="table"
            documentStyle="estimate"
          />
        </div>

        <div className="mt-3 flex justify-end sm:mt-6 print:mt-6">
          <div className="w-full max-w-md print:max-w-sm">
            <BillingTotalsSummary
              subtotal={estimate.subtotal}
              taxRate={estimate.taxRate}
              taxAmount={estimate.tax ?? 0}
              total={estimate.total}
              documentStyle="estimate"
            />
          </div>
        </div>
      </div>

      {estimate.notes ? (
        <div className="order-6 mt-4 border-t border-slate-200 pt-4 sm:order-5 sm:mt-8 sm:pt-8 print:order-5 print:mt-8 print:pt-8">
          <InvoiceNotesBlock notes={estimate.notes} />
        </div>
      ) : null}

      {showSignature ? (
        <BillingSignatureSection
          variant="estimate"
          signature={signature}
          companyTimeZone={companyTimeZone}
          documentStyle="estimate"
          className="order-7 mt-4 sm:order-6 sm:mt-8 print:order-6 print:mt-8"
          canCaptureSignature={canCaptureSignature}
          captureContext={signatureCaptureContext}
        />
      ) : null}

      {showFooter ? (
        <div className="order-8 sm:order-7 print:order-7">
          <EstimateThankYouFooter
            company={company}
            validUntil={estimate.validUntil}
            showApprovalGuidance={showApprovalGuidance}
          />
        </div>
      ) : null}
    </section>
  );
}
