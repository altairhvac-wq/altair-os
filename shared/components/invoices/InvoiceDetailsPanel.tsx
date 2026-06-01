import { FocusedDocumentOverlay } from "@/shared/components/layout/FocusedDocumentOverlay";
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
  const isOpen = mode === "create";

  return (
    <FocusedDocumentOverlay
      isOpen={isOpen}
      onClose={onClose}
      title="New invoice"
      subtitle="Add customer, line items, and due date"
      closeDisabled={isSubmitting}
      closeVariant="back"
      ariaLabel="Create invoice"
      bodyScroll="child"
    >
      <div className="flex h-full min-h-0 flex-1 flex-col px-3 py-3 sm:px-4 sm:py-4">
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
      </div>
    </FocusedDocumentOverlay>
  );
}
