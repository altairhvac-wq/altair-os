import type { ReportSnapshotRow } from "@/shared/types/reports-page";

type SnapshotListProps = {
  title: string;
  rows: ReportSnapshotRow[];
  emptyMessage: string;
};

function SnapshotList({ title, rows, emptyMessage }: SnapshotListProps) {
  return (
    <div className="admin-card min-w-0 p-4 sm:p-5">
      <h4 className="text-sm font-bold text-slate-900">{title}</h4>
      {rows.length === 0 ? (
        <p className="admin-text-helper mt-3">{emptyMessage}</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2.5 last:border-b-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">
                  {row.label}
                </p>
                {row.detail ? (
                  <p className="truncate text-xs text-slate-500">{row.detail}</p>
                ) : null}
              </div>
              <span className="shrink-0 text-sm font-bold text-slate-900">
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
};

export function OperationsSnapshotSection({
  topCustomers,
  topServiceCategories,
  overdueInvoices,
  workCompleted,
}: OperationsSnapshotSectionProps) {
  return (
    <section className="space-y-4">
      <div>
        <h3 className="admin-heading-section">Operations Snapshot</h3>
        <p className="admin-text-helper mt-0.5">
          Quick lists for customers, services, collections, and completed work.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SnapshotList
          title="Top Customers"
          rows={topCustomers}
          emptyMessage="Customer revenue appears once payments are recorded."
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
        />
        <SnapshotList
          title="Work Completed"
          rows={workCompleted}
          emptyMessage="Completed work appears once jobs are finished."
        />
      </div>
    </section>
  );
}
