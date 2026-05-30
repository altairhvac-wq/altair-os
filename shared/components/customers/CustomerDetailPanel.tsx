"use client";

import Link from "next/link";
import { Calendar, MapPin, Tag, X } from "lucide-react";
import { listDetailPanelClass } from "@/shared/components/layout/list-detail-layout";
import { CustomerCard } from "./CustomerCard";
import { CustomerForm } from "./CustomerForm";
import {
  formatDate,
  type Customer,
  type CustomerFormData,
} from "@/shared/types/customer";

type PanelMode = "detail" | "create" | "empty";

type CustomerDetailPanelProps = {
  mode: PanelMode;
  customer: Customer | null;
  onClose: () => void;
  onCreateSubmit: (data: CustomerFormData) => void;
  onCreateCancel: () => void;
  createError?: string | null;
  isSubmitting?: boolean;
};

export function CustomerDetailPanel({
  mode,
  customer,
  onClose,
  onCreateSubmit,
  onCreateCancel,
  createError,
  isSubmitting = false,
}: CustomerDetailPanelProps) {
  const title =
    mode === "create"
      ? "New customer"
      : mode === "detail" && customer
        ? customer.name
        : "Customer details";

  return (
    <aside
      className={`${listDetailPanelClass(mode !== "empty")} min-h-[12rem] min-w-0 flex-[1_1_45%] flex-col overflow-hidden admin-card lg:h-full lg:min-h-0 lg:w-[400px] lg:flex-none lg:shrink-0`}
    >
      <div className="admin-panel-header admin-section-header flex shrink-0 items-start justify-between">
        <div className="min-w-0 pr-2">
          <h2 className="admin-heading-section sm:text-base">{title}</h2>
          <p className="admin-text-helper mt-0.5">
            {mode === "create"
              ? "Add a new customer profile"
              : mode === "detail"
                ? "Profile and service history"
                : "Select a customer from the list"}
          </p>
        </div>
        {mode !== "empty" ? (
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close panel"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 sm:px-4">
        {mode === "empty" ? (
          <div className="flex h-full flex-col items-center justify-center px-4 py-8 text-center">
            <div className="admin-empty-state w-full max-w-xs">
              <div className="admin-empty-icon mx-auto">
                <MapPin className="h-6 w-6 text-slate-400" />
              </div>
              <p className="admin-heading-section mt-4 text-sm">
                No customer selected
              </p>
              <p className="admin-text-helper mx-auto mt-1 max-w-[220px]">
                Select a customer from the list or open a profile to view details.
              </p>
            </div>
          </div>
        ) : null}

        {mode === "create" ? (
          <CustomerForm
            onSubmit={onCreateSubmit}
            onCancel={onCreateCancel}
            error={createError}
            isSubmitting={isSubmitting}
          />
        ) : null}

        {mode === "detail" && customer ? (
          <div className="space-y-4">
            <CustomerCard customer={customer} />

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Service address
              </h3>
              <div className="mt-2 flex gap-2 text-sm text-slate-700">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <div>
                  <p>{customer.address}</p>
                  <p>
                    {customer.city}, {customer.state} {customer.zip}
                  </p>
                </div>
              </div>
            </section>

            {customer.tags.length > 0 ? (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Tags
                </h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {customer.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                    >
                      <Tag className="h-3 w-3 text-slate-400" />
                      {tag}
                    </span>
                  ))}
                </div>
              </section>
            ) : null}

            {customer.notes ? (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Notes
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {customer.notes}
                </p>
              </section>
            ) : null}

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Account info
              </h3>
              <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                <Calendar className="h-4 w-4 text-slate-400" />
                Customer since {formatDate(customer.createdAt)}
              </div>
            </section>

            <div className="flex gap-2 border-t border-slate-100 pt-4">
              <Link
                href={`/jobs?customerId=${customer.id}&create=1`}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
              >
                Create job
              </Link>
              <Link
                href={`/customers/${customer.id}`}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                View profile
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
