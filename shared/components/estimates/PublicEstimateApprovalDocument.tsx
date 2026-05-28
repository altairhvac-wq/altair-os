import { formatDate } from "@/shared/types/customer";
import type { PublicEstimateApprovalView } from "@/shared/types/public-estimate-approval";
import { BillingCompanyContactBlock } from "@/shared/components/billing/BillingCompanyContactBlock";
import { BillingLineItemsList } from "@/shared/components/billing/BillingLineItemsList";
import { BillingTotalsSummary } from "@/shared/components/billing/BillingTotalsSummary";

type PublicEstimateApprovalDocumentProps = {
  view: PublicEstimateApprovalView;
};

export function PublicEstimateApprovalDocument({
  view,
}: PublicEstimateApprovalDocumentProps) {
  const company = view.company;
  const estimate = view.estimate;

  if (!company || !estimate) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
      <div className="grid gap-6 border-b border-slate-200 pb-6 sm:grid-cols-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            From
          </p>
          <h2 className="mt-1 break-words text-xl font-bold text-slate-900">
            {company.name}
          </h2>
          <div className="mt-3">
            <BillingCompanyContactBlock company={company} showAddress />
          </div>
        </div>

        <div className="min-w-0 sm:text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Estimate
          </p>
          <h2 className="mt-1 break-words text-xl font-bold text-slate-900">
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
          </div>
        </div>
      </div>

      <div className="mt-6 border-b border-slate-200 pb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Prepared for
        </p>
        <p className="mt-2 break-words text-base font-semibold text-slate-900">
          {estimate.customerName}
        </p>
      </div>

      <div className="mt-6">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Line items
        </h3>
        <div className="mt-4">
          <BillingLineItemsList
            items={estimate.lineItems}
            documentLabel="estimate"
            variant="table"
          />
        </div>

        <div className="mt-4 max-w-md sm:ml-auto">
          <BillingTotalsSummary
            subtotal={estimate.subtotal}
            taxRate={estimate.taxRate}
            taxAmount={estimate.tax}
            total={estimate.total}
          />
        </div>
      </div>

      {estimate.notes ? (
        <div className="mt-6 border-t border-slate-200 pt-6">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Notes
          </h3>
          <p className="mt-3 break-words text-sm leading-relaxed text-slate-700">
            {estimate.notes}
          </p>
        </div>
      ) : null}
    </section>
  );
}
