import { listDetailPanelClass } from "@/shared/components/layout/list-detail-layout";
import { FileText, X } from "lucide-react";
import type { Customer } from "@/shared/types/customer";
import type { Job } from "@/shared/types/job";
import type { EstimateFormData } from "@/shared/types/estimate";
import type { ServiceItem } from "@/shared/types/service-item";
import { EstimateForm } from "./EstimateForm";

type PanelMode = "create" | "empty";

type EstimateDetailsPanelProps = {
  mode: PanelMode;
  customers: Customer[];
  jobs: Job[];
  serviceItems: ServiceItem[];
  onClose: () => void;
  onCreateSubmit: (data: EstimateFormData) => void;
  onCreateCancel: () => void;
  createError?: string | null;
  isSubmitting?: boolean;
  createInitialData?: Partial<EstimateFormData>;
};

export function EstimateDetailsPanel({
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
}: EstimateDetailsPanelProps) {
  const title = mode === "create" ? "New estimate" : "Create estimate";

  return (
    <aside
      className={`${listDetailPanelClass(mode !== "empty")} min-h-[12rem] min-w-0 flex-[1_1_45%] flex-col overflow-hidden admin-card lg:h-full lg:min-h-0 lg:w-[400px] lg:flex-none lg:shrink-0`}
    >
      <div className="flex shrink-0 items-start justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {mode === "create"
              ? "Add line items and send to your customer"
              : "Create a new estimate from the list"}
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
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
              <FileText className="h-6 w-6 text-slate-400" />
            </div>
            <p className="mt-4 text-sm font-medium text-slate-700">
              No estimate form open
            </p>
            <p className="mt-1 max-w-[220px] text-xs text-slate-500">
              Click a row to view estimate details, or create a new estimate.
            </p>
          </div>
        ) : null}

        {mode === "create" ? (
          <EstimateForm
            customers={customers}
            jobs={jobs}
            serviceItems={serviceItems}
            initialData={createInitialData}
            onSubmit={onCreateSubmit}
            onCancel={onCreateCancel}
            error={createError}
            isSubmitting={isSubmitting}
          />
        ) : null}
      </div>
    </aside>
  );
}
