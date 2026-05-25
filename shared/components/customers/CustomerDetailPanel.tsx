import { Calendar, MapPin, Tag, X } from "lucide-react";
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
};

export function CustomerDetailPanel({
  mode,
  customer,
  onClose,
  onCreateSubmit,
  onCreateCancel,
}: CustomerDetailPanelProps) {
  const title =
    mode === "create"
      ? "New customer"
      : mode === "detail" && customer
        ? customer.name
        : "Customer details";

  return (
    <aside className="flex h-full w-full flex-col rounded-2xl border border-slate-200 bg-white shadow-sm xl:w-[400px] xl:shrink-0">
      <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          <p className="mt-0.5 text-xs text-slate-500">
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
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close panel"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        {mode === "empty" ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
              <MapPin className="h-6 w-6 text-slate-400" />
            </div>
            <p className="mt-4 text-sm font-medium text-slate-700">
              No customer selected
            </p>
            <p className="mt-1 max-w-[220px] text-xs text-slate-500">
              Click a row in the table to view full customer details here.
            </p>
          </div>
        ) : null}

        {mode === "create" ? (
          <CustomerForm onSubmit={onCreateSubmit} onCancel={onCreateCancel} />
        ) : null}

        {mode === "detail" && customer ? (
          <div className="space-y-6">
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
              <button
                type="button"
                className="flex-1 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
              >
                Create job
              </button>
              <button
                type="button"
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Edit
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
