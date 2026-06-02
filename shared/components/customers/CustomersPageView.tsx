"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import {
  bulkArchiveCustomersAction,
  bulkDeleteCustomersAction,
  bulkRestoreCustomersAction,
} from "@/app/actions/customers-bulk";
import { createCustomerAction } from "@/app/actions/customers";
import { usePageBulkSelection } from "@/shared/hooks/usePageBulkSelection";
import { resolveSelectedItems } from "@/shared/lib/bulk-selection";
import {
  formatBulkCustomersResultMessage,
  isCustomerArchived,
} from "@/shared/lib/customer-lifecycle";
import { formatActionError } from "@/shared/lib/operational-errors";
import {
  type Customer,
  type CustomerFormData,
  type CustomerLifecycleState,
  type CustomerStatus,
  validateCustomerFormData,
} from "@/shared/types/customer";
import { ListCommandCenterLayout } from "@/shared/components/layout/ListCommandCenterLayout";
import { SettingsAlertBanner } from "@/shared/components/settings/SettingsAlertBanner";
import { CustomerDetailPanel } from "./CustomerDetailPanel";
import { CustomerSearchFilterBar } from "./CustomerSearchFilterBar";
import { CustomersBulkActionBar } from "./CustomersBulkActionBar";
import { CustomersEmptyState } from "./CustomersEmptyState";
import { CustomersTable } from "./CustomersTable";

type PanelMode = "create" | "empty";

type CustomersPageViewProps = {
  initialCustomers: Customer[];
  canManageCustomers: boolean;
  canViewBilling: boolean;
};

