import { CustomerNameLink } from "@/shared/components/customers/CustomerNameLink";
import type { ReportSnapshotRow } from "@/shared/types/reports-page";
import {
  altairReportCardClass,
  altairReportCardPadTier3Class,
} from "@/shared/design-system/components";
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
  /** When true, render as a column inside a shared card (no own card chrome). */
  embedded?: boolean;
};

function SnapshotList({
  title,
  rows,
  emptyMessage,
  linkCustomers = false,
  canManageCustomers = false,
  variant = "legacy",
  embedded = false,
}: SnapshotListProps) {
  const northStar = isNorthStarReportSurface(variant);

  if (northStar) {
    const body = (
      <>
        <h4 className="text-[11px] font-bold tracking-wide text-altair-paper">
          {title}
        </h4>
        {rows.length === 0 ? (
          <p className="mt-2 text-[11px] leading-relaxed text-altair-ink-on-graphite-muted">
            {emptyMessage}
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1.5">
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex items-start justify-between gap-2 rounded-md border border-altair-border/70 bg-white/[0.03] px-2 py-1.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-altair-paper">
                    {linkCustomers ? (
                      <CustomerNameLink
                        customerId={row.id}
                        customerName={row.label}
                        canManageCustomers={canManageCustomers}
                        linkClassName="text-xs font-semibold text-altair-paper transition-colors hover:text-altair-brass-interactive"
                      />
                    ) : row.customerId && canManageCustomers ? (
                      <CustomerNameLink
                        customerId={row.customerId}
                        customerName={row.label}
                        canManageCustomers={canManageCustomers}
                        linkClassName="text-xs font-semibold text-altair-paper transition-colors hover:text-altair-brass-interactive"
                      />
                    ) : (
                      row.label
                    )}
                  </p>
                  {row.detail ? (
                    <p className="mt-0.5 truncate text-[10px] text-altair-ink-on-graphite-muted">
                      {row.detail}
                    </p>
                  ) : null}
                </div>
                <span className="shrink-0 text-xs font-extrabold tabular-nums tracking-tight text-altair-paper">
                  {row.value}
                </span>
              </li>
            ))}
          </ul>
        )}
      </>
    );

    if (embedded) {
      return <div className="min-w-0">{body}</div>;
    }

    return (
      <div className={`${altairReportCardClass} ${altairReportCardPadTier3Class}`}>
        {body}
      </div>
    );
  }

  return (
    <div className="min-w-0 px-1 py-1">
      <h4 className="text-xs font-bold text-slate-900">{title}</h4>
      {rows.length === 0 ? (
        <p className="admin-text-helper mt-2 text-[11px]">{emptyMessage}</p>
      ) : (
        <ul className="mt-2 space-y-0">
          {rows.map((row) => (
            <li
              key={row.id}
              className="altair-surface-list-row flex items-start justify-between gap-2 !min-h-0 !px-0"
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
                  <p className="truncate text-[11px] text-slate-500">
                    {row.detail}
                  </p>
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

  if (northStar) {
    return (
      <div
        className={`${altairReportCardClass} ${altairReportCardPadTier3Class}`}
      >
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-3 xl:grid-cols-4 xl:gap-3">
          <SnapshotList
            title="Top Customers"
            rows={topCustomers}
            emptyMessage="Customer revenue appears once payments are recorded."
            linkCustomers
            canManageCustomers={canManageCustomers}
            variant={variant}
            embedded
          />
          <SnapshotList
            title="Top Service Categories"
            rows={topServiceCategories}
            emptyMessage="Service categories appear once jobs are completed."
            variant={variant}
            embedded
          />
          <SnapshotList
            title="Overdue Invoices"
            rows={overdueInvoices}
            emptyMessage="No overdue invoices right now."
            canManageCustomers={canManageCustomers}
            variant={variant}
            embedded
          />
          <SnapshotList
            title="Work Completed"
            rows={workCompleted}
            emptyMessage="Completed jobs appear once work is finished."
            variant={variant}
            embedded
          />
        </div>
      </div>
    );
  }

  return (
    <section className="altair-surface-section altair-surface-section-body space-y-3">
      <div>
        <h3 className="admin-heading-section text-[13px] sm:text-sm">
          Operations Snapshot
        </h3>
        <p className="admin-text-helper mt-0.5 text-[11px] sm:text-xs">
          Quick lists for customers, services, collections, and completed work.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 sm:gap-x-5 sm:gap-y-4 xl:grid-cols-4">
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
