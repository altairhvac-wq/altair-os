"use client";

import { DesktopConditionalDetailPanel } from "@/shared/components/layout/DesktopConditionalDetailPanel";
import { FocusedDocumentOverlay } from "@/shared/components/layout/FocusedDocumentOverlay";
import { useIsBelowLg } from "@/shared/components/mobile/use-mobile-viewport";
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
  const isBelowLg = useIsBelowLg();

  const form = (
    <JobForm
      customers={customers}
      initialData={createInitialData}
      onSubmit={onCreateSubmit}
      onCancel={onCreateCancel}
      error={createError}
      isSubmitting={isSubmitting}
    />
  );

  if (isBelowLg) {
    return (
      <FocusedDocumentOverlay
        isOpen={isOpen}
        onClose={onClose}
        title="New job"
        subtitle="Schedule work for a customer"
        closeDisabled={isSubmitting}
        closeVariant="back"
        ariaLabel="Create job"
      >
        {form}
      </FocusedDocumentOverlay>
    );
  }

  return (
    <DesktopConditionalDetailPanel
      isOpen={isOpen}
      onClose={onClose}
      title="New job"
      subtitle="Schedule work for a customer"
      closeDisabled={isSubmitting}
      ariaLabel="Create job"
      showMobileAside={false}
    >
      {form}
    </DesktopConditionalDetailPanel>
  );
}
