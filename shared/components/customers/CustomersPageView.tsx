"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { createCustomerAction } from "@/app/actions/customers";
import { formatActionError } from "@/shared/lib/operational-errors";
import {
  type Customer,
  type CustomerFormData,
  type CustomerStatus,
  validateCustomerFormData,
} from "@/shared/types/customer";
import { ListCommandCenterLayout } from "@/shared/components/layout/ListCommandCenterLayout";
import { CustomerDetailPanel } from "./CustomerDetailPanel";
import { CustomerSearchFilterBar } from "./CustomerSearchFilterBar";
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
): Customer[] {
  const query = search.trim().toLowerCase();

  return customers.filter((customer) => {
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
  const [panelMode, setPanelMode] = useState<PanelMode>("empty");
  const router = useRouter();
  const [createError, setCreateError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredCustomers = useMemo(
    () => filterCustomers(customers, search, statusFilter),
    [customers, search, statusFilter],
  );

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
      <section
        className={`flex min-h-[16rem] min-w-0 flex-1 flex-col overflow-hidden admin-card lg:min-h-0 ${
          isCreateOpen ? "max-lg:hidden" : ""
        }`}
      >
        {!hasNoCustomers ? (
          <CustomerSearchFilterBar
            search={search}
            statusFilter={statusFilter}
            onSearchChange={setSearch}
            onStatusFilterChange={setStatusFilter}
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
            />
          )}
        </div>
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
