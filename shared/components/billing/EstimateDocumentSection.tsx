import type { EstimateDetail } from "@/shared/types/estimate";
import type { BillingCompanyContact } from "@/shared/lib/billing-company-contact";
import { EstimateStatusBadge } from "@/shared/components/estimates/EstimateStatusBadge";
import { BillingLineItemsList } from "./BillingLineItemsList";
import { BillingSignatureBlock } from "./BillingSignatureBlock";
import { BillingTotalsSummary } from "./BillingTotalsSummary";
import { EstimateIdentityCard } from "./EstimateIdentityCard";
import { EstimateThankYouFooter } from "./EstimateThankYouFooter";
import { EstimateTotalHero } from "./EstimateTotalHero";
import { InvoiceCompanyHeroHeader } from "./InvoiceCompanyHeroHeader";
import { InvoiceNotesBlock } from "./InvoiceNotesBlock";

import type { BillingSignature } from "@/shared/types/billing-signature";

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
  /** Show customer-facing thank-you footer. Default true. */
  showFooter?: boolean;
  /** Label for the customer section. */
  customerSectionLabel?: "Bill to" | "Prepared for";
  /** Include online approval guidance in the footer. */
  showApprovalGuidance?: boolean;
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
  showFooter = true,
  customerSectionLabel = "Bill to",
  showApprovalGuidance = false,
}: EstimateDocumentSectionProps) {
  const customerEmail = estimate.customerEmail?.trim();
  const customerPhone = estimate.customerPhone?.trim();

  return (
    <section
      id={id}
      className={`rounded-2xl border border-slate-300 bg-white p-5 shadow-sm sm:p-8 print:rounded-none print:border print:border-slate-400 print:p-0 print:shadow-none ${className}`}
    >
      <InvoiceCompanyHeroHeader company={company} logoUrl={logoUrl} />

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_min(100%,360px)] lg:items-stretch lg:gap-8 print:mt-8 print:grid-cols-[1fr_260px] print:gap-8">
        <div className="min-w-0 space-y-4">
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

      <div className="mt-8 border-t border-slate-200 pt-8 print:mt-8 print:pt-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 print:text-slate-600">
          {customerSectionLabel}
        </p>
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 px-5 py-5 ring-1 ring-slate-100 print:rounded-none print:border-0 print:bg-white print:px-0 print:py-0 print:ring-0">
          <p className="break-words text-xl font-semibold text-slate-900 print:text-base">
            {estimate.customerName}
          </p>
          {customerEmail || customerPhone ? (
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
          Proposed services
        </h3>
        <div className="mt-5">
          <BillingLineItemsList
            items={estimate.lineItems}
            documentLabel="estimate"
            variant="table"
            documentStyle="estimate"
          />
        </div>

        <div className="mt-6 flex justify-end print:mt-6">
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
        <div className="mt-8 border-t border-slate-200 pt-8 print:mt-8 print:pt-8">
          <InvoiceNotesBlock notes={estimate.notes} />
        </div>
      ) : null}

      {showSignature ? (
        <BillingSignatureBlock
          variant="estimate"
          signature={signature}
          companyTimeZone={companyTimeZone}
          documentStyle="estimate"
          className="mt-8 print:mt-8"
        />
      ) : null}

      {showFooter ? (
        <EstimateThankYouFooter
          company={company}
          validUntil={estimate.validUntil}
          showApprovalGuidance={showApprovalGuidance}
        />
      ) : null}
    </section>
  );
}
