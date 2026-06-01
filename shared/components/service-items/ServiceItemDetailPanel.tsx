import { DesktopConditionalDetailPanel } from "@/shared/components/layout/DesktopConditionalDetailPanel";
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
  const isOpen = mode !== "empty";

  const title =
    mode === "create"
      ? "New price book item"
      : mode === "edit" && serviceItem
        ? serviceItem.name
        : "Item details";

  const subtitle =
    mode === "create"
      ? "Add a reusable service or part for estimates"
      : mode === "edit"
        ? "Update pricing and availability"
        : undefined;

  return (
    <DesktopConditionalDetailPanel
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      closeDisabled={isSubmitting}
      ariaLabel={mode === "create" ? "Create service item" : "Edit service item"}
    >
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
    </DesktopConditionalDetailPanel>
  );
}
