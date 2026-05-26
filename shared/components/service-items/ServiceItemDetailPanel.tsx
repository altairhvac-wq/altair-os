import { BookOpen, X } from "lucide-react";
import { listDetailPanelClass } from "@/shared/components/layout/list-detail-layout";
import {
  ServiceItemForm,
  serviceItemToFormData,
} from "./ServiceItemForm";
import type {
  ServiceItem,
  ServiceItemFormData,
} from "@/shared/types/service-item";

type PanelMode = "create" | "edit" | "empty";

type ServiceItemDetailPanelProps = {
  mode: PanelMode;
  serviceItem: ServiceItem | null;
  createFormKey: number;
  onClose: () => void;
  onCreateSubmit: (data: ServiceItemFormData) => void;
  onEditSubmit: (data: ServiceItemFormData) => void;
  onCancel: () => void;
  error?: string | null;
  isSubmitting?: boolean;
};

export function ServiceItemDetailPanel({
  mode,
  serviceItem,
  createFormKey,
  onClose,
  onCreateSubmit,
  onEditSubmit,
  onCancel,
  error,
  isSubmitting = false,
}: ServiceItemDetailPanelProps) {
  const title =
    mode === "create"
      ? "New price book item"
      : mode === "edit" && serviceItem
        ? serviceItem.name
        : "Item details";

  return (
    <aside
      className={`${listDetailPanelClass(mode !== "empty")} min-h-[12rem] min-w-0 flex-[1_1_45%] flex-col overflow-hidden admin-card lg:h-full lg:min-h-0 lg:w-[400px] lg:flex-none lg:shrink-0`}
    >
      <div className="flex shrink-0 items-start justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {mode === "create"
              ? "Add a reusable service or part for estimates"
              : mode === "edit"
                ? "Update pricing and availability"
                : "Select an item from the list"}
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
              <BookOpen className="h-6 w-6 text-slate-400" />
            </div>
            <p className="mt-4 text-sm font-medium text-slate-700">
              No item selected
            </p>
            <p className="mt-1 max-w-[220px] text-xs text-slate-500">
              Click a row in the table to edit pricing, tax settings, or active
              status.
            </p>
          </div>
        ) : null}

        {mode === "create" ? (
          <ServiceItemForm
            key={`create-${createFormKey}`}
            onSubmit={onCreateSubmit}
            onCancel={onCancel}
            error={error}
            isSubmitting={isSubmitting}
            submitLabel="Create item"
          />
        ) : null}

        {mode === "edit" && serviceItem ? (
          <ServiceItemForm
            key={serviceItem.id}
            initialData={serviceItemToFormData(serviceItem)}
            onSubmit={onEditSubmit}
            onCancel={onCancel}
            error={error}
            isSubmitting={isSubmitting}
            submitLabel="Save changes"
          />
        ) : null}
      </div>
    </aside>
  );
}
