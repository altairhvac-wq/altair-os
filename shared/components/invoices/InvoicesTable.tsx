import { Fragment } from "react";
import { formatCurrency, formatDate } from "@/shared/types/customer";
import type { BillingWorkflowListSection } from "@/shared/lib/billing-workflow-list";
import type { Invoice } from "@/shared/types/invoice";
import { BillingWorkflowSectionHeader } from "@/shared/components/billing/BillingWorkflowSectionHeader";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";
import { InvoicesMobileCardList } from "./InvoicesMobileCardList";

type InvoicesTableProps = {
  sections: BillingWorkflowListSection<Invoice>[];
  showSectionHeaders: boolean;
  onSelect: (invoice: Invoice) => void;
};

export function InvoicesTable({
  sections,
  showSectionHeaders,
  onSelect,
}: InvoicesTableProps) {
  return (
    <>
      <InvoicesMobileCardList
        sections={sections}
        showSectionHeaders={showSectionHeaders}
        onSelect={onSelect}
      />

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100/90 bg-slate-50/50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="admin-table-cell">Invoice</th>
              <th className="admin-table-cell">Customer</th>
              <th className="hidden admin-table-cell lg:table-cell">Job</th>
              <th className="hidden admin-table-cell xl:table-cell">
                Due date
              </th>
              <th className="admin-table-cell">Total</th>
              <th className="hidden admin-table-cell sm:table-cell">Balance</th>
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
                    colSpan={7}
                  />
                ) : null}
                {section.items.map((invoice) => (
                  <tr
                    key={invoice.id}
                    onClick={() => onSelect(invoice)}
                    className="cursor-pointer transition-colors hover:bg-slate-50"
                  >
                    <td className="admin-table-cell">
                      <p className="font-semibold text-slate-900">
                        {invoice.invoiceNumber}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDate(invoice.issueDate)}
                      </p>
                    </td>
                    <td className="admin-table-cell">
                      <p className="truncate font-medium text-slate-900">
                        {invoice.customerName}
                      </p>
                    </td>
                    <td className="hidden admin-table-cell text-slate-600 lg:table-cell">
                      {invoice.jobNumber ?? "—"}
                    </td>
                    <td className="hidden admin-table-cell text-slate-600 xl:table-cell">
                      {formatDate(invoice.dueDate)}
                    </td>
                    <td className="admin-table-cell font-semibold text-slate-900">
                      {formatCurrency(invoice.total)}
                    </td>
                    <td className="hidden admin-table-cell font-medium text-slate-700 sm:table-cell">
                      {formatCurrency(invoice.balanceDue)}
                    </td>
                    <td className="admin-table-cell">
                      <InvoiceStatusBadge status={invoice.status} />
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
