import type { EstimateDetail } from "@/shared/types/estimate";
import type { BillingCompanyContact } from "@/shared/lib/billing-company-contact";
import {
  estimateDocumentFooterAnchorClass,
  estimateDocumentPagePresenceClass,
  estimatePrintOnlyBlockClass,
  estimatePrintSignatureClass,
  type BillingDocumentAudience,
  type BillingDocumentLayoutVariant,
} from "@/shared/lib/billing-document-style";
import { DemoDisplayName } from "@/shared/components/display/DemoDisplayName";
import { EstimateStatusBadge } from "@/shared/components/estimates/EstimateStatusBadge";
import { BillingLineItemsList } from "./BillingLineItemsList";
import { BillingSignatureSection } from "./BillingSignatureSection";
import type { BillingSignatureCaptureContext } from "./BillingSignatureSection";
import { BillingTotalsSummary } from "./BillingTotalsSummary";
import { EstimateIdentityCard } from "./EstimateIdentityCard";
import { EstimateThankYouFooter } from "./EstimateThankYouFooter";
import { EstimateTotalHero } from "./EstimateTotalHero";
import { InvoiceCompanyHeroHeader } from "./InvoiceCompanyHeroHeader";
import { InvoiceNotesBlock } from "./InvoiceNotesBlock";

