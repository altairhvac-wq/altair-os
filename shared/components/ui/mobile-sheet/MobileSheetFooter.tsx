"use client";

import { buttonClassName } from "@/shared/design-system/components/button-styles";

type MobileSheetFooterProps = {
  children: React.ReactNode;
  className?: string;
};

export function MobileSheetFooter({
  children,
  className,
}: MobileSheetFooterProps) {
  return (
    <footer
      className={`overlay-form-actions flex shrink-0 gap-2.5 admin-sticky-footer-inline px-3 py-2.5 sm:px-4 ${className ?? ""}`}
    >
      {children}
    </footer>
  );
}

/** Standard dual-action footer buttons (cancel + primary submit). */
export function MobileSheetFooterActions({
  onCancel,
  cancelLabel = "Cancel",
  submitLabel,
  submittingLabel,
  submitForm,
  isSubmitting = false,
  submitDisabled = false,
  submitClassName = buttonClassName("primary", "md", "flex-1"),
}: {
  onCancel: () => void;
  cancelLabel?: string;
  submitLabel: string;
  submittingLabel: string;
  submitForm: string;
  isSubmitting?: boolean;
  submitDisabled?: boolean;
  submitClassName?: string;
}) {
  const cancelClass = buttonClassName("secondary", "md", "flex-1");

  return (
    <>
      <button
        type="button"
        onClick={onCancel}
        disabled={isSubmitting}
        className={cancelClass}
      >
        {cancelLabel}
      </button>
      <button
        type="submit"
        form={submitForm}
        disabled={isSubmitting || submitDisabled}
        className={submitClassName}
      >
        {isSubmitting ? submittingLabel : submitLabel}
      </button>
    </>
  );
}
