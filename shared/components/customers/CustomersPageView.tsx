"use client";

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
  validateCustomerFormData,
} from "@/shared/types/customer";
import {
  MasterListPageLayout,
  MasterPageSurface,
  masterListPageScrollRegionClass,
  masterListPageSurfaceClass,
} from "@/shared/design-system/shell";
import { Button } from "@/shared/design-system/components";
import { SettingsAlertBanner } from "@/shared/components/settings/SettingsAlertBanner";
import { buildCustomersGlanceStats } from "@/shared/lib/customers/customers-glance-stats";
import { useCompanyTimezone } from "@/shared/lib/company-timezone";
import { CustomerDetailPanel } from "./CustomerDetailPanel";
import { CustomerSearchFilterBar } from "./CustomerSearchFilterBar";
import { CustomersBulkActionBar } from "./CustomersBulkActionBar";
import { CustomersEmptyState } from "./CustomersEmptyState";
import { CustomersStatStrip } from "./CustomersStatStrip";
import { CustomersTable } from "./CustomersTable";
import { customerMissionClasses as cm } from "./customer-list-presentation";
import {
  filterCustomersForWorkQueue,
  resolveCustomerBulkLifecycleFilter,
  resolveDefaultCustomerWorkQueue,
  type CustomerWorkQueue,
} from "./customer-work-queues";

type PanelMode = "create" | "empty";

type CustomersPageViewProps = {
  initialCustomers: Customer[];
  canManageCustomers: boolean;
};

function filterCustomersBySearch(
  customers: Customer[],
  search: string,
): Customer[] {
  const query = search.trim().toLowerCase();
  if (!query) return customers;

  return customers.filter((customer) => {
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
}: CustomersPageViewProps) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [search, setSearch] = useState("");
  const timeZone = useCompanyTimezone();
  const [workQueue, setWorkQueue] = useState<CustomerWorkQueue>(() =>
    resolveDefaultCustomerWorkQueue(),
  );
  const [pastLifecycleFilter, setPastLifecycleFilter] = useState<
    "archived" | "deleted"
  >("archived");
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

  const glanceStats = useMemo(
    () =>
      buildCustomersGlanceStats({
        customers,
        timeZone,
      }),
    [customers, timeZone],
  );

  const queueScopedCustomers = useMemo(
    () => filterCustomersForWorkQueue(customers, workQueue),
    [customers, workQueue],
  );

  const lifecycleScopedCustomers = useMemo(() => {
    if (workQueue !== "past") {
      return queueScopedCustomers;
    }

    return queueScopedCustomers.filter(
      (customer) => getCustomerLifecycleState(customer) === pastLifecycleFilter,
    );
  }, [pastLifecycleFilter, queueScopedCustomers, workQueue]);

  const filteredCustomers = useMemo(
    () => filterCustomersBySearch(lifecycleScopedCustomers, search),
    [lifecycleScopedCustomers, search],
  );

  const bulkLifecycleFilter = resolveCustomerBulkLifecycleFilter(
    workQueue,
    pastLifecycleFilter,
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
    workQueue,
    pastLifecycleFilter,
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

  function handleQueueChange(queue: CustomerWorkQueue) {
    setWorkQueue(queue);
    clearSelection();
    clearBulkActionFeedback();
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
  const hasNoQueueCustomers = !hasNoCustomers && queueScopedCustomers.length === 0;
  const hasNoResults = !hasNoCustomers && filteredCustomers.length === 0;

  return (
    <MasterListPageLayout
      title="Customers"
      subtitle="Find who you need. See what needs attention."
      density="compact"
      headerSurfaceVariant="default"
      headerTitleClassName="min-w-0 text-base font-semibold tracking-tight text-altair-ink-on-paper sm:text-lg"
      headerSubtitleClassName="min-w-0 truncate text-[11px] leading-snug text-altair-ink-on-paper-muted"
      headerClassName="py-1.5"
      headerCenter={
        <CustomersStatStrip
          stats={glanceStats}
          activeQueue={workQueue}
          onFilterQueue={handleQueueChange}
        />
      }
      primaryAction={
        canManageCustomers ? (
          <Button
            size="sm"
            onClick={handleNewCustomer}
            leadingIcon={<UserPlus className="h-3.5 w-3.5" />}
          >
            New Customer
          </Button>
        ) : undefined
      }
      secondaryAction={
        canManageCustomers ? (
          <Button
            href="/customers/import"
            size="sm"
            variant="secondary"
            leadingIcon={<Upload className="h-3.5 w-3.5" />}
          >
            <span className="hidden sm:inline">Import Customers</span>
            <span className="sm:hidden">Import</span>
          </Button>
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
    >
      <MasterPageSurface
        variant="workspace"
        className={masterListPageSurfaceClass}
      >
        {!hasNoCustomers ? (
          <div className={cm.filterRegion}>
            <div className={cm.filterSearchBand}>
              <CustomerSearchFilterBar
                search={search}
                onSearchChange={setSearch}
                resultCount={filteredCustomers.length}
                showPastLifecycleFilter={workQueue === "past"}
                pastLifecycleFilter={pastLifecycleFilter}
                onPastLifecycleFilterChange={setPastLifecycleFilter}
              />
            </div>
          </div>
        ) : null}

        <div className={masterListPageScrollRegionClass}>
          {hasNoCustomers ? (
            <CustomersEmptyState
              variant="no-customers"
              onCreateCustomer={
                canManageCustomers ? handleNewCustomer : undefined
              }
            />
          ) : hasNoQueueCustomers || hasNoResults ? (
            <CustomersEmptyState variant="no-results" />
          ) : (
            <CustomersTable
              customers={filteredCustomers}
              showRevenueStats={false}
              selectionEnabled={selectionEnabled}
              selectedIds={selectedIds}
              onToggleSelection={toggleSelection}
              onToggleAllVisible={toggleAllVisible}
              canManageCustomers={canManageCustomers}
            />
          )}
        </div>

        {selectionEnabled ? (
          <CustomersBulkActionBar
            selectedCount={selectedCustomers.length}
            lifecycleFilter={bulkLifecycleFilter}
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
