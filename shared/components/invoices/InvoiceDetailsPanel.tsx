import { Receipt, X } from "lucide-react";
import { listDetailPanelClass } from "@/shared/components/layout/list-detail-layout";
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
    <aside
      className={`${listDetailPanelClass(mode !== "empty")} min-h-[12rem] min-w-0 flex-[1_1_45%] flex-col overflow-hidden admin-card lg:h-full lg:min-h-0 lg:w-[400px] lg:flex-none lg:shrink-0`}
    >
      <div className="admin-panel-header flex shrink-0 items-start justify-between px-4 py-3 sm:px-5 sm:py-4">
        <div className="min-w-0 pr-2">
          <h2 className="admin-heading-section sm:text-base">{title}</h2>
          <p className="admin-text-helper mt-0.5">
            {mode === "create"
              ? "Add line items and set due date"
              : "Create a new invoice from the list"}
          </p>
        </div>
        {mode !== "empty" ? (
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Close panel"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        {mode === "empty" ? (
          <div className="flex h-full flex-col items-center justify-center px-4 py-8 text-center">
            <div className="admin-empty-state w-full max-w-xs">
              <div className="admin-empty-icon mx-auto">
                <Receipt className="h-6 w-6 text-slate-400" />
              </div>
              <p className="admin-heading-section mt-4 text-sm">
                Create or select an invoice
              </p>
              <p className="admin-text-helper mx-auto mt-1 max-w-[220px]">
                Click New Invoice to create one, or select a row to view details.
              </p>
            </div>
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
