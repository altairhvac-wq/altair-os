import { Fragment } from "react";
import { formatCurrency, formatDate } from "@/shared/types/customer";
import type { BillingWorkflowListSection } from "@/shared/lib/billing-workflow-list";
import type { Estimate } from "@/shared/types/estimate";
import { BillingWorkflowSectionHeader } from "@/shared/components/billing/BillingWorkflowSectionHeader";
import { EstimateStatusBadge } from "./EstimateStatusBadge";
import { EstimatesMobileCardList } from "./EstimatesMobileCardList";

type EstimatesTableProps = {
  sections: BillingWorkflowListSection<Estimate>[];
  showSectionHeaders: boolean;
  onSelect: (estimate: Estimate) => void;
};

export function EstimatesTable({
  sections,
  showSectionHeaders,
  onSelect,
}: EstimatesTableProps) {
  return (
    <>
      <EstimatesMobileCardList
        sections={sections}
        showSectionHeaders={showSectionHeaders}
        onSelect={onSelect}
      />

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100/90 bg-white text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="admin-table-cell">Estimate</th>
              <th className="admin-table-cell">Customer</th>
              <th className="hidden admin-table-cell md:table-cell">
                Line items
              </th>
              <th className="hidden admin-table-cell lg:table-cell">
                Valid until
              </th>
              <th className="admin-table-cell">Total</th>
              <th className="admin-table-cell">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {sections.map((section) => (
              <Fragment key={section.id}>
                {showSectionHeaders ? (
                  <BillingWorkflowSectionHeader
                    label={section.label}
                    count={section.items.length}
                    variant="table"
                    colSpan={6}
                  />
                ) : null}
                {section.items.map((estimate) => {
                  const lineItemCount =
                    estimate.lineItemCount ?? estimate.lineItems.length;

                  return (
                    <tr
                      key={estimate.id}
                      onClick={() => onSelect(estimate)}
                      className="cursor-pointer transition-colors hover:bg-slate-50"
                    >
                      <td className="admin-table-cell">
                        <p className="font-semibold text-slate-900">
                          {estimate.estimateNumber}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatDate(estimate.createdAt)}
                        </p>
                      </td>
                      <td className="admin-table-cell">
                        <p className="truncate font-medium text-slate-900">
                          {estimate.customerName}
                        </p>
                      </td>
                      <td className="hidden admin-table-cell text-slate-600 md:table-cell">
                        {lineItemCount} {lineItemCount === 1 ? "item" : "items"}
                      </td>
                      <td className="hidden admin-table-cell text-slate-600 lg:table-cell">
                        {estimate.validUntil
                          ? formatDate(estimate.validUntil)
                          : "—"}
                      </td>
                      <td className="admin-table-cell font-semibold text-slate-900">
                        {formatCurrency(estimate.total)}
                      </td>
                      <td className="admin-table-cell">
                        <EstimateStatusBadge status={estimate.status} />
                      </td>
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