import type { BillingSignature } from "@/shared/types/billing-signature";
import type { ReactNode } from "react";
import { northStarEstimateDocumentTokens as edt } from "@/shared/design-system/north-star/tokens";

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
  /**
   * Include a compact signature block for print/PDF.
   * Hidden on screen when `signatureScreenVisibility` is `"print-only"`.
   */
  showPrintSignature?: boolean;
  /** @deprecated Use showPrintSignature */
  showSignature?: boolean;
  /** Screen visibility for the signature block. Default print-only for estimates. */
  signatureScreenVisibility?: "visible" | "print-only";
  /** Allow in-app signature capture beside the signature block. */
  canCaptureSignature?: boolean;
  signatureCaptureContext?: BillingSignatureCaptureContext;
  /** @deprecated Use showPrintFooter. Screen footer removed — print/PDF only. */
  showFooter?: boolean;
  /** One-line thank-you footer for print/PDF only. Default true. */
  showPrintFooter?: boolean;
  /** Label for the customer section. */
  customerSectionLabel?: "Bill to" | "Prepared for";
  /** Renders after Bill To on admin layouts (e.g. legacy integrations). */
  afterCustomer?: ReactNode;
  /** Compact customer-facing layout for public approval links. */
  layoutVariant?: BillingDocumentLayoutVariant;
  /** Who is viewing: admin (default) or customer/public. Print is CSS-driven. */
  documentAudience?: BillingDocumentAudience;
  /** North Star admin estimate detail document styling. Never used for public layout. */
  northStar?: boolean;
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
  showPrintSignature,
  showSignature,
  signatureScreenVisibility = "print-only",
  canCaptureSignature: _canCaptureSignature = false,
  signatureCaptureContext: _signatureCaptureContext,
  showFooter,
  showPrintFooter,
  customerSectionLabel = "Bill to",
  afterCustomer,
  layoutVariant = "default",
  northStar = false,
}: EstimateDocumentSectionProps) {
  const customerEmail = estimate.customerEmail?.trim();
  const customerPhone = estimate.customerPhone?.trim();
  const customerContactLine = [customerEmail, customerPhone]
    .filter(Boolean)
    .join(" · ");
  const isPublicLayout = layoutVariant === "public";
  const includePrintSignature = showPrintSignature ?? showSignature ?? true;
  const hideSignatureOnScreen = signatureScreenVisibility === "print-only";
  const includePrintFooter = showPrintFooter ?? showFooter ?? true;
  const printOnlyBlockClass = `${estimatePrintOnlyBlockClass} hidden print:block print:break-inside-avoid`;
  const showTaxBreakdown =
    (estimate.taxRate ?? 0) > 0 || (estimate.tax ?? 0) > 0;
  const sectionStackGap = northStar
    ? "mt-2.5 sm:mt-3 print:mt-2"
    : "mt-3 sm:mt-4 print:mt-2";
  const sectionDividerGap = northStar
    ? "mt-2.5 border-t pt-2.5 sm:mt-3 sm:pt-3 print:mt-2 print:pt-2"
    : "mt-3 border-t pt-3 sm:mt-4 sm:pt-4 print:mt-2 print:pt-2";
  const sectionBorderClass = northStar
    ? "border-[rgba(138,99,36,0.12)]"
    : "border-slate-200";

  const metadataGridClass = northStar
    ? `order-2 ${sectionStackGap} grid grid-cols-[minmax(0,1fr)_minmax(0,42%)] items-start gap-2 sm:grid-cols-1 sm:gap-3 lg:grid-cols-[minmax(0,1fr)_min(100%,280px)] lg:items-stretch lg:gap-4 print:grid-cols-[1fr_200px] print:gap-4`
    : "order-2 mt-3 grid grid-cols-[minmax(0,1fr)_minmax(0,42%)] items-start gap-2 sm:mt-4 sm:grid-cols-1 sm:gap-4 lg:grid-cols-[minmax(0,1fr)_min(100%,300px)] lg:items-stretch lg:gap-5 print:mt-3 print:grid-cols-[1fr_200px] print:gap-4";

  const surfaceClass = northStar
    ? `${edt.documentSurface} ${className}`
    : isPublicLayout
      ? `estimate-customer-document flex min-w-0 flex-col overflow-x-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4 ${estimateDocumentPagePresenceClass} print:rounded-none print:border print:border-slate-400 print:p-0 print:shadow-none ${className}`
      : `flex flex-col rounded-xl border border-slate-300 bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4 md:p-5 ${estimateDocumentPagePresenceClass} print:rounded-none print:border print:border-slate-400 print:p-0 print:shadow-none ${className}`;

  const lineItemsVariant = isPublicLayout ? "cards" : "table";

  return (
    <section id={id} className={surfaceClass}>
      <div className="order-1">
        <InvoiceCompanyHeroHeader company={company} logoUrl={logoUrl} />
      </div>

      <div className={metadataGridClass}>
        <div className="min-w-0">
          <EstimateIdentityCard
            estimateNumber={estimate.estimateNumber}
            issueDate={estimate.createdAt}
            validUntil={estimate.validUntil}
            northStar={northStar}
          />
          {showStatusBadge ? (
            <div className="no-print mt-1 flex justify-start lg:justify-end print:hidden">
              <EstimateStatusBadge status={estimate.status} />
            </div>
          ) : null}
        </div>

        <EstimateTotalHero total={estimate.total} northStar={northStar} />
      </div>

      <div
        className={`order-3 ${northStar ? "mt-2 border-t border-[rgba(138,99,36,0.12)] pt-2 sm:mt-2.5 sm:pt-2.5 print:mt-1.5 print:pt-1.5" : `${sectionDividerGap} ${sectionBorderClass}`}`}
      >
        <p
          className={
            northStar
              ? edt.documentSectionLabel
              : "text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500 sm:text-[10px] sm:tracking-[0.14em] print:text-slate-600"
          }
        >
          {customerSectionLabel}
        </p>
        <div className="mt-0.5 min-w-0 print:mt-0.5">
          <p
            className={`break-words text-sm font-semibold leading-tight print:text-sm ${northStar ? "text-[#17130E]" : "text-slate-900"}`}
          >
            <DemoDisplayName>{estimate.customerName}</DemoDisplayName>
          </p>
          {customerContactLine ? (
            <p
              className={`mt-0.5 text-xs leading-tight ${northStar ? "text-[#4F4638]" : "text-slate-600"}`}
            >
              {customerContactLine}
            </p>
          ) : null}
        </div>
      </div>

      {afterCustomer ? (
        <div className="order-4 mt-2.5 sm:order-8 sm:mt-4 print:hidden">
          {afterCustomer}
        </div>
      ) : null}

      <div className={`order-5 ${sectionStackGap} print:order-4`}>
        <h3
          className={
            northStar
              ? edt.documentSectionLabel
              : "text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500 sm:text-[10px] sm:tracking-[0.14em] print:text-slate-600"
          }
        >
          Proposed services
        </h3>
        <div
          className={`estimate-line-items mt-1 sm:mt-1.5 ${northStar ? edt.documentLineItemsTable : ""}`}
        >
          <BillingLineItemsList
            items={estimate.lineItems}
            documentLabel="estimate"
            variant={lineItemsVariant}
            documentStyle="estimate"
            northStar={northStar}
            compactDescriptions={isPublicLayout}
          />
        </div>

        {showTaxBreakdown ? (
          <div className="estimate-totals-block mt-1.5 flex justify-end sm:mt-2 print:mt-1.5">
            <div className="w-full max-w-md print:max-w-[220px]">
              <BillingTotalsSummary
                subtotal={estimate.subtotal}
                taxRate={estimate.taxRate}
                taxAmount={estimate.tax ?? 0}
                total={estimate.total}
                documentStyle="estimate"
                hideTotal
                compactSubtotal
                northStar={northStar}
              />
            </div>
          </div>
        ) : null}
      </div>

      {estimate.notes ? (
        <div
          className={`order-6 ${sectionDividerGap} ${sectionBorderClass} sm:order-5 print:order-5`}
        >
          <InvoiceNotesBlock notes={estimate.notes} northStar={northStar} />
        </div>
      ) : null}

      {includePrintSignature ? (
        hideSignatureOnScreen ? (
          <div
            className={`${printOnlyBlockClass} ${estimatePrintSignatureClass} order-7 ${sectionStackGap} sm:order-6 print:order-6`}
          >
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
        ) : (
          <BillingSignatureSection
            variant="estimate"
            signature={signature}
            companyTimeZone={companyTimeZone}
            documentStyle="estimate"
            compact
            printTemplate
            showCaptureAction={false}
            className={`order-7 ${sectionStackGap} sm:order-6 print:order-6`}
          />
        )
      ) : null}

      {includePrintFooter ? (
        <div
          className={`${printOnlyBlockClass} order-8 sm:order-7 print:order-7 ${estimateDocumentFooterAnchorClass}`}
        >
          <EstimateThankYouFooter company={company} />
        </div>
      ) : null}
    </section>
  );
}
