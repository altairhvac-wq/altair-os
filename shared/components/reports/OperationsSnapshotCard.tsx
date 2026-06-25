import Link from "next/link";
import { CustomerNameLink } from "@/shared/components/customers/CustomerNameLink";
import type { ReportSnapshotRow } from "@/shared/types/reports-page";
import {
  isNorthStarReportSurface,
  type ReportSurfaceVariant,
} from "./report-surface-variant";

type SnapshotListProps = {
  title: string;
  rows: ReportSnapshotRow[];
  emptyMessage: string;
  linkCustomers?: boolean;
  canManageCustomers?: boolean;
  variant?: ReportSurfaceVariant;
};

function SnapshotList({
  title,
  rows,
  emptyMessage,
  linkCustomers = false,
  canManageCustomers = false,
  variant = "legacy",
}: SnapshotListProps) {
  const northStar = isNorthStarReportSurface(variant);

  if (northStar) {
    return (
      <div className="min-w-0 rounded-[1.25rem] border border-[rgba(138,99,36,0.12)] bg-[#FBF7EF] px-3 py-3.5 shadow-[0_4px_16px_rgba(3,7,12,0.08)] sm:px-4 sm:py-4">
        <h4 className="text-xs font-bold tracking-wide text-[#17130E]">{title}</h4>
        {rows.length === 0 ? (
          <p className="mt-2.5 text-[11px] leading-relaxed text-[#64748B]">{emptyMessage}</p>
        ) : (
          <ul className="mt-2.5 space-y-0">
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex items-start justify-between gap-3 border-b border-[rgba(138,99,36,0.08)] py-2.5 last:border-b-0 last:pb-0 first:pt-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-[#17130E]">
                    {linkCustomers ? (
                      <CustomerNameLink
                        customerId={row.id}
                        customerName={row.label}
                        canManageCustomers={canManageCustomers}
                        linkClassName="text-[13px] font-medium text-[#17130E] transition-colors hover:text-[#8A6324]"
                      />
                    ) : row.customerId && canManageCustomers ? (
                      <CustomerNameLink
                        customerId={row.customerId}
                        customerName={row.label}
                        canManageCustomers={canManageCustomers}
                        linkClassName="text-[13px] font-medium text-[#17130E] transition-colors hover:text-[#8A6324]"
                      />
                    ) : (
                      row.label
                    )}
                  </p>
                  {row.detail ? (
                    <p className="mt-0.5 truncate text-[11px] text-[#64748B]">{row.detail}</p>
                  ) : null}
                </div>
                <span className="shrink-0 text-sm font-extrabold tabular-nums tracking-tight text-[#17130E]">
                  {row.value}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

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
  variant?: ReportSurfaceVariant;
};

export function OperationsSnapshotSection({
  topCustomers,
  topServiceCategories,
  overdueInvoices,
  workCompleted,
  canManageCustomers = false,
  variant = "legacy",
}: OperationsSnapshotSectionProps) {
  const northStar = isNorthStarReportSurface(variant);

  return (
    <section className="space-y-3">
      <div>
        <h3
          className={
            northStar
              ? "text-sm font-bold text-[#17130E]"
              : "admin-heading-section text-[13px] sm:text-sm"
          }
        >
          Operations Snapshot
        </h3>
        <p
          className={
            northStar
              ? "mt-0.5 text-xs text-[#64748B]"
              : "admin-text-helper mt-0.5 text-[11px] sm:text-xs"
          }
        >
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
          variant={variant}
        />
        <SnapshotList
          title="Top Service Categories"
          rows={topServiceCategories}
          emptyMessage="Service categories appear once jobs are completed."
          variant={variant}
        />
        <SnapshotList
          title="Overdue Invoices"
          rows={overdueInvoices}
          emptyMessage="No overdue invoices right now."
          canManageCustomers={canManageCustomers}
          variant={variant}
        />
        <SnapshotList
          title="Work Completed"
          rows={workCompleted}
          emptyMessage="Completed jobs appear once work is finished."
          variant={variant}
        />
      </div>
    </section>
  );
}
