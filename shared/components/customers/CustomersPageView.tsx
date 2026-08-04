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
import {
  buildCustomersGlanceStats,
  CUSTOMER_BOOK_QUEUE_ORDER,
} from "@/shared/lib/customers/customers-glance-stats";
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
  resolveInitialCustomerWorkQueue,
  type CustomerWorkQueue,
} from "./customer-work-queues";

type PanelMode = "create" | "empty";

export type CustomersLifecycleScope = "book" | "archived";

type CustomersPageViewProps = {
  initialCustomers: Customer[];
  canManageCustomers: boolean;
  /**
   * When true, omit MasterListPageLayout — Customers hub hosts page chrome.
   * Stat strip renders above the list inside the panel.
   */
  embedded?: boolean;
  /**
   * book = Active / Needs info / Inactive (lifecycle-active only).
   * archived = Past lifecycle (archived / recently deleted) — never Inactive.
   */
  lifecycleScope?: CustomersLifecycleScope;
  /** Hub registers New Customer header action against this handler. */
  onRegisterCreateHandler?: (handler: () => void) => void;
  /** Deep-link work queue from ?queue= (book scope only). */
  initialWorkQueue?: string | null;
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
  embedded = false,
  lifecycleScope = "book",
  onRegisterCreateHandler,
  initialWorkQueue = null,
}: CustomersPageViewProps) {
  const isArchivedScope = lifecycleScope === "archived";
  const [customers, setCustomers] = useState(initialCustomers);
  const [customersProp, setCustomersProp] = useState(initialCustomers);
  if (initialCustomers !== customersProp) {
    setCustomersProp(initialCustomers);
    setCustomers(initialCustomers);
  }
  const [search, setSearch] = useState("");
  const timeZone = useCompanyTimezone();
  const [workQueue, setWorkQueue] = useState<CustomerWorkQueue>(() =>
    isArchivedScope
      ? resolveDefaultCustomerWorkQueue()
      : resolveInitialCustomerWorkQueue(initialWorkQueue),
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
    if (!onRegisterCreateHandler || isArchivedScope) {
      return;
    }

    onRegisterCreateHandler(() => {
      if (!canManageCustomers) {
        return;
      }

      setPanelMode("create");
      setCreateError(null);
    });
  }, [onRegisterCreateHandler, isArchivedScope, canManageCustomers]);

  const bookCustomers = useMemo(
    () =>
      customers.filter(
        (customer) => getCustomerLifecycleState(customer) === "active",
      ),
    [customers],
  );

  const glanceStats = useMemo(() => {
    if (isArchivedScope) {
      const archivedCount = customers.filter(
        (customer) => getCustomerLifecycleState(customer) === "archived",
      ).length;
      const deletedCount = customers.filter(
        (customer) => getCustomerLifecycleState(customer) === "deleted",
      ).length;

      return [
        {
          id: "archived",
          label: "Archived",
          value: String(archivedCount),
          detail:
            archivedCount === 0
              ? "No archived customers"
              : "Soft-archived customer records",
        },
        {
          id: "deleted",
          label: "Recently Deleted",
          value: String(deletedCount),
          detail:
            deletedCount === 0
              ? "No customers in trash"
              : "In Recently Deleted",
        },
      ];
    }

    return buildCustomersGlanceStats({
      customers: bookCustomers,
      timeZone,
      queues: CUSTOMER_BOOK_QUEUE_ORDER,
    });
  }, [bookCustomers, customers, isArchivedScope, timeZone]);

  const effectiveWorkQueue: CustomerWorkQueue = isArchivedScope
    ? "past"
    : workQueue === "past"
      ? "active"
      : workQueue;

  const queueScopedCustomers = useMemo(
    () => filterCustomersForWorkQueue(customers, effectiveWorkQueue),
    [customers, effectiveWorkQueue],
  );

  const lifecycleScopedCustomers = useMemo(() => {
    if (effectiveWorkQueue !== "past") {
      return queueScopedCustomers;
    }

    return queueScopedCustomers.filter(
      (customer) => getCustomerLifecycleState(customer) === pastLifecycleFilter,
    );
  }, [pastLifecycleFilter, queueScopedCustomers, effectiveWorkQueue]);

  const filteredCustomers = useMemo(
    () => filterCustomersBySearch(lifecycleScopedCustomers, search),
    [lifecycleScopedCustomers, search],
  );

  const bulkLifecycleFilter = resolveCustomerBulkLifecycleFilter(
    effectiveWorkQueue,
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
    effectiveWorkQueue,
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
    if (isArchivedScope || queue === "past") {
      return;
    }

    setWorkQueue(queue);
    clearSelection();
    clearBulkActionFeedback();
  }

  function handleNewCustomer() {
    if (!canManageCustomers || isArchivedScope) {
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

  const scopedForEmpty = isArchivedScope
    ? filterCustomersForWorkQueue(customers, "past")
    : bookCustomers;
  const hasNoCustomers = scopedForEmpty.length === 0;
  const hasNoQueueCustomers =
    !hasNoCustomers && queueScopedCustomers.length === 0;
  const hasNoResults = !hasNoCustomers && filteredCustomers.length === 0;

  const panelBody = (
    <>
      <MasterPageSurface
        variant="workspace"
        className={masterListPageSurfaceClass}
      >
        {!hasNoCustomers ? (
          <div className={cm.filterRegion}>
            {embedded ? (
              <div className="border-b border-altair-border/70 px-1 pb-2 sm:px-0">
                <CustomersStatStrip
                  stats={glanceStats}
                  activeQueue={
                    isArchivedScope ? undefined : effectiveWorkQueue
                  }
                  onFilterQueue={
                    isArchivedScope ? undefined : handleQueueChange
                  }
                />
              </div>
            ) : null}
            <div className={cm.filterSearchBand}>
              <CustomerSearchFilterBar
                search={search}
                onSearchChange={setSearch}
                resultCount={filteredCustomers.length}
                showPastLifecycleFilter={effectiveWorkQueue === "past"}
                pastLifecycleFilter={pastLifecycleFilter}
                onPastLifecycleFilterChange={setPastLifecycleFilter}
              />
            </div>
          </div>
        ) : null}

        <div className={masterListPageScrollRegionClass}>
          {hasNoCustomers ? (
            isArchivedScope ? (
              <div className="flex flex-1 items-center justify-center px-4 py-10">
                <div className="w-full max-w-md rounded-xl border border-altair-border bg-altair-paper-subtle px-5 py-6 text-center">
                  <p className="text-sm font-semibold text-altair-ink-on-paper">
                    No archived customers
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-altair-ink-on-paper-secondary">
                    Archived and recently deleted customers appear here. Inactive
                    customers stay in the Customers tab.
                  </p>
                </div>
              </div>
            ) : (
              <CustomersEmptyState
                variant="no-customers"
                onCreateCustomer={
                  canManageCustomers ? handleNewCustomer : undefined
                }
              />
            )
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

      {!isArchivedScope ? (
        <CustomerDetailPanel
          mode={panelMode}
          onClose={handleClosePanel}
          onCreateSubmit={handleCreateSubmit}
          onCreateCancel={handleClosePanel}
          createError={createError}
          isSubmitting={isPending}
        />
      ) : null}
    </>
  );

  if (embedded) {
    return (
      <>
        {bulkActionMessage ? (
          <div className="mb-2">
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
          </div>
        ) : null}
        {panelBody}
      </>
    );
  }

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
          activeQueue={isArchivedScope ? undefined : effectiveWorkQueue}
          onFilterQueue={isArchivedScope ? undefined : handleQueueChange}
        />
      }
      primaryAction={
        canManageCustomers && !isArchivedScope ? (
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
        canManageCustomers && !isArchivedScope ? (
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
      {panelBody}
    </MasterListPageLayout>
  );
}
