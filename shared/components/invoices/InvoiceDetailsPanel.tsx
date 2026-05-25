import { Receipt, X } from "lucide-react";
import type { Customer } from "@/shared/types/customer";
import type { Job } from "@/shared/types/job";
import type { InvoiceFormData } from "@/shared/types/invoice";
import type { ServiceItem } from "@/shared/types/service-item";
import { InvoiceForm } from "./InvoiceForm";

type PanelMode = "create" | "empty";

type InvoiceDetailsPanelProps = {
  mode: PanelMode;
  customers: Customer[];
  jobs: Job[];
  serviceItems: ServiceItem[];
  onClose: () => void;
  onCreateSubmit: (data: InvoiceFormData) => void;
  onCreateCancel: () => void;
  createError?: string | null;
  isSubmitting?: boolean;
  createInitialData?: Partial<InvoiceFormData>;
};

export function InvoiceDetailsPanel({
  mode,
  customers,
  jobs,
  serviceItems,
  onClose,
  onCreateSubmit,
  onCreateCancel,
  createError,
  isSubmitting = false,
  createInitialData,
}: InvoiceDetailsPanelProps) {
  const title = mode === "create" ? "New invoice" : "Create invoice";

  return (
    <aside className="flex min-h-[12rem] min-w-0 flex-[1_1_45%] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:h-full lg:min-h-0 lg:w-[400px] lg:flex-none lg:shrink-0">
      <div className="flex shrink-0 items-start justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {mode === "create"
              ? "Add line items and set due date"
              : "Create a new invoice from the list"}
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
              <Receipt className="h-6 w-6 text-slate-400" />
            </div>
            <p className="mt-4 text-sm font-medium text-slate-700">
              Create or select an invoice
            </p>
            <p className="mt-1 max-w-[220px] text-xs text-slate-500">
              Click New Invoice to create one, or select a row to view details.
            </p>
          </div>
        ) : null}

        {mode === "create" ? (
          <InvoiceForm
            customers={customers}
            jobs={jobs}
            serviceItems={serviceItems}
            onSubmit={onCreateSubmit}
            onCancel={onCreateCancel}
            error={createError}
            isSubmitting={isSubmitting}
            initialData={createInitialData}
          />
        ) : null}
      </div>
    </aside>
  );
}
