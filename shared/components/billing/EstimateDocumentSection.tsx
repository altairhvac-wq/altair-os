import { formatDate } from "@/shared/types/customer";
import type { EstimateDetail } from "@/shared/types/estimate";
import type { BillingCompanyContact } from "@/shared/lib/billing-company-contact";
import { BillingCompanyContactBlock } from "./BillingCompanyContactBlock";
import { BillingLineItemsList } from "./BillingLineItemsList";
import { BillingSignatureBlock } from "./BillingSignatureBlock";
import { BillingTotalsSummary } from "./BillingTotalsSummary";
import { EstimateStatusBadge } from "@/shared/components/estimates/EstimateStatusBadge";

type EstimateDocumentSectionProps = {
  estimate: EstimateDetail;
  company: BillingCompanyContact;
  className?: string;
  id?: string;
};

export function EstimateDocumentSection({
  estimate,
  company,
  className = "",
  id = "estimate-document",
}: EstimateDocumentSectionProps) {
  const customerEmail = estimate.customerEmail?.trim();
  const customerPhone = estimate.customerPhone?.trim();

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
            Estimate
          </p>
          <h2 className="mt-1 break-words text-xl font-bold text-slate-900 print:text-2xl">
            {estimate.estimateNumber}
          </h2>
          <div className="mt-3 space-y-1 text-sm text-slate-600">
            <p>
              <span className="font-medium text-slate-700">Issued:</span>{" "}
              {formatDate(estimate.createdAt)}
            </p>
            {estimate.validUntil ? (
              <p>
                <span className="font-medium text-slate-700">Valid until:</span>{" "}
                {formatDate(estimate.validUntil)}
              </p>
            ) : null}
            <div className="pt-1 sm:flex sm:justify-end print:flex print:justify-end">
              <EstimateStatusBadge status={estimate.status} />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 border-b border-slate-200 pb-6 print:mt-8 print:pb-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 print:text-slate-700">
          Bill to
        </p>
        <p className="mt-2 break-words text-base font-semibold text-slate-900">
          {estimate.customerName}
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
            items={estimate.lineItems}
            documentLabel="estimate"
            variant="table"
          />
        </div>

        <div className="mt-4 max-w-md sm:ml-auto print:max-w-sm print:ml-auto">
          <BillingTotalsSummary
            subtotal={estimate.subtotal}
            taxRate={estimate.taxRate}
            taxAmount={estimate.tax ?? 0}
            total={estimate.total}
          />
        </div>
      </div>

      {estimate.notes ? (
        <div className="mt-6 border-t border-slate-200 pt-6 print:mt-8 print:pt-8">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 print:text-slate-700">
            Notes
          </h3>
          <p className="mt-3 break-words text-sm leading-relaxed text-slate-700">
            {estimate.notes}
          </p>
        </div>
      ) : null}

      <BillingSignatureBlock variant="estimate" className="mt-6 print:mt-8" />
    </section>
  );
}