function filterCustomers(
  customers: Customer[],
  search: string,
  statusFilter: CustomerStatus | "all",
  lifecycleFilter: CustomerLifecycleState,
): Customer[] {
  const query = search.trim().toLowerCase();

  return customers.filter((customer) => {
    const matchesLifecycle =
      lifecycleFilter === "archived"
        ? isCustomerArchived(customer)
        : !isCustomerArchived(customer);

    if (!matchesLifecycle) return false;

    const matchesStatus =
      statusFilter === "all" || customer.status === statusFilter;

    if (!matchesStatus) return false;
    if (!query) return true;

    const haystack = [
      customer.name,
      customer.email,
      customer.phone,
      customer.company ?? "",
      customer.city,
      customer.state,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}

export function CustomersPageView({
  initialCustomers,
  canManageCustomers,
  canViewBilling,
}: CustomersPageViewProps) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | "all">(
    "all",
  );
  const [lifecycleFilter, setLifecycleFilter] =
    useState<CustomerLifecycleState>("active");
  const [panelMode, setPanelMode] = useState<PanelMode>("empty");
  const router = useRouter();
  const [createError, setCreateError] = useState<string | null>(null);
  const [bulkActionMessage, setBulkActionMessage] = useState<string | null>(
    null,
  );
  const [bulkActionFailureDetails, setBulkActionFailureDetails] = useState<
    string[] | null
  >(null);
  const [bulkActionTone, setBulkActionTone] = useState<
    "success" | "warning" | "error"
  >("success");
  const [isPending, startTransition] = useTransition();
  const [isBulkArchiving, startBulkArchiveTransition] = useTransition();
  const [isBulkRestoring, startBulkRestoreTransition] = useTransition();
  const [isBulkDeleting, startBulkDeleteTransition] = useTransition();

  useEffect(() => {
    setCustomers(initialCustomers);
  }, [initialCustomers]);

  const filteredCustomers = useMemo(
    () => filterCustomers(customers, search, statusFilter, lifecycleFilter),
    [customers, search, statusFilter, lifecycleFilter],
  );

  const selectionEnabled = canManageCustomers && !search.trim();
  const {
    selectedIds,
    selectedCount,
    toggleSelection,
    toggleAllVisible,
    clearSelection,
    setSelectedIds,
  } = usePageBulkSelection(filteredCustomers, [
    search,
    statusFilter,
    lifecycleFilter,
  ]);

  const selectedCustomers = useMemo(
    () => resolveSelectedItems(filteredCustomers, selectedIds),
    [filteredCustomers, selectedIds],
  );

  function clearBulkActionFeedback() {
    setBulkActionMessage(null);
    setBulkActionFailureDetails(null);
  }

  function applyBulkActionResult(input: {
    result: Awaited<ReturnType<typeof bulkArchiveCustomersAction>>;
    actionLabel: string;
  }) {
    const { result, actionLabel } = input;

    if (result.error && result.results.length === 0) {
      setBulkActionTone("error");
      setBulkActionMessage(
        formatActionError(result.error, "We couldn't update the selected customers."),
      );
      return;
    }

    const failedIds = new Set(
      result.results.filter((item) => !item.success).map((item) => item.customerId),
    );

    setSelectedIds((previous) => {
      if (failedIds.size === 0) {
        return new Set();
      }

      const next = new Set<string>();
      for (const customerId of previous) {
        if (failedIds.has(customerId)) {
          next.add(customerId);
        }
      }
      return next;
    });

    const failureDetails = result.results
      .filter((item) => !item.success)
      .map(
        (item) =>
          `${item.customerName}: ${item.error ?? "Could not be updated."}`,
      );

    setBulkActionFailureDetails(
      failureDetails.length > 0 ? failureDetails : null,
    );
    setBulkActionTone(
      result.successCount > 0
        ? result.failureCount > 0
          ? "warning"
          : "success"
        : "error",
    );
    setBulkActionMessage(
      formatBulkCustomersResultMessage({
        successCount: result.successCount,
        failureCount: result.failureCount,
        actionLabel,
      }),
    );

    if (result.successCount > 0) {
      router.refresh();
    }
  }

  function handleBulkArchive() {
    if (!selectionEnabled || selectedCount === 0 || isBulkArchiving) {
      return;
    }

    clearBulkActionFeedback();
    const customerIds = [...selectedIds];

    startBulkArchiveTransition(async () => {
      const result = await bulkArchiveCustomersAction(customerIds);
      applyBulkActionResult({ result, actionLabel: "Archive" });
    });
  }

  function handleBulkRestore() {
    if (!selectionEnabled || selectedCount === 0 || isBulkRestoring) {
      return;
    }

    clearBulkActionFeedback();
    const customerIds = [...selectedIds];

    startBulkRestoreTransition(async () => {
      const result = await bulkRestoreCustomersAction(customerIds);
      applyBulkActionResult({ result, actionLabel: "Restore" });
    });
  }

  function handleBulkDelete() {
    if (!selectionEnabled || selectedCount === 0 || isBulkDeleting) {
      return;
    }

    clearBulkActionFeedback();
    const customerIds = [...selectedIds];

    startBulkDeleteTransition(async () => {
      const result = await bulkDeleteCustomersAction(customerIds);
      applyBulkActionResult({ result, actionLabel: "Delete" });
    });
  }

  function handleNewCustomer() {
    if (!canManageCustomers) {
      return;
    }

    setPanelMode("create");
    setCreateError(null);
  }

  function handleClosePanel() {
    setPanelMode("empty");
    setCreateError(null);
  }

  function handleCreateSubmit(data: CustomerFormData) {
    if (isPending) {
      return;
    }

    setCreateError(null);

    const validationError = validateCustomerFormData(data, {
      requireContact: false,
    });
    if (validationError) {
      setCreateError(validationError);
      return;
    }

    startTransition(async () => {
      const result = await createCustomerAction(data);

      if (result.error || !result.customer) {
        setCreateError(
          formatActionError(
            result.error,
            "We couldn't save this customer. Check the details and try again.",
          ),
        );
        return;
      }

      setCustomers((previous) => [result.customer!, ...previous]);
      setPanelMode("empty");
      router.push(`/customers/${result.customer.id}`);
    });
  }

  const hasNoCustomers = customers.length === 0;
  const hasNoResults = !hasNoCustomers && filteredCustomers.length === 0;
  const isCreateOpen = panelMode === "create";

  return (
    <ListCommandCenterLayout
      title="Customers"
      subtitle="Manage profiles, locations, and service history"
      density="compact"
      primaryAction={
        canManageCustomers ? (
          <button
            type="button"
            onClick={handleNewCustomer}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl admin-btn-primary px-3 py-1.5 text-sm"
          >
            <UserPlus className="h-3.5 w-3.5" />
            New Customer
          </button>
        ) : undefined
      }
      className={
        isCreateOpen
          ? "max-lg:h-[calc(100dvh-7rem)] max-lg:min-h-0 max-lg:overflow-hidden"
          : undefined
      }
    >
      {bulkActionMessage ? (
        <SettingsAlertBanner tone={bulkActionTone}>
          <div>
            <p>{bulkActionMessage}</p>
            {bulkActionFailureDetails?.length ? (
              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs">
                {bulkActionFailureDetails.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </SettingsAlertBanner>
      ) : null}

      <section
        className={`flex min-h-[16rem] min-w-0 lg:flex-1 flex-col overflow-hidden admin-card lg:min-h-0 ${
          isCreateOpen ? "max-lg:hidden" : ""
        }`}
      >
        {!hasNoCustomers ? (
          <CustomerSearchFilterBar
            search={search}
            statusFilter={statusFilter}
            lifecycleFilter={lifecycleFilter}
            onSearchChange={setSearch}
            onStatusFilterChange={setStatusFilter}
            onLifecycleFilterChange={setLifecycleFilter}
            resultCount={filteredCustomers.length}
          />
        ) : null}

        <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden lg:overflow-y-auto">
          {hasNoCustomers ? (
            <CustomersEmptyState
              variant="no-customers"
              onCreateCustomer={
                canManageCustomers ? handleNewCustomer : undefined
              }
            />
          ) : hasNoResults ? (
            <CustomersEmptyState variant="no-results" />
          ) : (
            <CustomersTable
              customers={filteredCustomers}
              showRevenueStats={canViewBilling}
              selectionEnabled={selectionEnabled}
              selectedIds={selectedIds}
              onToggleSelection={toggleSelection}
              onToggleAllVisible={toggleAllVisible}
            />
          )}
        </div>

        {selectionEnabled ? (
          <CustomersBulkActionBar
            selectedCount={selectedCustomers.length}
            lifecycleFilter={lifecycleFilter}
            isArchiving={isBulkArchiving}
            isRestoring={isBulkRestoring}
            isDeleting={isBulkDeleting}
            onArchive={handleBulkArchive}
            onRestore={handleBulkRestore}
            onDelete={handleBulkDelete}
            onClearSelection={clearSelection}
          />
        ) : null}
      </section>

      <CustomerDetailPanel
        mode={panelMode}
        onClose={handleClosePanel}
        onCreateSubmit={handleCreateSubmit}
        onCreateCancel={handleClosePanel}
        createError={createError}
        isSubmitting={isPending}
      />
    </ListCommandCenterLayout>
  );
}
