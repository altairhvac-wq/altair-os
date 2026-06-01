"use client";

import { DesktopConditionalDetailPanel } from "@/shared/components/layout/DesktopConditionalDetailPanel";
import { CustomerForm } from "./CustomerForm";
import type { CustomerFormData } from "@/shared/types/customer";

type PanelMode = "create" | "empty";

type CustomerDetailPanelProps = {
  mode: PanelMode;
  onClose: () => void;
  onCreateSubmit: (data: CustomerFormData) => void;
  onCreateCancel: () => void;
  createError?: string | null;
  isSubmitting?: boolean;
};

export function CustomerDetailPanel({
  mode,
  onClose,
  onCreateSubmit,
  onCreateCancel,
  createError,
  isSubmitting = false,
}: CustomerDetailPanelProps) {
  const isOpen = mode === "create";

  return (
    <DesktopConditionalDetailPanel
      isOpen={isOpen}
      onClose={onClose}
      title="New customer"
      subtitle="Add a new customer profile"
      closeDisabled={isSubmitting}
      ariaLabel="Create customer"
    >
      <CustomerForm
        onSubmit={onCreateSubmit}
        onCancel={onCreateCancel}
        error={createError}
        isSubmitting={isSubmitting}
      />
    </DesktopConditionalDetailPanel>
  );
}
