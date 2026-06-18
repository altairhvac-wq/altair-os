"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, UserPlus } from "lucide-react";
import {
  bulkArchiveCustomersAction,
  bulkMoveCustomersToTrashAction,
  bulkPermanentlyDeleteCustomersAction,
  bulkRestoreCustomersAction,
  bulkRestoreCustomersFromTrashAction,
} from "@/app/actions/customers-bulk";
import { createCustomerAction } from "@/app/actions/customers";
import { isNorthStarShellEnabled } from "@/lib/beta/north-star-shell";
import { usePageBulkSelection } from "@/shared/hooks/usePageBulkSelection";
import { resolveSelectedItems } from "@/shared/lib/bulk-selection";
import {
  formatBulkCustomersResultMessage,
  getCustomerLifecycleState,
} from "@/shared/lib/customer-lifecycle";
import { formatActionError } from "@/shared/lib/operational-errors";
import {
  type Customer,
  type CustomerFormData,
  type CustomerLifecycleState,
  type CustomerStatus,
  validateCustomerFormData,
} from "@/shared/types/customer";
import {
  MasterListPageLayout,
  MasterPageSurface,
  masterListPageMobilePanelLockClass,
  masterListPagePrimaryActionClass,
  masterListPageScrollRegionClass,
  masterListPageSurfaceClass,
  masterSecondaryActionClass,
} from "@/shared/design-system/shell";
import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";
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
      getCustomerLifecycleState(customer) === lifecycleFilter;

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
  const [isBulkMovingToTrash, startBulkMoveToTrashTransition] = useTransition();
  const [isBulkRestoringFromTrash, startBulkRestoreFromTrashTransition] =
    useTransition();
  const [isBulkPermanentlyDeleting, startBulkPermanentDeleteTransition] =
    useTransition();

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

  function handleBulkMoveToTrash() {
    if (!selectionEnabled || selectedCount === 0 || isBulkMovingToTrash) {
      return;
    }

    clearBulkActionFeedback();
    const customerIds = [...selectedIds];

    startBulkMoveToTrashTransition(async () => {
      const result = await bulkMoveCustomersToTrashAction(customerIds);
      applyBulkActionResult({ result, actionLabel: "Move to Trash" });
    });
  }

  function handleBulkRestoreFromTrash() {
    if (!selectionEnabled || selectedCount === 0 || isBulkRestoringFromTrash) {
      return;
    }

    clearBulkActionFeedback();
    const customerIds = [...selectedIds];

    startBulkRestoreFromTrashTransition(async () => {
      const result = await bulkRestoreCustomersFromTrashAction(customerIds);
      applyBulkActionResult({ result, actionLabel: "Restore" });
    });
  }

  function handleBulkPermanentDelete() {
    if (!selectionEnabled || selectedCount === 0 || isBulkPermanentlyDeleting) {
      return;
    }

    clearBulkActionFeedback();
    const customerIds = [...selectedIds];

    startBulkPermanentDeleteTransition(async () => {
      const result = await bulkPermanentlyDeleteCustomersAction(customerIds);
      applyBulkActionResult({ result, actionLabel: "Permanent delete" });
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
  const northStar = isNorthStarShellEnabled();

  return (
    <MasterListPageLayout
      title="Customers"
      subtitle="Manage profiles, locations, and service history"
      eyebrow={northStar ? "Customer directory" : undefined}
      density="compact"
      primaryAction={
        canManageCustomers ? (
          <button
            type="button"
            onClick={handleNewCustomer}
            className={
              northStar
                ? `north-star-customers-primary-action ${lt.primaryAction}`
                : masterListPagePrimaryActionClass
            }
          >
            <UserPlus className="h-3.5 w-3.5" />
            New Customer
          </button>
        ) : undefined
      }
      secondaryAction={
        canManageCustomers ? (
          <Link
            href="/customers/import"
            className={
              northStar
                ? `north-star-customers-secondary-action ${lt.secondaryAction}`
                : masterSecondaryActionClass
            }
          >
            <Upload className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Import Customers</span>
            <span className="sm:hidden">Import</span>
          </Link>
        ) : undefined
      }
      banners={
        bulkActionMessage ? (
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
        ) : undefined
      }
      className={`${isCreateOpen ? masterListPageMobilePanelLockClass : ""} ${
        northStar ? lt.pageCanvas : ""
      }`}
      headerClassName={northStar ? lt.pageHeader : undefined}
      headerSurfaceVariant={northStar ? "northStar" : "default"}
      headerEyebrowClassName={northStar ? lt.pageHeaderEyebrow : undefined}
      headerTitleClassName={northStar ? lt.pageHeaderTitle : undefined}
      headerSubtitleClassName={northStar ? lt.pageHeaderSubtitle : undefined}
    >
      <MasterPageSurface
        variant={northStar ? "northStarList" : "card"}
        className={`${masterListPageSurfaceClass} ${
          isCreateOpen ? "max-lg:hidden" : ""
        } ${northStar ? lt.listSurface : ""}`}
      >
        {northStar ? (
          <div aria-hidden="true" className={lt.listSurfaceTopAccent} />
        ) : null}

        {!hasNoCustomers ? (
          <CustomerSearchFilterBar
            search={search}
            statusFilter={statusFilter}
            lifecycleFilter={lifecycleFilter}
            onSearchChange={setSearch}
            onStatusFilterChange={setStatusFilter}
            onLifecycleFilterChange={setLifecycleFilter}
            resultCount={filteredCustomers.length}
            northStar={northStar}
          />
        ) : null}

        <div className={masterListPageScrollRegionClass}>
          {hasNoCustomers ? (
            <CustomersEmptyState
              variant="no-customers"
              onCreateCustomer={
                canManageCustomers ? handleNewCustomer : undefined
              }
              northStar={northStar}
            />
          ) : hasNoResults ? (
            <CustomersEmptyState variant="no-results" northStar={northStar} />
          ) : (
            <CustomersTable
              customers={filteredCustomers}
              showRevenueStats={canViewBilling}
              selectionEnabled={selectionEnabled}
              selectedIds={selectedIds}
              onToggleSelection={toggleSelection}
              onToggleAllVisible={toggleAllVisible}
              northStar={northStar}
            />
          )}
        </div>

        {selectionEnabled ? (
          <CustomersBulkActionBar
            selectedCount={selectedCustomers.length}
            lifecycleFilter={lifecycleFilter}
            isArchiving={isBulkArchiving}
            isRestoring={isBulkRestoring}
            isMovingToTrash={isBulkMovingToTrash}
            isRestoringFromTrash={isBulkRestoringFromTrash}
            isPermanentlyDeleting={isBulkPermanentlyDeleting}
            onArchive={handleBulkArchive}
            onRestore={handleBulkRestore}
            onMoveToTrash={handleBulkMoveToTrash}
            onRestoreFromTrash={handleBulkRestoreFromTrash}
            onPermanentDelete={handleBulkPermanentDelete}
            onClearSelection={clearSelection}
            northStar={northStar}
          />
        ) : null}
      </MasterPageSurface>

      <CustomerDetailPanel
        mode={panelMode}
        onClose={handleClosePanel}
        onCreateSubmit={handleCreateSubmit}
        onCreateCancel={handleClosePanel}
        createError={createError}
        isSubmitting={isPending}
      />
    </MasterListPageLayout>
  );
}
