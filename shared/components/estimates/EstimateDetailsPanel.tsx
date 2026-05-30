import { listDetailPanelClass } from "@/shared/components/layout/list-detail-layout";
import { FileText, X } from "lucide-react";
import type { Customer } from "@/shared/types/customer";
import type { Job } from "@/shared/types/job";
import type { EstimateFormData } from "@/shared/types/estimate";
import type { ServiceItem } from "@/shared/types/service-item";
import { adminPanelBodyClass } from "@/shared/lib/admin-density";
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
      <div className="admin-panel-header admin-section-header flex shrink-0 items-start justify-between">
        <div className="min-w-0 pr-2">
          <h2 className="admin-heading-section sm:text-base">{title}</h2>
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

      <div className={adminPanelBodyClass}>
        {mode === "empty" ? (
          <div className="flex h-full flex-col items-center justify-center px-4 py-8 text-center">
            <div className="admin-empty-state w-full max-w-xs">
              <div className="admin-empty-icon mx-auto">
                <FileText className="h-6 w-6 text-slate-400" />
              </div>
              <p className="admin-heading-section mt-4 text-sm">
                No estimate form open
              </p>
              <p className="admin-text-helper mx-auto mt-1 max-w-[220px]">
                Click a row to view estimate details, or create a new estimate.
              </p>
            </div>
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
