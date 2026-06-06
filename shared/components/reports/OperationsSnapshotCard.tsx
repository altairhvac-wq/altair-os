import { CustomerNameLink } from "@/shared/components/customers/CustomerNameLink";
import type { ReportSnapshotRow } from "@/shared/types/reports-page";

type SnapshotListProps = {
  title: string;
  rows: ReportSnapshotRow[];
  emptyMessage: string;
  linkCustomers?: boolean;
  canManageCustomers?: boolean;
};

function SnapshotList({
  title,
  rows,
  emptyMessage,
  linkCustomers = false,
  canManageCustomers = false,
}: SnapshotListProps) {
  return (
    <div className="admin-card min-w-0 px-3 py-3 sm:px-4 sm:py-3.5">
      <h4 className="text-xs font-bold text-slate-900">{title}</h4>
      {rows.length === 0 ? (
        <p className="admin-text-helper mt-2 text-[11px]">{emptyMessage}</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex items-start justify-between gap-2 border-b border-slate-100 pb-1.5 last:border-b-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-slate-800">
                  {linkCustomers ? (
                    <CustomerNameLink
                      customerId={row.id}
                      customerName={row.label}
                      canManageCustomers={canManageCustomers}
                      linkClassName="text-xs font-medium text-slate-800 transition-colors hover:text-cyan-700"
                    />
                  ) : row.customerId && canManageCustomers ? (
                    <CustomerNameLink
                      customerId={row.customerId}
                      customerName={row.label}
                      canManageCustomers={canManageCustomers}
                      linkClassName="text-xs font-medium text-slate-800 transition-colors hover:text-cyan-700"
                    />
                  ) : (
                    row.label
                  )}
                </p>
                {row.detail ? (
                  <p className="truncate text-[11px] text-slate-500">{row.detail}</p>
                ) : null}
              </div>
              <span className="shrink-0 text-xs font-bold tabular-nums text-slate-900">
                {row.value}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type OperationsSnapshotSectionProps = {
  topCustomers: ReportSnapshotRow[];
  topServiceCategories: ReportSnapshotRow[];
  overdueInvoices: ReportSnapshotRow[];
  workCompleted: ReportSnapshotRow[];
  canManageCustomers?: boolean;
};

export function OperationsSnapshotSection({
  topCustomers,
  topServiceCategories,
  overdueInvoices,
  workCompleted,
  canManageCustomers = false,
}: OperationsSnapshotSectionProps) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="admin-heading-section text-[13px] sm:text-sm">
          Operations Snapshot
        </h3>
        <p className="admin-text-helper mt-0.5 text-[11px] sm:text-xs">
          Quick lists for customers, services, collections, and completed work.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SnapshotList
          title="Top Customers"
          rows={topCustomers}
          emptyMessage="Customer revenue appears once payments are recorded."
          linkCustomers
          canManageCustomers={canManageCustomers}
        />
        <SnapshotList
          title="Top Service Categories"
          rows={topServiceCategories}
          emptyMessage="Service categories appear once jobs are completed."
        />
        <SnapshotList
          title="Overdue Invoices"
          rows={overdueInvoices}
          emptyMessage="No overdue invoices right now."
          canManageCustomers={canManageCustomers}
        />
        <SnapshotList
          title="Work Completed"
          rows={workCompleted}
          emptyMessage="Completed jobs appear once work is finished."
        />
      </div>
    </section>
  );
}
