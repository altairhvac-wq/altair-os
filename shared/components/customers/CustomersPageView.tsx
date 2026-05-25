"use client";

import { useEffect, useMemo, useState } from "react";
import { UserPlus } from "lucide-react";
import { mockCustomers } from "@/shared/data/mock-customers";
import {
  type Customer,
  type CustomerFormData,
  type CustomerStatus,
} from "@/shared/types/customer";
import { CustomerDetailPanel } from "./CustomerDetailPanel";
import { CustomerSearchFilterBar } from "./CustomerSearchFilterBar";
import { CustomersEmptyState } from "./CustomersEmptyState";
import { CustomersLoadingState } from "./CustomersLoadingState";
import { CustomersTable } from "./CustomersTable";

type PanelMode = "detail" | "create" | "empty";

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

function formDataToCustomer(data: CustomerFormData): Customer {
  return {
    id: `cust-${Date.now()}`,
    name: data.name,
    email: data.email,
    phone: data.phone,
    company: data.company || undefined,
    status: data.status,
    address: data.address,
    city: data.city,
    state: data.state,
    zip: data.zip,
    totalJobs: 0,
    totalRevenue: 0,
    tags: [],
    notes: data.notes || undefined,
    createdAt: new Date().toISOString().split("T")[0],
  };
}

export function CustomersPageView() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | "all">(
    "all",
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("empty");

  useEffect(() => {
    const timer = setTimeout(() => {
      setCustomers(mockCustomers);
      setIsLoading(false);
    }, 600);

    return () => clearTimeout(timer);
  }, []);

  const filteredCustomers = useMemo(
    () => filterCustomers(customers, search, statusFilter),
    [customers, search, statusFilter],
  );

  const selectedCustomer =
    customers.find((c) => c.id === selectedId) ?? null;

  function handleSelectCustomer(customer: Customer) {
    setSelectedId(customer.id);
    setPanelMode("detail");
  }

  function handleNewCustomer() {
    setSelectedId(null);
    setPanelMode("create");
  }

  function handleClosePanel() {
    setSelectedId(null);
    setPanelMode("empty");
  }

  function handleCreateSubmit(data: CustomerFormData) {
    const newCustomer = formDataToCustomer(data);
    setCustomers((prev) => [newCustomer, ...prev]);
    setSelectedId(newCustomer.id);
    setPanelMode("detail");
  }

  if (isLoading) {
    return <CustomersLoadingState />;
  }

  const hasNoCustomers = customers.length === 0;
  const hasNoResults = !hasNoCustomers && filteredCustomers.length === 0;

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-4 overflow-hidden lg:flex-row">
      <section className="flex min-h-[16rem] min-w-0 flex-[1_1_55%] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:min-h-0 lg:flex-1">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              All customers
            </h2>
            <p className="text-xs text-slate-500">
              Manage profiles, locations, and service history
            </p>
          </div>
          <button
            type="button"
            onClick={handleNewCustomer}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-cyan-700"
          >
            <UserPlus className="h-4 w-4" />
            New Customer
          </button>
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

        <div className="min-h-0 flex-1 overflow-y-auto">
          {hasNoCustomers ? (
            <CustomersEmptyState
              variant="no-customers"
              onCreateCustomer={handleNewCustomer}
            />
          ) : hasNoResults ? (
            <CustomersEmptyState variant="no-results" />
          ) : (
            <CustomersTable
              customers={filteredCustomers}
              selectedId={selectedId}
              onSelect={handleSelectCustomer}
            />
          )}
        </div>
      </section>

      <CustomerDetailPanel
        mode={panelMode}
        customer={selectedCustomer}
        onClose={handleClosePanel}
        onCreateSubmit={handleCreateSubmit}
        onCreateCancel={handleClosePanel}
      />
    </div>
  );
}
