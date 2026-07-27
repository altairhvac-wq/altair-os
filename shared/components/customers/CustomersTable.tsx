"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { BulkSelectCheckbox } from "@/shared/components/bulk/BulkSelectCheckbox";
import { useFormatDemoDisplayName } from "@/shared/components/display/FounderMarketingDisplayContext";
import {
  AltairTable,
  AltairTableBody,
  AltairTableCell,
  AltairTableHead,
  AltairTableHeader,
  AltairTablePrimaryCell,
  AltairTableRow,
  AltairTableSecondaryText,
} from "@/shared/design-system/table";
import { resolveBulkSelectionState } from "@/shared/lib/bulk-selection";
import { isCustomerArchived, isCustomerDeleted } from "@/shared/lib/customer-lifecycle";
import {
  formatCurrency,
  getCustomerInitials,
  type Customer,
} from "@/shared/types/customer";
import { CustomerNameLink } from "./CustomerNameLink";
import { CustomerStatusBadge } from "./CustomerStatusBadge";
import { CustomersMobileCardList } from "./CustomersMobileCardList";
import {
  customerMissionClasses as cm,
  resolveCustomerListCue,
} from "./customer-list-presentation";

/**
 * Focus ring for the primary customer-name link: Paper-surface treatment
 * shared with Input/Select — brass command ring for Mission Briefing.
 */
const customerNameLinkFocusClass =
  "hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-altair-brass/40 focus-visible:ring-offset-2 focus-visible:ring-offset-altair-paper-elevated";

type CustomersTableProps = {
  customers: Customer[];
  showRevenueStats?: boolean;
  selectionEnabled?: boolean;
  selectedIds?: ReadonlySet<string>;
  onToggleSelection?: (customerId: string) => void;
  onToggleAllVisible?: (selectAll: boolean) => void;
  /** @deprecated Mission Briefing unifies presentation; retained for call-site compatibility. */
  northStar?: boolean;
  canManageCustomers?: boolean;
};

export function CustomersTable({
  customers,
  showRevenueStats = true,
  selectionEnabled = false,
  selectedIds,
  onToggleSelection,
  onToggleAllVisible,
  canManageCustomers = false,
}: CustomersTableProps) {
  const router = useRouter();
  const formatDisplayName = useFormatDemoDisplayName();

  const headerSelection = useMemo(
    () =>
      selectionEnabled && selectedIds
        ? resolveBulkSelectionState(selectedIds, customers)
        : null,
    [customers, selectedIds, selectionEnabled],
  );

  return (
    <>
      <CustomersMobileCardList customers={customers} />

      <div className={`hidden max-w-full overflow-x-auto md:block ${cm.listShell}`}>
        <AltairTable className="min-w-[640px]">
          <AltairTableHeader>
            <AltairTableRow>
              {selectionEnabled ? (
                <AltairTableHead className="w-10">
                  {headerSelection && headerSelection.selectableCount > 0 ? (
                    <BulkSelectCheckbox
                      checked={headerSelection.allSelected}
                      indeterminate={headerSelection.someSelected}
                      ariaLabel="Select all visible customers"
                      onChange={(checked) => onToggleAllVisible?.(checked)}
                    />
                  ) : null}
                </AltairTableHead>
              ) : null}
              <AltairTableHead>Customer</AltairTableHead>
              <AltairTableHead>Status</AltairTableHead>
              <AltairTableHead className="hidden lg:table-cell">Location</AltairTableHead>
              <AltairTableHead align="right">Jobs</AltairTableHead>
              {showRevenueStats ? (
                <AltairTableHead align="right">Revenue</AltairTableHead>
              ) : null}
              <AltairTableHead>Next</AltairTableHead>
            </AltairTableRow>
          </AltairTableHeader>
          <AltairTableBody>
            {customers.map((customer) => {
              const isBulkSelected = selectedIds?.has(customer.id) ?? false;
              const cue = resolveCustomerListCue(customer);

              return (
                <AltairTableRow
                  key={customer.id}
                  selected={isBulkSelected}
                  onClick={() => router.push(`/customers/${customer.id}`)}
                >
                  {selectionEnabled ? (
                    <AltairTableCell>
                      <BulkSelectCheckbox
                        checked={selectedIds?.has(customer.id) ?? false}
                        ariaLabel={`Select ${customer.name}`}
                        onChange={() => onToggleSelection?.(customer.id)}
                      />
                    </AltairTableCell>
                  ) : null}
                  <AltairTablePrimaryCell
                    leading={
                      <div className={cm.avatar}>
                        {getCustomerInitials(formatDisplayName(customer.name))}
                      </div>
                    }
                    primary={
                      <CustomerNameLink
                        customerId={customer.id}
                        customerName={customer.name}
                        canManageCustomers={canManageCustomers}
                        className={cm.primaryText}
                        linkClassName={`${cm.primaryText} ${customerNameLinkFocusClass}`}
                        stopRowNavigation
                      />
                    }
                    trailing={
                      isCustomerDeleted(customer) ? (
                        <span className={cm.badgeDeleted}>Deleted</span>
                      ) : isCustomerArchived(customer) ? (
                        <span className={cm.badgeArchived}>Archived</span>
                      ) : null
                    }
                    secondary={
                      <AltairTableSecondaryText className={cm.secondaryText}>
                        {customer.company ?? customer.email}
                      </AltairTableSecondaryText>
                    }
                  />
                  <AltairTableCell>
                    <CustomerStatusBadge status={customer.status} />
                  </AltairTableCell>
                  <AltairTableCell
                    className={`hidden lg:table-cell ${cm.metaText}`}
                  >
                    {customer.city}, {customer.state}
                  </AltairTableCell>
                  <AltairTableCell
                    align="right"
                    className="font-medium tabular-nums text-altair-ink-on-paper"
                  >
                    {customer.totalJobs}
                  </AltairTableCell>
                  {showRevenueStats ? (
                    <AltairTableCell
                      align="right"
                      className="font-medium tabular-nums text-altair-ink-on-paper"
                    >
                      {formatCurrency(customer.totalRevenue)}
                    </AltairTableCell>
                  ) : null}
                  <AltairTableCell
                    className={
                      cue.tone === "warning" ? cm.cueWarning : cm.cueNeutral
                    }
                  >
                    {cue.label}
                  </AltairTableCell>
                </AltairTableRow>
              );
            })}
          </AltairTableBody>
        </AltairTable>
      </div>
    </>
  );
}
