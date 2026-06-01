import { FocusedDocumentOverlay } from "@/shared/components/layout/FocusedDocumentOverlay";
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
  aiFeaturesEnabled?: boolean;
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
  aiFeaturesEnabled = false,
}: EstimateDetailsPanelProps) {
  const isOpen = mode === "create";

  return (
    <FocusedDocumentOverlay
      isOpen={isOpen}
      onClose={onClose}
      title="New estimate"
      subtitle="Add customer, line items, and pricing"
      closeDisabled={isSubmitting}
      closeVariant="back"
      ariaLabel="Create estimate"
      bodyScroll="child"
    >
      <div className="flex h-full min-h-0 flex-1 flex-col px-3 py-3 sm:px-4 sm:py-4">
        <EstimateForm
          customers={customers}
          jobs={jobs}
          serviceItems={serviceItems}
          initialData={createInitialData}
          onSubmit={onCreateSubmit}
          onCancel={onCreateCancel}
          error={createError}
          isSubmitting={isSubmitting}
          aiFeaturesEnabled={aiFeaturesEnabled}
        />
      </div>
    </FocusedDocumentOverlay>
  );
}
