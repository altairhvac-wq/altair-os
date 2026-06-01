"use client";

import { DesktopConditionalDetailPanel } from "@/shared/components/layout/DesktopConditionalDetailPanel";
import type { Customer } from "@/shared/types/customer";
import type { JobFormData } from "@/shared/types/job";
import { JobForm } from "./JobForm";

type PanelMode = "create" | "empty";

type JobDetailsPanelProps = {
  mode: PanelMode;
  customers: Customer[];
  onClose: () => void;
  onCreateSubmit: (data: JobFormData) => void;
  onCreateCancel: () => void;
  createError?: string | null;
  isSubmitting?: boolean;
  createInitialData?: Partial<JobFormData>;
};

export function JobDetailsPanel({
  mode,
  customers,
  onClose,
  onCreateSubmit,
  onCreateCancel,
  createError,
  isSubmitting = false,
  createInitialData,
}: JobDetailsPanelProps) {
  const isOpen = mode === "create";

  return (
    <DesktopConditionalDetailPanel
      isOpen={isOpen}
      onClose={onClose}
      title="New job"
      subtitle="Schedule work for a customer"
      closeDisabled={isSubmitting}
      ariaLabel="Create job"
    >
      <JobForm
        customers={customers}
        initialData={createInitialData}
        onSubmit={onCreateSubmit}
        onCancel={onCreateCancel}
        error={createError}
        isSubmitting={isSubmitting}
      />
    </DesktopConditionalDetailPanel>
  );
}
