"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { createCustomerAction } from "@/app/actions/customers";
import {
  type Customer,
  type CustomerFormData,
  type CustomerStatus,
  validateCustomerFormData,
} from "@/shared/types/customer";
import { listDetailListSectionClassName } from "@/shared/components/layout/list-detail-layout";
import { CustomerDetailPanel } from "./CustomerDetailPanel";
import { CustomerSearchFilterBar } from "./CustomerSearchFilterBar";
import { CustomersEmptyState } from "./CustomersEmptyState";
import { CustomersTable } from "./CustomersTable";

type PanelMode = "detail" | "create" | "empty";

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
        setCreateError(result.error ?? "Failed to create customer.");
        return;
      }

      setCustomers((previous) => [result.customer!, ...previous]);
      router.push(`/customers/${result.customer.id}`);
    });
  }

  const hasNoCustomers = customers.length === 0;
  const hasNoResults = !hasNoCustomers && filteredCustomers.length === 0;

  return (
    <div className="flex min-h-0 min-w-0 max-w-full flex-col gap-4 lg:h-[calc(100dvh-7rem)] lg:flex-row lg:overflow-hidden">
      <section
        className={`${listDetailListSectionClassName} flex min-h-[16rem] min-w-0 flex-[1_1_55%] flex-col lg:overflow-hidden admin-card lg:min-h-0 lg:flex-1 ${panelMode === "create" ? "max-lg:hidden" : ""}`}
      >
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              All customers
            </h2>
            <p className="text-xs text-slate-500">
              Manage profiles, locations, and service history
            </p>
          </div>
          {canManageCustomers ? (
            <button
              type="button"
              onClick={handleNewCustomer}
              className="inline-flex shrink-0 items-center gap-2 admin-btn-primary"
            >
              <UserPlus className="h-4 w-4" />
              New Customer
            </button>
          ) : null}
        </div>

        {!hasNoCustomers ? (
          <div className="shrink-0">
            <CustomerSearchFilterBar
              search={search}
              statusFilter={statusFilter}
              onSearchChange={setSearch}
              onStatusFilterChange={setStatusFilter}
              resultCount={filteredCustomers.length}
            />
          </div>
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
        customer={null}
        onClose={handleClosePanel}
        onCreateSubmit={handleCreateSubmit}
        onCreateCancel={handleClosePanel}
        createError={createError}
        isSubmitting={isPending}
      />
    </div>
  );
}
